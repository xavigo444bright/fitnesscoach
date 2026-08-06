/**
 * 俯卧撑 Ghost 关键帧（FR-064）
 * 侧面 plank：肘角驱动，与 pushup-rules 相位一致。
 */

import { buildPushupPose } from "../fixtures/pushup.js";
import type { Phase, Pose } from "../types.js";

export type PushupGhostKeyframeId =
  | "stand"
  | "descend_mid"
  | "bottom"
  | "ascend_mid";

export interface PushupPoseKeyframe {
  id: PushupGhostKeyframeId;
  phaseHint: Phase | "descend_mid" | "ascend_mid";
  pose: Pose;
}

export const PUSHUP_GHOST_KEYFRAMES: Record<
  PushupGhostKeyframeId,
  PushupPoseKeyframe
> = {
  stand: {
    id: "stand",
    phaseHint: "stand",
    pose: buildPushupPose({ elbowDeg: 170, hipDrop: 0 }),
  },
  descend_mid: {
    id: "descend_mid",
    phaseHint: "descend_mid",
    pose: buildPushupPose({ elbowDeg: 140, hipDrop: 0.01 }),
  },
  bottom: {
    id: "bottom",
    phaseHint: "bottom",
    pose: buildPushupPose({ elbowDeg: 95, hipDrop: 0.02 }),
  },
  ascend_mid: {
    id: "ascend_mid",
    phaseHint: "ascend_mid",
    pose: buildPushupPose({ elbowDeg: 140, hipDrop: 0.01 }),
  },
};

export const PUSHUP_GHOST_SEQUENCE: PushupGhostKeyframeId[] = [
  "stand",
  "descend_mid",
  "bottom",
  "ascend_mid",
  "stand",
];
