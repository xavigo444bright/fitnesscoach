/**
 * @fitness-coach/core — 哑铃侧平举（FR-088 / VT-P6-019）
 * 真源：docs/exercises/lateral-raise-rules.md v0.1.4
 */

import { DEFAULT_LATERAL_RAISE_PHASE_CONFIG } from "../phase.js";
import { LATERAL_RAISE_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const LATERAL_RAISE: ExerciseDefinition = {
  id: "lateral-raise",
  name: "哑铃侧平举",
  cameraHint: "front",
  rules: LATERAL_RAISE_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_LATERAL_RAISE_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_LATERAL_RAISE_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_LATERAL_RAISE_PHASE_CONFIG.confirmFrames,
  },
};

export const LATERAL_RAISE_DEPTH_RULE_ID = "raise-height";
