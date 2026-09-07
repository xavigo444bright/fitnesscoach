import { buildRdlNearHipMeasured } from "../boundary/poseTune.js";
import { buildRaisePose } from "../fixtures/raise.js";
import { buildDbFlyPose } from "../fixtures/dbFly.js";
import { buildPushupPose } from "../fixtures/pushup.js";
import type { Phase, Pose } from "../types.js";

export type PushupLikeGhostId =
  | "stand"
  | "descend_mid"
  | "bottom"
  | "ascend_mid";

export interface PushupLikeKeyframe {
  id: PushupLikeGhostId;
  phaseHint: Phase | "descend_mid" | "ascend_mid";
  pose: Pose;
}

function set(
  standElbow: number,
  midElbow: number,
  bottomElbow: number,
  hipDrop = 0,
): Record<PushupLikeGhostId, PushupLikeKeyframe> {
  return {
    stand: {
      id: "stand",
      phaseHint: "stand",
      pose: buildPushupPose({ elbowDeg: standElbow, hipDrop }),
    },
    descend_mid: {
      id: "descend_mid",
      phaseHint: "descend_mid",
      pose: buildPushupPose({
        elbowDeg: midElbow,
        hipDrop: hipDrop * 0.5,
      }),
    },
    bottom: {
      id: "bottom",
      phaseHint: "bottom",
      pose: buildPushupPose({ elbowDeg: bottomElbow, hipDrop: 0 }),
    },
    ascend_mid: {
      id: "ascend_mid",
      phaseHint: "ascend_mid",
      pose: buildPushupPose({
        elbowDeg: midElbow,
        hipDrop: hipDrop * 0.5,
      }),
    },
  };
}

/** 平板：stand=撅臀未撑稳，bottom=一线撑稳。hipDrop 负值=离开支撑面。 */
export const PLANK_GHOST_KEYFRAMES = set(170, 160, 160, -0.12);

export const DB_ROW_GHOST_KEYFRAMES = set(160, 125, 85);

export const OHP_GHOST_KEYFRAMES = set(165, 130, 90);

export const BENCH_PRESS_GHOST_KEYFRAMES = set(170, 140, 95);

export const PULLUP_GHOST_KEYFRAMES = set(165, 125, 75);

export const DIP_GHOST_KEYFRAMES = set(165, 130, 80);

export const INCLINE_PUSHUP_GHOST_KEYFRAMES = set(170, 140, 90);

export const CHEST_PRESS_MACHINE_GHOST_KEYFRAMES = set(145, 115, 70);

export const LATERAL_RAISE_GHOST_KEYFRAMES = {
  stand: {
    id: "stand" as const,
    phaseHint: "stand" as const,
    pose: buildRaisePose({ abductionDeg: 8 }),
  },
  descend_mid: {
    id: "descend_mid" as const,
    phaseHint: "descend_mid" as const,
    pose: buildRaisePose({ abductionDeg: 48 }),
  },
  bottom: {
    id: "bottom" as const,
    phaseHint: "bottom" as const,
    pose: buildRaisePose({ abductionDeg: 82 }),
  },
  ascend_mid: {
    id: "ascend_mid" as const,
    phaseHint: "ascend_mid" as const,
    pose: buildRaisePose({ abductionDeg: 48 }),
  },
};

export const FRONT_RAISE_GHOST_KEYFRAMES = {
  stand: {
    id: "stand" as const,
    phaseHint: "stand" as const,
    pose: buildRaisePose({ abductionDeg: 8, sideView: true }),
  },
  descend_mid: {
    id: "descend_mid" as const,
    phaseHint: "descend_mid" as const,
    pose: buildRaisePose({ abductionDeg: 48, sideView: true }),
  },
  bottom: {
    id: "bottom" as const,
    phaseHint: "bottom" as const,
    pose: buildRaisePose({ abductionDeg: 82, sideView: true }),
  },
  ascend_mid: {
    id: "ascend_mid" as const,
    phaseHint: "ascend_mid" as const,
    pose: buildRaisePose({ abductionDeg: 48, sideView: true }),
  },
};

export const REAR_DELT_FLY_GHOST_KEYFRAMES = {
  stand: {
    id: "stand" as const,
    phaseHint: "stand" as const,
    pose: buildDbFlyPose({ wristIncludedDeg: 18 }),
  },
  descend_mid: {
    id: "descend_mid" as const,
    phaseHint: "descend_mid" as const,
    pose: buildDbFlyPose({ wristIncludedDeg: 45 }),
  },
  bottom: {
    id: "bottom" as const,
    phaseHint: "bottom" as const,
    pose: buildDbFlyPose({ wristIncludedDeg: 70 }),
  },
  ascend_mid: {
    id: "ascend_mid" as const,
    phaseHint: "ascend_mid" as const,
    pose: buildDbFlyPose({ wristIncludedDeg: 45 }),
  },
};

export const FACE_PULL_GHOST_KEYFRAMES = set(150, 120, 80);

export const PIKE_PUSHUP_GHOST_KEYFRAMES = set(170, 140, 90, 0.22);

export const CABLE_CROSSOVER_GHOST_KEYFRAMES = {
  stand: {
    id: "stand" as const,
    phaseHint: "stand" as const,
    pose: buildDbFlyPose({ wristIncludedDeg: 40 }),
  },
  descend_mid: {
    id: "descend_mid" as const,
    phaseHint: "descend_mid" as const,
    pose: buildDbFlyPose({ wristIncludedDeg: 80 }),
  },
  bottom: {
    id: "bottom" as const,
    phaseHint: "bottom" as const,
    pose: buildDbFlyPose({ wristIncludedDeg: 115 }),
  },
  ascend_mid: {
    id: "ascend_mid" as const,
    phaseHint: "ascend_mid" as const,
    pose: buildDbFlyPose({ wristIncludedDeg: 80 }),
  },
};

export const DB_FLY_GHOST_KEYFRAMES = {
  stand: {
    id: "stand" as const,
    phaseHint: "stand" as const,
    pose: buildDbFlyPose({ wristIncludedDeg: 18 }),
  },
  descend_mid: {
    id: "descend_mid" as const,
    phaseHint: "descend_mid" as const,
    pose: buildDbFlyPose({ wristIncludedDeg: 40 }),
  },
  bottom: {
    id: "bottom" as const,
    phaseHint: "bottom" as const,
    pose: buildDbFlyPose({ wristIncludedDeg: 70 }),
  },
  ascend_mid: {
    id: "ascend_mid" as const,
    phaseHint: "ascend_mid" as const,
    pose: buildDbFlyPose({ wristIncludedDeg: 40 }),
  },
};

/** RDL：膝相对伸，靠躯干前倾铰链。 */
export const RDL_GHOST_KEYFRAMES = {
  stand: {
    id: "stand" as const,
    phaseHint: "stand" as const,
    pose: buildRdlNearHipMeasured(168),
  },
  descend_mid: {
    id: "descend_mid" as const,
    phaseHint: "descend_mid" as const,
    pose: buildRdlNearHipMeasured(140),
  },
  bottom: {
    id: "bottom" as const,
    phaseHint: "bottom" as const,
    pose: buildRdlNearHipMeasured(100),
  },
  ascend_mid: {
    id: "ascend_mid" as const,
    phaseHint: "ascend_mid" as const,
    pose: buildRdlNearHipMeasured(140),
  },
};

export const PLANK_GHOST_SEQUENCE: PushupLikeGhostId[] = [
  "stand",
  "descend_mid",
  "bottom",
  "ascend_mid",
  "stand",
];

export const DB_ROW_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
export const OHP_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
export const BENCH_PRESS_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
export const RDL_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
export const PULLUP_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
export const DB_FLY_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
export const DIP_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
export const INCLINE_PUSHUP_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
export const CABLE_CROSSOVER_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
export const CHEST_PRESS_MACHINE_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
export const LATERAL_RAISE_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
export const FRONT_RAISE_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
export const REAR_DELT_FLY_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
export const FACE_PULL_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
export const PIKE_PUSHUP_GHOST_SEQUENCE = PLANK_GHOST_SEQUENCE;
