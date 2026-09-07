/**
 * 多动作 Ghost 关键帧入口（FR-064）
 */

import {
  DEFAULT_BENCH_PRESS_PHASE_CONFIG,
  DEFAULT_DB_ROW_PHASE_CONFIG,
  DEFAULT_GLUTE_BRIDGE_PHASE_CONFIG,
  DEFAULT_LUNGE_PHASE_CONFIG,
  DEFAULT_OHP_PHASE_CONFIG,
  DEFAULT_PLANK_PHASE_CONFIG,
  DEFAULT_PULLUP_PHASE_CONFIG,
  DEFAULT_DB_FLY_PHASE_CONFIG,
  DEFAULT_DIP_PHASE_CONFIG,
  DEFAULT_INCLINE_PUSHUP_PHASE_CONFIG,
  DEFAULT_CABLE_CROSSOVER_PHASE_CONFIG,
  DEFAULT_CHEST_PRESS_MACHINE_PHASE_CONFIG,
  DEFAULT_LATERAL_RAISE_PHASE_CONFIG,
  DEFAULT_FRONT_RAISE_PHASE_CONFIG,
  DEFAULT_REAR_DELT_FLY_PHASE_CONFIG,
  DEFAULT_FACE_PULL_PHASE_CONFIG,
  DEFAULT_PIKE_PUSHUP_PHASE_CONFIG,
  DEFAULT_PUSHUP_PHASE_CONFIG,
  DEFAULT_RDL_PHASE_CONFIG,
  DEFAULT_SQUAT_PHASE_CONFIG,
  type PhaseConfig,
} from "../phase.js";
import type { Phase, Pose } from "../types.js";
import {
  BENCH_PRESS_GHOST_KEYFRAMES,
  DB_ROW_GHOST_KEYFRAMES,
  OHP_GHOST_KEYFRAMES,
  PLANK_GHOST_KEYFRAMES,
  PULLUP_GHOST_KEYFRAMES,
  RDL_GHOST_KEYFRAMES,
  DB_FLY_GHOST_KEYFRAMES,
  DIP_GHOST_KEYFRAMES,
  INCLINE_PUSHUP_GHOST_KEYFRAMES,
  CABLE_CROSSOVER_GHOST_KEYFRAMES,
  CHEST_PRESS_MACHINE_GHOST_KEYFRAMES,
  LATERAL_RAISE_GHOST_KEYFRAMES,
  FRONT_RAISE_GHOST_KEYFRAMES,
  REAR_DELT_FLY_GHOST_KEYFRAMES,
  FACE_PULL_GHOST_KEYFRAMES,
  PIKE_PUSHUP_GHOST_KEYFRAMES,
} from "./batch-keyframes.js";
import { GLUTE_BRIDGE_GHOST_KEYFRAMES } from "./glute-bridge-keyframes.js";
import { LUNGE_GHOST_KEYFRAMES } from "./lunge-keyframes.js";
import { PUSHUP_GHOST_KEYFRAMES } from "./pushup-keyframes.js";
import { SQUAT_GHOST_KEYFRAMES } from "./squat-keyframes.js";

export type GhostExerciseId =
  | "squat"
  | "pushup"
  | "glute-bridge"
  | "lunge"
  | "plank"
  | "db-row"
  | "ohp"
  | "bench-press"
  | "rdl"
  | "pullup"
  | "db-fly"
  | "dip"
  | "incline-pushup"
  | "cable-crossover"
  | "chest-press-machine"
  | "lateral-raise"
  | "front-raise"
  | "rear-delt-fly"
  | "face-pull"
  | "pike-pushup";

export type GhostKeyframeSet = {
  stand: Pose;
  descend_mid: Pose;
  bottom: Pose;
  ascend_mid: Pose;
};

export function ghostKeyframesFor(
  exerciseId: GhostExerciseId,
): GhostKeyframeSet {
  if (exerciseId === "pushup") {
    return {
      stand: PUSHUP_GHOST_KEYFRAMES.stand.pose,
      descend_mid: PUSHUP_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: PUSHUP_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: PUSHUP_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "glute-bridge") {
    return {
      stand: GLUTE_BRIDGE_GHOST_KEYFRAMES.stand.pose,
      descend_mid: GLUTE_BRIDGE_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: GLUTE_BRIDGE_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: GLUTE_BRIDGE_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "lunge") {
    return {
      stand: LUNGE_GHOST_KEYFRAMES.stand.pose,
      descend_mid: LUNGE_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: LUNGE_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: LUNGE_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "plank") {
    return {
      stand: PLANK_GHOST_KEYFRAMES.stand.pose,
      descend_mid: PLANK_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: PLANK_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: PLANK_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "db-row") {
    return {
      stand: DB_ROW_GHOST_KEYFRAMES.stand.pose,
      descend_mid: DB_ROW_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: DB_ROW_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: DB_ROW_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "ohp") {
    return {
      stand: OHP_GHOST_KEYFRAMES.stand.pose,
      descend_mid: OHP_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: OHP_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: OHP_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "bench-press") {
    return {
      stand: BENCH_PRESS_GHOST_KEYFRAMES.stand.pose,
      descend_mid: BENCH_PRESS_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: BENCH_PRESS_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: BENCH_PRESS_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "rdl") {
    return {
      stand: RDL_GHOST_KEYFRAMES.stand.pose,
      descend_mid: RDL_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: RDL_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: RDL_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "pullup") {
    return {
      stand: PULLUP_GHOST_KEYFRAMES.stand.pose,
      descend_mid: PULLUP_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: PULLUP_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: PULLUP_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "db-fly") {
    return {
      stand: DB_FLY_GHOST_KEYFRAMES.stand.pose,
      descend_mid: DB_FLY_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: DB_FLY_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: DB_FLY_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "dip") {
    return {
      stand: DIP_GHOST_KEYFRAMES.stand.pose,
      descend_mid: DIP_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: DIP_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: DIP_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "incline-pushup") {
    return {
      stand: INCLINE_PUSHUP_GHOST_KEYFRAMES.stand.pose,
      descend_mid: INCLINE_PUSHUP_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: INCLINE_PUSHUP_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: INCLINE_PUSHUP_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "cable-crossover") {
    return {
      stand: CABLE_CROSSOVER_GHOST_KEYFRAMES.stand.pose,
      descend_mid: CABLE_CROSSOVER_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: CABLE_CROSSOVER_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: CABLE_CROSSOVER_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "chest-press-machine") {
    return {
      stand: CHEST_PRESS_MACHINE_GHOST_KEYFRAMES.stand.pose,
      descend_mid: CHEST_PRESS_MACHINE_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: CHEST_PRESS_MACHINE_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: CHEST_PRESS_MACHINE_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "lateral-raise") {
    return {
      stand: LATERAL_RAISE_GHOST_KEYFRAMES.stand.pose,
      descend_mid: LATERAL_RAISE_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: LATERAL_RAISE_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: LATERAL_RAISE_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "front-raise") {
    return {
      stand: FRONT_RAISE_GHOST_KEYFRAMES.stand.pose,
      descend_mid: FRONT_RAISE_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: FRONT_RAISE_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: FRONT_RAISE_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "rear-delt-fly") {
    return {
      stand: REAR_DELT_FLY_GHOST_KEYFRAMES.stand.pose,
      descend_mid: REAR_DELT_FLY_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: REAR_DELT_FLY_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: REAR_DELT_FLY_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "face-pull") {
    return {
      stand: FACE_PULL_GHOST_KEYFRAMES.stand.pose,
      descend_mid: FACE_PULL_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: FACE_PULL_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: FACE_PULL_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  if (exerciseId === "pike-pushup") {
    return {
      stand: PIKE_PUSHUP_GHOST_KEYFRAMES.stand.pose,
      descend_mid: PIKE_PUSHUP_GHOST_KEYFRAMES.descend_mid.pose,
      bottom: PIKE_PUSHUP_GHOST_KEYFRAMES.bottom.pose,
      ascend_mid: PIKE_PUSHUP_GHOST_KEYFRAMES.ascend_mid.pose,
    };
  }
  return {
    stand: SQUAT_GHOST_KEYFRAMES.stand.pose,
    descend_mid: SQUAT_GHOST_KEYFRAMES.descend_mid.pose,
    bottom: SQUAT_GHOST_KEYFRAMES.bottom.pose,
    ascend_mid: SQUAT_GHOST_KEYFRAMES.ascend_mid.pose,
  };
}

export function ghostPhaseConfigFor(exerciseId: GhostExerciseId): PhaseConfig {
  if (exerciseId === "pushup") return DEFAULT_PUSHUP_PHASE_CONFIG;
  if (exerciseId === "glute-bridge") return DEFAULT_GLUTE_BRIDGE_PHASE_CONFIG;
  if (exerciseId === "lunge") return DEFAULT_LUNGE_PHASE_CONFIG;
  if (exerciseId === "plank") return DEFAULT_PLANK_PHASE_CONFIG;
  if (exerciseId === "db-row") return DEFAULT_DB_ROW_PHASE_CONFIG;
  if (exerciseId === "ohp") return DEFAULT_OHP_PHASE_CONFIG;
  if (exerciseId === "bench-press") return DEFAULT_BENCH_PRESS_PHASE_CONFIG;
  if (exerciseId === "rdl") return DEFAULT_RDL_PHASE_CONFIG;
  if (exerciseId === "pullup") return DEFAULT_PULLUP_PHASE_CONFIG;
  if (exerciseId === "db-fly") return DEFAULT_DB_FLY_PHASE_CONFIG;
  if (exerciseId === "dip") return DEFAULT_DIP_PHASE_CONFIG;
  if (exerciseId === "incline-pushup") return DEFAULT_INCLINE_PUSHUP_PHASE_CONFIG;
  if (exerciseId === "cable-crossover") {
    return DEFAULT_CABLE_CROSSOVER_PHASE_CONFIG;
  }
  if (exerciseId === "chest-press-machine") {
    return DEFAULT_CHEST_PRESS_MACHINE_PHASE_CONFIG;
  }
  if (exerciseId === "lateral-raise") return DEFAULT_LATERAL_RAISE_PHASE_CONFIG;
  if (exerciseId === "front-raise") return DEFAULT_FRONT_RAISE_PHASE_CONFIG;
  if (exerciseId === "rear-delt-fly") return DEFAULT_REAR_DELT_FLY_PHASE_CONFIG;
  if (exerciseId === "face-pull") return DEFAULT_FACE_PULL_PHASE_CONFIG;
  if (exerciseId === "pike-pushup") return DEFAULT_PIKE_PUSHUP_PHASE_CONFIG;
  return DEFAULT_SQUAT_PHASE_CONFIG;
}

/** 预览循环用相位序列（含过渡）。 */
export function ghostPreviewPhases(): Phase[] {
  return ["stand", "descend", "bottom", "ascend"];
}
