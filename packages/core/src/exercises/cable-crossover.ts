/**
 * @fitness-coach/core — 绳索夹胸（FR-088 / VT-P6-017）
 * 真源：docs/exercises/cable-crossover-rules.md
 */

import { DEFAULT_CABLE_CROSSOVER_PHASE_CONFIG } from "../phase.js";
import { CABLE_CROSSOVER_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const CABLE_CROSSOVER: ExerciseDefinition = {
  id: "cable-crossover",
  name: "绳索夹胸",
  cameraHint: "front",
  rules: CABLE_CROSSOVER_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_CABLE_CROSSOVER_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_CABLE_CROSSOVER_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_CABLE_CROSSOVER_PHASE_CONFIG.confirmFrames,
  },
};

export const CABLE_CROSSOVER_DEPTH_RULE_ID = "crossover-depth";
