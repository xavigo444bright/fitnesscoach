import { calendarDayLocal, countModeForRef, isoAtLocalNoon } from "./volume.js";
import { backdateKind } from "./calendar.js";
import type {
  LogExerciseRef,
  LogSet,
  LogSlot,
  Workout,
  WorkoutLog,
  WorkoutLogIds,
} from "./types.js";
import { sameExercise } from "./types.js";

function requireWorkout(log: WorkoutLog, workoutId: string): Workout {
  const w = log.workouts.find((x) => x.id === workoutId);
  if (!w) throw new Error(`workout not found: ${workoutId}`);
  return w;
}

function replaceWorkout(log: WorkoutLog, workout: Workout): WorkoutLog {
  return {
    ...log,
    workouts: log.workouts.map((w) => (w.id === workout.id ? workout : w)),
  };
}

export function createWorkout(
  log: WorkoutLog,
  startedAt: string,
  ids: WorkoutLogIds,
): { log: WorkoutLog; workoutId: string } {
  const workout: Workout = {
    id: ids.nextId(),
    startedAt,
    status: "open",
    slots: [],
  };
  return {
    log: { ...log, workouts: [...log.workouts, workout] },
    workoutId: workout.id,
  };
}

/**
 * 给今天或过去某本地日新建一节。过去日直接结束，不占首页进行中。
 * 不复用已有 open 课。未来日抛错。
 */
export function createBackdatedWorkout(
  log: WorkoutLog,
  day: string,
  nowIso: string,
  ids: WorkoutLogIds,
  timeZone?: string,
): { log: WorkoutLog; workoutId: string } {
  const kind = backdateKind(day, nowIso, timeZone);
  if (kind === "future") throw new Error(`cannot log a future day: ${day}`);
  const startedAt = isoAtLocalNoon(day, timeZone);
  const created = createWorkout(log, startedAt, ids);
  if (kind === "today") return created;
  return {
    log: endWorkout(created.log, created.workoutId, startedAt),
    workoutId: created.workoutId,
  };
}

export function openWorkout(log: WorkoutLog): Workout | undefined {
  const opens = log.workouts.filter((w) => w.status === "open");
  return opens.at(-1);
}

export function ensureOpenWorkout(
  log: WorkoutLog,
  startedAt: string,
  ids: WorkoutLogIds,
): { log: WorkoutLog; workoutId: string } {
  const open = openWorkout(log);
  if (open) return { log, workoutId: open.id };
  return createWorkout(log, startedAt, ids);
}

export function addSlot(
  log: WorkoutLog,
  workoutId: string,
  exercise: LogExerciseRef,
  ids: WorkoutLogIds,
): { log: WorkoutLog; slotId: string } {
  if (exercise.kind === "custom" && exercise.name.trim() === "") {
    throw new Error("custom exercise name required");
  }
  const workout = requireWorkout(log, workoutId);
  const existing = workout.slots.find((s) => sameExercise(s.exercise, exercise));
  if (existing) return { log, slotId: existing.id };
  const slot: LogSlot = {
    id: ids.nextId(),
    exercise:
      exercise.kind === "custom"
        ? { kind: "custom", name: exercise.name.trim() }
        : exercise,
    countMode: countModeForRef(exercise),
    sets: [],
  };
  return {
    log: replaceWorkout(log, { ...workout, slots: [...workout.slots, slot] }),
    slotId: slot.id,
  };
}

export function addSet(
  log: WorkoutLog,
  workoutId: string,
  slotId: string,
  patch: Omit<LogSet, "id" | "kind"> & { kind?: LogSet["kind"] },
  ids: WorkoutLogIds,
): { log: WorkoutLog; setId: string } {
  const workout = requireWorkout(log, workoutId);
  const slot = workout.slots.find((s) => s.id === slotId);
  if (!slot) throw new Error(`slot not found: ${slotId}`);
  const kind = patch.kind ?? (slot.countMode === "timed" ? "timed" : "reps");
  const set: LogSet = {
    id: ids.nextId(),
    kind,
    reps: patch.reps,
    weightKg: patch.weightKg,
    weightUnit:
      patch.weightUnit === "lb" || patch.weightUnit === "kg"
        ? patch.weightUnit
        : undefined,
    durationSec: patch.durationSec,
    restSec: patch.restSec,
    note: patch.note,
    cameraReps: patch.cameraReps,
    formSummary: patch.formSummary,
  };
  const nextSlot: LogSlot = { ...slot, sets: [...slot.sets, set] };
  const nextWorkout: Workout = {
    ...workout,
    slots: workout.slots.map((s) => (s.id === slotId ? nextSlot : s)),
  };
  return { log: replaceWorkout(log, nextWorkout), setId: set.id };
}

export function patchSet(
  log: WorkoutLog,
  workoutId: string,
  slotId: string,
  setId: string,
  patch: Partial<Omit<LogSet, "id" | "kind">>,
): WorkoutLog {
  const workout = requireWorkout(log, workoutId);
  const slot = workout.slots.find((s) => s.id === slotId);
  if (!slot) throw new Error(`slot not found: ${slotId}`);
  const set = slot.sets.find((s) => s.id === setId);
  if (!set) throw new Error(`set not found: ${setId}`);
  const nextSet: LogSet = { ...set, ...patch, id: set.id, kind: set.kind };
  const nextSlot: LogSlot = {
    ...slot,
    sets: slot.sets.map((s) => (s.id === setId ? nextSet : s)),
  };
  const nextWorkout: Workout = {
    ...workout,
    slots: workout.slots.map((s) => (s.id === slotId ? nextSlot : s)),
  };
  return replaceWorkout(log, nextWorkout);
}

export function removeSet(
  log: WorkoutLog,
  workoutId: string,
  slotId: string,
  setId: string,
): WorkoutLog {
  const workout = requireWorkout(log, workoutId);
  const slot = workout.slots.find((s) => s.id === slotId);
  if (!slot) throw new Error(`slot not found: ${slotId}`);
  if (!slot.sets.some((s) => s.id === setId)) {
    throw new Error(`set not found: ${setId}`);
  }
  const nextSlot: LogSlot = {
    ...slot,
    sets: slot.sets.filter((s) => s.id !== setId),
  };
  return replaceWorkout(log, {
    ...workout,
    slots: workout.slots.map((s) => (s.id === slotId ? nextSlot : s)),
  });
}

export function removeWorkout(log: WorkoutLog, workoutId: string): WorkoutLog {
  const workout = requireWorkout(log, workoutId);
  if (workout.status !== "ended") {
    throw new Error("only ended workouts can be removed");
  }
  return {
    ...log,
    workouts: log.workouts.filter((w) => w.id !== workoutId),
  };
}

export function removeSlot(
  log: WorkoutLog,
  workoutId: string,
  slotId: string,
): WorkoutLog {
  const workout = requireWorkout(log, workoutId);
  if (!workout.slots.some((s) => s.id === slotId)) {
    throw new Error(`slot not found: ${slotId}`);
  }
  return replaceWorkout(log, {
    ...workout,
    slots: workout.slots.filter((s) => s.id !== slotId),
  });
}

export function copySet(
  log: WorkoutLog,
  workoutId: string,
  slotId: string,
  setId: string,
  ids: WorkoutLogIds,
): { log: WorkoutLog; setId: string } {
  const workout = requireWorkout(log, workoutId);
  const slot = workout.slots.find((s) => s.id === slotId);
  if (!slot) throw new Error(`slot not found: ${slotId}`);
  const source = slot.sets.find((s) => s.id === setId);
  if (!source) throw new Error(`set not found: ${setId}`);
  return addSet(
    log,
    workoutId,
    slotId,
    {
      kind: source.kind,
      reps: source.reps,
      weightKg: source.weightKg,
      weightUnit: source.weightUnit,
      durationSec: source.durationSec,
      restSec: source.restSec,
    },
    ids,
  );
}

export function copyLastSet(
  log: WorkoutLog,
  workoutId: string,
  slotId: string,
  ids: WorkoutLogIds,
): { log: WorkoutLog; setId: string } {
  const workout = requireWorkout(log, workoutId);
  const slot = workout.slots.find((s) => s.id === slotId);
  if (!slot) throw new Error(`slot not found: ${slotId}`);
  const last = slot.sets.at(-1);
  if (!last) throw new Error("no set to copy");
  return copySet(log, workoutId, slotId, last.id, ids);
}

export function patchWorkout(
  log: WorkoutLog,
  workoutId: string,
  patch: { title?: string; bodyweightKg?: number | null },
): WorkoutLog {
  const workout = requireWorkout(log, workoutId);
  const title =
    !("title" in patch)
      ? workout.title
      : patch.title == null || patch.title.trim() === ""
        ? undefined
        : patch.title.trim();
  const bodyweightKg =
    !("bodyweightKg" in patch)
      ? workout.bodyweightKg
      : patch.bodyweightKg != null &&
          Number.isFinite(patch.bodyweightKg) &&
          patch.bodyweightKg > 0
        ? patch.bodyweightKg
        : undefined;
  return replaceWorkout(log, { ...workout, title, bodyweightKg });
}

/** 已结束的课，新的在前（写入「记录」列表）。 */
export function endedWorkouts(log: WorkoutLog): Workout[] {
  return log.workouts.filter((w) => w.status === "ended").slice().reverse();
}

export function workoutById(
  log: WorkoutLog,
  workoutId: string,
): Workout | undefined {
  return log.workouts.find((w) => w.id === workoutId);
}

/** 首页·训练要展示的课：进行中优先，否则最近一节已结束的课。 */
export function homeSessionWorkout(
  log: WorkoutLog,
  workoutId?: string,
): Workout | undefined {
  if (workoutId) {
    const focused = workoutById(log, workoutId);
    if (focused) return focused;
  }
  const open = openWorkout(log);
  if (open) return open;
  const ended = log.workouts.filter((w) => w.status === "ended");
  return ended.at(-1);
}

/** 首页模块：今天开始的课 + 跨日仍进行中的课。改其中一节不删除其他节。 */
export function homeDayWorkouts(
  log: WorkoutLog,
  nowIso: string,
  timeZone?: string,
): Workout[] {
  const day = calendarDayLocal(nowIso, timeZone);
  const startedDesc = (a: Workout, b: Workout) =>
    b.startedAt.localeCompare(a.startedAt);
  const today = log.workouts
    .filter((w) => calendarDayLocal(w.startedAt, timeZone) === day)
    .slice()
    .sort((a, b) => {
      if (a.status === "open" && b.status !== "open") return -1;
      if (b.status === "open" && a.status !== "open") return 1;
      return startedDesc(a, b);
    });
  const danglingOpen = log.workouts
    .filter(
      (w) =>
        w.status === "open" && calendarDayLocal(w.startedAt, timeZone) !== day,
    )
    .slice()
    .sort(startedDesc);
  return [...danglingOpen, ...today];
}

export function endWorkout(
  log: WorkoutLog,
  workoutId: string,
  endedAt: string,
): WorkoutLog {
  const workout = requireWorkout(log, workoutId);
  if (workout.status === "ended") return log;
  return replaceWorkout(log, {
    ...workout,
    status: "ended",
    endedAt,
  });
}

export type FollowAlongInput = {
  catalogId: string;
  cameraReps: number;
  /** 用户改过的次数/秒；缺省用 cameraReps */
  reps?: number;
  weightKg?: number;
  weightUnit?: "kg" | "lb";
  formSummary?: string;
};

/** FR-093 数据层：相机次数进当前课该动作一组，次数可改。无弹窗。 */
export function applyFollowAlongSet(
  log: WorkoutLog,
  input: FollowAlongInput,
  startedAt: string,
  ids: WorkoutLogIds,
  workoutId?: string,
): WorkoutLog {
  let next = log;
  let targetId = workoutId;
  if (targetId) {
    requireWorkout(next, targetId);
  } else {
    const open = openWorkout(next);
    if (open) {
      targetId = open.id;
    } else {
      const created = createWorkout(next, startedAt, ids);
      next = created.log;
      targetId = created.workoutId;
    }
  }
  const slotAdd = addSlot(
    next,
    targetId,
    { kind: "catalog", catalogId: input.catalogId },
    ids,
  );
  next = slotAdd.log;
  const counted = input.reps ?? input.cameraReps;
  const slot = next.workouts
    .find((w) => w.id === targetId)
    ?.slots.find((s) => s.id === slotAdd.slotId);
  if (!slot) throw new Error("follow-along slot missing");
  if (slot.countMode === "timed") {
    const added = addSet(
      next,
      targetId,
      slotAdd.slotId,
      {
        kind: "timed",
        durationSec: counted,
        cameraReps: input.cameraReps,
        formSummary: input.formSummary,
      },
      ids,
    );
    return added.log;
  }
  const added = addSet(
    next,
    targetId,
    slotAdd.slotId,
    {
      kind: "reps",
      reps: counted,
      cameraReps: input.cameraReps,
      weightKg: input.weightKg,
      weightUnit: input.weightUnit,
      formSummary: input.formSummary,
    },
    ids,
  );
  return added.log;
}
