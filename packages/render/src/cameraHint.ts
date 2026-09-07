/**
 * 正面 / 侧面机位自动识别（训练参考轨迹切换，FR-068）
 *
 * 正面：左右肩/髋水平间距大；侧面：左右点几乎叠在同一竖线。
 */

import {
  LandmarkIndex,
  landmarkReliable,
  type Pose,
} from "@fitness-coach/core";

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

/** 髋/踝出画或 vis 偏低时不当作机位证据（近景躺姿瞎猜髋会把侧面判成正面）。 */
const HINT_HIP_MIN_VIS = 0.5;
/** 无可信髋时用肩水平跨度绝对值分正侧（近景躯干高会失真）。 */
const HINT_SHOULDER_SPAN_FRONT = 0.22;
const HINT_SHOULDER_SPAN_SIDE = 0.1;

function classifySpanRatio(spanRatio: number): CameraHintInference {
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

/**
 * 由肩/髋（及踝）水平跨度相对躯干高度推断机位。
 * 髋不可靠时不拿瞎猜髋宽当正面；肩已叠成侧视时忽略宽髋。
 */
export function inferCameraHintDetailed(pose: Pose): CameraHintInference {
  const ls = pose[LandmarkIndex.LeftShoulder];
  const rs = pose[LandmarkIndex.RightShoulder];
  const lh = pose[LandmarkIndex.LeftHip];
  const rh = pose[LandmarkIndex.RightHip];
  const lsOk = landmarkReliable(ls);
  const rsOk = landmarkReliable(rs);
  const lhOk = landmarkReliable(lh, { minVis: HINT_HIP_MIN_VIS });
  const rhOk = landmarkReliable(rh, { minVis: HINT_HIP_MIN_VIS });
  const shoulder = mid(lsOk ? ls : undefined, rsOk ? rs : undefined);
  const hip = mid(lhOk ? lh : undefined, rhOk ? rh : undefined);
  const sh = lsOk && rsOk ? pairSpan(ls, rs) : null;
  const hp = lhOk && rhOk ? pairSpan(lh, rh) : null;

  if (!shoulder) {
    return { hint: 0, confidence: 0, spanRatio: 0 };
  }

  if (!hip) {
    if (sh == null) return { hint: 0, confidence: 0, spanRatio: 0 };
    if (sh >= HINT_SHOULDER_SPAN_FRONT) {
      const spanRatio = sh / 0.3;
      return {
        hint: "front",
        confidence: Math.min(1, (sh - HINT_SHOULDER_SPAN_FRONT) / 0.2 + 0.55),
        spanRatio,
      };
    }
    if (sh <= HINT_SHOULDER_SPAN_SIDE) {
      const spanRatio = sh / 0.3;
      return {
        hint: "side",
        confidence: Math.min(1, (HINT_SHOULDER_SPAN_SIDE - sh) / 0.1 + 0.55),
        spanRatio,
      };
    }
    return { hint: 0, confidence: 0.2, spanRatio: sh / 0.3 };
  }

  const torsoH = Math.abs(hip.y - shoulder.y);
  if (torsoH < 0.04) {
    return { hint: 0, confidence: 0, spanRatio: 0 };
  }

  const spans: number[] = [];
  if (sh != null) spans.push(sh);
  if (hp != null) {
    const shR = sh != null ? sh / torsoH : null;
    const hpR = hp / torsoH;
    if (shR != null && shR <= 0.34 && hpR >= 0.5) {
      // 肩已侧视，不要被出画/瞎猜的宽髋拉成正面
    } else {
      spans.push(hp);
    }
  }

  if (spans.length === 0) {
    return { hint: 0, confidence: 0, spanRatio: 0 };
  }

  const avgSpan = spans.reduce((s, v) => s + v, 0) / spans.length;
  let spanRatio = avgSpan / torsoH;

  const la = pose[LandmarkIndex.LeftAnkle];
  const ra = pose[LandmarkIndex.RightAnkle];
  const ankle = mid(
    landmarkReliable(la, { minVis: HINT_HIP_MIN_VIS }) ? la : undefined,
    landmarkReliable(ra, { minVis: HINT_HIP_MIN_VIS }) ? ra : undefined,
  );
  if (ankle) {
    const depthRatio = Math.abs(ankle.x - hip.x) / torsoH;
    if (depthRatio >= 0.35 && spanRatio < 0.7) {
      spanRatio *= 0.72;
    }
  }

  return classifySpanRatio(spanRatio);
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
