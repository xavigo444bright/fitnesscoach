/**
 * 按「测量角」反找 builder 输入，供边界矩阵卡在真实阈值上。
 */

import { buildSquatPose } from "../fixtures/index.js";
import { buildPushupPose } from "../fixtures/pushup.js";
import { pushupElbowAngle, squatKneeAngle } from "../phase.js";
import { pushupBodyLineDeg, torsoLeanFromVertical } from "../validate.js";
import type { Pose } from "../types.js";

/**
 * 构造右侧膝角测量值接近 targetMeasuredDeg 的深蹲姿态。
 */
export function buildSquatNearKneeMeasured(
  targetMeasuredDeg: number,
  opts: { torsoLeanDeg?: number; leftKneeDx?: number } = {},
): Pose {
  const torsoLeanDeg = opts.torsoLeanDeg ?? 25;
  const leftKneeDx = opts.leftKneeDx ?? 0;
  let lo = targetMeasuredDeg - 20;
  let hi = targetMeasuredDeg + 20;
  let best = buildSquatPose({
    kneeDeg: targetMeasuredDeg,
    torsoLeanDeg,
    leftKneeDx,
  });
  let bestErr = Infinity;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    const pose = buildSquatPose({
      kneeDeg: mid,
      torsoLeanDeg,
      leftKneeDx,
    });
    const m = squatKneeAngle(pose);
    if (m == null) {
      hi = mid;
      continue;
    }
    const err = Math.abs(m - targetMeasuredDeg);
    if (err < bestErr) {
      bestErr = err;
      best = pose;
    }
    if (err < 0.05) return pose;
    // 输入膝角↑ → 测量膝角↑（同向）
    if (m < targetMeasuredDeg) lo = mid;
    else hi = mid;
  }
  return best;
}

/**
 * 构造躯干前倾测量值接近 targetLeanDeg 的站立姿态。
 */
export function buildSquatNearLeanMeasured(
  targetLeanDeg: number,
  opts: { kneeDeg?: number } = {},
): Pose {
  const kneeDeg = opts.kneeDeg ?? 175;
  let lo = targetLeanDeg - 20;
  let hi = targetLeanDeg + 20;
  let best = buildSquatPose({ kneeDeg, torsoLeanDeg: targetLeanDeg });
  let bestErr = Infinity;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    const pose = buildSquatPose({ kneeDeg, torsoLeanDeg: mid });
    const m = torsoLeanFromVertical(pose);
    if (m == null) {
      hi = mid;
      continue;
    }
    const err = Math.abs(m - targetLeanDeg);
    if (err < bestErr) {
      bestErr = err;
      best = pose;
    }
    if (err < 0.05) return pose;
    if (m < targetLeanDeg) lo = mid;
    else hi = mid;
  }
  return best;
}

/** 俯卧撑：实测肘角接近目标。 */
export function buildPushupNearElbowMeasured(
  targetMeasuredDeg: number,
  opts: { hipDrop?: number } = {},
): Pose {
  let lo = targetMeasuredDeg - 40;
  let hi = targetMeasuredDeg + 40;
  let best = buildPushupPose({
    elbowDeg: targetMeasuredDeg,
    hipDrop: opts.hipDrop ?? 0,
  });
  let bestErr = Infinity;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    const pose = buildPushupPose({
      elbowDeg: mid,
      hipDrop: opts.hipDrop ?? 0,
    });
    const m = pushupElbowAngle(pose);
    if (m == null) {
      hi = mid;
      continue;
    }
    const err = Math.abs(m - targetMeasuredDeg);
    if (err < bestErr) {
      bestErr = err;
      best = pose;
    }
    if (err < 0.15) return pose;
    if (m < targetMeasuredDeg) lo = mid;
    else hi = mid;
  }
  return best;
}

/** 俯卧撑：实测肩-髋-踝角接近目标（通过调节 hipDrop）。 */
export function buildPushupNearBodyLineMeasured(
  targetBodyLineDeg: number,
  opts: { elbowDeg?: number } = {},
): Pose {
  const elbowDeg = opts.elbowDeg ?? 170;
  let lo = 0;
  let hi = 0.55;
  let best = buildPushupPose({ elbowDeg, hipDrop: 0 });
  let bestErr = Infinity;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    const pose = buildPushupPose({ elbowDeg, hipDrop: mid });
    const m = pushupBodyLineDeg(pose);
    if (m == null) {
      hi = mid;
      continue;
    }
    const err = Math.abs(m - targetBodyLineDeg);
    if (err < bestErr) {
      bestErr = err;
      best = pose;
    }
    if (err < 0.2) return pose;
    // hipDrop↑ → body line 角↓
    if (m > targetBodyLineDeg) lo = mid;
    else hi = mid;
  }
  return best;
}
