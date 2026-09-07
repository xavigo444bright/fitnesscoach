/**
 * @fitness-coach/core — 上斜俯卧撑（FR-088 / VT-P6-016）
 * 真源：docs/exercises/incline-pushup-rules.md
 */

import { DEFAULT_INCLINE_PUSHUP_PHASE_CONFIG } from "../phase.js";
import { INCLINE_PUSHUP_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const INCLINE_PUSHUP: ExerciseDefinition = {
  id: "incline-pushup",
  name: "上斜俯卧撑",
  cameraHint: "side",
  rules: INCLINE_PUSHUP_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_INCLINE_PUSHUP_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_INCLINE_PUSHUP_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_INCLINE_PUSHUP_PHASE_CONFIG.confirmFrames,
  },
};

export const INCLINE_PUSHUP_DEPTH_RULE_ID = "elbow-depth";
