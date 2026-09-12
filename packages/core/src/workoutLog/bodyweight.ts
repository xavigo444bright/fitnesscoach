import { getCatalogEntry } from "../exercises/catalog.js";
import { lastLoadForExercise } from "./lastLoad.js";
import type { LogExerciseRef, Workout, WorkoutLog } from "./types.js";

export function setBodyweightKg(
  log: WorkoutLog,
  bodyweightKg: number | undefined,
): WorkoutLog {
  const next =
    bodyweightKg != null && Number.isFinite(bodyweightKg) && bodyweightKg > 0
      ? bodyweightKg
      : undefined;
  return { ...log, bodyweightKg: next };
}

export function isBodyweightRef(ref: LogExerciseRef): boolean {
  if (ref.kind !== "catalog") return false;
  return getCatalogEntry(ref.catalogId)?.equipment === "bodyweight";
}

/** 本节覆盖优先，否则「我的」档案自重。 */
export function effectiveBodyweightKg(
  log: WorkoutLog,
  workout?: Workout,
): number | undefined {
  if (workout?.bodyweightKg != null && workout.bodyweightKg > 0) {
    return workout.bodyweightKg;
  }
  if (log.bodyweightKg != null && log.bodyweightKg > 0) return log.bodyweightKg;
  return undefined;
}

/** 新组预填重量：仅上次该动作带重量的组（FR-095）。无历史不填自重。 */
export function suggestedWeightKg(
  log: WorkoutLog,
  ref: LogExerciseRef,
  _workout?: Workout,
): number | undefined {
  const last = lastLoadForExercise(log, ref);
  return last?.weightKg;
}
