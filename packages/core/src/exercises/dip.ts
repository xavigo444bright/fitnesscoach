/**
 * @fitness-coach/core — 双杠臂屈伸（FR-088 / VT-P6-015）
 * 真源：docs/exercises/dip-rules.md
 */

import { DEFAULT_DIP_PHASE_CONFIG } from "../phase.js";
import { DIP_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const DIP: ExerciseDefinition = {
  id: "dip",
  name: "双杠臂屈伸",
  cameraHint: "side",
  rules: DIP_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_DIP_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_DIP_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_DIP_PHASE_CONFIG.confirmFrames,
  },
};

export const DIP_DEPTH_RULE_ID = "dip-depth";
