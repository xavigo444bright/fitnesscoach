import { sameExercise, type LogExerciseRef, type WorkoutLog } from "./types.js";

export type LastLoad = {
  weightKg: number;
  reps: number;
};

/** FR-095：同一动作最近一次带重量的次数组。 */
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
        const set = slot.sets[k]!;
        if (set.kind === "timed") continue;
        if (set.weightKg == null || !(set.weightKg > 0)) continue;
        if (set.reps == null || !(set.reps > 0)) continue;
        return { weightKg: set.weightKg, reps: set.reps };
      }
    }
  }
  return null;
}
