/**
 * 对齐后 Pose → 3D rig 几何（FR-080 / FR-081 / T8-3）
 *
 * 坐标系：与 2D 叠加相同的归一化 Pose 空间（x/y ∈ [0,1]，y 向下）。
 * z：2D 对齐不变换深度，轨迹里的 MediaPipe z 与用户画幅不一致，
 *    **不用原始 z**；按左右解剖侧 + 体型比例重建厚度，侧面才能看出体积。
 * 肌肉半径随 bodyThicknessForRig 缩放；躯干另给椭球体积。
 * 绘制（WebGL）在 apps/mobile；本文件无 three / RN 依赖。
 */

import {
  LandmarkIndex,
  type Pose,
  type TrajectoryExerciseId,
} from "@fitness-coach/core";
import { POSE_BONES } from "./bones.js";
import { inferCameraHint, type CameraHint } from "./cameraHint.js";

export type Rig3dJoint = {
  index: number;
  x: number;
  y: number;
  z: number;
};

export type Rig3dBone = {
  from: number;
  to: number;
  /** 起点半径（髋/肩端可更粗） */
  radiusFrom: number;
  /** 终点半径 */
  radiusTo: number;
};

export type Rig3dVolumeKind =
  | "torso"
  | "head"
  | "chest"
  | "pelvis"
  | "thigh"
  | "upperArm"
  | "hand"
  | "foot";

export type Rig3dVolume = {
  id: string;
  kind: Rig3dVolumeKind;
  x: number;
  y: number;
  z: number;
  /** 半轴：x/z 为厚度，y 为沿主轴 */
  rx: number;
  ry: number;
  rz: number;
  /** 主轴方向（Pose 空间，y 向下） */
  dirX: number;
  dirY: number;
  dirZ: number;
};

export type Rig3dScene = {
  joints: Rig3dJoint[];
  bones: Rig3dBone[];
  volumes: Rig3dVolume[];
  space: "normalized";
  cameraHint: CameraHint;
};

export type Rig3dOptions = {
  /** 缺省：由 Pose 肩髋跨度推断，失败则 side（T8-2 默认） */
  cameraHint?: CameraHint;
  /** 俯卧撑用 plank 身长估厚度、上臂加粗（T8-4） */
  exerciseId?: TrajectoryExerciseId;
};

/** 合成关节点：肩中 / 髋中 / 头，用于躯干与颈。 */
export const RIG_MID_SHOULDER = 100;
export const RIG_MID_HIP = 101;
export const RIG_HEAD = 102;

const LEFT_INDEXES = new Set<number>([
  LandmarkIndex.LeftShoulder,
  LandmarkIndex.LeftElbow,
  LandmarkIndex.LeftWrist,
  LandmarkIndex.LeftHip,
  LandmarkIndex.LeftKnee,
  LandmarkIndex.LeftAnkle,
  LandmarkIndex.LeftHeel,
  LandmarkIndex.LeftFootIndex,
]);

const RIGHT_INDEXES = new Set<number>([
  LandmarkIndex.RightShoulder,
  LandmarkIndex.RightElbow,
  LandmarkIndex.RightWrist,
  LandmarkIndex.RightHip,
  LandmarkIndex.RightKnee,
  LandmarkIndex.RightAnkle,
  LandmarkIndex.RightHeel,
  LandmarkIndex.RightFootIndex,
]);

const MIN_JOINTS = 4;
const THICKNESS_MIN = 0.018;
const THICKNESS_MAX = 0.07;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function pairKey(from: number, to: number): string {
  return from < to ? `${from}-${to}` : `${to}-${from}`;
}

function mid(
  a: { x: number; y: number } | undefined,
  b: { x: number; y: number } | undefined,
): { x: number; y: number } | null {
  if (a && b) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (a) return { x: a.x, y: a.y };
  if (b) return { x: b.x, y: b.y };
  return null;
}

/** 简化肌肉半径（未乘体型）。大腿/躯干粗、前臂细；俯卧撑上臂加粗（FR-081 / T8-4）。 */
export function muscleRadiusForBone(
  from: number,
  to: number,
  exerciseId: TrajectoryExerciseId = "squat",
): {
  from: number;
  to: number;
} {
  if (
    (from === RIG_MID_SHOULDER && to === RIG_MID_HIP) ||
    (from === RIG_MID_HIP && to === RIG_MID_SHOULDER)
  ) {
    return { from: 0.072, to: 0.078 };
  }
  const key = pairKey(from, to);
  if (exerciseId === "pushup") {
    switch (key) {
      case "11-13":
      case "12-14":
        return { from: 0.052, to: 0.044 }; // 上臂：支撑粗
      case "13-15":
      case "14-16":
        return { from: 0.04, to: 0.03 };
      case "23-25":
      case "24-26":
        return { from: 0.048, to: 0.038 };
      case "25-27":
      case "26-28":
        return { from: 0.034, to: 0.024 };
      case "11-23":
      case "12-24":
        return { from: 0.055, to: 0.058 };
      default:
        break;
    }
  }
  switch (key) {
    case "23-25":
    case "24-26":
      return { from: 0.062, to: 0.048 }; // 大腿：髋粗膝细
    case "25-27":
    case "26-28":
      return { from: 0.042, to: 0.028 }; // 小腿
    case "11-23":
    case "12-24":
      return { from: 0.05, to: 0.055 };
    case "11-13":
    case "12-14":
      return { from: 0.038, to: 0.032 };
    case "23-24":
    case "11-12":
      return { from: 0.03, to: 0.03 };
    case "13-15":
    case "14-16":
      return { from: 0.026, to: 0.02 };
    case "27-29":
    case "27-31":
    case "28-30":
    case "28-32":
      return { from: 0.022, to: 0.016 };
    default:
      return { from: 0.022, to: 0.022 };
  }
}

/** 躯干厚度：深蹲髋–踝；俯卧撑肩–踝（plank 身长）。 */
export function bodyThicknessForRig(
  pose: Pose,
  exerciseId: TrajectoryExerciseId = "squat",
): number {
  const hip = mid(pose[LandmarkIndex.LeftHip], pose[LandmarkIndex.RightHip]);
  const ankle = mid(
    pose[LandmarkIndex.LeftAnkle],
    pose[LandmarkIndex.RightAnkle],
  );
  const sh = mid(
    pose[LandmarkIndex.LeftShoulder],
    pose[LandmarkIndex.RightShoulder],
  );
  let h = 0.28;
  if (exerciseId === "pushup") {
    if (sh && ankle) h = Math.hypot(sh.x - ankle.x, sh.y - ankle.y);
    else if (hip && ankle) h = Math.hypot(hip.x - ankle.x, hip.y - ankle.y);
    else if (sh && hip) h = Math.hypot(sh.x - hip.x, sh.y - hip.y) * 1.8;
    return clamp(h * 0.12, THICKNESS_MIN, THICKNESS_MAX);
  }
  if (hip && ankle) {
    h = Math.hypot(hip.x - ankle.x, hip.y - ankle.y);
  } else if (sh && hip) {
    h = Math.hypot(sh.x - hip.x, sh.y - hip.y) * 1.6;
  }
  return clamp(h * 0.14, THICKNESS_MIN, THICKNESS_MAX);
}

/**
 * Pose 归一化 → 正交相机世界坐标（FR-082）。
 * 相机 left=0, right=aspect, top=1, bottom=0 时，世界单位在像素上各向同性，
 * 竖屏下关节球/胶囊截面才是圆而不是椭圆。
 */
export function poseToOrthoWorld(
  x: number,
  y: number,
  z: number,
  aspect: number,
): { x: number; y: number; z: number } {
  return { x: x * aspect, y: 1 - y, z: z * aspect };
}

export function reconstructJointZ(
  pose: Pose,
  index: number,
  _z: number | undefined,
  _cameraHint: CameraHint = "side",
  exerciseId: TrajectoryExerciseId = "squat",
): number {
  const half = bodyThicknessForRig(pose, exerciseId);
  if (LEFT_INDEXES.has(index)) return half;
  if (RIGHT_INDEXES.has(index)) return -half;
  return 0;
}

function extendPast(
  from: { x: number; y: number } | undefined,
  to: { x: number; y: number } | undefined,
  extra: number,
): { x: number; y: number } | null {
  if (!to) return null;
  if (!from) return { x: to.x, y: to.y };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1e-6;
  return { x: to.x + (dx / len) * extra, y: to.y + (dy / len) * extra };
}

function resolveHint(pose: Pose, explicit?: CameraHint): CameraHint {
  if (explicit) return explicit;
  const inferred = inferCameraHint(pose);
  return inferred === "front" || inferred === "side" ? inferred : "side";
}

/**
 * 从对齐后的示范 Pose 构建 3D rig。
 * 关节过少时返回 null（不绘制）。
 */
export function buildRig3d(
  pose: Pose,
  opts: Rig3dOptions = {},
): Rig3dScene | null {
  const cameraHint = resolveHint(pose, opts.cameraHint);
  const exerciseId = opts.exerciseId ?? "squat";
  const joints: Rig3dJoint[] = [];
  const present = new Set<number>();

  for (let i = 0; i < pose.length; i += 1) {
    const lm = pose[i];
    if (!lm) continue;
    joints.push({
      index: i,
      x: lm.x,
      y: lm.y,
      z: reconstructJointZ(pose, i, lm.z, cameraHint, exerciseId),
    });
    present.add(i);
  }

  if (joints.length < MIN_JOINTS) return null;

  const sh = mid(
    pose[LandmarkIndex.LeftShoulder],
    pose[LandmarkIndex.RightShoulder],
  );
  const hip = mid(pose[LandmarkIndex.LeftHip], pose[LandmarkIndex.RightHip]);
  if (sh && hip) {
    joints.push({ index: RIG_MID_SHOULDER, x: sh.x, y: sh.y, z: 0 });
    joints.push({ index: RIG_MID_HIP, x: hip.x, y: hip.y, z: 0 });
    present.add(RIG_MID_SHOULDER);
    present.add(RIG_MID_HIP);
    const dx = hip.x - sh.x;
    const dy = hip.y - sh.y;
    const len = Math.hypot(dx, dy) || 0.2;
    const ux = dx / len;
    const uy = dy / len;
    const headOff = Math.max(0.15, len * 0.42);
    joints.push({
      index: RIG_HEAD,
      x: sh.x - ux * headOff,
      y: sh.y - uy * headOff,
      z: 0,
    });
    present.add(RIG_HEAD);
  }

  const thickness = bodyThicknessForRig(pose, exerciseId);
  const scale = thickness / 0.04;
  const bones: Rig3dBone[] = [];
  for (const [from, to] of POSE_BONES) {
    if (!present.has(from) || !present.has(to)) continue;
    const r = muscleRadiusForBone(from, to, exerciseId);
    bones.push({
      from,
      to,
      radiusFrom: r.from * scale,
      radiusTo: r.to * scale,
    });
  }
  if (present.has(RIG_MID_SHOULDER) && present.has(RIG_MID_HIP)) {
    const r = muscleRadiusForBone(RIG_MID_SHOULDER, RIG_MID_HIP, exerciseId);
    bones.push({
      from: RIG_MID_SHOULDER,
      to: RIG_MID_HIP,
      radiusFrom: r.from * scale,
      radiusTo: r.to * scale,
    });
  }
  if (present.has(RIG_MID_SHOULDER) && present.has(RIG_HEAD)) {
    bones.push({
      from: RIG_MID_SHOULDER,
      to: RIG_HEAD,
      radiusFrom: 0.03 * scale,
      radiusTo: 0.036 * scale,
    });
  }

  const volumes: Rig3dVolume[] = [];
  if (sh && hip) {
    const dx = hip.x - sh.x;
    const dy = hip.y - sh.y;
    const len = Math.hypot(dx, dy) || 0.2;
    const ux = dx / len;
    const uy = dy / len;
    const headJ = joints.find((j) => j.index === RIG_HEAD);
    const headR = clamp(len * 0.3, 0.055, 0.09);
    volumes.push({
      id: "waist",
      kind: "torso",
      x: (sh.x + hip.x) / 2,
      y: (sh.y + hip.y) / 2,
      z: 0,
      rx: thickness * 0.95,
      ry: len * 0.28,
      rz: thickness * 0.8,
      dirX: ux,
      dirY: uy,
      dirZ: 0,
    });
    volumes.push({
      id: "chest",
      kind: "chest",
      x: sh.x + ux * len * 0.22,
      y: sh.y + uy * len * 0.22,
      z: 0,
      rx: thickness * 2.15,
      ry: len * 0.28,
      rz: thickness * 1.55,
      dirX: ux,
      dirY: uy,
      dirZ: 0,
    });
    volumes.push({
      id: "pelvis",
      kind: "pelvis",
      x: hip.x - ux * len * 0.04,
      y: hip.y - uy * len * 0.04,
      z: 0,
      rx: thickness * 2.05,
      ry: len * 0.22,
      rz: thickness * 1.5,
      dirX: ux,
      dirY: uy,
      dirZ: 0,
    });
    if (headJ) {
      volumes.push({
        id: "head",
        kind: "head",
        x: headJ.x,
        y: headJ.y,
        z: 0,
        rx: headR,
        ry: headR * 1.12,
        rz: headR * 0.95,
        dirX: -ux,
        dirY: -uy,
        dirZ: 0,
      });
    }
  }
  const handR = Math.max(0.038, thickness * 1.15);
  const footR = Math.max(0.042, thickness * 1.35);
  const addLimbCap = (
    id: string,
    kind: "hand" | "foot",
    tip: { x: number; y: number } | null,
    index: number,
    size: number,
  ) => {
    if (!tip) return;
    volumes.push({
      id,
      kind,
      x: tip.x,
      y: tip.y,
      z: reconstructJointZ(pose, index, undefined, cameraHint, exerciseId),
      rx: size,
      ry: size * 0.72,
      rz: size * 0.88,
      dirX: 0,
      dirY: 1,
      dirZ: 0,
    });
  };
  addLimbCap(
    "hand-l",
    "hand",
    extendPast(
      pose[LandmarkIndex.LeftElbow],
      pose[LandmarkIndex.LeftWrist],
      0.045,
    ),
    LandmarkIndex.LeftWrist,
    handR,
  );
  addLimbCap(
    "hand-r",
    "hand",
    extendPast(
      pose[LandmarkIndex.RightElbow],
      pose[LandmarkIndex.RightWrist],
      0.045,
    ),
    LandmarkIndex.RightWrist,
    handR,
  );
  addLimbCap(
    "foot-l",
    "foot",
    extendPast(
      pose[LandmarkIndex.LeftKnee],
      pose[LandmarkIndex.LeftAnkle],
      0.04,
    ),
    LandmarkIndex.LeftAnkle,
    footR,
  );
  addLimbCap(
    "foot-r",
    "foot",
    extendPast(
      pose[LandmarkIndex.RightKnee],
      pose[LandmarkIndex.RightAnkle],
      0.04,
    ),
    LandmarkIndex.RightAnkle,
    footR,
  );

  const addSegmentVolume = (
    id: string,
    kind: "thigh" | "upperArm",
    fromLm: { x: number; y: number } | undefined,
    toLm: { x: number; y: number } | undefined,
    fromIdx: number,
    toIdx: number,
  ) => {
    if (!fromLm || !toLm) return;
    const r = muscleRadiusForBone(fromIdx, toIdx, exerciseId);
    const dx = toLm.x - fromLm.x;
    const dy = toLm.y - fromLm.y;
    const len = Math.hypot(dx, dy) || 1e-6;
    const midR = ((r.from + r.to) / 2) * scale;
    volumes.push({
      id,
      kind,
      x: (fromLm.x + toLm.x) / 2,
      y: (fromLm.y + toLm.y) / 2,
      z: 0,
      rx: midR * 1.25,
      ry: len * 0.46,
      rz: midR,
      dirX: dx / len,
      dirY: dy / len,
      dirZ: 0,
    });
  };
  addSegmentVolume(
    "thigh-l",
    "thigh",
    pose[LandmarkIndex.LeftHip],
    pose[LandmarkIndex.LeftKnee],
    LandmarkIndex.LeftHip,
    LandmarkIndex.LeftKnee,
  );
  addSegmentVolume(
    "thigh-r",
    "thigh",
    pose[LandmarkIndex.RightHip],
    pose[LandmarkIndex.RightKnee],
    LandmarkIndex.RightHip,
    LandmarkIndex.RightKnee,
  );
  addSegmentVolume(
    "upperarm-l",
    "upperArm",
    pose[LandmarkIndex.LeftShoulder],
    pose[LandmarkIndex.LeftElbow],
    LandmarkIndex.LeftShoulder,
    LandmarkIndex.LeftElbow,
  );
  addSegmentVolume(
    "upperarm-r",
    "upperArm",
    pose[LandmarkIndex.RightShoulder],
    pose[LandmarkIndex.RightElbow],
    LandmarkIndex.RightShoulder,
    LandmarkIndex.RightElbow,
  );

  return { joints, bones, volumes, space: "normalized", cameraHint };
}
