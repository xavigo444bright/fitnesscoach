/**
 * 示范窗主动肌登记（FR-085）。
 * 新动作升级 coachable 时在 catalog 填 `activeMuscles`；未填则按 bodyPart 兜底。
 * 禁止把相位/计数写进这里。
 */

import type { BodyPart } from "./catalog.js";

/** 与小窗体积 kind 对齐的肌群 id；加体积时两边一起扩。 */
export type ActiveMuscleId = "chest" | "pelvis" | "thigh" | "upperArm";

/** catalog 未登记时的部位兜底，避免新浏览项完全无强调。 */
export const BODY_PART_ACTIVE_MUSCLES: Record<
  BodyPart,
  readonly ActiveMuscleId[]
> = {
  chest: ["chest"],
  shoulders: ["upperArm"],
  back: ["chest"],
  legs: ["pelvis", "thigh"],
  core: ["pelvis"],
};

export function activeMusclesFromBodyPart(
  part: BodyPart,
): readonly ActiveMuscleId[] {
  return BODY_PART_ACTIVE_MUSCLES[part];
}
