/**
 * 示范窗骨骼模式肌群填充（FR-085）。色走 theme，强调态由 render.muscleEmphasisFor 决定。
 */

import { colors } from "./theme.js";

export type MuscleFillKind =
  | "torso"
  | "head"
  | "chest"
  | "pelvis"
  | "thigh"
  | "upperArm"
  | "hand"
  | "foot";

export type MuscleFillEmphasis = "active" | "rest";

export function muscleFill(
  kind: MuscleFillKind,
  emphasis: MuscleFillEmphasis,
): string {
  if (emphasis === "rest") return colors.muscleRest;
  switch (kind) {
    case "chest":
      return colors.muscleChestActive;
    case "pelvis":
      return colors.musclePelvisActive;
    case "thigh":
      return colors.muscleThighActive;
    case "upperArm":
      return colors.muscleArmActive;
    default:
      return colors.muscleRest;
  }
}
