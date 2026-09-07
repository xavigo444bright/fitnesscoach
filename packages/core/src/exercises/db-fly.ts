/**
 * @fitness-coach/core — 哑铃飞鸟（FR-088 / VT-P6-014）
 * 真源：docs/exercises/db-fly-rules.md
 */

import { DEFAULT_DB_FLY_PHASE_CONFIG } from "../phase.js";
import { DB_FLY_RULES } from "../validate.js";
import type { ExerciseDefinition } from "../types.js";

export const DB_FLY: ExerciseDefinition = {
  id: "db-fly",
  name: "哑铃飞鸟",
  cameraHint: "side",
  rules: DB_FLY_RULES,
  phaseThresholds: {
    standAboveDeg: DEFAULT_DB_FLY_PHASE_CONFIG.standAboveDeg,
    bottomBelowDeg: DEFAULT_DB_FLY_PHASE_CONFIG.bottomBelowDeg,
    confirmFrames: DEFAULT_DB_FLY_PHASE_CONFIG.confirmFrames,
  },
};

export const DB_FLY_DEPTH_RULE_ID = "fly-depth";
