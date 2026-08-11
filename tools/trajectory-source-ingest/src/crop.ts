/**
 * 用 ffmpeg 裁剪候选 mp4（需本机安装 ffmpeg）。
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { runCapture } from "./util.js";
import type { CameraHint, ExerciseId, TimeRangeSec } from "./types.js";

export async function cropCandidateClip(opts: {
  inputVideo: string;
  outDir: string;
  exerciseId: ExerciseId;
  cameraHint: CameraHint;
  index: number;
  timeRange: TimeRangeSec;
}): Promise<string> {
  await mkdir(opts.outDir, { recursive: true });
  const name = `${opts.exerciseId}-${opts.cameraHint}-cand-${String(opts.index).padStart(2, "0")}.mp4`;
  const outPath = path.join(opts.outDir, name);
  const start = Math.max(0, opts.timeRange.startSec);
  const dur = Math.max(0.1, opts.timeRange.endSec - opts.timeRange.startSec);

  // -ss 在 -i 前做输入定位；再 -t 截时长；重编码保证边界准确
  const r = await runCapture(
    "ffmpeg",
    [
      "-y",
      "-ss",
      start.toFixed(3),
      "-i",
      opts.inputVideo,
      "-t",
      dur.toFixed(3),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-c:a",
      "aac",
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
