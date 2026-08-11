/**
 * 正面 / 侧面机位自动识别（训练参考轨迹切换，FR-068）
 *
 * 正面：左右肩/髋水平间距大；侧面：左右点几乎叠在同一竖线。
 */

import { LandmarkIndex, type Pose } from "@fitness-coach/core";

export type CameraHint = "side" | "front";

export type CameraHintInference = {
  hint: CameraHint | 0;
  /** 0～1 */
  confidence: number;
  /** 肩髋平均水平跨度 / 躯干高，越大越正面 */
  spanRatio: number;
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

function pairSpan(
  a: { x: number } | undefined,
  b: { x: number } | undefined,
): number | null {
  if (!a || !b) return null;
  return Math.abs(a.x - b.x);
}

/**
 * 由肩/髋（及踝）水平跨度相对躯干高度推断机位。
 */
export function inferCameraHintDetailed(pose: Pose): CameraHintInference {
  const ls = pose[LandmarkIndex.LeftShoulder];
  const rs = pose[LandmarkIndex.RightShoulder];
  const lh = pose[LandmarkIndex.LeftHip];
  const rh = pose[LandmarkIndex.RightHip];
  const shoulder = mid(ls, rs);
  const hip = mid(lh, rh);
  if (!shoulder || !hip) {
    return { hint: 0, confidence: 0, spanRatio: 0 };
  }

  const torsoH = Math.abs(hip.y - shoulder.y);
  if (torsoH < 0.04) {
    return { hint: 0, confidence: 0, spanRatio: 0 };
  }

  // 仅用肩/髋水平跨度；踝距在分腿站立时易把侧面误判成正面
  const spans: number[] = [];
  const sh = pairSpan(ls, rs);
  const hp = pairSpan(lh, rh);
  if (sh != null) spans.push(sh);
  if (hp != null) spans.push(hp);

  if (spans.length === 0) {
    return { hint: 0, confidence: 0, spanRatio: 0 };
  }

  const avgSpan = spans.reduce((s, v) => s + v, 0) / spans.length;
  let spanRatio = avgSpan / torsoH;

  // 矢状深度：侧面站立时髋–踝水平偏移相对躯干更大
  const ankle = mid(
    pose[LandmarkIndex.LeftAnkle],
    pose[LandmarkIndex.RightAnkle],
  );
  if (ankle) {
    const depthRatio = Math.abs(ankle.x - hip.x) / torsoH;
    if (depthRatio >= 0.35 && spanRatio < 0.7) {
      spanRatio *= 0.72; // 压低正面倾向
    }
  }

  // 经验阈值：侧面常 <0.32，正面常 >0.62（中间死区避免 3/4 抖切）
  if (spanRatio >= 0.62) {
    const confidence = Math.min(1, (spanRatio - 0.62) / 0.4 + 0.55);
    return { hint: "front", confidence, spanRatio };
  }
  if (spanRatio <= 0.34) {
    const confidence = Math.min(1, (0.34 - spanRatio) / 0.34 + 0.55);
    return { hint: "side", confidence, spanRatio };
  }
  return { hint: 0, confidence: 0.2, spanRatio };
}

export function inferCameraHint(pose: Pose): CameraHint | 0 {
  return inferCameraHintDetailed(pose).hint;
}

export type CameraHintLatchUpdate = {
  /** 行程中禁止切换，避免半蹲时肩距变化误切 */
  allowFlip?: boolean;
  confidence?: number;
};

/**
 * 多帧锁定正面/侧面；已锁定后弱信号忽略。
 */
export class CameraHintLatch {
  private locked: CameraHint | 0 = 0;
  private pending: CameraHint | 0 = 0;
  private pendingCount = 0;

  constructor(private readonly confirmFrames = 8) {}

  get value(): CameraHint | 0 {
    return this.locked;
  }

  reset(): void {
    this.locked = 0;
    this.pending = 0;
    this.pendingCount = 0;
  }

  update(
    observed: CameraHint | 0,
    opts: CameraHintLatchUpdate = {},
  ): CameraHint | 0 {
    const confidence = opts.confidence ?? 1;
    if (observed === 0 || confidence < 0.4) return this.locked;

    if (this.locked === 0) {
      if (this.pending === observed) this.pendingCount += 1;
      else {
        this.pending = observed;
        this.pendingCount = 1;
      }
      if (this.pendingCount >= Math.min(4, this.confirmFrames)) {
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

    if (opts.allowFlip === false) {
      this.pending = 0;
      this.pendingCount = 0;
      return this.locked;
    }

    if (confidence < 0.55) return this.locked;

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
