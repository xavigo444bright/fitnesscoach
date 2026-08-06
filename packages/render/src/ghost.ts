/**
 * Ghost 相位插值（M3-T6 / VT-P3B-001,002 / FR-064,065）
 * 支持深蹲 / 俯卧撑等多动作关键帧。
 */

import {
  DEFAULT_SQUAT_PHASE_CONFIG,
  ghostKeyframesFor,
  ghostPhaseConfigFor,
  LandmarkIndex,
  type GhostExerciseId,
  type Landmark,
  type Phase,
  type Pose,
} from "@fitness-coach/core";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpLandmark(
  a: Landmark | undefined,
  b: Landmark | undefined,
  t: number,
): Landmark | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  const out: Landmark = {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
  if (a.z != null || b.z != null) {
    out.z = lerp(a.z ?? 0, b.z ?? 0, t);
  }
  if (a.visibility != null || b.visibility != null) {
    out.visibility = lerp(a.visibility ?? 1, b.visibility ?? 1, t);
  }
  return out;
}

/** 两帧 Pose 按索引 lerp（t∈[0,1]）。 */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const tt = Math.min(1, Math.max(0, t));
  const n = Math.max(a.length, b.length);
  const out: Pose = [];
  for (let i = 0; i < n; i += 1) {
    out[i] = lerpLandmark(a[i], b[i], tt);
  }
  return out;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * 由相位 + 驱动角生成 Ghost Pose（膝角或肘角）。
 */
export function ghostPoseForExercise(
  exerciseId: GhostExerciseId,
  phase: Phase,
  driveDeg: number | null,
  standAboveDeg?: number,
  bottomBelowDeg?: number,
): Pose {
  const cfg = ghostPhaseConfigFor(exerciseId);
  const standAbove = standAboveDeg ?? cfg.standAboveDeg;
  const bottomBelow = bottomBelowDeg ?? cfg.bottomBelowDeg;
  const kf = ghostKeyframesFor(exerciseId);
  const span = standAbove - bottomBelow || 1;

  switch (phase) {
    case "stand":
      return kf.stand;
    case "bottom":
      return kf.bottom;
    case "descend": {
      if (driveDeg == null) return kf.descend_mid;
      const t = clamp01((standAbove - driveDeg) / span);
      if (t <= 0.5) return lerpPose(kf.stand, kf.descend_mid, t * 2);
      return lerpPose(kf.descend_mid, kf.bottom, (t - 0.5) * 2);
    }
    case "ascend": {
      if (driveDeg == null) return kf.ascend_mid;
      const t = clamp01((driveDeg - bottomBelow) / span);
      if (t <= 0.5) return lerpPose(kf.bottom, kf.ascend_mid, t * 2);
      return lerpPose(kf.ascend_mid, kf.stand, (t - 0.5) * 2);
    }
    default:
      return kf.stand;
  }
}

/**
 * @deprecated 等价于 ghostPoseForExercise('squat', …)；保留兼容旧测试。
 */
export function ghostPoseForPhase(
  phase: Phase,
  kneeDeg: number | null,
  standAboveDeg: number = DEFAULT_SQUAT_PHASE_CONFIG.standAboveDeg,
  bottomBelowDeg: number = DEFAULT_SQUAT_PHASE_CONFIG.bottomBelowDeg,
): Pose {
  return ghostPoseForExercise(
    "squat",
    phase,
    kneeDeg,
    standAboveDeg,
    bottomBelowDeg,
  );
}

function midPoint(
  a: Landmark | undefined,
  b: Landmark | undefined,
): { x: number; y: number } | null {
  if (a && b) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (a) return { x: a.x, y: a.y };
  if (b) return { x: b.x, y: b.y };
  return null;
}

function hipAnkleAnchors(pose: Pose): {
  hip: { x: number; y: number };
  ankle: { x: number; y: number };
} | null {
  const hip = midPoint(
    pose[LandmarkIndex.LeftHip],
    pose[LandmarkIndex.RightHip],
  );
  const ankle = midPoint(
    pose[LandmarkIndex.LeftAnkle],
    pose[LandmarkIndex.RightAnkle],
  );
  if (!hip || !ankle) return null;
  return { hip, ankle };
}

/**
 * 将模板 Ghost 对齐到用户：按髋–踝尺度缩放，并以髋为锚点平移。
 */
export function alignGhostToUser(ghost: Pose, user: Pose): Pose {
  const g = hipAnkleAnchors(ghost);
  const u = hipAnkleAnchors(user);
  if (!g || !u) return ghost;

  const gSpan = Math.hypot(g.ankle.x - g.hip.x, g.ankle.y - g.hip.y);
  const uSpan = Math.hypot(u.ankle.x - u.hip.x, u.ankle.y - u.hip.y);
  if (gSpan < 1e-6 || uSpan < 1e-6) return ghost;

  const scale = uSpan / gSpan;
  const out: Pose = [];
  for (let i = 0; i < ghost.length; i += 1) {
    const lm = ghost[i];
    if (!lm) continue;
    out[i] = {
      x: u.hip.x + (lm.x - g.hip.x) * scale,
      y: u.hip.y + (lm.y - g.hip.y) * scale,
      ...(lm.z != null ? { z: lm.z } : {}),
      ...(lm.visibility != null ? { visibility: lm.visibility } : {}),
    };
  }
  return out;
}
