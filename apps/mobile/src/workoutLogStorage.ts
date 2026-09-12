/**
 * T11-1/T12 本机课表。突变走 core 命令，Screen 不自算容量。
 */
import {
  emptyWorkoutLog,
  parseWorkoutLog,
  stringifyWorkoutLog,
  type WorkoutLog,
  type WorkoutLogIds,
} from '@fitness-coach/core';
import { File, Paths } from 'expo-file-system';

const FILE_NAME = 'workout-log-v1.json';

function logFile(): File {
  return new File(Paths.document, FILE_NAME);
}

async function loadPersistedWorkoutLog(): Promise<WorkoutLog> {
  const file = logFile();
  if (!file.exists) return emptyWorkoutLog();
  return parseWorkoutLog(await file.text());
}

async function savePersistedWorkoutLog(log: WorkoutLog): Promise<void> {
  const file = logFile();
  if (!file.exists) file.create();
  file.write(stringifyWorkoutLog(log));
}

let cached: WorkoutLog | null = null;
const listeners = new Set<() => void>();

function emitWorkoutLog(): void {
  for (const listener of listeners) listener();
}

export function subscribeWorkoutLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function peekWorkoutLog(): WorkoutLog {
  return cached ?? emptyWorkoutLog();
}

export function makeWorkoutLogIds(): WorkoutLogIds {
  let n = 0;
  return { nextId: () => `id-${Date.now().toString(36)}-${++n}` };
}

export async function persistWorkoutLog(log: WorkoutLog): Promise<void> {
  cached = log;
  await savePersistedWorkoutLog(log);
  emitWorkoutLog();
}

export async function hydrateWorkoutLog(): Promise<WorkoutLog> {
  try {
    cached = await loadPersistedWorkoutLog();
  } catch {
    cached = emptyWorkoutLog();
  }
  emitWorkoutLog();
  return cached;
}

export async function commitWorkoutLog(
  updater: (log: WorkoutLog, ids: WorkoutLogIds) => WorkoutLog,
): Promise<WorkoutLog> {
  const next = updater(peekWorkoutLog(), makeWorkoutLogIds());
  await persistWorkoutLog(next);
  return next;
}
