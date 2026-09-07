/**
 * 用画面四角灰度差估计窗内运镜。
 * 2D Pose 在图像坐标：持续绕拍/推轨会把运镜写进骨点，肘角未必立刻废，但轨迹会漂。
 * 轻微手持抖动通常可接受。
 */

import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCapture } from "./util.js";

export type CameraMotionVerdict = "locked" | "handheld" | "moving";

export const CAMERA_MOTION_GRAY_W = 160;
export const CAMERA_MOTION_GRAY_H = 90;
const CORNER_FRAC = 0.18;
const FPS = 2;
const MAX_FRAMES = 12;

export function meanCornerSad(
  a: Uint8Array,
  b: Uint8Array,
  width: number,
  height: number,
): number {
  if (a.length !== width * height || b.length !== width * height) {
    throw new Error("gray frame size mismatch");
  }
  const cw = Math.max(1, Math.floor(width * CORNER_FRAC));
  const ch = Math.max(1, Math.floor(height * CORNER_FRAC));
  let sum = 0;
  let n = 0;
  const corners: Array<[number, number]> = [
    [0, 0],
    [width - cw, 0],
    [0, height - ch],
    [width - cw, height - ch],
  ];
  for (const [x0, y0] of corners) {
    for (let y = y0; y < y0 + ch; y += 1) {
      for (let x = x0; x < x0 + cw; x += 1) {
        const i = y * width + x;
        sum += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
        n += 1;
      }
    }
  }
  return n === 0 ? 0 : sum / n / 255;
}

export function cameraMotionVerdict(meanSad: number): CameraMotionVerdict {
  if (meanSad < 0.045) return "locked";
  if (meanSad < 0.11) return "handheld";
  return "moving";
}

export interface CameraMotionReport {
  frameCount: number;
  meanCornerSad: number;
  verdict: CameraMotionVerdict;
  /** moving：不要当 2D 轨迹真源。locked/handheld：可正常提骨。 */
  trajectoryOk: boolean;
}

export function splitGrayFrames(
  raw: Uint8Array,
  width = CAMERA_MOTION_GRAY_W,
  height = CAMERA_MOTION_GRAY_H,
): Uint8Array[] {
  const frameBytes = width * height;
  if (raw.length < frameBytes) {
    throw new Error("not enough gray bytes for one frame");
  }
  const n = Math.floor(raw.length / frameBytes);
  const frames: Uint8Array[] = [];
  for (let i = 0; i < n; i += 1) {
    frames.push(raw.subarray(i * frameBytes, (i + 1) * frameBytes));
  }
  return frames;
}

export function reportFromGrayFrames(
  frames: Uint8Array[],
  width = CAMERA_MOTION_GRAY_W,
  height = CAMERA_MOTION_GRAY_H,
): CameraMotionReport {
  if (frames.length < 2) {
    throw new Error("need ≥2 frames to estimate camera motion");
  }
  let sum = 0;
  let pairs = 0;
  for (let i = 1; i < frames.length; i += 1) {
    sum += meanCornerSad(frames[i - 1]!, frames[i]!, width, height);
    pairs += 1;
  }
  const mean = sum / pairs;
  const verdict = cameraMotionVerdict(mean);
  return {
    frameCount: frames.length,
    meanCornerSad: Math.round(mean * 1000) / 1000,
    verdict,
    trajectoryOk: verdict !== "moving",
  };
}

export async function estimateCameraMotionFromVideo(
  videoPath: string,
): Promise<CameraMotionReport> {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "scout-cam-"));
  const rawPath = path.join(tmp, "gray.raw");
  try {
    const r = await runCapture(
      "ffmpeg",
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        videoPath,
        "-vf",
        `fps=${FPS},scale=${CAMERA_MOTION_GRAY_W}:${CAMERA_MOTION_GRAY_H},format=gray`,
        "-frames:v",
        String(MAX_FRAMES),
        "-f",
        "rawvideo",
        rawPath,
      ],
      { timeoutMs: 60_000 },
    );
    if (r.code !== 0) {
      throw new Error(
        `ffmpeg camera-motion extract failed: ${(r.stderr || r.stdout).slice(0, 400)}`,
      );
    }
    const raw = await readFile(rawPath);
    return reportFromGrayFrames(splitGrayFrames(raw));
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
