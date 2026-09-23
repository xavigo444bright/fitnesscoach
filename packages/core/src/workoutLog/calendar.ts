/**
 * FR-099：按本地日历日回看已结束的课。
 */
import type { Workout, WorkoutLog } from "./types.js";
import { calendarDayLocal } from "./volume.js";

export function workoutCalendarDay(
  workout: Workout,
  timeZone?: string,
): string {
  return calendarDayLocal(workout.endedAt ?? workout.startedAt, timeZone);
}

/** 已结束课的本地日，升序 YYYY-MM-DD。 */
export function trainedCalendarDays(
  log: WorkoutLog,
  timeZone?: string,
): string[] {
  const days = new Set<string>();
  for (const workout of log.workouts) {
    if (workout.status !== "ended") continue;
    days.add(workoutCalendarDay(workout, timeZone));
  }
  return [...days].sort();
}

/** 某本地日的已结束课，新的在前。 */
export function workoutsOnCalendarDay(
  log: WorkoutLog,
  day: string,
  timeZone?: string,
): Workout[] {
  return log.workouts
    .filter(
      (workout) =>
        workout.status === "ended" &&
        workoutCalendarDay(workout, timeZone) === day,
    )
    .slice()
    .reverse();
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 周日为首的月历格子；空白为 null。 */
export function calendarMonthDays(
  year: number,
  month: number,
): (string | null)[] {
  const first = new Date(year, month - 1, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${pad2(month)}-${pad2(day)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function shiftYearMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export type BackdateKind = "past" | "today" | "future";

/** 相对 `nowIso` 的本地日：过去 / 今天 / 未来。未来不允许补记。 */
export function backdateKind(
  day: string,
  nowIso: string,
  timeZone?: string,
): BackdateKind {
  const today = calendarDayLocal(nowIso, timeZone);
  if (day > today) return "future";
  if (day < today) return "past";
  return "today";
}
