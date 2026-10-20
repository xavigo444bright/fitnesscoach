/**
 * 后接入的 12 个动作没有旧鬼影。
 * 这里只放四帧火柴人，正侧肩宽都有，给重合度一个方向。
 * 不打包示范轨迹。
 */

import { LandmarkIndex, type Landmark, type Pose } from "../types.js";

const LATER = [
  "lat-pulldown",
  "seated-row",
  "band-row",
  "superman",
  "leg-press",
  "calf-raise",
  "goblet-squat",
  "dead-bug",
  "bird-dog",
  "crunch",
  "side-plank",
  "hanging-knee-raise",
] as const;

export type LaterGhostId = (typeof LATER)[number];

function isLater(id: string): id is LaterGhostId {
  return (LATER as readonly string[]).includes(id);
}

function put(pose: Pose, index: number, x: number, y: number): void {
  const lm: Landmark = {
    x: Math.min(0.92, Math.max(0.08, x)),
    y: Math.min(0.92, Math.max(0.08, y)),
    visibility: 1,
  };
  pose[index] = lm;
}

/** 左右对称的站姿或坐姿。spread 是整段肩宽：正面约 0.09，侧面约 0.03。 */
function stick(opts: {
  spread: number;
  shoulderY: number;
  hipY: number;
  elbowX: number;
  elbowY: number;
  wristX: number;
  wristY: number;
  kneeY: number;
  ankleY: number;
}): Pose {
  const pose: Pose = [];
  const s = opts.spread / 2;
  put(pose, LandmarkIndex.LeftShoulder, 0.5 - s, opts.shoulderY);
  put(pose, LandmarkIndex.RightShoulder, 0.5 + s, opts.shoulderY);
  put(pose, LandmarkIndex.LeftElbow, 0.5 - s - opts.elbowX, opts.elbowY);
  put(pose, LandmarkIndex.RightElbow, 0.5 + s + opts.elbowX, opts.elbowY);
  put(pose, LandmarkIndex.LeftWrist, 0.5 - s - opts.wristX, opts.wristY);
  put(pose, LandmarkIndex.RightWrist, 0.5 + s + opts.wristX, opts.wristY);
  put(pose, LandmarkIndex.LeftHip, 0.5 - s * 0.6, opts.hipY);
  put(pose, LandmarkIndex.RightHip, 0.5 + s * 0.6, opts.hipY);
  put(pose, LandmarkIndex.LeftKnee, 0.5 - s * 0.55, opts.kneeY);
  put(pose, LandmarkIndex.RightKnee, 0.5 + s * 0.55, opts.kneeY);
  put(pose, LandmarkIndex.LeftAnkle, 0.5 - s * 0.5, opts.ankleY);
  put(pose, LandmarkIndex.RightAnkle, 0.5 + s * 0.5, opts.ankleY);
  return pose;
}

function lerp(a: Pose, b: Pose, t: number): Pose {
  const out: Pose = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const p = a[i];
    const q = b[i];
    if (!p || !q) continue;
    out[i] = {
      x: p.x + (q.x - p.x) * t,
      y: p.y + (q.y - p.y) * t,
      visibility: 1,
    };
  }
  return out;
}

function four(stand: Pose, bottom: Pose): Pose[] {
  return [stand, lerp(stand, bottom, 0.5), bottom, lerp(stand, bottom, 0.5)];
}

function views(
  front: { stand: Pose; bottom: Pose },
  side: { stand: Pose; bottom: Pose },
): Pose[] {
  return [...four(front.stand, front.bottom), ...four(side.stand, side.bottom)];
}

function armsUp(spread: number): Pose {
  return stick({
    spread,
    shoulderY: 0.4,
    hipY: 0.62,
    elbowX: 0.02,
    elbowY: 0.26,
    wristX: 0.03,
    wristY: 0.14,
    kneeY: 0.76,
    ankleY: 0.9,
  });
}

function armsDown(spread: number): Pose {
  return stick({
    spread,
    shoulderY: 0.38,
    hipY: 0.58,
    elbowX: 0.14,
    elbowY: 0.5,
    wristX: 0.02,
    wristY: 0.55,
    kneeY: 0.74,
    ankleY: 0.9,
  });
}

function armsForward(spread: number): Pose {
  return stick({
    spread,
    shoulderY: 0.4,
    hipY: 0.62,
    elbowX: spread < 0.05 ? 0.14 : 0.08,
    elbowY: 0.42,
    wristX: spread < 0.05 ? 0.26 : 0.14,
    wristY: 0.4,
    kneeY: 0.78,
    ankleY: 0.9,
  });
}

function armsBack(spread: number): Pose {
  return stick({
    spread,
    shoulderY: 0.4,
    hipY: 0.62,
    elbowX: 0.02,
    elbowY: 0.5,
    wristX: 0.01,
    wristY: 0.46,
    kneeY: 0.78,
    ankleY: 0.9,
  });
}

function prone(spread: number, lifted: boolean): Pose {
  return stick({
    spread,
    shoulderY: 0.42,
    hipY: 0.55,
    elbowX: lifted ? 0.1 : 0.04,
    elbowY: lifted ? 0.32 : 0.48,
    wristX: lifted ? 0.16 : 0.05,
    wristY: lifted ? 0.24 : 0.5,
    kneeY: 0.62,
    ankleY: lifted ? 0.5 : 0.72,
  });
}

function squatLike(spread: number, deep: boolean): Pose {
  return stick({
    spread,
    shoulderY: deep ? 0.48 : 0.32,
    hipY: deep ? 0.62 : 0.52,
    elbowX: 0.04,
    elbowY: deep ? 0.58 : 0.46,
    wristX: 0.02,
    wristY: deep ? 0.64 : 0.58,
    kneeY: deep ? 0.5 : 0.7,
    ankleY: 0.88,
  });
}

function kneesUp(spread: number, raised: boolean): Pose {
  return stick({
    spread,
    shoulderY: 0.28,
    hipY: 0.48,
    elbowX: 0.02,
    elbowY: 0.16,
    wristX: 0.02,
    wristY: 0.1,
    kneeY: raised ? 0.4 : 0.66,
    ankleY: raised ? 0.32 : 0.82,
  });
}

function build(id: LaterGhostId): Pose[] {
  const front = 0.09;
  const side = 0.03;
  if (id === "lat-pulldown" || id === "hanging-knee-raise") {
    if (id === "hanging-knee-raise") {
      return views(
        { stand: kneesUp(front, false), bottom: kneesUp(front, true) },
        { stand: kneesUp(side, false), bottom: kneesUp(side, true) },
      );
    }
    return views(
      { stand: armsUp(front), bottom: armsDown(front) },
      { stand: armsUp(side), bottom: armsDown(side) },
    );
  }
  if (id === "seated-row" || id === "band-row") {
    return views(
      { stand: armsForward(front), bottom: armsBack(front) },
      { stand: armsForward(side), bottom: armsBack(side) },
    );
  }
  if (id === "superman" || id === "dead-bug" || id === "bird-dog" || id === "crunch") {
    return views(
      { stand: prone(front, false), bottom: prone(front, true) },
      { stand: prone(side, false), bottom: prone(side, true) },
    );
  }
  if (id === "side-plank") {
    return views(
      { stand: prone(front, false), bottom: prone(front, false) },
      { stand: prone(side, false), bottom: prone(side, false) },
    );
  }
  if (id === "leg-press" || id === "goblet-squat") {
    return views(
      { stand: squatLike(front, false), bottom: squatLike(front, true) },
      { stand: squatLike(side, false), bottom: squatLike(side, true) },
    );
  }
  return views(
    { stand: squatLike(front, false), bottom: squatLike(front, false) },
    { stand: squatLike(side, false), bottom: squatLike(side, false) },
  );
}

const CACHE = new Map<LaterGhostId, Pose[]>();

/** 没有旧鬼影的动作返回 8 帧（正面 4 + 侧面 4）。其余返回 null。 */
export function laterGhostPoses(exerciseId: string): Pose[] | null {
  if (!isLater(exerciseId)) return null;
  const hit = CACHE.get(exerciseId);
  if (hit) return hit;
  const poses = build(exerciseId);
  CACHE.set(exerciseId, poses);
  return poses;
}
