import { exerciseDisplayName } from "./display.js";
import {
  exerciseKey,
  type LogExerciseRef,
  type LogSet,
  type WorkoutLog,
} from "./types.js";
import { recordedWeightUnit } from "./units.js";
import { calendarDayLocal } from "./volume.js";

export const PR_PREVIEW_LIMIT = 4;

export type ExercisePr = {
  exercise: LogExerciseRef;
  weightKg: number;
  /** 写出这一组时用的单位。旧数据缺省 kg。 */
  weightUnit: "kg" | "lb";
  reps: number;
  /** 写出该最重组的那节课 `startedAt`。 */
  achievedAt: string;
};

function isPrSet(set: LogSet): set is LogSet & { weightKg: number; reps: number } {
  if (set.kind === "timed") return false;
  return (
    set.weightKg != null &&
    set.weightKg > 0 &&
    set.reps != null &&
    set.reps > 0
  );
}

function isBetterPr(next: ExercisePr, current: ExercisePr): boolean {
  if (next.weightKg !== current.weightKg) return next.weightKg > current.weightKg;
  return next.reps > current.reps;
}

function isSamePr(next: ExercisePr, current: ExercisePr): boolean {
  return next.weightKg === current.weightKg && next.reps === current.reps;
}

/** 成就柜默认平铺条数；展开后给全量。 */
export function visiblePersonalRecords(
  records: ExercisePr[],
  expanded: boolean,
  limit: number = PR_PREVIEW_LIMIT,
): ExercisePr[] {
  if (expanded || records.length <= limit) return records;
  return records.slice(0, limit);
}

export type PrStampParts = {
  year: number;
  month: number;
  day: number;
};

/** 盖章用的本地年月日。无效日期回退 0。 */
export function prStampParts(iso: string, timeZone?: string): PrStampParts {
  const raw = calendarDayLocal(iso, timeZone);
  const [year, month, day] = raw.split("-").map((part) => Number(part));
  if (!year || !month || !day) return { year: 0, month: 0, day: 0 };
  return { year, month, day };
}

export type PrStampMark = {
  monthDay: string;
  year: string;
};

/** 章面两行：等宽 MM.DD + 年。 */
export function prStampMark(iso: string, timeZone?: string): PrStampMark | null {
  const { year, month, day } = prStampParts(iso, timeZone);
  if (!year || !month || !day) return null;
  return {
    monthDay: `${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`,
    year: String(year),
  };
}

/** FR-098：按动作历史最大重量，并列时取该重量下次数更多的一组。 */
export function personalRecords(log: WorkoutLog): ExercisePr[] {
  const byKey = new Map<string, ExercisePr>();
  for (const workout of log.workouts) {
    for (const slot of workout.slots) {
      for (const set of slot.sets) {
        if (!isPrSet(set)) continue;
        const next: ExercisePr = {
          exercise: slot.exercise,
          weightKg: set.weightKg,
          weightUnit: recordedWeightUnit(set.weightUnit),
          reps: set.reps,
          achievedAt: workout.startedAt,
        };
        const key = exerciseKey(slot.exercise);
        const current = byKey.get(key);
        if (!current || isBetterPr(next, current)) {
          byKey.set(key, next);
          continue;
        }
        if (isSamePr(next, current) && next.achievedAt < current.achievedAt) {
          byKey.set(key, { ...current, achievedAt: next.achievedAt });
        }
      }
    }
  }
  return [...byKey.values()].sort((a, b) => {
    if (b.weightKg !== a.weightKg) return b.weightKg - a.weightKg;
    return exerciseDisplayName(a.exercise).localeCompare(
      exerciseDisplayName(b.exercise),
      "zh",
    );
  });
}
