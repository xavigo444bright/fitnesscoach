/**
 * 弓步 Ghost 关键帧（FR-064）
 * 真源：docs/exercises/lunge-rules.md §Ghost 关键帧
 * 合成几何复用深蹲姿态（双侧膝角相同 → 工作腿 min 仍正确）。
 */

import { buildSquatPose } from "../fixtures/index.js";
import type { Phase, Pose } from "../types.js";

export type LungeGhostKeyframeId =
  | "stand"
  | "descend_mid"
  | "bottom"
  | "ascend_mid";

export interface LungePoseKeyframe {
  id: LungeGhostKeyframeId;
  phaseHint: Phase | "descend_mid" | "ascend_mid";
  pose: Pose;
}

export const LUNGE_GHOST_KEYFRAMES: Record<
  LungeGhostKeyframeId,
  LungePoseKeyframe
> = {
  stand: {
    id: "stand",
    phaseHint: "stand",
    pose: buildSquatPose({ kneeDeg: 165, torsoLeanDeg: 10 }),
  },
  descend_mid: {
    id: "descend_mid",
    phaseHint: "descend_mid",
    pose: buildSquatPose({ kneeDeg: 125, torsoLeanDeg: 18 }),
  },
  bottom: {
    id: "bottom",
    phaseHint: "bottom",
    pose: buildSquatPose({ kneeDeg: 85, torsoLeanDeg: 22 }),
  },
  ascend_mid: {
    id: "ascend_mid",
    phaseHint: "ascend_mid",
    pose: buildSquatPose({ kneeDeg: 125, torsoLeanDeg: 18 }),
  },
};

export const LUNGE_GHOST_SEQUENCE: LungeGhostKeyframeId[] = [
  "stand",
  "descend_mid",
  "bottom",
  "ascend_mid",
  "stand",
];
