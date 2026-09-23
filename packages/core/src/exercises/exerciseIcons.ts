/**
 * 动作库缩略图（T20 / FR-001）：映射到 Workout Guide 姿势帧。
 * 图本身是 CC BY-SA 4.0（Everkinetic → Bryl Lim），不进业务规则。
 */
import { EXERCISE_CATALOG, type Equipment } from "./catalog.js";

export const WORKOUT_GUIDE_PACKAGE = "@bryllim/workout-guide@1.0.0";
export const WORKOUT_GUIDE_FRAME = 2 as const;

/** catalog id → Workout Guide slug（打包文件名为 `{id}.png`，取 frame-2）。 */
export const EXERCISE_ICON_SLUG: Record<string, string> = {
  pushup: "push-up",
  "bench-press": "bench-press",
  "db-fly": "dumbbell-fly",
  dip: "dip",
  "incline-pushup": "incline-push-up",
  "cable-crossover": "cable-fly",
  "chest-press-machine": "machine-chest-press",
  ohp: "standing-dumbbell-press",
  "lateral-raise": "lateral-raise",
  "front-raise": "front-raise",
  "rear-delt-fly": "rear-delt-fly",
  "face-pull": "face-pull",
  "pike-pushup": "pike-push-up",
  "db-row": "one-arm-dumbbell-row",
  pullup: "pull-up",
  "lat-pulldown": "lat-pulldown",
  "seated-row": "seated-row",
  superman: "superman",
  "band-row": "banded-row",
  squat: "squat",
  "glute-bridge": "glute-bridge",
  lunge: "forward-lunge",
  rdl: "dumbbell-romanian-deadlift",
  "leg-press": "leg-press",
  "calf-raise": "calf-raise",
  "goblet-squat": "goblet-squat",
  plank: "plank",
  "dead-bug": "dead-bug",
  "bird-dog": "bird-dog",
  crunch: "crunch",
  "side-plank": "side-plank",
  "hanging-knee-raise": "hanging-knee-raise",
};

const EQUIPMENT_ICON_FALLBACK: Record<Equipment, string> = {
  bodyweight: "squat",
  dumbbell: "db-fly",
  barbell: "bench-press",
  machine: "chest-press-machine",
  band: "band-row",
  other: "squat",
};

export const DEFAULT_EXERCISE_ICON_KEY = "squat";

/** 缩略图资源键：有 catalog 用动作图，自定义按器械，再不行用深蹲。 */
export function exerciseIconKey(input: {
  catalogId?: string | null;
  equipment?: Equipment | null;
}): string {
  const id = input.catalogId?.trim() ?? "";
  if (id && EXERCISE_ICON_SLUG[id]) return id;
  if (input.equipment && EQUIPMENT_ICON_FALLBACK[input.equipment]) {
    return EQUIPMENT_ICON_FALLBACK[input.equipment];
  }
  return DEFAULT_EXERCISE_ICON_KEY;
}

export function catalogExerciseIconKeys(): string[] {
  return EXERCISE_CATALOG.map((e) => e.id);
}
