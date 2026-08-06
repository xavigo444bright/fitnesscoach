/**
 * 将 MoveNet runtime 检测结果接到 core（膝角 + validate）。
 */

import {
  SQUAT_RULES,
  squatKneeAngle,
  validate,
  type Phase,
  type ValidationResult,
} from "@fitness-coach/core";
import {
  movenetKeypointsToPose,
  type MoveNetKeypoint,
} from "./movenetMap.js";

export interface MoveNetDetectResult {
  count: number;
  detectedOf17: number;
  keypoints: MoveNetKeypoint[];
  frameWidth: number;
  frameHeight: number;
  inferMs?: number;
  backend?: string;
}

export interface CorePoseAnalysis {
  pose: ReturnType<typeof movenetKeypointsToPose>;
  kneeDeg: number | null;
  validation: ValidationResult;
  phase: Phase;
}

/**
 * detectPose 结果 → Pose + 膝角 + validate（默认 phase=stand，调试页可改）。
 */
export function analyzeMoveNetResult(
  result: MoveNetDetectResult,
  phase: Phase = "stand",
): CorePoseAnalysis {
  const pose = movenetKeypointsToPose(
    result.keypoints,
    result.frameWidth,
    result.frameHeight,
  );
  return {
    pose,
    kneeDeg: squatKneeAngle(pose),
    validation: validate(pose, phase, SQUAT_RULES),
    phase,
  };
}
