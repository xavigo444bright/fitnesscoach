/**
 * 臀桥 Ghost 关键帧（FR-064）
 * 侧面仰卧：髋伸驱动。stand=贴地静息，bottom=顶髋锁髋。
 */

import { buildGluteBridgePose } from "../fixtures/gluteBridge.js";
import type { Phase, Pose } from "../types.js";

export type GluteBridgeGhostKeyframeId =
  | "stand"
  | "descend_mid"
  | "bottom"
  | "ascend_mid";

export interface GluteBridgePoseKeyframe {
  id: GluteBridgeGhostKeyframeId;
  phaseHint: Phase | "descend_mid" | "ascend_mid";
  pose: Pose;
}

export const GLUTE_BRIDGE_GHOST_KEYFRAMES: Record<
  GluteBridgeGhostKeyframeId,
  GluteBridgePoseKeyframe
> = {
  stand: {
    id: "stand",
    phaseHint: "stand",
    pose: buildGluteBridgePose({ hipDeg: 120 }),
  },
  descend_mid: {
    id: "descend_mid",
    phaseHint: "descend_mid",
    pose: buildGluteBridgePose({ hipDeg: 150 }),
  },
  bottom: {
    id: "bottom",
    phaseHint: "bottom",
    pose: buildGluteBridgePose({ hipDeg: 172 }),
  },
  ascend_mid: {
    id: "ascend_mid",
    phaseHint: "ascend_mid",
    pose: buildGluteBridgePose({ hipDeg: 150 }),
  },
};

export const GLUTE_BRIDGE_GHOST_SEQUENCE: GluteBridgeGhostKeyframeId[] = [
  "stand",
  "descend_mid",
  "bottom",
  "ascend_mid",
  "stand",
];
