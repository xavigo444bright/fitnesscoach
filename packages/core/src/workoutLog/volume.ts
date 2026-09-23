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

/**
 * 某本地日历日的中午。用来写补记 `startedAt`，避免 UTC 零点被时区滚到另一天。
 */
export function isoAtLocalNoon(day: string, timeZone?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) throw new Error(`invalid calendar day: ${day}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const utcGuess = Date.UTC(year, month - 1, date, 12, 0, 0);
  const offset = timeZoneOffsetMs(utcGuess, timeZone);
  let instant = utcGuess - offset;
  const offset2 = timeZoneOffsetMs(instant, timeZone);
  if (offset2 !== offset) instant = utcGuess - offset2;
  const iso = new Date(instant).toISOString();
  if (calendarDayLocal(iso, timeZone) !== day) {
    throw new Error(`local noon missed ${day}`);
  }
  return iso;
}

function timeZoneOffsetMs(utcMs: number, timeZone?: string): number {
  const date = new Date(utcMs);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
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
