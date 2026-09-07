/**
 * 合成示范姿态序列（无视频时的 bootstrap；也可作为提取管线输入）
 */

import { buildGluteBridgePose } from "../fixtures/gluteBridge.js";
import { buildDbFlyPose } from "../fixtures/dbFly.js";
import { buildSquatPose } from "../fixtures/index.js";
import { buildPushupPose } from "../fixtures/pushup.js";
import { buildRaisePose } from "../fixtures/raise.js";
import type { Pose } from "../types.js";
import { extractDemoTrajectory, type RawTrajectoryFrame } from "./clean.js";
import type { DemoTrajectory, PoseDump, TrajectoryExerciseId } from "./types.js";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function repeat(pose: Pose, n: number): Pose[] {
  return Array.from({ length: n }, () => pose);
}

function isKneeDrive(exerciseId: TrajectoryExerciseId): boolean {
  return exerciseId === "squat" || exerciseId === "lunge";
}

function isHipHinge(exerciseId: TrajectoryExerciseId): boolean {
  return exerciseId === "rdl";
}

function isFly(exerciseId: TrajectoryExerciseId): boolean {
  return exerciseId === "db-fly";
}

function isCrossover(exerciseId: TrajectoryExerciseId): boolean {
  return exerciseId === "cable-crossover";
}

function isMachinePress(exerciseId: TrajectoryExerciseId): boolean {
  return exerciseId === "chest-press-machine";
}

function isShoulderRaise(exerciseId: TrajectoryExerciseId): boolean {
  return exerciseId === "lateral-raise" || exerciseId === "front-raise";
}

function isRearDelt(exerciseId: TrajectoryExerciseId): boolean {
  return exerciseId === "rear-delt-fly";
}

function isFacePull(exerciseId: TrajectoryExerciseId): boolean {
  return exerciseId === "face-pull";
}

function isPikePushup(exerciseId: TrajectoryExerciseId): boolean {
  return exerciseId === "pike-pushup";
}

function demoCameraHint(
  exerciseId: TrajectoryExerciseId,
): "front" | "side" {
  return exerciseId === "cable-crossover" || exerciseId === "lateral-raise"
    ? "front"
    : "side";
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
    if (isKneeDrive(exerciseId)) {
      const standKnee = exerciseId === "lunge" ? 165 : 175;
      poses.push(
        ...repeat(buildSquatPose({ kneeDeg: standKnee, torsoLeanDeg: 8 }), framesPerPhase),
        ...repeat(buildSquatPose({ kneeDeg: 125, torsoLeanDeg: 18 }), framesPerPhase),
        ...repeat(buildSquatPose({ kneeDeg: 85, torsoLeanDeg: 22 }), framesPerPhase),
        ...repeat(buildSquatPose({ kneeDeg: 125, torsoLeanDeg: 18 }), framesPerPhase),
        ...repeat(buildSquatPose({ kneeDeg: standKnee, torsoLeanDeg: 8 }), framesPerPhase),
      );
    } else if (exerciseId === "glute-bridge") {
      poses.push(
        ...repeat(buildGluteBridgePose({ hipDeg: 120 }), framesPerPhase),
        ...repeat(buildGluteBridgePose({ hipDeg: 150 }), framesPerPhase),
        ...repeat(buildGluteBridgePose({ hipDeg: 172 }), framesPerPhase),
        ...repeat(buildGluteBridgePose({ hipDeg: 150 }), framesPerPhase),
        ...repeat(buildGluteBridgePose({ hipDeg: 120 }), framesPerPhase),
      );
    } else if (isHipHinge(exerciseId)) {
      poses.push(
        ...repeat(buildSquatPose({ kneeDeg: 160, torsoLeanDeg: 12 }), framesPerPhase),
        ...repeat(buildSquatPose({ kneeDeg: 160, torsoLeanDeg: 40 }), framesPerPhase),
        ...repeat(buildSquatPose({ kneeDeg: 160, torsoLeanDeg: 72 }), framesPerPhase),
        ...repeat(buildSquatPose({ kneeDeg: 160, torsoLeanDeg: 40 }), framesPerPhase),
        ...repeat(buildSquatPose({ kneeDeg: 160, torsoLeanDeg: 12 }), framesPerPhase),
      );
    } else if (isFly(exerciseId)) {
      poses.push(
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 18 }), framesPerPhase),
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 40 }), framesPerPhase),
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 70 }), framesPerPhase),
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 40 }), framesPerPhase),
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 18 }), framesPerPhase),
      );
    } else if (isCrossover(exerciseId)) {
      poses.push(
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 40 }), framesPerPhase),
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 80 }), framesPerPhase),
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 115 }), framesPerPhase),
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 80 }), framesPerPhase),
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 40 }), framesPerPhase),
      );
    } else if (isMachinePress(exerciseId)) {
      poses.push(
        ...repeat(buildPushupPose({ elbowDeg: 150 }), framesPerPhase),
        ...repeat(buildPushupPose({ elbowDeg: 115 }), framesPerPhase),
        ...repeat(buildPushupPose({ elbowDeg: 70 }), framesPerPhase),
        ...repeat(buildPushupPose({ elbowDeg: 115 }), framesPerPhase),
        ...repeat(buildPushupPose({ elbowDeg: 150 }), framesPerPhase),
      );
    } else if (isShoulderRaise(exerciseId)) {
      const sideView = exerciseId === "front-raise";
      poses.push(
        ...repeat(buildRaisePose({ abductionDeg: 8, sideView }), framesPerPhase),
        ...repeat(buildRaisePose({ abductionDeg: 48, sideView }), framesPerPhase),
        ...repeat(buildRaisePose({ abductionDeg: 82, sideView }), framesPerPhase),
        ...repeat(buildRaisePose({ abductionDeg: 48, sideView }), framesPerPhase),
        ...repeat(buildRaisePose({ abductionDeg: 8, sideView }), framesPerPhase),
      );
    } else if (isRearDelt(exerciseId)) {
      poses.push(
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 18 }), framesPerPhase),
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 45 }), framesPerPhase),
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 70 }), framesPerPhase),
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 45 }), framesPerPhase),
        ...repeat(buildDbFlyPose({ wristIncludedDeg: 18 }), framesPerPhase),
      );
    } else if (isFacePull(exerciseId)) {
      poses.push(
        ...repeat(buildPushupPose({ elbowDeg: 150 }), framesPerPhase),
        ...repeat(buildPushupPose({ elbowDeg: 120 }), framesPerPhase),
        ...repeat(buildPushupPose({ elbowDeg: 80 }), framesPerPhase),
        ...repeat(buildPushupPose({ elbowDeg: 120 }), framesPerPhase),
        ...repeat(buildPushupPose({ elbowDeg: 150 }), framesPerPhase),
      );
    } else if (isPikePushup(exerciseId)) {
      poses.push(
        ...repeat(buildPushupPose({ elbowDeg: 170, hipDrop: 0.22 }), framesPerPhase),
        ...repeat(
          buildPushupPose({ elbowDeg: 140, hipDrop: 0.22 }),
          framesPerPhase,
        ),
        ...repeat(buildPushupPose({ elbowDeg: 90, hipDrop: 0.22 }), framesPerPhase),
        ...repeat(
          buildPushupPose({ elbowDeg: 140, hipDrop: 0.22 }),
          framesPerPhase,
        ),
        ...repeat(buildPushupPose({ elbowDeg: 170, hipDrop: 0.22 }), framesPerPhase),
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
  const prefix = isKneeDrive(exerciseId)
    ? repeat(
        buildSquatPose({
          kneeDeg: exerciseId === "lunge" ? 162 : 172,
          torsoLeanDeg: 10,
        }),
        4,
      )
    : exerciseId === "glute-bridge"
      ? repeat(buildGluteBridgePose({ hipDeg: 175 }), 4)
      : isHipHinge(exerciseId)
        ? repeat(buildSquatPose({ kneeDeg: 160, torsoLeanDeg: 14 }), 4)
        : isFly(exerciseId)
          ? repeat(buildDbFlyPose({ wristIncludedDeg: 18 }), 4)
          : isCrossover(exerciseId)
            ? repeat(buildDbFlyPose({ wristIncludedDeg: 40 }), 4)
            : isMachinePress(exerciseId)
              ? repeat(buildPushupPose({ elbowDeg: 145 }), 4)
              : isShoulderRaise(exerciseId)
                ? repeat(
                    buildRaisePose({
                      abductionDeg: 8,
                      sideView: exerciseId === "front-raise",
                    }),
                    4,
                  )
                : isRearDelt(exerciseId)
                  ? repeat(buildDbFlyPose({ wristIncludedDeg: 18 }), 4)
                  : isFacePull(exerciseId)
                    ? repeat(buildPushupPose({ elbowDeg: 145 }), 4)
                    : isPikePushup(exerciseId)
                      ? repeat(
                          buildPushupPose({ elbowDeg: 165, hipDrop: 0.22 }),
                          4,
                        )
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
        exerciseId === "glute-bridge"
          ? 120
          : isKneeDrive(exerciseId)
            ? exerciseId === "lunge"
              ? 165
              : 175
            : 170,
        exerciseId === "glute-bridge" ? 172 : isKneeDrive(exerciseId) ? 85 : 95,
        i / half,
      );
    } else {
      drive = lerp(
        exerciseId === "glute-bridge" ? 172 : isKneeDrive(exerciseId) ? 85 : 95,
        exerciseId === "glute-bridge"
          ? 120
          : isKneeDrive(exerciseId)
            ? exerciseId === "lunge"
              ? 165
              : 175
            : 170,
        (i - half) / (samples - 1 - half || 1),
      );
    }
    if (isFly(exerciseId)) {
      const t =
        i <= half
          ? i / half
          : 1 - (i - half) / (samples - 1 - half || 1);
      poses.push(buildDbFlyPose({ wristIncludedDeg: lerp(18, 70, t) }));
    } else if (isCrossover(exerciseId)) {
      const t =
        i <= half
          ? i / half
          : 1 - (i - half) / (samples - 1 - half || 1);
      poses.push(buildDbFlyPose({ wristIncludedDeg: lerp(40, 115, t) }));
    } else if (isKneeDrive(exerciseId)) {
      const stand = exerciseId === "lunge" ? 165 : 175;
      const torso = lerp(8, 22, Math.min(1, Math.abs(stand - drive) / 80));
      poses.push(buildSquatPose({ kneeDeg: drive, torsoLeanDeg: torso }));
    } else if (exerciseId === "glute-bridge") {
      poses.push(buildGluteBridgePose({ hipDeg: drive }));
    } else if (isHipHinge(exerciseId)) {
      const lean = lerp(12, 72, Math.min(1, Math.abs(170 - drive) / 80));
      poses.push(buildSquatPose({ kneeDeg: 160, torsoLeanDeg: lean }));
    } else if (isMachinePress(exerciseId)) {
      const t =
        i <= half
          ? i / half
          : 1 - (i - half) / (samples - 1 - half || 1);
      poses.push(buildPushupPose({ elbowDeg: lerp(150, 70, t) }));
    } else if (isShoulderRaise(exerciseId)) {
      const t =
        i <= half
          ? i / half
          : 1 - (i - half) / (samples - 1 - half || 1);
      poses.push(
        buildRaisePose({
          abductionDeg: lerp(8, 82, t),
          sideView: exerciseId === "front-raise",
        }),
      );
    } else if (isRearDelt(exerciseId)) {
      const t =
        i <= half
          ? i / half
          : 1 - (i - half) / (samples - 1 - half || 1);
      poses.push(buildDbFlyPose({ wristIncludedDeg: lerp(18, 70, t) }));
    } else if (isFacePull(exerciseId)) {
      const t =
        i <= half
          ? i / half
          : 1 - (i - half) / (samples - 1 - half || 1);
      poses.push(buildPushupPose({ elbowDeg: lerp(150, 80, t) }));
    } else if (isPikePushup(exerciseId)) {
      const t =
        i <= half
          ? i / half
          : 1 - (i - half) / (samples - 1 - half || 1);
      poses.push(
        buildPushupPose({ elbowDeg: lerp(170, 90, t), hipDrop: 0.22 }),
      );
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
  const id =
    opts?.id ??
    (exerciseId === "cable-crossover" || exerciseId === "lateral-raise"
      ? `${exerciseId}-front-v1`
      : `${exerciseId}-side-v1`);
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
      cameraHint: demoCameraHint(exerciseId),
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
    cameraHint: demoCameraHint(exerciseId),
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
