import {
  sameExercise,
  type LogExerciseRef,
  type LogSet,
  type WorkoutLog,
} from "./types.js";

export type LastLoad = {
  /** 单一重量，或左右之和。左右分记时另看 weightLeftKg / weightRightKg。 */
  weightKg: number;
  reps: number;
  weightLeftKg?: number;
  weightRightKg?: number;
};

function positiveKg(n: number | undefined): number {
  return n != null && Number.isFinite(n) && n > 0 ? n : 0;
}

function loadOf(set: LogSet): LastLoad | null {
  if (set.kind === "timed") return null;
  if (set.reps == null || !(set.reps > 0)) return null;
  const left = positiveKg(set.weightLeftKg);
  const right = positiveKg(set.weightRightKg);
  if (left > 0 || right > 0) {
    return {
      weightKg: left + right,
      reps: set.reps,
      weightLeftKg: left > 0 ? left : undefined,
      weightRightKg: right > 0 ? right : undefined,
    };
  }
  if (set.weightKg == null || !(set.weightKg > 0)) return null;
  return { weightKg: set.weightKg, reps: set.reps };
}

/** FR-095：同一动作最近一次带外加负荷的次数组。没填重量的自重不计。 */
export function lastLoadForExercise(
  log: WorkoutLog,
  exercise: LogExerciseRef,
): LastLoad | null {
  for (let i = log.workouts.length - 1; i >= 0; i -= 1) {
    const workout = log.workouts[i]!;
    for (let s = workout.slots.length - 1; s >= 0; s -= 1) {
      const slot = workout.slots[s]!;
      if (!sameExercise(slot.exercise, exercise)) continue;
      for (let k = slot.sets.length - 1; k >= 0; k -= 1) {
        const load = loadOf(slot.sets[k]!);
        if (load) return load;
      }
    }
  }
  return null;
}
