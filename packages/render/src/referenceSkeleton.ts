/**
 * 示范轨迹 → 训练参考（FR-068）
 *
 * - `referencePoseFromTrajectory`：对齐用户画幅（历史身上 3D 骨）
 * - `canonicalPoseFromUser`：示范窗「骨骼」跟人实时 Pose，窗内拟合
 * - `canonicalPoseFromTrajectory`：跟相位取样片（保留给单测 / 旧路径）
 */

import {
  getDemoTrajectory,
  poseFromFrame,
  progressByNearestDrive,
  sampleTrajectoryAt,
  standProgressOf,
  type DemoTrajectory,
  type Phase,
  type PhaseConfig,
  type Pose,
  type TrajectoryCameraHint,
  type TrajectoryExerciseId,
} from "@fitness-coach/core";
import {
  alignGhostToUser,
  bodyOnlyPose,
  estimateAlignTransform,
  matchSideFacing,
  type GhostAlignMode,
  type GhostScaleSmoother,
  type SideFacing,
} from "./ghost.js";
import { buildRig3d, type Rig3dOptions } from "./rig3d.js";

export type ReferenceSkeletonOptions = {
  trajectory?: DemoTrajectory;
  phaseConfig?: PhaseConfig;
  /** false 时返回 null（开关关闭） */
  enabled?: boolean;
  /** 深蹲侧面/正面轨迹；默认 side */
  cameraHint?: TrajectoryCameraHint;
  /** 侧面：多帧锁定后的用户朝向（-1 左 / +1 右） */
  userFacing?: SideFacing | 0;
  /** 尺度/旋转平滑（站立更新、行程冻结） */
  scaleSmoother?: GhostScaleSmoother;
  /** 是否允许本帧更新尺度；默认 true */
  updateScale?: boolean;
};

const DEFAULT_FIT_MARGIN = 0.1;

function alignModeFor(
  exerciseId: TrajectoryExerciseId,
  camera: TrajectoryCameraHint,
): GhostAlignMode | "auto" {
  if (exerciseId === "pushup") {
    // 正面缺踝 → 肩宽；侧面有完整身长 → 髋/肩–踝，禁止误走 support
    return camera === "front" ? "support" : "upright";
  }
  return "auto";
}

/**
 * 按用户驱动角在示范轨迹上就近取样（相位消歧），并对齐到用户体型。
 * 侧面机位会按用户朝左/朝右镜像示范骨（FR-068）。
 * enabled=false → null（训练页关参考骨架）。
 */
export function referencePoseFromTrajectory(
  exerciseId: TrajectoryExerciseId,
  user: Pose,
  phase: Phase,
  driveDeg: number | null,
  opts: ReferenceSkeletonOptions = {},
): Pose | null {
  if (opts.enabled === false) return null;
  const camera = opts.cameraHint ?? "side";
  const traj = opts.trajectory ?? getDemoTrajectory(exerciseId, camera);
  void opts.phaseConfig;
  const alignMode = alignModeFor(exerciseId, camera);

  const t = progressByNearestDrive(traj, phase, driveDeg);
  let demo = poseFromFrame(sampleTrajectoryAt(traj, t));
  let demoStand = poseFromFrame(
    sampleTrajectoryAt(traj, standProgressOf(traj)),
  );

  if (camera === "side") {
    demo = matchSideFacing(demo, user, opts.userFacing);
    demoStand = matchSideFacing(demoStand, user, opts.userFacing);
  }

  const estimated = estimateAlignTransform(demoStand, user, { mode: alignMode });
  let scale = estimated?.scale ?? 1;
  let rot = estimated?.rot ?? 0;
  let mode = estimated?.mode ?? (alignMode === "auto" ? "upright" : alignMode);
  if (opts.scaleSmoother) {
    const tf = opts.scaleSmoother.update(
      estimated ?? { scale: 1, rot: 0, mode },
      opts.updateScale !== false,
      estimated != null,
    );
    scale = tf.scale;
    rot = tf.rot;
    mode = tf.mode;
  }
  const aligned = alignGhostToUser(demo, user, { scale, rot, mode });
  return bodyOnlyPose(aligned);
}

function sampleDemoPose(
  exerciseId: TrajectoryExerciseId,
  user: Pose,
  phase: Phase,
  driveDeg: number | null,
  opts: ReferenceSkeletonOptions,
): Pose | null {
  if (opts.enabled === false) return null;
  const camera = opts.cameraHint ?? "side";
  const traj = opts.trajectory ?? getDemoTrajectory(exerciseId, camera);
  void opts.phaseConfig;
  const t = progressByNearestDrive(traj, phase, driveDeg);
  let demo = poseFromFrame(sampleTrajectoryAt(traj, t));
  if (camera === "side") {
    demo = matchSideFacing(demo, user, opts.userFacing);
  }
  return demo;
}

type Aabb2 = { minX: number; minY: number; maxX: number; maxY: number };

function aabbFromPose(pose: Pose, rigOpts?: Rig3dOptions): Aabb2 | null {
  const rig = buildRig3d(pose, rigOpts);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  if (rig) {
    for (const j of rig.joints) add(j.x, j.y);
    for (const v of rig.volumes) {
      add(v.x - Math.abs(v.rx), v.y - Math.abs(v.ry));
      add(v.x + Math.abs(v.rx), v.y + Math.abs(v.ry));
    }
  } else {
    pose.forEach((lm) => {
      if (lm) add(lm.x, lm.y);
    });
  }
  if (!Number.isFinite(minX) || maxX - minX < 1e-6 || maxY - minY < 1e-6) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

function applyFit(pose: Pose, box: Aabb2, margin: number): Pose {
  const spanX = Math.max(1e-6, box.maxX - box.minX);
  const spanY = Math.max(1e-6, box.maxY - box.minY);
  const target = Math.max(0.2, 1 - 2 * margin);
  const scale = Math.min(target / spanX, target / spanY);
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const out: Pose = [];
  pose.forEach((lm, i) => {
    if (!lm) return;
    out[i] = {
      ...lm,
      x: 0.5 + (lm.x - cx) * scale,
      y: 0.5 + (lm.y - cy) * scale,
    };
  });
  return out;
}

/**
 * 把 Pose 等比缩放到归一化画幅内并居中（标准体型填满小窗）。
 * 按 rig 头/胸/骨盆体积迭代，避免小人裁出窗。
 */
export function fitPoseToFrame(
  pose: Pose,
  margin: number = DEFAULT_FIT_MARGIN,
  rigOpts?: Rig3dOptions,
): Pose {
  let current = pose;
  for (let pass = 0; pass < 3; pass += 1) {
    const box = aabbFromPose(current, rigOpts);
    if (!box) return current;
    current = applyFit(current, box, margin);
  }
  return current;
}

/**
 * 示范窗「骨骼」：把用户当前 Pose 框内拟合（FR-084）。
 * 跟人起步/当前姿态，不取样片。
 */
export function canonicalPoseFromUser(
  user: Pose,
  opts: Pick<ReferenceSkeletonOptions, "enabled" | "cameraHint"> & {
    exerciseId?: TrajectoryExerciseId;
  } = {},
): Pose | null {
  if (opts.enabled === false) return null;
  const body = bodyOnlyPose(user);
  let n = 0;
  for (const lm of body) {
    if (lm) n += 1;
  }
  if (n < 4) return null;
  return fitPoseToFrame(body, DEFAULT_FIT_MARGIN, {
    cameraHint: opts.cameraHint ?? "side",
    exerciseId: opts.exerciseId,
  });
}

/**
 * 按用户相位/驱动角取样示范轨迹，**不对齐用户体型**。
 * 侧面仍按用户朝向镜像，然后框内拟合。保留给单测；训练页骨骼模式改走 `canonicalPoseFromUser`。
 */
export function canonicalPoseFromTrajectory(
  exerciseId: TrajectoryExerciseId,
  user: Pose,
  phase: Phase,
  driveDeg: number | null,
  opts: ReferenceSkeletonOptions = {},
): Pose | null {
  const demo = sampleDemoPose(exerciseId, user, phase, driveDeg, opts);
  if (!demo) return null;
  return fitPoseToFrame(bodyOnlyPose(demo), DEFAULT_FIT_MARGIN, {
    cameraHint: opts.cameraHint ?? "side",
    exerciseId,
  });
}
