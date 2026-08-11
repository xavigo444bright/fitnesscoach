/**
 * 侧面机位朝向：用户朝左/朝右（画面坐标）+ 多帧锁定
 */

import { LandmarkIndex, type Pose } from "@fitness-coach/core";

export type SideFacing = 1 | -1;

export type SideFacingInference = {
  facing: SideFacing | 0;
  /** 0～1，越高越可信；站立竖直腿时通常偏低 */
  confidence: number;
};

function mid(
  a: { x: number; y: number } | undefined,
  b: { x: number; y: number } | undefined,
): { x: number; y: number } | null {
  if (a && b) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (a) return { x: a.x, y: a.y };
  if (b) return { x: b.x, y: b.y };
  return null;
}

/**
 * +1 = 朝画面右，-1 = 朝左。
 * 站立时踝–髋常与真实朝向相反（髋略在踝前），故降权；优先膝–踝与手臂前伸。
 */
export function inferSideFacingDetailed(pose: Pose): SideFacingInference {
  const votes: Array<{ dir: SideFacing; w: number }> = [];
  const hip = mid(pose[LandmarkIndex.LeftHip], pose[LandmarkIndex.RightHip]);

  for (const [ki, ai] of [
    [LandmarkIndex.LeftKnee, LandmarkIndex.LeftAnkle],
    [LandmarkIndex.RightKnee, LandmarkIndex.RightAnkle],
  ] as const) {
    const knee = pose[ki];
    const ank = pose[ai];
    if (!knee || !ank) continue;
    const dx = knee.x - ank.x;
    if (Math.abs(dx) >= 0.028) votes.push({ dir: dx > 0 ? 1 : -1, w: 3 });
    else if (Math.abs(dx) >= 0.018) votes.push({ dir: dx > 0 ? 1 : -1, w: 1 });
  }

  const wrist = mid(
    pose[LandmarkIndex.LeftWrist],
    pose[LandmarkIndex.RightWrist],
  );
  if (wrist && hip) {
    const dx = wrist.x - hip.x;
    if (Math.abs(dx) >= 0.04) votes.push({ dir: dx > 0 ? 1 : -1, w: 2 });
    else if (Math.abs(dx) >= 0.025) votes.push({ dir: dx > 0 ? 1 : -1, w: 1 });
  }

  const elbow = mid(
    pose[LandmarkIndex.LeftElbow],
    pose[LandmarkIndex.RightElbow],
  );
  if (elbow && hip) {
    const dx = elbow.x - hip.x;
    if (Math.abs(dx) >= 0.035) votes.push({ dir: dx > 0 ? 1 : -1, w: 2 });
  }

  const shoulder = mid(
    pose[LandmarkIndex.LeftShoulder],
    pose[LandmarkIndex.RightShoulder],
  );
  if (shoulder && hip) {
    const dx = shoulder.x - hip.x;
    if (Math.abs(dx) >= 0.03) votes.push({ dir: dx > 0 ? 1 : -1, w: 1 });
  }

  // 踝–髋：阈值抬高且低权重，避免站立间歇误判
  const ankle = mid(
    pose[LandmarkIndex.LeftAnkle],
    pose[LandmarkIndex.RightAnkle],
  );
  if (hip && ankle) {
    const dx = ankle.x - hip.x;
    if (Math.abs(dx) >= 0.05) votes.push({ dir: dx > 0 ? 1 : -1, w: 1 });
  }

  if (votes.length === 0) return { facing: 0, confidence: 0 };

  let wPos = 0;
  let wNeg = 0;
  for (const v of votes) {
    if (v.dir === 1) wPos += v.w;
    else wNeg += v.w;
  }
  const total = wPos + wNeg;
  if (total <= 0) return { facing: 0, confidence: 0 };
  if (wPos === wNeg) return { facing: 0, confidence: 0 };

  const facing: SideFacing = wPos > wNeg ? 1 : -1;
  const confidence = Math.min(1, Math.abs(wPos - wNeg) / total);
  // 弱多数当作未知，交给 Latch 保持旧值
  if (confidence < 0.34 || Math.max(wPos, wNeg) < 2) {
    return { facing: 0, confidence };
  }
  return { facing, confidence };
}

export function inferSideFacing(pose: Pose): SideFacing | 0 {
  return inferSideFacingDetailed(pose).facing;
}

/** 绕 pivotX 水平镜像。 */
export function mirrorPoseX(pose: Pose, pivotX: number): Pose {
  const out: Pose = [];
  for (let i = 0; i < pose.length; i += 1) {
    const lm = pose[i];
    if (!lm) continue;
    out[i] = { ...lm, x: 2 * pivotX - lm.x };
  }
  return out;
}

export function poseHipX(pose: Pose): number {
  const hip = mid(pose[LandmarkIndex.LeftHip], pose[LandmarkIndex.RightHip]);
  return hip?.x ?? 0.5;
}

export type SideFacingLatchUpdate = {
  /** 行程中禁止翻转；仅 stand 允许更新朝向（转身应在站立时完成） */
  allowFlip?: boolean;
  confidence?: number;
};

/**
 * 多帧确认后再翻转。
 * 已锁定后：弱信号忽略；allowFlip=false 时保持锁定（用于下蹲行程）。
 */
export class SideFacingLatch {
  private locked: SideFacing | 0 = 0;
  private pending: SideFacing | 0 = 0;
  private pendingCount = 0;

  constructor(private readonly confirmFrames = 6) {}

  get value(): SideFacing | 0 {
    return this.locked;
  }

  reset(): void {
    this.locked = 0;
    this.pending = 0;
    this.pendingCount = 0;
  }

  update(
    observed: SideFacing | 0,
    opts: SideFacingLatchUpdate = {},
  ): SideFacing | 0 {
    const confidence = opts.confidence ?? 1;
    if (observed === 0 || confidence < 0.34) return this.locked;

    if (this.locked === 0) {
      if (this.pending === observed) this.pendingCount += 1;
      else {
        this.pending = observed;
        this.pendingCount = 1;
      }
      if (this.pendingCount >= Math.min(3, this.confirmFrames)) {
        this.locked = observed;
        this.pending = 0;
        this.pendingCount = 0;
      }
      return this.locked || observed;
    }

    if (observed === this.locked) {
      this.pending = 0;
      this.pendingCount = 0;
      return this.locked;
    }

    // 反向：行程中不允许翻转
    if (opts.allowFlip === false) {
      this.pending = 0;
      this.pendingCount = 0;
      return this.locked;
    }

    // 翻转需更高置信 + 连续帧
    if (confidence < 0.5) return this.locked;

    if (this.pending === observed) this.pendingCount += 1;
    else {
      this.pending = observed;
      this.pendingCount = 1;
    }
    if (this.pendingCount >= this.confirmFrames) {
      this.locked = observed;
      this.pending = 0;
      this.pendingCount = 0;
    }
    return this.locked;
  }
}

/**
 * 将示范骨调整到目标朝向（未知示范朝向时默认按 +1 / 朝右片源）。
 */
export function orientPoseToFacing(
  demo: Pose,
  targetFacing: SideFacing | 0,
  demoFacing: SideFacing | 0 = 0,
): Pose {
  if (targetFacing === 0) return demo;
  const src = demoFacing === 0 ? inferSideFacing(demo) : demoFacing;
  const effectiveSrc: SideFacing = src === 0 ? 1 : src;
  if (effectiveSrc === targetFacing) return demo;
  return mirrorPoseX(demo, poseHipX(demo));
}
