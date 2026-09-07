/**
 * @fitness-coach/core — 罗马尼亚硬拉（FR-088 / VT-P6-012）
 * 真源：docs/exercises/rdl-rules.md
 */

import { DEFAULT_RDL_PHASE_CONFIG } from "../phase.js";
import { RDL_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const RDL: ExerciseDefinition = {
  id: "rdl",
  name: "罗马尼亚硬拉",
  cameraHint: "side",
  rules: RDL_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_RDL_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_RDL_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_RDL_PHASE_CONFIG.confirmFrames,
  },
};

export const RDL_DEPTH_RULE_ID = "rdl-depth";
