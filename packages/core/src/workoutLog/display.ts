import { getCatalogEntry } from "../exercises/catalog.js";
import type { LogExerciseRef, Workout, WorkoutTemplate } from "./types.js";

export function exerciseDisplayName(ref: LogExerciseRef): string {
  if (ref.kind === "custom") return ref.name;
  return getCatalogEntry(ref.catalogId)?.name ?? ref.catalogId;
}

export function workoutTitleDisplay(workout: Workout): string {
  const title = workout.title?.trim();
  return title && title.length > 0 ? title : "未命名训练";
}

/** 首页聚合：动作名 + 组数。 */
export function workoutExerciseSummary(workout: Workout): string {
  if (workout.slots.length === 0) return "";
  return workout.slots
    .map((slot) => {
      const name = exerciseDisplayName(slot.exercise);
      const n = slot.sets.length;
      return n > 0 ? `${name} ${n}组` : name;
    })
    .join(" · ");
}

export function templateExerciseSummary(template: WorkoutTemplate): string {
  if (template.slots.length === 0) return "";
  return template.slots
    .map((slot) => {
      const name = exerciseDisplayName(slot.exercise);
      const n = slot.sets.length;
      return n > 0 ? `${name} ${n}组` : name;
    })
    .join(" · ");
}
