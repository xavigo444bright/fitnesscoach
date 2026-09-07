/**
 * @fitness-coach/core — 臀桥动作定义（FR-088 / VT-RB-004）
 * 真源：docs/exercises/glute-bridge-rules.md
 */

import { DEFAULT_GLUTE_BRIDGE_PHASE_CONFIG } from "../phase.js";
import { GLUTE_BRIDGE_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const GLUTE_BRIDGE: ExerciseDefinition = {
  id: "glute-bridge",
  name: "臀桥",
  cameraHint: "side",
  rules: GLUTE_BRIDGE_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_GLUTE_BRIDGE_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_GLUTE_BRIDGE_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_GLUTE_BRIDGE_PHASE_CONFIG.confirmFrames,
  },
};

export const GLUTE_BRIDGE_DEPTH_RULE_ID = "hip-extension";
