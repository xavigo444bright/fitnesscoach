/**
 * @fitness-coach/core — 俯卧撑动作定义（FR-011 / VT-P6-001）
 * 真源：docs/exercises/pushup-rules.md
 */

import {
  DEFAULT_PUSHUP_PHASE_CONFIG,
} from "../phase.js";
import { PUSHUP_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const PUSHUP: ExerciseDefinition = {
  id: "pushup",
  name: "俯卧撑",
  cameraHint: "side",
  rules: PUSHUP_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_PUSHUP_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_PUSHUP_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_PUSHUP_PHASE_CONFIG.confirmFrames,
  },
};

export const PUSHUP_DEPTH_RULE_ID = "elbow-depth";
