/**
 * Phase G 十二条（FR-088）。真源：docs/exercises/*-rules.md
 */

import {
  DEFAULT_BAND_ROW_PHASE_CONFIG,
  DEFAULT_BIRD_DOG_PHASE_CONFIG,
  DEFAULT_CALF_RAISE_PHASE_CONFIG,
  DEFAULT_CRUNCH_PHASE_CONFIG,
  DEFAULT_DEAD_BUG_PHASE_CONFIG,
  DEFAULT_GOBLET_SQUAT_PHASE_CONFIG,
  DEFAULT_HANGING_KNEE_RAISE_PHASE_CONFIG,
  DEFAULT_LAT_PULLDOWN_PHASE_CONFIG,
  DEFAULT_LEG_PRESS_PHASE_CONFIG,
  DEFAULT_SEATED_ROW_PHASE_CONFIG,
  DEFAULT_SIDE_PLANK_PHASE_CONFIG,
  DEFAULT_SUPERMAN_PHASE_CONFIG,
  type PhaseConfig,
} from "../phase.js";
import {
  BAND_ROW_RULES,
  BIRD_DOG_RULES,
  CALF_RAISE_RULES,
  CRUNCH_RULES,
  DEAD_BUG_RULES,
  GOBLET_SQUAT_RULES,
  HANGING_KNEE_RAISE_RULES,
  LAT_PULLDOWN_RULES,
  LEG_PRESS_RULES,
  SEATED_ROW_RULES,
  SIDE_PLANK_RULES,
  SUPERMAN_RULES,
} from "../validate.js";
import type { ExerciseDefinition, RuleDefinition } from "../types.js";

function define(
  id: string,
  name: string,
  cameraHint: "side" | "front",
  rules: RuleDefinition[],
  cfg: PhaseConfig,
): ExerciseDefinition {
  return {
    id,
    name,
    cameraHint,
    rules,
    phaseThresholds: {
      standAboveDeg: cfg.standAboveDeg,
      bottomBelowDeg: cfg.bottomBelowDeg,
      confirmFrames: cfg.confirmFrames,
    },
  };
}

export const LAT_PULLDOWN = define(
  "lat-pulldown",
  "高位下拉",
  "front",
  LAT_PULLDOWN_RULES,
  DEFAULT_LAT_PULLDOWN_PHASE_CONFIG,
);
export const LAT_PULLDOWN_DEPTH_RULE_ID = "pull-depth";

export const SEATED_ROW = define(
  "seated-row",
  "坐姿划船",
  "side",
  SEATED_ROW_RULES,
  DEFAULT_SEATED_ROW_PHASE_CONFIG,
);
export const SEATED_ROW_DEPTH_RULE_ID = "row-depth";

export const SUPERMAN = define(
  "superman",
  "超人式",
  "side",
  SUPERMAN_RULES,
  DEFAULT_SUPERMAN_PHASE_CONFIG,
);
export const SUPERMAN_DEPTH_RULE_ID = "lift-height";

export const BAND_ROW = define(
  "band-row",
  "弹力带划船",
  "side",
  BAND_ROW_RULES,
  DEFAULT_BAND_ROW_PHASE_CONFIG,
);
export const BAND_ROW_DEPTH_RULE_ID = "row-depth";

export const LEG_PRESS = define(
  "leg-press",
  "腿举",
  "side",
  LEG_PRESS_RULES,
  DEFAULT_LEG_PRESS_PHASE_CONFIG,
);
export const LEG_PRESS_DEPTH_RULE_ID = "knee-depth";

export const CALF_RAISE = define(
  "calf-raise",
  "提踵",
  "side",
  CALF_RAISE_RULES,
  DEFAULT_CALF_RAISE_PHASE_CONFIG,
);
export const CALF_RAISE_DEPTH_RULE_ID = "ankle-rom";

export const GOBLET_SQUAT = define(
  "goblet-squat",
  "高脚杯深蹲",
  "side",
  GOBLET_SQUAT_RULES,
  DEFAULT_GOBLET_SQUAT_PHASE_CONFIG,
);
export const GOBLET_SQUAT_DEPTH_RULE_ID = "squat-depth";

export const DEAD_BUG = define(
  "dead-bug",
  "死虫式",
  "side",
  DEAD_BUG_RULES,
  DEFAULT_DEAD_BUG_PHASE_CONFIG,
);
export const DEAD_BUG_DEPTH_RULE_ID = "lumbar-contact";

export const BIRD_DOG = define(
  "bird-dog",
  "鸟狗式",
  "side",
  BIRD_DOG_RULES,
  DEFAULT_BIRD_DOG_PHASE_CONFIG,
);
export const BIRD_DOG_DEPTH_RULE_ID = "hip-level";

export const CRUNCH = define(
  "crunch",
  "卷腹",
  "side",
  CRUNCH_RULES,
  DEFAULT_CRUNCH_PHASE_CONFIG,
);
export const CRUNCH_DEPTH_RULE_ID = "crunch-height";

export const SIDE_PLANK = define(
  "side-plank",
  "侧平板",
  "front",
  SIDE_PLANK_RULES,
  DEFAULT_SIDE_PLANK_PHASE_CONFIG,
);
export const SIDE_PLANK_DEPTH_RULE_ID = "side-line";

export const HANGING_KNEE_RAISE = define(
  "hanging-knee-raise",
  "悬垂提膝",
  "side",
  HANGING_KNEE_RAISE_RULES,
  DEFAULT_HANGING_KNEE_RAISE_PHASE_CONFIG,
);
export const HANGING_KNEE_RAISE_DEPTH_RULE_ID = "knee-height";
