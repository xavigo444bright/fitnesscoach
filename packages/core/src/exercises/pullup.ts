/**
 * @fitness-coach/core — 引体向上（FR-088 / VT-P6-013）
 * 真源：docs/exercises/pullup-rules.md
 */

import { DEFAULT_PULLUP_PHASE_CONFIG } from "../phase.js";
import { PULLUP_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const PULLUP: ExerciseDefinition = {
  id: "pullup",
  name: "引体向上",
  cameraHint: "side",
  rules: PULLUP_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_PULLUP_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_PULLUP_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_PULLUP_PHASE_CONFIG.confirmFrames,
  },
};

export const PULLUP_DEPTH_RULE_ID = "pull-depth";
