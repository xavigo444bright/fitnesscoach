/**
 * 多动作 Ghost 关键帧入口（FR-064）
 */

import {
  DEFAULT_PUSHUP_PHASE_CONFIG,
  DEFAULT_SQUAT_PHASE_CONFIG,
  type PhaseConfig,
} from "../phase.js";
import type { Phase, Pose } from "../types.js";
import { PUSHUP_GHOST_KEYFRAMES } from "./pushup-keyframes.js";
import { SQUAT_GHOST_KEYFRAMES } from "./squat-keyframes.js";

export type GhostExerciseId = "squat" | "pushup";

export type GhostKeyframeSet = {
  stand: Pose;
  descend_mid: Pose;
  bottom: Pose;
  ascend_mid: Pose;
};

export function ghostKeyframesFor(
  exerciseId: GhostExerciseId,
): GhostKeyframeSet {
  if (exerciseId === "pushup") {
    return {
      stand: PUSHUP_GHOST_KEYFRAMES.stand.pose,
      descend_mid: PUSHUP_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: PUSHUP_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: PUSHUP_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  return {
    stand: SQUAT_GHOST_KEYFRAMES.stand.pose,
    descend_mid: SQUAT_GHOST_KEYFRAMES.descend_mid.pose,
    bottom: SQUAT_GHOST_KEYFRAMES.bottom.pose,
    ascend_mid: SQUAT_GHOST_KEYFRAMES.ascend_mid.pose,
  };
}

export function ghostPhaseConfigFor(exerciseId: GhostExerciseId): PhaseConfig {
  return exerciseId === "pushup"
    ? DEFAULT_PUSHUP_PHASE_CONFIG
    : DEFAULT_SQUAT_PHASE_CONFIG;
}

/** 预览循环用相位序列（含过渡）。 */
export function ghostPreviewPhases(): Phase[] {
  return ["stand", "descend", "bottom", "ascend"];
}
