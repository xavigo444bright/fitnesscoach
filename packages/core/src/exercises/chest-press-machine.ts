/**
 * @fitness-coach/core — 坐姿推胸器（FR-088 / VT-P6-018）
 * 真源：docs/exercises/chest-press-machine-rules.md
 */

import { DEFAULT_CHEST_PRESS_MACHINE_PHASE_CONFIG } from "../phase.js";
import { CHEST_PRESS_MACHINE_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const CHEST_PRESS_MACHINE: ExerciseDefinition = {
  id: "chest-press-machine",
  name: "坐姿推胸器",
  cameraHint: "side",
  rules: CHEST_PRESS_MACHINE_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_CHEST_PRESS_MACHINE_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_CHEST_PRESS_MACHINE_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_CHEST_PRESS_MACHINE_PHASE_CONFIG.confirmFrames,
  },
};

export const CHEST_PRESS_MACHINE_DEPTH_RULE_ID = "press-depth";
