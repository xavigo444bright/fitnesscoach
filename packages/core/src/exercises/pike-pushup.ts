/**
 * @fitness-coach/core — 派克俯卧撑（FR-088 / VT-P6-023）
 * 真源：docs/exercises/pike-pushup-rules.md
 */

import { DEFAULT_PIKE_PUSHUP_PHASE_CONFIG } from "../phase.js";
import { PIKE_PUSHUP_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const PIKE_PUSHUP: ExerciseDefinition = {
  id: "pike-pushup",
  name: "派克俯卧撑",
  cameraHint: "side",
  rules: PIKE_PUSHUP_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_PIKE_PUSHUP_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_PIKE_PUSHUP_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_PIKE_PUSHUP_PHASE_CONFIG.confirmFrames,
  },
};

export const PIKE_PUSHUP_DEPTH_RULE_ID = "elbow-depth";
