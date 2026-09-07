/**
 * @fitness-coach/core — 俯身飞鸟（FR-088 / VT-P6-021）
 * 真源：docs/exercises/rear-delt-fly-rules.md
 */

import { DEFAULT_REAR_DELT_FLY_PHASE_CONFIG } from "../phase.js";
import { REAR_DELT_FLY_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const REAR_DELT_FLY: ExerciseDefinition = {
  id: "rear-delt-fly",
  name: "俯身飞鸟（后束）",
  cameraHint: "side",
  rules: REAR_DELT_FLY_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_REAR_DELT_FLY_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_REAR_DELT_FLY_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_REAR_DELT_FLY_PHASE_CONFIG.confirmFrames,
  },
};

export const REAR_DELT_FLY_DEPTH_RULE_ID = "fly-depth";
