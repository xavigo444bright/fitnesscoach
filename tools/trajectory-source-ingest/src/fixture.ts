import { synthesizePoseDump, type PoseDump } from "@fitness-coach/core";
import type { ExerciseId } from "./types.js";

/**
 * 将合成 PoseDump 的时间轴拉伸到目标时长（保持帧序与 rep 结构）。
 * 用于 dry-run / 单测，将合成片拉到偏好时长带内（便于稳定复现）。
 */
export function stretchPoseDumpDuration(
  dump: PoseDump,
  targetDurationSec: number,
): PoseDump {
  const frames = dump.frames;
  if (frames.length === 0) return dump;
  const fps = dump.fps && dump.fps > 0 ? dump.fps : 30;
  const lastIdx = frames.length - 1;
  const srcLastMs = frames[lastIdx]!.tMs ?? (lastIdx * 1000) / fps;
  const srcDur = Math.max(srcLastMs, 1);
  const scale = (targetDurationSec * 1000) / srcDur;
  return {
    ...dump,
    fps,
    frames: frames.map((fr, idx) => ({
      ...fr,
      tMs: (fr.tMs ?? (idx * 1000) / fps) * scale,
    })),
  };
}

/** dry-run 默认夹具：多 rep + 时长落在样片标准内 */
export function dryRunPoseDump(
  exerciseId: ExerciseId,
  targetDurationSec = 12,
): PoseDump {
  const base = synthesizePoseDump(exerciseId, 3);
  return stretchPoseDumpDuration(
    {
      ...base,
      label: `dry-run-synthetic-${exerciseId}.mp4`,
    },
    targetDurationSec,
  );
}
