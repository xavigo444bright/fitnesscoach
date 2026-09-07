/**
 * @fitness-coach/core — 哑铃前平举（FR-088 / VT-P6-020）
 * 真源：docs/exercises/front-raise-rules.md v0.1.2
 * 驱动每侧取髋-肩-肘与肩到肘/腕竖直外展的较大值。
 */

import { DEFAULT_FRONT_RAISE_PHASE_CONFIG } from "../phase.js";
import { FRONT_RAISE_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const FRONT_RAISE: ExerciseDefinition = {
  id: "front-raise",
  name: "哑铃前平举",
  cameraHint: "side",
  rules: FRONT_RAISE_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_FRONT_RAISE_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_FRONT_RAISE_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_FRONT_RAISE_PHASE_CONFIG.confirmFrames,
  },
};

export const FRONT_RAISE_DEPTH_RULE_ID = "raise-height";
