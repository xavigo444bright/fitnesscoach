/**
 * FR-097：把一节课存成模板，再套用生成新课。
 */
import { addSet, addSlot, createWorkout, patchWorkout } from "./commands.js";
import type {
  WorkoutLog,
  WorkoutLogIds,
  WorkoutTemplate,
  WorkoutTemplateSlot,
} from "./types.js";

function requireWorkout(log: WorkoutLog, workoutId: string) {
  const workout = log.workouts.find((w) => w.id === workoutId);
  if (!workout) throw new Error(`workout not found: ${workoutId}`);
  return workout;
}

export function listWorkoutTemplates(log: WorkoutLog): WorkoutTemplate[] {
  return (log.templates ?? []).slice().reverse();
}

export function saveWorkoutAsTemplate(
  log: WorkoutLog,
  workoutId: string,
  name: string,
  createdAt: string,
  ids: WorkoutLogIds,
): { log: WorkoutLog; templateId: string } {
  const workout = requireWorkout(log, workoutId);
  const trimmed = name.trim();
  if (trimmed === "") throw new Error("template name required");
  if (workout.slots.length === 0) throw new Error("workout has no exercises");
  const slots: WorkoutTemplateSlot[] = workout.slots.map((slot) => ({
    exercise: slot.exercise,
    countMode: slot.countMode,
    sets: slot.sets.map((set) => ({
      kind: set.kind,
      reps: set.reps,
      weightKg: set.weightKg,
      durationSec: set.durationSec,
    })),
  }));
  const template: WorkoutTemplate = {
    id: ids.nextId(),
    name: trimmed,
    createdAt,
    slots,
  };
  return {
    log: { ...log, templates: [...(log.templates ?? []), template] },
    templateId: template.id,
  };
}

export function applyWorkoutTemplate(
  log: WorkoutLog,
  templateId: string,
  startedAt: string,
  ids: WorkoutLogIds,
): { log: WorkoutLog; workoutId: string } {
  const template = (log.templates ?? []).find((t) => t.id === templateId);
  if (!template) throw new Error(`template not found: ${templateId}`);
  let next = createWorkout(log, startedAt, ids);
  let out = patchWorkout(next.log, next.workoutId, { title: template.name });
  for (const slot of template.slots) {
    const added = addSlot(out, next.workoutId, slot.exercise, ids);
    out = added.log;
    for (const draft of slot.sets) {
      if (slot.countMode === "timed") {
        if (draft.durationSec == null) continue;
        out = addSet(
          out,
          next.workoutId,
          added.slotId,
          { kind: "timed", durationSec: draft.durationSec },
          ids,
        ).log;
        continue;
      }
      if (draft.reps == null) continue;
      out = addSet(
        out,
        next.workoutId,
        added.slotId,
        {
          kind: "reps",
          reps: draft.reps,
          weightKg: draft.weightKg,
        },
        ids,
      ).log;
    }
  }
  return { log: out, workoutId: next.workoutId };
}

export function removeWorkoutTemplate(
  log: WorkoutLog,
  templateId: string,
): WorkoutLog {
  const templates = log.templates ?? [];
  if (!templates.some((t) => t.id === templateId)) {
    throw new Error(`template not found: ${templateId}`);
  }
  return {
    ...log,
    templates: templates.filter((t) => t.id !== templateId),
  };
}
