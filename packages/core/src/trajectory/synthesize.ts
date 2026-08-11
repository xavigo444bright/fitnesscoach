/**
 * 合成示范姿态序列（无视频时的 bootstrap；也可作为提取管线输入）
 */

import { buildSquatPose } from "../fixtures/index.js";
import { buildPushupPose } from "../fixtures/pushup.js";
import type { Pose } from "../types.js";
import { extractDemoTrajectory, type RawTrajectoryFrame } from "./clean.js";
import type { DemoTrajectory, PoseDump, TrajectoryExerciseId } from "./types.js";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function repeat(pose: Pose, n: number): Pose[] {
  return Array.from({ length: n }, () => pose);
}

/**
 * 生成含多 rep 的合成序列（含轻微噪声帧，供清洗/裁剪验证）。
 */
export function synthesizeMultiRepSequence(
  exerciseId: TrajectoryExerciseId,
  reps = 3,
  framesPerPhase = 6,
): RawTrajectoryFrame[] {
  const poses: Pose[] = [];
  for (let r = 0; r < reps; r += 1) {
    if (exerciseId === "squat") {
      poses.push(
        ...repeat(buildSquatPose({ kneeDeg: 175, torsoLeanDeg: 8 }), framesPerPhase),
        ...repeat(buildSquatPose({ kneeDeg: 130, torsoLeanDeg: 22 }), framesPerPhase),
        ...repeat(buildSquatPose({ kneeDeg: 85, torsoLeanDeg: 28 }), framesPerPhase),
        ...repeat(buildSquatPose({ kneeDeg: 130, torsoLeanDeg: 22 }), framesPerPhase),
        ...repeat(buildSquatPose({ kneeDeg: 175, torsoLeanDeg: 8 }), framesPerPhase),
      );
    } else {
      poses.push(
        ...repeat(buildPushupPose({ elbowDeg: 170 }), framesPerPhase),
        ...repeat(buildPushupPose({ elbowDeg: 140 }), framesPerPhase),
        ...repeat(buildPushupPose({ elbowDeg: 95 }), framesPerPhase),
        ...repeat(buildPushupPose({ elbowDeg: 140 }), framesPerPhase),
        ...repeat(buildPushupPose({ elbowDeg: 170 }), framesPerPhase),
      );
    }
  }
  // 前缀杂帧（未进入完整循环）
  const prefix =
    exerciseId === "squat"
      ? repeat(buildSquatPose({ kneeDeg: 172, torsoLeanDeg: 10 }), 4)
      : repeat(buildPushupPose({ elbowDeg: 165 }), 4);

  return [...prefix, ...poses].map((pose, idx) => ({
    pose,
    tMs: idx * (1000 / 30),
  }));
}

/** 平滑单 rep 驱动角序列 → 姿态（更密采样，适合直接当示范）。 */
export function synthesizeSmoothRepPoses(
  exerciseId: TrajectoryExerciseId,
  samples = 48,
): Pose[] {
  const half = Math.floor(samples / 2);
  const poses: Pose[] = [];
  for (let i = 0; i < samples; i += 1) {
    let drive: number;
    if (i <= half) {
      // descend: stand → bottom
      drive = lerp(
        exerciseId === "squat" ? 175 : 170,
        exerciseId === "squat" ? 85 : 95,
        i / half,
      );
    } else {
      drive = lerp(
        exerciseId === "squat" ? 85 : 95,
        exerciseId === "squat" ? 175 : 170,
        (i - half) / (samples - 1 - half || 1),
      );
    }
    if (exerciseId === "squat") {
      const torso = lerp(8, 28, Math.min(1, Math.abs(175 - drive) / 90));
      poses.push(buildSquatPose({ kneeDeg: drive, torsoLeanDeg: torso }));
    } else {
      poses.push(buildPushupPose({ elbowDeg: drive }));
    }
  }
  return poses;
}

/**
 * 从多 rep 合成序列跑完整提取管线，得到入库用单循环轨迹。
 */
export function synthesizeDemoTrajectory(
  exerciseId: TrajectoryExerciseId,
  opts?: { id?: string; reps?: number },
): DemoTrajectory {
  const id = opts?.id ?? `${exerciseId}-side-v1`;
  const raw = synthesizeMultiRepSequence(exerciseId, opts?.reps ?? 3);
  return extractDemoTrajectory(raw, {
    exerciseId,
    id,
    source: {
      type: "synthetic",
      label: `synthetic-${exerciseId}-multi-rep`,
      fps: 30,
    },
    meta: {
      cameraHint: "side",
      notes: "T7-1 bootstrap：规则几何合成 → 清洗/单 rep 裁剪",
      createdAt: "2026-08-07T00:00:00.000Z",
    },
  });
}

/** 导出为 PoseDump，供 CLI / 外部视频管线对齐中间格式。 */
export function synthesizePoseDump(
  exerciseId: TrajectoryExerciseId,
  reps = 3,
): PoseDump {
  const raw = synthesizeMultiRepSequence(exerciseId, reps);
  return {
    exerciseId,
    fps: 30,
    cameraHint: "side",
    label: `synthetic-${exerciseId}`,
    frames: raw.map((fr) => ({
      tMs: fr.tMs,
      landmarks: fr.pose.map((lm) =>
        lm
          ? {
              x: lm.x,
              y: lm.y,
              ...(lm.z != null ? { z: lm.z } : {}),
              visibility: lm.visibility ?? 1,
            }
          : null,
      ),
    })),
  };
}
