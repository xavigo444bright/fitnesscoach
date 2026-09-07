/**
 * Pose → 人形 IK 目标（T9-2 / OQ-006）
 *
 * 纯数据，无 three / RN。Overlay 把目标点投到正交世界后，
 * 再对蒙皮 GLB 的 Mixamo（或别名）骨骼做 aim。
 */

import { LandmarkIndex, type Pose } from "@fitness-coach/core";
import {
  buildRig3d,
  RIG_HEAD,
  RIG_MID_HIP,
  RIG_MID_SHOULDER,
  type Rig3dJoint,
  type Rig3dOptions,
} from "./rig3d.js";

export type Vec3 = { x: number; y: number; z: number };

export type HumanoidJointId =
  | "hips"
  | "chest"
  | "neck"
  | "head"
  | "headTop"
  | "leftShoulder"
  | "leftElbow"
  | "leftWrist"
  | "rightShoulder"
  | "rightElbow"
  | "rightWrist"
  | "leftHip"
  | "leftKnee"
  | "leftAnkle"
  | "leftFoot"
  | "rightHip"
  | "rightKnee"
  | "rightAnkle"
  | "rightFoot";

export type HumanoidTargets = Record<HumanoidJointId, Vec3>;

export type HumanoidBoneRole =
  | "hips"
  | "spine"
  | "spine1"
  | "spine2"
  | "neck"
  | "head"
  | "leftShoulder"
  | "leftUpperArm"
  | "leftLowerArm"
  | "leftHand"
  | "rightShoulder"
  | "rightUpperArm"
  | "rightLowerArm"
  | "rightHand"
  | "leftUpperLeg"
  | "leftLowerLeg"
  | "leftFoot"
  | "rightUpperLeg"
  | "rightLowerLeg"
  | "rightFoot";

/** 归一化后的骨骼名别名（Mixamo / RiggedFigure / 常见 humanoid） */
const ROLE_ALIASES: Record<HumanoidBoneRole, string[]> = {
  hips: ["hips", "pelvis", "torsojoint1"],
  spine: ["spine", "torsojoint2"],
  spine1: ["spine1"],
  spine2: ["spine2", "torsojoint3"],
  neck: ["neck", "neckjoint1"],
  head: ["head", "neckjoint2"],
  leftShoulder: ["leftshoulder", "armjointl1"],
  leftUpperArm: ["leftarm", "leftupperarm", "armjointl2"],
  leftLowerArm: ["leftforearm", "leftlowerarm", "armjointl3"],
  leftHand: ["lefthand"],
  rightShoulder: ["rightshoulder", "armjointr1"],
  rightUpperArm: ["rightarm", "rightupperarm", "armjointr2"],
  rightLowerArm: ["rightforearm", "rightlowerarm", "armjointr3"],
  rightHand: ["righthand"],
  leftUpperLeg: ["leftupleg", "leftupperleg", "legjointl1"],
  leftLowerLeg: ["leftleg", "leftlowerleg", "legjointl2"],
  leftFoot: ["leftfoot", "legjointl3"],
  rightUpperLeg: ["rightupleg", "rightupperleg", "legjointr1"],
  rightLowerLeg: ["rightleg", "rightlowerleg", "legjointr2"],
  rightFoot: ["rightfoot", "legjointr3"],
};

const ALIAS_TO_ROLE = new Map<string, HumanoidBoneRole>();
for (const [role, aliases] of Object.entries(ROLE_ALIASES) as [
  HumanoidBoneRole,
  string[],
][]) {
  for (const a of aliases) ALIAS_TO_ROLE.set(a, role);
}

export function normalizeBoneName(name: string): string {
  return name
    .replace(/^mixamorig[:_]?/i, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

export function humanoidRoleForBoneName(
  name: string,
): HumanoidBoneRole | null {
  return ALIAS_TO_ROLE.get(normalizeBoneName(name)) ?? null;
}

/**
 * 把模型 bind 身高缩到 Pose 正交世界。
 * 禁止用 0.08 这类下限：厘米级模型会被放大到画幅外。
 */
export function figureScaleFromHeights(
  poseHeight: number,
  bindHeight: number,
): number {
  const raw = poseHeight / Math.max(1e-6, bindHeight);
  return Math.min(4, Math.max(1e-4, raw));
}

/** 从根到叶的 aim 顺序：骨骼指向的 Pose 目标（骨尾） */
export const HUMANOID_AIM_CHAIN: {
  role: HumanoidBoneRole;
  target: HumanoidJointId;
}[] = [
  { role: "hips", target: "chest" },
  { role: "neck", target: "head" },
  { role: "leftShoulder", target: "leftShoulder" },
  { role: "leftUpperArm", target: "leftElbow" },
  { role: "leftLowerArm", target: "leftWrist" },
  { role: "rightShoulder", target: "rightShoulder" },
  { role: "rightUpperArm", target: "rightElbow" },
  { role: "rightLowerArm", target: "rightWrist" },
  { role: "leftUpperLeg", target: "leftKnee" },
  { role: "leftLowerLeg", target: "leftAnkle" },
  { role: "leftFoot", target: "leftFoot" },
  { role: "rightUpperLeg", target: "rightKnee" },
  { role: "rightLowerLeg", target: "rightAnkle" },
  { role: "rightFoot", target: "rightFoot" },
];

const SIDE_PAIRS: [number, number][] = [
  [LandmarkIndex.LeftShoulder, LandmarkIndex.RightShoulder],
  [LandmarkIndex.LeftElbow, LandmarkIndex.RightElbow],
  [LandmarkIndex.LeftWrist, LandmarkIndex.RightWrist],
  [LandmarkIndex.LeftHip, LandmarkIndex.RightHip],
  [LandmarkIndex.LeftKnee, LandmarkIndex.RightKnee],
  [LandmarkIndex.LeftAnkle, LandmarkIndex.RightAnkle],
];

function copyXy(pose: Pose, from: number, to: number): void {
  const src = pose[from];
  if (!src || pose[to]) return;
  pose[to] = { x: src.x, y: src.y };
}

function fillMid(pose: Pose, a: number, b: number, mid: number): void {
  if (pose[mid] || !pose[a] || !pose[b]) return;
  pose[mid] = {
    x: (pose[a]!.x + pose[b]!.x) / 2,
    y: (pose[a]!.y + pose[b]!.y) / 2,
  };
}

function fillEnd(pose: Pose, from: number, via: number, to: number): void {
  if (pose[to] || !pose[from] || !pose[via]) return;
  const dx = pose[via]!.x - pose[from]!.x;
  const dy = pose[via]!.y - pose[from]!.y;
  pose[to] = { x: pose[via]!.x + dx, y: pose[via]!.y + dy };
}

/** 侧面轨迹常缺被挡一侧；用对侧 x/y 补上再取 IK。 */
export function completeBodyPose(pose: Pose): Pose {
  const out: Pose = pose.slice();
  for (const [l, r] of SIDE_PAIRS) {
    copyXy(out, l, r);
    copyXy(out, r, l);
  }
  fillMid(
    out,
    LandmarkIndex.LeftHip,
    LandmarkIndex.LeftAnkle,
    LandmarkIndex.LeftKnee,
  );
  fillMid(
    out,
    LandmarkIndex.RightHip,
    LandmarkIndex.RightAnkle,
    LandmarkIndex.RightKnee,
  );
  fillMid(
    out,
    LandmarkIndex.LeftShoulder,
    LandmarkIndex.LeftWrist,
    LandmarkIndex.LeftElbow,
  );
  fillMid(
    out,
    LandmarkIndex.RightShoulder,
    LandmarkIndex.RightWrist,
    LandmarkIndex.RightElbow,
  );
  fillEnd(
    out,
    LandmarkIndex.LeftShoulder,
    LandmarkIndex.LeftElbow,
    LandmarkIndex.LeftWrist,
  );
  fillEnd(
    out,
    LandmarkIndex.RightShoulder,
    LandmarkIndex.RightElbow,
    LandmarkIndex.RightWrist,
  );
  return out;
}

function v(j: Rig3dJoint): Vec3 {
  return { x: j.x, y: j.y, z: j.z };
}

function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function extend(from: Vec3, to: Vec3, extra: number): Vec3 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dy, dz) || 1e-6;
  return {
    x: to.x + (dx / len) * extra,
    y: to.y + (dy / len) * extra,
    z: to.z + (dz / len) * extra,
  };
}

/**
 * 从对齐后 Pose 取人形 IK 目标（与 buildRig3d 同一套 z 重建）。
 */
export function humanoidTargetsFromPose(
  pose: Pose,
  opts: Rig3dOptions = {},
): HumanoidTargets | null {
  const rig = buildRig3d(completeBodyPose(pose), opts);
  if (!rig) return null;
  const by = new Map(rig.joints.map((j) => [j.index, j]));
  const hipsJ = by.get(RIG_MID_HIP);
  const chestJ = by.get(RIG_MID_SHOULDER);
  const headJ = by.get(RIG_HEAD);
  const ls = by.get(LandmarkIndex.LeftShoulder);
  const rs = by.get(LandmarkIndex.RightShoulder);
  const le = by.get(LandmarkIndex.LeftElbow);
  const re = by.get(LandmarkIndex.RightElbow);
  const lw = by.get(LandmarkIndex.LeftWrist);
  const rw = by.get(LandmarkIndex.RightWrist);
  const lh = by.get(LandmarkIndex.LeftHip);
  const rh = by.get(LandmarkIndex.RightHip);
  const lk = by.get(LandmarkIndex.LeftKnee);
  const rk = by.get(LandmarkIndex.RightKnee);
  const la = by.get(LandmarkIndex.LeftAnkle);
  const ra = by.get(LandmarkIndex.RightAnkle);
  if (
    !hipsJ ||
    !chestJ ||
    !headJ ||
    !ls ||
    !rs ||
    !le ||
    !re ||
    !lw ||
    !rw ||
    !lh ||
    !rh ||
    !lk ||
    !rk ||
    !la ||
    !ra
  ) {
    return null;
  }
  const hips = v(hipsJ);
  const chest = v(chestJ);
  const head = v(headJ);
  const leftKnee = v(lk);
  const rightKnee = v(rk);
  const leftAnkle = v(la);
  const rightAnkle = v(ra);
  return {
    hips,
    chest,
    neck: lerp(chest, head, 0.35),
    head,
    headTop: extend(chest, head, 0.04),
    leftShoulder: v(ls),
    leftElbow: v(le),
    leftWrist: v(lw),
    rightShoulder: v(rs),
    rightElbow: v(re),
    rightWrist: v(rw),
    leftHip: v(lh),
    leftKnee,
    leftAnkle,
    leftFoot: extend(leftKnee, leftAnkle, 0.04),
    rightHip: v(rh),
    rightKnee,
    rightAnkle,
    rightFoot: extend(rightKnee, rightAnkle, 0.04),
  };
}
