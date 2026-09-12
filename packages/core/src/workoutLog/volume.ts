/**
 * FR-094：只对填了重量的次数组算 次数×公斤。
 * 平板等计时动作不进容量数字。
 */

import type { LogExerciseRef, LogSet, Workout, WorkoutLog } from "./types.js";

const TIMED_CATALOG_IDS = new Set(["plank", "side-plank"]);

export function isTimedCatalogId(catalogId: string): boolean {
  return TIMED_CATALOG_IDS.has(catalogId);
}

export function countModeForRef(ref: LogExerciseRef): "reps" | "timed" {
  if (ref.kind === "catalog" && isTimedCatalogId(ref.catalogId)) return "timed";
  return "reps";
}

export function setVolumeKg(set: LogSet): number {
  if (set.kind === "timed") return 0;
  const reps = set.reps;
  const kg = set.weightKg;
  if (reps == null || kg == null) return 0;
  if (!(reps > 0) || !(kg > 0)) return 0;
  return reps * kg;
}

export function workoutVolumeKg(workout: Workout): number {
  let total = 0;
  for (const slot of workout.slots) {
    for (const set of slot.sets) total += setVolumeKg(set);
  }
  return total;
}

export function calendarDayUtc(iso: string): string {
  return iso.slice(0, 10);
}

/** 按本地（或指定时区）日历日，避免 UTC 切日。 */
export function calendarDayLocal(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return calendarDayUtc(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date);
}

export function calendarDayLabel(iso: string, timeZone?: string): string {
  const day = calendarDayLocal(iso, timeZone);
  const parts = day.split("-");
  if (parts.length !== 3) return day;
  return `${Number(parts[1])}月${Number(parts[2])}日`;
}

export function dayVolumeKg(log: WorkoutLog, dayUtc: string): number {
  let total = 0;
  for (const w of log.workouts) {
    if (calendarDayUtc(w.startedAt) === dayUtc) total += workoutVolumeKg(w);
  }
  return total;
}
