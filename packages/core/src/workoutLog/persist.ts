import {
  WORKOUT_LOG_VERSION,
  emptyWorkoutLog,
  type Workout,
  type WorkoutLog,
  type WorkoutTemplate,
} from "./types.js";

export function stringifyWorkoutLog(log: WorkoutLog): string {
  return JSON.stringify(log);
}

export function parseWorkoutLog(raw: string): WorkoutLog {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("workout log must be an object");
  }
  const rec = parsed as {
    version?: unknown;
    workouts?: unknown;
    bodyweightKg?: unknown;
    templates?: unknown;
  };
  if (rec.version !== WORKOUT_LOG_VERSION) {
    throw new Error(`unsupported workout log version: ${String(rec.version)}`);
  }
  if (!Array.isArray(rec.workouts)) {
    throw new Error("workout log workouts must be an array");
  }
  const bodyweightKg =
    typeof rec.bodyweightKg === "number" &&
    Number.isFinite(rec.bodyweightKg) &&
    rec.bodyweightKg > 0
      ? rec.bodyweightKg
      : undefined;
  const templates = parseTemplates(rec.templates);
  return {
    version: WORKOUT_LOG_VERSION,
    workouts: rec.workouts as Workout[],
    bodyweightKg,
    ...(templates ? { templates } : {}),
  };
}

function parseTemplates(raw: unknown): WorkoutTemplate[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const templates = raw.filter((item): item is WorkoutTemplate => {
    if (!item || typeof item !== "object") return false;
    const rec = item as { id?: unknown; name?: unknown; slots?: unknown };
    return (
      typeof rec.id === "string" &&
      typeof rec.name === "string" &&
      Array.isArray(rec.slots)
    );
  });
  return templates.length > 0 ? templates : undefined;
}

export type MemoryLogBox = { raw: string | null };

/** 单测用：模拟杀进程后再读（只留 JSON 字符串）。 */
export function saveWorkoutLogToMemory(box: MemoryLogBox, log: WorkoutLog): void {
  box.raw = stringifyWorkoutLog(log);
}

export function loadWorkoutLogFromMemory(box: MemoryLogBox): WorkoutLog {
  if (box.raw == null) return emptyWorkoutLog();
  return parseWorkoutLog(box.raw);
}
