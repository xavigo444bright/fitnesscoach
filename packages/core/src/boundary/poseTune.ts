/**
 * 按「测量角」反找 builder 输入，供边界矩阵卡在真实阈值上。
 */

import { buildGluteBridgePose } from "../fixtures/gluteBridge.js";
import { buildDbFlyPose } from "../fixtures/dbFly.js";
import { buildRaisePose } from "../fixtures/raise.js";
import { buildPushupPose } from "../fixtures/pushup.js";
import { buildSquatPose } from "../fixtures/index.js";
import {
  dbFlyDriveDeg,
  gluteBridgeHipAngle,
  plankBodyLineDeg,
  pushupElbowAngle,
  rdlHipAngle,
  shoulderRaiseDriveDeg,
  squatKneeAngle,
} from "../phase.js";
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

/** 平板撅臀：实测肩髋踝角接近目标（负 hipDrop）。向地板的 hipDrop 一律视为撑住。 */
export function buildPlankNearPikeLineMeasured(
  targetBodyLineDeg: number,
  opts: { elbowDeg?: number } = {},
): Pose {
  const elbowDeg = opts.elbowDeg ?? 165;
  let lo = -0.55;
  let hi = 0;
  let best = buildPushupPose({ elbowDeg, hipDrop: -0.2 });
  let bestErr = Infinity;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    const pose = buildPushupPose({ elbowDeg, hipDrop: mid });
    const m = plankBodyLineDeg(pose);
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
    // hipDrop 更负 → 撅臀一线更小
    if (m > targetBodyLineDeg) hi = mid;
    else lo = mid;
  }
  return best;
}

/** 臀桥：实测肩-髋-膝接近目标。 */
export function buildGluteBridgeNearHipMeasured(
  targetMeasuredDeg: number,
): Pose {
  let lo = targetMeasuredDeg - 20;
  let hi = targetMeasuredDeg + 20;
  let best = buildGluteBridgePose({ hipDeg: targetMeasuredDeg });
  let bestErr = Infinity;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    const pose = buildGluteBridgePose({ hipDeg: mid });
    const m = gluteBridgeHipAngle(pose);
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
    if (m < targetMeasuredDeg) lo = mid;
    else hi = mid;
  }
  return best;
}

/**
 * RDL：固定软膝，用躯干前倾把肩-髋-膝调到目标。
 * 前倾↑ → 髋角↓。
 */
export function buildRdlNearHipMeasured(targetMeasuredDeg: number): Pose {
  const kneeDeg = 160;
  let lo = 0;
  let hi = 90;
  let best = buildSquatPose({ kneeDeg, torsoLeanDeg: 40 });
  let bestErr = Infinity;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    const pose = buildSquatPose({ kneeDeg, torsoLeanDeg: mid });
    const m = rdlHipAngle(pose);
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
    if (m > targetMeasuredDeg) lo = mid;
    else hi = mid;
  }
  return best;
}

/**
 * 飞鸟：按实测 driveDeg（180 − 开合角）反找腕夹角。
 * 开合角↑ → drive↓。
 */
export function buildDbFlyNearDriveMeasured(targetMeasuredDeg: number): Pose {
  let lo = 4;
  let hi = 170;
  let best = buildDbFlyPose({ wristIncludedDeg: 180 - targetMeasuredDeg });
  let bestErr = Infinity;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    const pose = buildDbFlyPose({ wristIncludedDeg: mid });
    const m = dbFlyDriveDeg(pose);
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
    // included↑ → drive↓
    if (m > targetMeasuredDeg) lo = mid;
    else hi = mid;
  }
  return best;
}

/**
 * 侧平举 / 前平举：按实测 driveDeg（180 − max 外展）反找 abductionDeg。
 * 外展↑ → drive↓。
 */
export function buildRaiseNearDriveMeasured(
  targetMeasuredDeg: number,
  opts: {
    sideView?: boolean;
    driveFn?: (pose: Pose) => number | null;
  } = {},
): Pose {
  const driveFn = opts.driveFn ?? shoulderRaiseDriveDeg;
  let lo = 2;
  let hi = 170;
  let best = buildRaisePose({
    abductionDeg: 180 - targetMeasuredDeg,
    sideView: opts.sideView,
  });
  let bestErr = Infinity;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    const pose = buildRaisePose({
      abductionDeg: mid,
      sideView: opts.sideView,
    });
    const m = driveFn(pose);
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
    if (m > targetMeasuredDeg) lo = mid;
    else hi = mid;
  }
  return best;
}
