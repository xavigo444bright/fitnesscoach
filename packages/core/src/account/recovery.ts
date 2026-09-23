/**
 * 同一台手机上的改密题目。只看本机课表近 7 天的目录动作组数。
 * 没有训练、或全是自定义动作时不能出题。
 */
import type { WorkoutLog } from "../workoutLog/types.js";
import { calendarDayLocal } from "../workoutLog/volume.js";

export const RECOVERY_QUIZ_MAX_CORRECT = 3;

export type CatalogSetCount = {
  id: string;
  sets: number;
};

export type RecoveryQuiz = {
  correctIds: string[];
  choices: string[];
  pickCount: number;
};

function shiftCalendarDay(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1));
  utc.setUTCDate(utc.getUTCDate() + delta);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function orderKey(salt: string, id: string): number {
  let hash = 2166136261;
  const text = `${salt}:${id}`;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 含当天在内的近 `days` 个本地日历日，按目录动作计组数。 */
export function catalogSetCountsInDays(
  log: WorkoutLog,
  nowIso: string,
  days = 7,
  timeZone?: string,
): CatalogSetCount[] {
  const today = calendarDayLocal(nowIso, timeZone);
  const start = shiftCalendarDay(today, -(Math.max(days, 1) - 1));
  const totals = new Map<string, number>();
  for (const workout of log.workouts) {
    const day = calendarDayLocal(workout.endedAt ?? workout.startedAt, timeZone);
    if (day < start || day > today) continue;
    for (const slot of workout.slots) {
      if (slot.exercise.kind !== "catalog") continue;
      if (slot.sets.length === 0) continue;
      const id = slot.exercise.catalogId;
      totals.set(id, (totals.get(id) ?? 0) + slot.sets.length);
    }
  }
  return [...totals.entries()].map(([id, sets]) => ({ id, sets }));
}

/**
 * 近 7 天练过的目录动作，按组数取前 1 到 3 个作为正确答案。
 * 干扰项来自动作库，不含正确答案。
 */
export function buildRecoveryQuiz(
  counts: CatalogSetCount[],
  catalogIds: string[],
  salt: string,
  choiceCount?: number,
): RecoveryQuiz | null {
  const known = new Set(catalogIds);
  const ranked = counts
    .filter((item) => item.sets > 0 && known.has(item.id))
    .sort((a, b) => b.sets - a.sets || a.id.localeCompare(b.id));
  if (!ranked[0]) return null;
  const correctIds = ranked.slice(0, RECOVERY_QUIZ_MAX_CORRECT).map((item) => item.id);
  const slots = choiceCount ?? (correctIds.length >= 3 ? 9 : 6);
  const decoys = catalogIds
    .filter((id) => !correctIds.includes(id))
    .sort((a, b) => orderKey(salt, a) - orderKey(salt, b));
  const take = Math.max(slots, correctIds.length + 1) - correctIds.length;
  const pickedDecoys = decoys.slice(0, take);
  if (pickedDecoys.length === 0) return null;
  const choices = [...correctIds, ...pickedDecoys].sort(
    (a, b) => orderKey(salt, a) - orderKey(salt, b),
  );
  return { correctIds, choices, pickCount: correctIds.length };
}

export function recoveryQuizMatches(correctIds: string[], picked: string[]): boolean {
  if (picked.length !== correctIds.length) return false;
  const chosen = new Set(picked);
  return correctIds.every((id) => chosen.has(id));
}

/** 最多选 `pickCount` 个；再点新的会顶掉最早选的。 */
export function toggleRecoveryPick(
  current: string[],
  id: string,
  pickCount: number,
): string[] {
  const limit = Math.max(pickCount, 1);
  if (current.includes(id)) return current.filter((item) => item !== id);
  if (current.length < limit) return [...current, id];
  return [...current.slice(1), id];
}

export type NameQuiz = {
  correct: string;
  choices: string[];
};

export function directoryLoginNames(directory: { users: { username?: string; displayName?: string }[] }): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const user of directory.users) {
    const name = (user.username ?? user.displayName)?.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

export function pickNameDecoys(
  pool: string[],
  exclude: string[],
  count: number,
  salt: string,
): string[] {
  const blocked = new Set(exclude.map((name) => name.trim().toLocaleLowerCase()));
  const decoys = pool
    .filter((name) => name.trim() !== "" && !blocked.has(name.trim().toLocaleLowerCase()))
    .sort((a, b) => orderKey(salt, a) - orderKey(salt, b));
  const take = Math.max(count, 0);
  const picked = decoys.slice(0, take);
  let n = 0;
  while (picked.length < take) {
    n += 1;
    const filler = `user_${(orderKey(salt, `pad:${n}`) % 100000).toString().padStart(5, "0")}`;
    if (blocked.has(filler) || picked.includes(filler)) continue;
    picked.push(filler);
  }
  return picked;
}

export function buildNameQuiz(
  correct: string,
  decoys: string[],
  salt: string,
): NameQuiz | null {
  const name = correct.trim();
  if (!name) return null;
  const unique = decoys
    .map((item) => item.trim())
    .filter((item) => item !== "" && item.toLocaleLowerCase() !== name.toLocaleLowerCase());
  if (unique.length === 0) return null;
  const choices = [...new Set([name, ...unique])].sort(
    (a, b) => orderKey(salt, a) - orderKey(salt, b),
  );
  return { correct: name, choices };
}
