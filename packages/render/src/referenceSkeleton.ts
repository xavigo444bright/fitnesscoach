/**
 * 示范轨迹 → 训练参考骨架（FR-068 / T7-2）
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
