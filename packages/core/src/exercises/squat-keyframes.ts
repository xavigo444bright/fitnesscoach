/**
 * 深蹲 Ghost 关键帧（M3-T6 / FR-064）
 * 真源：docs/exercises/squat-rules.md §Ghost 关键帧
 */

import { buildSquatPose } from "../fixtures/index.js";
import type { Phase, Pose } from "../types.js";

export type SquatGhostKeyframeId =
  | "stand"
  | "descend_mid"
  | "bottom"
  | "ascend_mid";

export interface PoseKeyframe {
  id: SquatGhostKeyframeId;
  /** 主要对应相位（stand 帧用于 stand；mid 用于过渡）。 */
  phaseHint: Phase | "descend_mid" | "ascend_mid";
  pose: Pose;
}

/** 5 逻辑帧中去重后的 4 个姿态（首尾 stand 共用）。 */
export const SQUAT_GHOST_KEYFRAMES: Record<SquatGhostKeyframeId, PoseKeyframe> =
  {
    stand: {
      id: "stand",
      phaseHint: "stand",
      pose: buildSquatPose({ kneeDeg: 170, torsoLeanDeg: 10 }),
    },
    descend_mid: {
      id: "descend_mid",
      phaseHint: "descend_mid",
      pose: buildSquatPose({ kneeDeg: 120, torsoLeanDeg: 22 }),
    },
    bottom: {
      id: "bottom",
      phaseHint: "bottom",
      pose: buildSquatPose({ kneeDeg: 85, torsoLeanDeg: 28 }),
    },
    ascend_mid: {
      id: "ascend_mid",
      phaseHint: "ascend_mid",
      pose: buildSquatPose({ kneeDeg: 120, torsoLeanDeg: 22 }),
    },
  };

/** 规则文档列出的顺序（含回到 stand）。 */
export const SQUAT_GHOST_SEQUENCE: SquatGhostKeyframeId[] = [
  "stand",
  "descend_mid",
  "bottom",
  "ascend_mid",
  "stand",
];
