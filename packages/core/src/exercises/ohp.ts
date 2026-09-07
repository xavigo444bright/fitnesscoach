/**
 * @fitness-coach/core — 站姿推举（FR-088 / VT-P6-010）
 * 真源：docs/exercises/ohp-rules.md
 */

import { DEFAULT_OHP_PHASE_CONFIG } from "../phase.js";
import { OHP_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const OHP: ExerciseDefinition = {
  id: "ohp",
  name: "站姿推举",
  cameraHint: "side",
  rules: OHP_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_OHP_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_OHP_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_OHP_PHASE_CONFIG.confirmFrames,
  },
};

export const OHP_DEPTH_RULE_ID = "torso-upright";
