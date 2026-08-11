/**
 * 复用 trajectory-extract/scripts/video_to_pose_dump.py（不重复实现 MediaPipe）。
 */

import { access } from "node:fs/promises";
import {
  EXTRACT_VENV_PYTHON,
  POSE_MODEL,
  VIDEO_TO_POSE_SCRIPT,
} from "./paths.js";
import { runCapture } from "./util.js";
import type { CameraHint, ExerciseId } from "./types.js";

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function runVideoToPoseDump(opts: {
  videoPath: string;
  exerciseId: ExerciseId;
  camera: CameraHint;
  outPath: string;
  pythonBin?: string;
  stride?: number;
}): Promise<{ poseDumpPath: string; poseScript: string }> {
  const python = opts.pythonBin ?? EXTRACT_VENV_PYTHON;
  if (!(await exists(python))) {
    throw new Error(
      `python venv missing: ${python}\n` +
        `Create shared venv under tools/trajectory-extract (see that package / ingest README).`,
    );
  }
  if (!(await exists(VIDEO_TO_POSE_SCRIPT))) {
    throw new Error(`pose script missing: ${VIDEO_TO_POSE_SCRIPT}`);
  }
  if (!(await exists(POSE_MODEL))) {
    throw new Error(
      `MediaPipe model missing: ${POSE_MODEL}\n` +
        `Download pose_landmarker_lite.task into tools/trajectory-extract/models/.`,
    );
  }

  const args = [
    VIDEO_TO_POSE_SCRIPT,
    "--video",
    opts.videoPath,
    "--exercise",
    opts.exerciseId,
    "--camera",
    opts.camera,
    "--out",
    opts.outPath,
    "--model",
    POSE_MODEL,
  ];
  if (opts.stride != null && opts.stride > 1) {
    args.push("--stride", String(opts.stride));
  }

  const r = await runCapture(python, args, { timeoutMs: 1_800_000 });
  if (r.code !== 0) {
    throw new Error(
      `video_to_pose_dump failed:\n${r.stdout}\n${r.stderr}`.slice(0, 1200),
    );
  }
  return { poseDumpPath: opts.outPath, poseScript: VIDEO_TO_POSE_SCRIPT };
}
