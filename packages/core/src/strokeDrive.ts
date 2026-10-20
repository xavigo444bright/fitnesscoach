/**
 * 还没有肢体比例区域的动作，用计次规则标好的起始度数和目标度数。
 * 行程引擎看不到这些度数。
 */

import {
  birdDogDriveDeg,
  cableCrossoverDriveDeg,
  calfRaiseDriveDeg,
  crunchDriveDeg,
  dbFlyDriveDeg,
  deadBugDriveDeg,
  gluteBridgeDriveDeg,
  hangingKneeHipAngle,
  kneeAngleOf,
  lungeWorkingKneeAngle,
  plankDriveDeg,
  rearDeltFlyDriveDeg,
  rdlHipAngle,
  shoulderRaiseDriveDeg,
  supermanDriveDeg,
} from "./phase.js";
import type { AttemptObs } from "./attempt.js";
import type { StrokeMark } from "./strokeMarks.js";
import type { Pose } from "./types.js";

const DRIVE: Record<string, (pose: Pose) => number | null> = {
  lunge: lungeWorkingKneeAngle,
  "leg-press": lungeWorkingKneeAngle,
  "calf-raise": calfRaiseDriveDeg,
  rdl: rdlHipAngle,
  "glute-bridge": gluteBridgeDriveDeg,
  "front-raise": shoulderRaiseDriveDeg,
  "rear-delt-fly": rearDeltFlyDriveDeg,
  "db-fly": dbFlyDriveDeg,
  "cable-crossover": cableCrossoverDriveDeg,
  superman: supermanDriveDeg,
  "dead-bug": deadBugDriveDeg,
  "bird-dog": birdDogDriveDeg,
  crunch: crunchDriveDeg,
  "hanging-knee-raise": hangingKneeHipAngle,
  plank: plankDriveDeg,
  "side-plank": plankDriveDeg,
};

export function driveSample(pose: Pose, mark: StrokeMark): AttemptObs | null {
  if (mark.start.kind !== "deg-above" || mark.target.kind !== "deg-below") {
    return null;
  }
  const read = DRIVE[mark.exerciseId];
  if (!read) return null;
  if (mark.bilateral && mark.exerciseId === "leg-press") {
    return bothKnees(pose, mark.start.deg, mark.target.deg);
  }
  const deg = read(pose);
  if (deg == null || !Number.isFinite(deg)) return null;
  const span = mark.start.deg - mark.target.deg;
  if (span === 0) return null;
  return {
    progress: (mark.start.deg - deg) / span,
    atStart: deg >= mark.start.deg,
    atFinish: deg <= mark.target.deg,
    shortTravel: shortTravelForSpan(span),
  };
}

/** 窗口很窄时，半次不能只是窗口的一小截，否则测量抖动也在说话。 */
function shortTravelForSpan(span: number): number {
  if (span <= 0) return 0.45;
  return Math.min(0.85, Math.max(0.45, 12 / span));
}

/** 腿举两侧都要屈到。只看见一条腿时，那一条可以继续。 */
function bothKnees(
  pose: Pose,
  startAbove: number,
  targetBelow: number,
): AttemptObs | null {
  const vals = [kneeAngleOf(pose, "left"), kneeAngleOf(pose, "right")].filter(
    (v): v is number => v != null && Number.isFinite(v),
  );
  if (vals.length === 0) return null;
  const span = startAbove - targetBelow;
  if (span === 0) return null;
  const straighter = Math.max(...vals);
  return {
    progress: (startAbove - straighter) / span,
    atStart: vals.every((deg) => deg >= startAbove),
    atFinish: vals.every((deg) => deg <= targetBelow),
    shortTravel: shortTravelForSpan(span),
  };
}
