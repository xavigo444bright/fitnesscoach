/**
 * @fitness-coach/core — 弓步蹲动作定义（FR-088 / VT-P6-007）
 * 真源：docs/exercises/lunge-rules.md
 */

import { DEFAULT_LUNGE_PHASE_CONFIG } from "../phase.js";
import { LUNGE_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const LUNGE: ExerciseDefinition = {
  id: "lunge",
  name: "弓步蹲",
  cameraHint: "side",
  rules: LUNGE_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_LUNGE_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_LUNGE_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_LUNGE_PHASE_CONFIG.confirmFrames,
  },
};

export const LUNGE_DEPTH_RULE_ID = "lunge-depth";
