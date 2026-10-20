/**
 * 行程类别注册表。四类按身体部位。新类别从这里插进来。
 * 状态机在 attempt.ts，不认识类别，也不读计次文案。
 */

import type { AttemptObs } from "./attempt.js";
import type { StrokeMark } from "./strokeMarks.js";
import type { SquatDepthState } from "./squatDepth.js";
import type { Pose } from "./types.js";

export interface StrokeReadInput {
  pose: Pose;
  mark: StrokeMark;
  squat: SquatDepthState;
}

export type StrokeRead = {
  squat: SquatDepthState;
  obs: AttemptObs | null;
  /** 点还在，但叠在一起，这段读不到。整帧没有别的读数时才填。 */
  unreadJoints?: number[];
};

export type StrokeCategoryReader = (input: StrokeReadInput) => StrokeRead;

const readers = new Map<string, StrokeCategoryReader>();

export function registerStrokeCategory(
  bodyPart: string,
  reader: StrokeCategoryReader,
): void {
  readers.set(bodyPart, reader);
}

export function unregisterStrokeCategory(bodyPart: string): void {
  readers.delete(bodyPart);
}

export function strokeCategoryIds(): string[] {
  return [...readers.keys()];
}

export function readRegisteredStroke(
  input: StrokeReadInput,
): StrokeRead | null {
  const reader = readers.get(input.mark.bodyPart);
  if (!reader) return null;
  return reader(input);
}
