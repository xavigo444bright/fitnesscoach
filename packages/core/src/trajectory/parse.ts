/**
 * 轨迹 JSON 解析与校验（VT-P7-001）
 */

import type { Phase } from "../types.js";
import type {
  DemoTrajectory,
  TrajectoryExerciseId,
  TrajectoryFrame,
  TrajectoryLandmark,
} from "./types.js";
import { TRAJECTORY_SCHEMA_VERSION } from "./types.js";

const PHASES = new Set<Phase>(["stand", "descend", "bottom", "ascend"]);
const EXERCISES = new Set<TrajectoryExerciseId>(["squat", "pushup"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v != null && !Array.isArray(v);
}

function parseLandmark(raw: unknown, idx: number): TrajectoryLandmark {
  if (!isRecord(raw)) {
    throw new Error(`frame landmark[${idx}] must be object`);
  }
  const i = raw.i;
  const x = raw.x;
  const y = raw.y;
  if (typeof i !== "number" || typeof x !== "number" || typeof y !== "number") {
    throw new Error(`frame landmark[${idx}] needs numeric i,x,y`);
  }
  const lm: TrajectoryLandmark = { i, x, y };
  if (raw.z != null) {
    if (typeof raw.z !== "number") throw new Error(`landmark[${idx}].z invalid`);
    lm.z = raw.z;
  }
  if (raw.v != null) {
    if (typeof raw.v !== "number") throw new Error(`landmark[${idx}].v invalid`);
    lm.v = raw.v;
  }
  return lm;
}

function parseFrame(raw: unknown, idx: number): TrajectoryFrame {
  if (!isRecord(raw)) throw new Error(`frames[${idx}] must be object`);
  const t = raw.t;
  if (typeof t !== "number" || t < 0 || t > 1) {
    throw new Error(`frames[${idx}].t must be in [0,1]`);
  }
  if (!Array.isArray(raw.landmarks) || raw.landmarks.length === 0) {
    throw new Error(`frames[${idx}].landmarks must be non-empty array`);
  }
  const frame: TrajectoryFrame = {
    t,
    landmarks: raw.landmarks.map((lm, j) => parseLandmark(lm, j)),
  };
  if (raw.phase != null) {
    if (typeof raw.phase !== "string" || !PHASES.has(raw.phase as Phase)) {
      throw new Error(`frames[${idx}].phase invalid`);
    }
    frame.phase = raw.phase as Phase;
  }
  if (raw.driveDeg != null) {
    if (typeof raw.driveDeg !== "number") {
      throw new Error(`frames[${idx}].driveDeg invalid`);
    }
    frame.driveDeg = raw.driveDeg;
  }
  return frame;
}

/**
 * 解析并校验 DemoTrajectory；非法则抛错。
 */
export function parseDemoTrajectory(input: unknown): DemoTrajectory {
  if (!isRecord(input)) throw new Error("trajectory must be object");
  if (input.schemaVersion !== TRAJECTORY_SCHEMA_VERSION) {
    throw new Error(
      `unsupported schemaVersion: ${String(input.schemaVersion)} (want ${TRAJECTORY_SCHEMA_VERSION})`,
    );
  }
  if (typeof input.id !== "string" || !input.id) {
    throw new Error("trajectory.id required");
  }
  if (
    typeof input.exerciseId !== "string" ||
    !EXERCISES.has(input.exerciseId as TrajectoryExerciseId)
  ) {
    throw new Error("trajectory.exerciseId must be squat|pushup");
  }
  if (!isRecord(input.source) || typeof input.source.type !== "string") {
    throw new Error("trajectory.source.type required");
  }
  if (!isRecord(input.meta)) throw new Error("trajectory.meta required");
  if (input.meta.landmarkScheme !== "mediapipe33") {
    throw new Error("meta.landmarkScheme must be mediapipe33");
  }
  if (
    input.meta.cameraHint !== "side" &&
    input.meta.cameraHint !== "front"
  ) {
    throw new Error("meta.cameraHint must be side|front");
  }
  if (!Array.isArray(input.frames) || input.frames.length < 2) {
    throw new Error("trajectory.frames needs ≥2 frames");
  }
  const frames = input.frames.map(parseFrame);
  if (frames[0]!.t !== 0) {
    throw new Error("first frame.t must be 0");
  }
  if (frames[frames.length - 1]!.t !== 1) {
    throw new Error("last frame.t must be 1");
  }
  for (let i = 1; i < frames.length; i += 1) {
    if (frames[i]!.t < frames[i - 1]!.t) {
      throw new Error(`frames t not monotonic at ${i}`);
    }
  }

  return {
    schemaVersion: TRAJECTORY_SCHEMA_VERSION,
    id: input.id,
    exerciseId: input.exerciseId as TrajectoryExerciseId,
    source: {
      type: input.source.type as DemoTrajectory["source"]["type"],
      label:
        typeof input.source.label === "string" ? input.source.label : undefined,
      fps: typeof input.source.fps === "number" ? input.source.fps : undefined,
    },
    meta: {
      landmarkScheme: "mediapipe33",
      cameraHint: input.meta.cameraHint,
      rawFrameCount:
        typeof input.meta.rawFrameCount === "number"
          ? input.meta.rawFrameCount
          : undefined,
      loopFrameRange: Array.isArray(input.meta.loopFrameRange)
        ? (input.meta.loopFrameRange as [number, number])
        : undefined,
      createdAt:
        typeof input.meta.createdAt === "string"
          ? input.meta.createdAt
          : undefined,
      notes: typeof input.meta.notes === "string" ? input.meta.notes : undefined,
    },
    frames,
  };
}

/** JSON 字符串 → DemoTrajectory */
export function parseDemoTrajectoryJson(text: string): DemoTrajectory {
  return parseDemoTrajectory(JSON.parse(text) as unknown);
}
