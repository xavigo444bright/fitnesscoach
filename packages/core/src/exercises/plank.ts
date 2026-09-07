/**
 * @fitness-coach/core — 平板支撑（FR-088 / VT-P6-008）
 * 真源：docs/exercises/plank-rules.md
 */

import { DEFAULT_PLANK_PHASE_CONFIG } from "../phase.js";
import { PLANK_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const PLANK: ExerciseDefinition = {
  id: "plank",
  name: "平板支撑",
  cameraHint: "side",
  rules: PLANK_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_PLANK_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_PLANK_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_PLANK_PHASE_CONFIG.confirmFrames,
  },
};

export const PLANK_DEPTH_RULE_ID = "body-line";
