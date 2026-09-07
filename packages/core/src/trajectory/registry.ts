/**
 * 已入库示范轨迹（VT-P7-001）
 *
 * 深蹲 / 俯卧撑：侧面与正面真片。
 * 深蹲侧面默认 squat-side-v1（全程垂臂、行程完整）。
 * v2（ingest）举手帧过多，仅保留资产备查，不作为默认。
 */

import { parseDemoTrajectory } from "./parse.js";
import { SQUAT_FRONT_V1 } from "./assets/squatFrontV1.js";
import { SQUAT_SIDE_V1 } from "./assets/squatSideV1.js";
import { PUSHUP_FRONT_V1 } from "./assets/pushupFrontV1.js";
import { PUSHUP_SIDE_V1 } from "./assets/pushupSideV1.js";
import type { DemoTrajectory, TrajectoryExerciseId } from "./types.js";

export type TrajectoryCameraHint = "side" | "front";

const SQUAT_BY_CAMERA: Record<TrajectoryCameraHint, DemoTrajectory> = {
  side: parseDemoTrajectory(SQUAT_SIDE_V1),
  front: parseDemoTrajectory(SQUAT_FRONT_V1),
};

const PUSHUP_BY_CAMERA: Record<TrajectoryCameraHint, DemoTrajectory> = {
  side: parseDemoTrajectory(PUSHUP_SIDE_V1),
  front: parseDemoTrajectory(PUSHUP_FRONT_V1),
};

/** 默认侧面（与 rules 推荐机位一致）。运行时仅 squat/pushup；臀桥 JSON 另存不打包。 */
export const BUNDLED_DEMO_TRAJECTORIES: Record<
  "squat" | "pushup",
  DemoTrajectory
> = {
  squat: SQUAT_BY_CAMERA.side,
  pushup: PUSHUP_BY_CAMERA.side,
};

export function getDemoTrajectory(
  exerciseId: TrajectoryExerciseId,
  cameraHint: TrajectoryCameraHint = "side",
): DemoTrajectory {
  if (exerciseId === "squat") {
    return SQUAT_BY_CAMERA[cameraHint] ?? SQUAT_BY_CAMERA.side;
  }
  if (exerciseId === "pushup") {
    return PUSHUP_BY_CAMERA[cameraHint] ?? PUSHUP_BY_CAMERA.side;
  }
  throw new Error(
    `getDemoTrajectory: ${exerciseId} is not bundled (NFR-010); use on-disk JSON until coachable`,
  );
}

/** 该动作是否已有指定机位轨迹。 */
export function hasDemoTrajectory(
  exerciseId: TrajectoryExerciseId,
  cameraHint: TrajectoryCameraHint,
): boolean {
  if (exerciseId === "squat" || exerciseId === "pushup") {
    return cameraHint === "side" || cameraHint === "front";
  }
  return false;
}

export function listDemoTrajectoryIds(): string[] {
  return [
    SQUAT_BY_CAMERA.side.id,
    SQUAT_BY_CAMERA.front.id,
    PUSHUP_BY_CAMERA.side.id,
    PUSHUP_BY_CAMERA.front.id,
  ];
}
