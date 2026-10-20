/**
 * FR-094：填了外加负荷的次数组算 次数×公斤（左右分记用两侧之和）。
 * 自重动作没填负荷时，有本节或档案自重则按自重计入；没填自重则不进容量。
 * 平板等计时动作不进容量数字。
 */

import { isBodyweightRef } from "./bodyweight.js";
import type { LogExerciseRef, LogSet, Workout, WorkoutLog } from "./types.js";

const TIMED_CATALOG_IDS = new Set(["plank", "side-plank"]);

export function isTimedCatalogId(catalogId: string): boolean {
  return TIMED_CATALOG_IDS.has(catalogId);
}

export function countModeForRef(ref: LogExerciseRef): "reps" | "timed" {
  if (ref.kind === "catalog" && isTimedCatalogId(ref.catalogId)) return "timed";
  return "reps";
}

function positiveKg(n: number | undefined): number {
  return n != null && Number.isFinite(n) && n > 0 ? n : 0;
}

/** 这一组手填的外加负荷。左右任一有数时用两侧之和，否则用单一重量。 */
export function externalLoadKg(set: LogSet): number | undefined {
  const left = positiveKg(set.weightLeftKg);
  const right = positiveKg(set.weightRightKg);
  if (left > 0 || right > 0) return left + right;
  const single = positiveKg(set.weightKg);
  return single > 0 ? single : undefined;
}

export type SetVolumeOptions = {
  /** 自重动作、且这一组没填外加负荷时，用这个公斤计入。 */
  bodyweightKg?: number;
  bodyweightExercise?: boolean;
};

export function setVolumeKg(set: LogSet, options?: SetVolumeOptions): number {
  if (set.kind === "timed") return 0;
  const reps = set.reps;
  if (reps == null || !(reps > 0)) return 0;
  const external = externalLoadKg(set);
  if (external != null) return reps * external;
  if (!options?.bodyweightExercise) return 0;
  const body = positiveKg(options.bodyweightKg);
  if (!(body > 0)) return 0;
  return reps * body;
}

export function workoutVolumeKg(
  workout: Workout,
  profileBodyweightKg?: number,
): number {
  const bodyweightKg =
    workout.bodyweightKg != null && workout.bodyweightKg > 0
      ? workout.bodyweightKg
      : profileBodyweightKg != null && profileBodyweightKg > 0
        ? profileBodyweightKg
        : undefined;
  let total = 0;
  for (const slot of workout.slots) {
    const bodyweightExercise = isBodyweightRef(slot.exercise);
    for (const set of slot.sets) {
      total += setVolumeKg(set, { bodyweightKg, bodyweightExercise });
    }
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
    if (calendarDayUtc(w.startedAt) === dayUtc) {
      total += workoutVolumeKg(w, log.bodyweightKg);
    }
  }
  return total;
}
