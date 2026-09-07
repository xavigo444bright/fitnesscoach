/**
 * @fitness-coach/core — 哑铃划船（FR-088 / VT-P6-009）
 * 真源：docs/exercises/db-row-rules.md
 */

import { DEFAULT_DB_ROW_PHASE_CONFIG } from "../phase.js";
import { DB_ROW_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const DB_ROW: ExerciseDefinition = {
  id: "db-row",
  name: "哑铃划船",
  cameraHint: "side",
  rules: DB_ROW_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_DB_ROW_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_DB_ROW_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_DB_ROW_PHASE_CONFIG.confirmFrames,
  },
};

export const DB_ROW_DEPTH_RULE_ID = "row-depth";
