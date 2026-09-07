/**
 * 用 ffmpeg 裁剪候选 mp4（需本机安装 ffmpeg）。
 * 入点必须按秒对齐 look-window：先粗 seek 再解码微调，避免只落到关键帧。
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { runCapture } from "./util.js";
import type { CameraHint, ExerciseId, TimeRangeSec } from "./types.js";

/** 输入侧粗定位秒数；剩余在解码后精确切。 */
export const CROP_INPUT_PREROLL_SEC = 2;

export function ffmpegCropSeek(startSec: number): {
  inputSs: number;
  outputSs: number;
} {
  const start = Math.max(0, startSec);
  const preroll = Math.min(start, CROP_INPUT_PREROLL_SEC);
  return { inputSs: start - preroll, outputSs: preroll };
}

export async function cropCandidateClip(opts: {
  inputVideo: string;
  outDir: string;
  exerciseId: ExerciseId;
  cameraHint: CameraHint;
  index: number;
  timeRange: TimeRangeSec;
  /** 默认 `<exercise>-<camera>-cand-NN.mp4`；crop-only 用 scout id */
  fileName?: string;
}): Promise<string> {
  await mkdir(opts.outDir, { recursive: true });
  const name =
    opts.fileName ??
    `${opts.exerciseId}-${opts.cameraHint}-cand-${String(opts.index).padStart(2, "0")}.mp4`;
  const outPath = path.join(opts.outDir, name);
  const start = Math.max(0, opts.timeRange.startSec);
  const dur = Math.max(0.1, opts.timeRange.endSec - opts.timeRange.startSec);
  const { inputSs, outputSs } = ffmpegCropSeek(start);

  const r = await runCapture(
    "ffmpeg",
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      inputSs.toFixed(3),
      "-i",
      opts.inputVideo,
      "-ss",
      outputSs.toFixed(3),
      "-t",
      dur.toFixed(3),
      "-map",
      "0:v:0",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-an",
      "-movflags",
      "+faststart",
      outPath,
    ],
    { timeoutMs: 600_000 },
  );
  if (r.code !== 0) {
    throw new Error(
      `ffmpeg crop failed: ${(r.stderr || r.stdout).slice(0, 800)}`,
    );
  }
  return outPath;
}
