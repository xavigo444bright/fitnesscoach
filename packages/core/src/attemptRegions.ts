/**
 * 把起始区 / 目标区量成行程引擎能读的数。
 * 文案在 countingRule.ts。类别从 strokeCategory 注册。
 * 日志 C07-04、C07-05、C08-01，见 docs/count-change-log.md。
 */

import {
  angleBetween3d,
  ARM_POINT_STUB,
  hasWorldPoint,
  tiltFromVerticalDeg,
} from "./angles.js";
import { frontRaiseSideDriveDeg, lateralRaiseSideReached } from "./phase.js";
import {
  readSquatDepth,
  SQUAT_CLOSE,
  SQUAT_STILL_STANDING,
  type SquatDepthState,
} from "./squatDepth.js";
import { driveSample } from "./strokeDrive.js";
import {
  readRegisteredStroke,
  registerStrokeCategory,
  type StrokeReadInput,
} from "./strokeCategory.js";
import {
  repStrokeIds,
  strokeMark,
  type ArmPlane,
  type StrokeMark,
} from "./strokeMarks.js";
import { LandmarkIndex, type Landmark, type Pose } from "./types.js";
import type { AttemptObs } from "./attempt.js";

export const ATTEMPT_EXERCISES = repStrokeIds();

export type AttemptExerciseId = (typeof ATTEMPT_EXERCISES)[number];

export function usesAttempt(exerciseId: string): boolean {
  return strokeMark(exerciseId)?.countsRep === true;
}

/** 直臂收到这条以下才算走出一截。起始和完成以标注为准。 */
const ARM_SHORT_EXT = 0.78;
/** 与 phase.ts 一致：短于叠点或小于这个角度的肘不参加。 */
const COLLAPSED_ELBOW_DEG = 15;

const SIDES = ["left", "right"] as const;

function lm(
  pose: Pose,
  side: "left" | "right",
  which: "shoulder" | "elbow" | "wrist" | "hip",
): Landmark | undefined {
  const index = {
    left: {
      shoulder: LandmarkIndex.LeftShoulder,
      elbow: LandmarkIndex.LeftElbow,
      wrist: LandmarkIndex.LeftWrist,
      hip: LandmarkIndex.LeftHip,
    },
    right: {
      shoulder: LandmarkIndex.RightShoulder,
      elbow: LandmarkIndex.RightElbow,
      wrist: LandmarkIndex.RightWrist,
      hip: LandmarkIndex.RightHip,
    },
  }[side][which];
  return pose[index];
}

function dist2(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function dist3(a: Landmark, b: Landmark): number {
  return Math.hypot(a.wx! - b.wx!, a.wy! - b.wy!, a.wz! - b.wz!);
}

type SideFold =
  | { kind: "missing" }
  | { kind: "stacked"; joints: number[] }
  | {
      kind: "ok";
      extension: number;
      elbowBelow: boolean;
      wristAbove: boolean;
      elbowNearHip: boolean;
      wristNearFace: boolean;
    };

function jointIndex(
  side: "left" | "right",
  which: "shoulder" | "elbow" | "wrist",
): number {
  const table = {
    left: {
      shoulder: LandmarkIndex.LeftShoulder,
      elbow: LandmarkIndex.LeftElbow,
      wrist: LandmarkIndex.LeftWrist,
    },
    right: {
      shoulder: LandmarkIndex.RightShoulder,
      elbow: LandmarkIndex.RightElbow,
      wrist: LandmarkIndex.RightWrist,
    },
  } as const;
  return table[side][which];
}

/** 有三维就只用三维，避免朝镜头缩进被画面看成折起。 */
function sideFold(pose: Pose, side: "left" | "right"): SideFold {
  const shoulder = lm(pose, side, "shoulder");
  const elbow = lm(pose, side, "elbow");
  const wrist = lm(pose, side, "wrist");
  const joints = [
    jointIndex(side, "shoulder"),
    jointIndex(side, "elbow"),
    jointIndex(side, "wrist"),
  ];
  if (!shoulder || !elbow || !wrist) return { kind: "missing" };
  const world =
    hasWorldPoint(shoulder) && hasWorldPoint(elbow) && hasWorldPoint(wrist);
  const chain = world
    ? dist3(shoulder, elbow) + dist3(elbow, wrist)
    : dist2(shoulder, elbow) + dist2(elbow, wrist);
  const minChain = world ? 0.08 : 0.04;
  if (chain < minChain || chain < ARM_POINT_STUB) return { kind: "stacked", joints };
  const reach = world ? dist3(shoulder, wrist) : dist2(shoulder, wrist);
  const extension = reach / chain;
  const elbowBelow = world
    ? elbow.wy! < shoulder.wy!
    : elbow.y > shoulder.y;
  const wristAbove = world
    ? wrist.wy! > shoulder.wy!
    : wrist.y < shoulder.y;
  const hip = lm(pose, side, "hip");
  const hipWorld = hip != null && world && hasWorldPoint(hip);
  const elbowHip = hip
    ? hipWorld
      ? dist3(elbow, hip)
      : dist2(elbow, hip)
    : Infinity;
  const shoulderHip = hip
    ? hipWorld
      ? dist3(shoulder, hip)
      : dist2(shoulder, hip)
    : 0;
  const elbowNearHip = hip != null && elbowHip <= shoulderHip;
  const nose = pose[LandmarkIndex.Nose];
  const other = lm(pose, side === "left" ? "right" : "left", "shoulder");
  const span = other ? dist2(shoulder, other) : 0.12;
  const wristNearFace = nose
    ? dist2(wrist, nose) <= Math.max(span, 0.08) * 1.1
    : wristAbove &&
      Math.abs(wrist.x - shoulder.x) >=
        Math.abs((wrist.z ?? 0) - (shoulder.z ?? 0));
  return {
    kind: "ok",
    extension,
    elbowBelow,
    wristAbove,
    elbowNearHip,
    wristNearFace,
  };
}

function planeReached(plane: ArmPlane, side: Extract<SideFold, { kind: "ok" }>, target: number): boolean {
  if (side.extension > target) return false;
  if (plane === "pull-down") return side.elbowBelow;
  if (plane === "pull-back") return side.elbowNearHip;
  if (plane === "pull-up") return side.wristAbove;
  if (plane === "to-face") return side.wristNearFace;
  return true;
}

export function lateralShortMessage(pose: Pose): string {
  let high = false;
  let sideways = false;
  for (const side of SIDES) {
    const shoulder = lm(pose, side, "shoulder");
    const tip = lm(pose, side, "wrist") ?? lm(pose, side, "elbow");
    if (!shoulder || !tip) continue;
    const seg = dist2(shoulder, tip);
    if (seg < 0.02) continue;
    if (tip.y <= shoulder.y + 0.35 * seg) high = true;
    if (Math.abs(tip.x - shoulder.x) >= Math.abs(tip.y - shoulder.y)) {
      sideways = true;
    }
  }
  if (high && !sideways) return "向两侧打开，不要往前抬";
  return "再抬高一些，手抬到肩";
}

type RegionRead = {
  squat: SquatDepthState;
  obs: AttemptObs | null;
  unreadJoints?: number[];
};

function facingCamera(pose: Pose): boolean {
  const left = pose[LandmarkIndex.LeftShoulder];
  const right = pose[LandmarkIndex.RightShoulder];
  if (!left || !right) return false;
  return dist2(left, right) >= 0.08;
}

function opensLaterally(
  pose: Pose,
  side: "left" | "right",
  shoulder: Landmark,
  tip: Landmark,
  facing: boolean,
): boolean {
  if (!facing) return true;
  const other = lm(pose, side === "left" ? "right" : "left", "shoulder");
  const mid = other ? (shoulder.x + other.x) / 2 : shoulder.x;
  const outward = Math.abs(tip.x - mid) + 1e-4 >= Math.abs(shoulder.x - mid);
  const dx = Math.abs(tip.x - shoulder.x);
  const dy = Math.abs(tip.y - shoulder.y);
  return outward && dx + 1e-4 >= dy;
}

function gatherFolds(pose: Pose): { ok: Extract<SideFold, { kind: "ok" }>[]; unread: number[] } {
  const ok: Extract<SideFold, { kind: "ok" }>[] = [];
  const unread: number[] = [];
  for (const side of SIDES) {
    const read = sideFold(pose, side);
    if (read.kind === "ok") ok.push(read);
    else if (read.kind === "stacked") unread.push(...read.joints);
  }
  return { ok, unread };
}

type SidePull =
  | { kind: "missing" }
  | { kind: "stacked"; joints: number[] }
  | {
      kind: "ok";
      deg: number;
      wristAbove: boolean;
      elbowNearHip: boolean;
      wristNearFace: boolean;
    };

/** 拉类一侧：三维肘角，丢掉叠点和小于 15° 的折叠。 */
function sidePull(pose: Pose, side: "left" | "right"): SidePull {
  const shoulder = lm(pose, side, "shoulder");
  const elbow = lm(pose, side, "elbow");
  const wrist = lm(pose, side, "wrist");
  const joints = [
    jointIndex(side, "shoulder"),
    jointIndex(side, "elbow"),
    jointIndex(side, "wrist"),
  ];
  if (!shoulder || !elbow || !wrist) return { kind: "missing" };
  const deg = angleBetween3d(shoulder, elbow, wrist);
  if (deg == null || deg < COLLAPSED_ELBOW_DEG) return { kind: "stacked", joints };
  const world =
    hasWorldPoint(shoulder) && hasWorldPoint(elbow) && hasWorldPoint(wrist);
  const wristAbove = world ? wrist.wy! > shoulder.wy! : wrist.y < shoulder.y;
  const hip = lm(pose, side, "hip");
  const hipWorld = hip != null && world && hasWorldPoint(hip);
  const elbowHip = hip
    ? hipWorld
      ? dist3(elbow, hip)
      : dist2(elbow, hip)
    : Infinity;
  const shoulderHip = hip
    ? hipWorld
      ? dist3(shoulder, hip)
      : dist2(shoulder, hip)
    : 0;
  const elbowNearHip = hip != null && elbowHip <= shoulderHip;
  const nose = pose[LandmarkIndex.Nose];
  const other = lm(pose, side === "left" ? "right" : "left", "shoulder");
  const span = other ? dist2(shoulder, other) : 0.12;
  const wristNearFace = nose
    ? dist2(wrist, nose) <= Math.max(span, 0.08) * 1.1
    : wristAbove &&
      Math.abs(wrist.x - shoulder.x) >=
        Math.abs((wrist.z ?? 0) - (shoulder.z ?? 0));
  return { kind: "ok", deg, wristAbove, elbowNearHip, wristNearFace };
}

function pullDirected(
  plane: ArmPlane,
  side: Extract<SidePull, { kind: "ok" }>,
): boolean {
  if (plane === "pull-down") return !side.wristAbove;
  if (plane === "pull-back") return side.elbowNearHip;
  if (plane === "pull-up") return side.wristAbove;
  if (plane === "to-face") return side.wristNearFace;
  return false;
}

/**
 * 拉类：读得到的两侧里更弯的那一侧是工作肘。
 * 起始是更弯的那一侧仍然伸直。完成是它弯到目标，并满足该动作的方向。
 * 下拉不要求肘低于肩，但完成侧的腕要在肩或肩下。
 */
function pullSample(pose: Pose, mark: StrokeMark, squat: SquatDepthState): RegionRead {
  const start = mark.start;
  const target = mark.target;
  if (start.kind !== "deg-above" || target.kind !== "deg-below") {
    return { squat, obs: null };
  }
  const ok: Extract<SidePull, { kind: "ok" }>[] = [];
  const unread: number[] = [];
  for (const side of SIDES) {
    const read = sidePull(pose, side);
    if (read.kind === "ok") ok.push(read);
    else if (read.kind === "stacked") unread.push(...read.joints);
  }
  if (ok.length === 0) return { squat, obs: null, unreadJoints: unread };
  const span = start.deg - target.deg;
  if (span <= 0) return { squat, obs: null };
  const working = ok.reduce((a, b) => (a.deg <= b.deg ? a : b));
  const plane = mark.armPlane ?? "pull-down";
  return {
    squat,
    obs: {
      progress: (start.deg - working.deg) / span,
      atStart: working.deg >= start.deg,
      atFinish: working.deg <= target.deg && pullDirected(plane, working),
      shortTravel: Math.min(0.85, Math.max(0.45, 12 / span)),
    },
  };
}

function foldSample(pose: Pose, mark: StrokeMark, squat: SquatDepthState): RegionRead {
  const start = mark.start;
  const target = mark.target;
  if (start.kind !== "extension-min" || target.kind !== "extension-max") {
    return { squat, obs: null };
  }
  const { ok, unread } = gatherFolds(pose);
  if (ok.length === 0) return { squat, obs: null, unreadJoints: unread };
  const span = start.value - target.value;
  if (span <= 0) return { squat, obs: null };
  const straighter = Math.max(...ok.map((side) => side.extension));
  const plane = mark.armPlane ?? "fold";
  return {
    squat,
    obs: {
      progress: (start.value - straighter) / span,
      atStart: ok.every((side) => side.extension >= start.value),
      atFinish: ok.every((side) => planeReached(plane, side, target.value)),
      shortTravel: (start.value - ARM_SHORT_EXT) / span,
    },
  };
}

/** 推举：两侧都要伸直并且手到肩的上方。垂在身侧不是目标。 */
function overheadSample(pose: Pose, mark: StrokeMark, squat: SquatDepthState): RegionRead {
  const start = mark.start;
  const target = mark.target;
  if (start.kind !== "extension-max" || target.kind !== "overhead-min") {
    return { squat, obs: null };
  }
  const { ok, unread } = gatherFolds(pose);
  if (ok.length === 0) return { squat, obs: null, unreadJoints: unread };
  const span = target.value - start.value;
  if (span <= 0) return { squat, obs: null };
  const least = Math.min(...ok.map((side) => side.extension));
  const overhead =
    mark.orientationSpanDeg != null &&
    mark.orientationSpanDeg >= 180 &&
    ok.every((side) => side.extension >= target.value && side.wristAbove);
  return {
    squat,
    obs: {
      progress: (least - start.value) / span,
      atStart: ok.every((side) => side.extension <= start.value),
      atFinish: overhead,
      shortTravel: 0.55,
    },
  };
}

function sideLift(pose: Pose, side: "left" | "right"): number | "stacked" | null {
  const shoulder = lm(pose, side, "shoulder");
  const wrist = lm(pose, side, "wrist") ?? lm(pose, side, "elbow");
  if (!shoulder || !wrist) return null;
  const seg = dist2(shoulder, wrist);
  if (seg < 0.02) return "stacked";
  return (shoulder.y + seg - wrist.y) / seg;
}

function raiseSideSample(pose: Pose, mark: StrokeMark, squat: SquatDepthState): RegionRead {
  const start = mark.start.kind === "lift-max" ? mark.start.value : 0.25;
  const vals: number[] = [];
  const unread: number[] = [];
  let anyReached = false;
  let readable = 0;
  let reached = 0;
  for (const side of SIDES) {
    const lift = sideLift(pose, side);
    if (lift === "stacked") {
      unread.push(jointIndex(side, "shoulder"), jointIndex(side, "wrist"));
      continue;
    }
    if (lift == null) continue;
    readable += 1;
    vals.push(lift);
    if (lateralRaiseSideReached(pose, side)) reached += 1;
  }
  anyReached = readable > 0 && reached === readable;
  if (vals.length === 0) return { squat, obs: null, unreadJoints: unread };
  const least = Math.min(...vals);
  return {
    squat,
    obs: {
      progress: least,
      atStart: vals.every((v) => v <= start),
      atFinish: anyReached,
      shortTravel: 0.55,
    },
  };
}

function raiseFrontSample(pose: Pose, mark: StrokeMark, squat: SquatDepthState): RegionRead {
  const start = mark.start;
  const target = mark.target;
  if (start.kind !== "deg-above" || target.kind !== "deg-below") {
    return { squat, obs: null };
  }
  const degs: number[] = [];
  const unread: number[] = [];
  for (const side of SIDES) {
    const deg = frontRaiseSideDriveDeg(pose, side);
    if (deg != null) {
      degs.push(deg);
      continue;
    }
    const shoulder = lm(pose, side, "shoulder");
    const tip = lm(pose, side, "wrist") ?? lm(pose, side, "elbow");
    if (shoulder && tip && tiltFromVerticalDeg(shoulder, tip) == null) {
      unread.push(jointIndex(side, "shoulder"), jointIndex(side, "wrist"));
    }
  }
  if (degs.length === 0) return { squat, obs: null, unreadJoints: unread };
  const span = start.deg - target.deg;
  if (span === 0) return { squat, obs: null };
  const leastOpen = Math.max(...degs);
  return {
    squat,
    obs: {
      progress: (start.deg - leastOpen) / span,
      atStart: degs.every((deg) => deg >= start.deg),
      atFinish: degs.every((deg) => deg <= target.deg),
      shortTravel: Math.min(0.85, Math.max(0.45, 12 / span)),
    },
  };
}

function openSideSample(pose: Pose, mark: StrokeMark, squat: SquatDepthState): RegionRead {
  const start = mark.start;
  const target = mark.target;
  if (start.kind !== "deg-above" || target.kind !== "deg-below") {
    return { squat, obs: null };
  }
  const facing = facingCamera(pose);
  const degs: number[] = [];
  const unread: number[] = [];
  let readable = 0;
  let opened = 0;
  for (const side of SIDES) {
    const shoulder = lm(pose, side, "shoulder");
    if (!shoulder) continue;
    const wrist = lm(pose, side, "wrist");
    const elbow = lm(pose, side, "elbow");
    const wristTilt = wrist ? tiltFromVerticalDeg(shoulder, wrist) : null;
    const elbowTilt = elbow ? tiltFromVerticalDeg(shoulder, elbow) : null;
    const tilt = wristTilt ?? elbowTilt;
    const tip = wristTilt != null ? wrist : elbow;
    if (tilt == null || !tip) {
      if (wrist || elbow) {
        unread.push(jointIndex(side, "shoulder"), jointIndex(side, "wrist"));
      }
      continue;
    }
    const drive = 180 - tilt;
    readable += 1;
    degs.push(drive);
    if (drive <= target.deg && opensLaterally(pose, side, shoulder, tip, facing)) {
      opened += 1;
    }
  }
  if (degs.length === 0) return { squat, obs: null, unreadJoints: unread };
  const span = start.deg - target.deg;
  if (span === 0) return { squat, obs: null };
  const leastOpen = Math.max(...degs);
  const arrived = degs.every((deg) => deg <= target.deg);
  return {
    squat,
    obs: {
      progress: (start.deg - leastOpen) / span,
      atStart: degs.every((deg) => deg >= start.deg),
      atFinish: arrived,
      counts: readable > 0 && opened === readable,
      shortTravel: Math.min(0.85, Math.max(0.45, 12 / span)),
    },
  };
}

function measureMark(
  pose: Pose,
  mark: StrokeMark,
  squat: SquatDepthState,
): RegionRead {
  if (mark.start.kind === "openness-min" && mark.target.kind === "openness-max") {
    const reading = readSquatDepth(squat, pose);
    if (reading.openness == null) return { squat: reading.state, obs: null };
    const openness = reading.openness;
    const span = 1 - SQUAT_CLOSE;
    return {
      squat: reading.state,
      obs: {
        progress: (1 - openness) / span,
        atStart: openness >= mark.start.value && openness >= SQUAT_STILL_STANDING,
        atFinish: openness <= mark.target.value,
        shortTravel: (1 - 0.82) / span,
      },
    };
  }
  if (
    mark.armPlane === "pull-down" ||
    mark.armPlane === "pull-back" ||
    mark.armPlane === "pull-up" ||
    mark.armPlane === "to-face"
  ) {
    return pullSample(pose, mark, squat);
  }
  if (mark.armPlane === "raise-side" || mark.start.kind === "lift-max") {
    return raiseSideSample(pose, mark, squat);
  }
  if (mark.armPlane === "raise-front") return raiseFrontSample(pose, mark, squat);
  if (mark.armPlane === "open-side") return openSideSample(pose, mark, squat);
  if (mark.start.kind === "extension-max" && mark.target.kind === "overhead-min") {
    return overheadSample(pose, mark, squat);
  }
  if (mark.start.kind === "extension-min" && mark.target.kind === "extension-max") {
    return foldSample(pose, mark, squat);
  }
  const obs = driveSample(pose, mark);
  return { squat, obs };
}

function readBody(input: StrokeReadInput) {
  return measureMark(input.pose, input.mark, input.squat);
}

registerStrokeCategory("arm", readBody);
registerStrokeCategory("leg", readBody);
registerStrokeCategory("hip", readBody);
registerStrokeCategory("trunk", readBody);

export function readAttemptRegion(
  exerciseId: string,
  pose: Pose,
  squat: SquatDepthState,
): RegionRead {
  const mark = strokeMark(exerciseId);
  if (!mark) return { squat, obs: null };
  const read = readRegisteredStroke({ pose, mark, squat });
  if (!read) return { squat, obs: null };
  return read;
}

/** 上色用的关节。深蹲两侧腿都算，不单涂写死的右腿。 */
export function attemptTintJoints(exerciseId: string): number[] {
  const part = strokeMark(exerciseId)?.bodyPart;
  if (part === "leg") {
    return [
      LandmarkIndex.LeftHip,
      LandmarkIndex.LeftKnee,
      LandmarkIndex.LeftAnkle,
      LandmarkIndex.RightHip,
      LandmarkIndex.RightKnee,
      LandmarkIndex.RightAnkle,
    ];
  }
  if (part === "hip" || part === "trunk") {
    return [
      LandmarkIndex.LeftShoulder,
      LandmarkIndex.RightShoulder,
      LandmarkIndex.LeftHip,
      LandmarkIndex.RightHip,
      LandmarkIndex.LeftKnee,
      LandmarkIndex.RightKnee,
    ];
  }
  return [
    LandmarkIndex.LeftShoulder,
    LandmarkIndex.LeftElbow,
    LandmarkIndex.LeftWrist,
    LandmarkIndex.RightShoulder,
    LandmarkIndex.RightElbow,
    LandmarkIndex.RightWrist,
  ];
}

export interface ScaleWatch {
  world: number | null;
  image: number | null;
  pendingWorld: number | null;
  pendingImage: number | null;
  pendingFrames: number;
}

export function initialScaleWatch(): ScaleWatch {
  return {
    world: null,
    image: null,
    pendingWorld: null,
    pendingImage: null,
    pendingFrames: 0,
  };
}

function shoulderWidth(pose: Pose): { world: number | null; image: number | null } {
  const left = pose[LandmarkIndex.LeftShoulder];
  const right = pose[LandmarkIndex.RightShoulder];
  if (!left || !right) return { world: null, image: null };
  const image = dist2(left, right);
  const world =
    hasWorldPoint(left) && hasWorldPoint(right) ? dist3(left, right) : null;
  return {
    world: world != null && world >= 0.05 ? world : null,
    image: image >= 0.02 ? image : null,
  };
}

const ADOPT_FRAMES = 8;

/**
 * 肩宽在画面里突然变大：人正在走近镜头。三维肩宽突然跳：骨骼不可信。
 * 新尺度连续稳住之后再采纳，避免永远停在旧距离。
 */
export function stepScaleWatch(
  prev: ScaleWatch,
  pose: Pose,
): { state: ScaleWatch; trusted: boolean } {
  const sample = shoulderWidth(pose);
  if (sample.world == null && sample.image == null) {
    return { state: prev, trusted: false };
  }
  const imageQuiet =
    prev.image != null &&
    sample.image != null &&
    Math.abs(sample.image - prev.image) / prev.image < 0.08;
  const worldJump =
    prev.world != null &&
    sample.world != null &&
    !imageQuiet &&
    (sample.world > prev.world * 1.35 || sample.world < prev.world * 0.72);
  const imageApproach =
    prev.image != null &&
    sample.image != null &&
    sample.image > prev.image * 1.22;
  const jumped = worldJump || imageApproach;
  if (!jumped) {
    return {
      trusted: true,
      state: {
        world: sample.world ?? prev.world,
        image: sample.image ?? prev.image,
        pendingWorld: null,
        pendingImage: null,
        pendingFrames: 0,
      },
    };
  }
  const worldStable =
    prev.pendingWorld == null ||
    sample.world == null ||
    Math.abs(sample.world - prev.pendingWorld) / prev.pendingWorld < 0.08;
  const imageStable =
    prev.pendingImage == null ||
    sample.image == null ||
    Math.abs(sample.image - prev.pendingImage) / prev.pendingImage < 0.08;
  const frames = worldStable && imageStable ? prev.pendingFrames + 1 : 1;
  if (frames >= ADOPT_FRAMES) {
    return {
      trusted: true,
      state: {
        world: sample.world,
        image: sample.image,
        pendingWorld: null,
        pendingImage: null,
        pendingFrames: 0,
      },
    };
  }
  return {
    trusted: false,
    state: {
      ...prev,
      pendingWorld: sample.world,
      pendingImage: sample.image,
      pendingFrames: frames,
    },
  };
}
