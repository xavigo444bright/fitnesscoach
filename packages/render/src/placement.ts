/**
 * 站位引导逻辑（M3-T5 / VT-P3A-006 / FR-022）
 *
 * 髋/踝缺失、低可见或出画 → 显示轮廓引导 + 文案。
 */

import { LandmarkIndex, type Pose } from "@fitness-coach/core";

export type PlacementReason =
  | "ok"
  | "missing_keypoints"
  | "out_of_frame"
  | "too_close";

export interface PlacementGuideResult {
  /** 是否显示站位框/文案。 */
  visible: boolean;
  hint: string | null;
  reason: PlacementReason;
}

export interface PlacementConfig {
  /** 归一化边距；点落在外视为出画。 */
  margin: number;
  /** visibility 低于此视为缺失。 */
  minVisibility: number;
  /**
   * 髋-踝竖直跨度超过此值视为过近（需后退）。
   * 侧面全身约 0.45–0.7；过大说明裁切过紧。
   */
  maxBodySpanY: number;
}

export const DEFAULT_PLACEMENT_CONFIG: PlacementConfig = {
  margin: 0.02,
  minVisibility: 0.5,
  maxBodySpanY: 0.98,
};

const KEY_POINTS = [
  LandmarkIndex.LeftHip,
  LandmarkIndex.RightHip,
  LandmarkIndex.LeftAnkle,
  LandmarkIndex.RightAnkle,
] as const;

function isPresent(
  pose: Pose,
  index: number,
  minVisibility: number,
): boolean {
  const lm = pose[index];
  if (!lm) return false;
  if (lm.visibility != null && lm.visibility < minVisibility) return false;
  return true;
}

function inFrame(
  x: number,
  y: number,
  margin: number,
): boolean {
  return (
    x >= margin &&
    x <= 1 - margin &&
    y >= margin &&
    y <= 1 - margin
  );
}

/**
 * 评估站位。坐标假定为归一化 0–1（MediaPipe）。
 */
export function evaluatePlacement(
  pose: Pose,
  cfg: PlacementConfig = DEFAULT_PLACEMENT_CONFIG,
): PlacementGuideResult {
  const present = KEY_POINTS.filter((i) =>
    isPresent(pose, i, cfg.minVisibility),
  );
  if (present.length < KEY_POINTS.length) {
    return {
      visible: true,
      hint: "髋膝踝入画即可，不必顶满框",
      reason: "missing_keypoints",
    };
  }

  for (const i of KEY_POINTS) {
    const lm = pose[i]!;
    if (!inFrame(lm.x, lm.y, cfg.margin)) {
      return {
        visible: true,
        hint: "请稍退，让髋与脚踝入画",
        reason: "out_of_frame",
      };
    }
  }

  const hipsY = [
    pose[LandmarkIndex.LeftHip]!.y,
    pose[LandmarkIndex.RightHip]!.y,
  ];
  const anklesY = [
    pose[LandmarkIndex.LeftAnkle]!.y,
    pose[LandmarkIndex.RightAnkle]!.y,
  ];
  const span =
    Math.max(...anklesY) - Math.min(...hipsY);
  if (span > cfg.maxBodySpanY) {
    return {
      visible: true,
      hint: "略退一点，髋膝踝入画即可",
      reason: "too_close",
    };
  }

  return { visible: false, hint: null, reason: "ok" };
}
