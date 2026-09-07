/**
 * @fitness-coach/core — 面拉（FR-088 / VT-P6-022）
 * 真源：docs/exercises/face-pull-rules.md
 */

import { DEFAULT_FACE_PULL_PHASE_CONFIG } from "../phase.js";
import { FACE_PULL_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const FACE_PULL: ExerciseDefinition = {
  id: "face-pull",
  name: "面拉",
  cameraHint: "side",
  rules: FACE_PULL_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_FACE_PULL_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_FACE_PULL_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_FACE_PULL_PHASE_CONFIG.confirmFrames,
  },
};

export const FACE_PULL_DEPTH_RULE_ID = "pull-height";
