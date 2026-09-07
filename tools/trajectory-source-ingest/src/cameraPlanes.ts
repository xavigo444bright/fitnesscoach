/**
 * 机位规格（FR-089）：出 clips.json 前必须先写 specs.json。
 * 祖父动作不要求条目。
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./paths.js";
import type { CameraHint, ScoutCamera } from "./types.js";

export type CameraPlaneClipRef = {
  exerciseId: string;
  camera: ScoutCamera;
  status: string;
};

export const CAMERA_PLANES_SPEC_PATH = path.join(
  REPO_ROOT,
  "docs",
  "exercises",
  "camera-planes",
  "specs.json",
);

export type PlaneId = ScoutCamera;
export type EvaluationBucket = "front" | "side" | "dual_or_three_quarter";

export interface CuePlane {
  ruleId: string;
  planes: PlaneId[];
}

export interface CameraPlaneExerciseSpec {
  evaluation: EvaluationBucket;
  countPlanes: PlaneId[];
  cuePlanes?: CuePlane[];
  defaultHint: CameraHint;
  requiredClipCameras: PlaneId[];
  optionalClipCameras?: PlaneId[];
  placementNote: string;
  rationale: string;
}

export interface CameraPlaneRegistry {
  schemaVersion: string;
  updatedAt?: string;
  notes?: string;
  grandfatheredExerciseIds: string[];
  exercises: Record<string, CameraPlaneExerciseSpec>;
}

const PLANES = new Set<PlaneId>(["side", "front", "three_quarter"]);
const EVALUATIONS = new Set<EvaluationBucket>([
  "front",
  "side",
  "dual_or_three_quarter",
]);

export function isScoutCamera(v: unknown): v is ScoutCamera {
  return v === "side" || v === "front" || v === "three_quarter";
}

/** 3/4 片按侧面做 Pose 提取；正面仍是 front。 */
export function poseCameraHint(camera: ScoutCamera): CameraHint {
  return camera === "front" ? "front" : "side";
}

function isPlane(v: unknown): v is PlaneId {
  return typeof v === "string" && PLANES.has(v as PlaneId);
}

function parsePlaneList(raw: unknown, label: string): PlaneId[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`camera-planes ${label} must be a non-empty array`);
  }
  const out: PlaneId[] = [];
  for (const item of raw) {
    if (!isPlane(item)) {
      throw new Error(`camera-planes ${label}: invalid plane ${String(item)}`);
    }
    out.push(item);
  }
  return out;
}

function parseCuePlanes(raw: unknown, exerciseId: string): CuePlane[] | undefined {
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error(`camera-planes ${exerciseId}.cuePlanes must be an array`);
  }
  return raw.map((item, i) => {
    if (item == null || typeof item !== "object") {
      throw new Error(`camera-planes ${exerciseId}.cuePlanes[${i}] must be an object`);
    }
    const row = item as Record<string, unknown>;
    if (typeof row.ruleId !== "string" || row.ruleId.length === 0) {
      throw new Error(`camera-planes ${exerciseId}.cuePlanes[${i}] missing ruleId`);
    }
    return {
      ruleId: row.ruleId,
      planes: parsePlaneList(row.planes, `${exerciseId}.cuePlanes[${i}].planes`),
    };
  });
}

function assertEvaluationMatchesRequired(
  exerciseId: string,
  spec: CameraPlaneExerciseSpec,
): void {
  const req = new Set(spec.requiredClipCameras);
  if (spec.evaluation === "front" && !req.has("front")) {
    throw new Error(
      `camera-planes ${exerciseId}: evaluation=front requires requiredClipCameras to include front`,
    );
  }
  if (spec.evaluation === "side" && !req.has("side")) {
    throw new Error(
      `camera-planes ${exerciseId}: evaluation=side requires requiredClipCameras to include side`,
    );
  }
  if (spec.evaluation === "dual_or_three_quarter") {
    const dual = req.has("front") && req.has("side");
    const tq = req.has("three_quarter");
    if (!dual && !tq) {
      throw new Error(
        `camera-planes ${exerciseId}: evaluation=dual_or_three_quarter needs [front,side] or three_quarter in requiredClipCameras`,
      );
    }
  }
}

function parseExerciseSpec(
  exerciseId: string,
  raw: unknown,
): CameraPlaneExerciseSpec {
  if (raw == null || typeof raw !== "object") {
    throw new Error(`camera-planes exercises.${exerciseId} must be an object`);
  }
  const o = raw as Record<string, unknown>;
  if (!EVALUATIONS.has(o.evaluation as EvaluationBucket)) {
    throw new Error(
      `camera-planes ${exerciseId}.evaluation must be front|side|dual_or_three_quarter`,
    );
  }
  if (o.defaultHint !== "front" && o.defaultHint !== "side") {
    throw new Error(`camera-planes ${exerciseId}.defaultHint must be front|side`);
  }
  if (typeof o.placementNote !== "string" || o.placementNote.trim().length === 0) {
    throw new Error(`camera-planes ${exerciseId}.placementNote is required`);
  }
  if (typeof o.rationale !== "string" || o.rationale.trim().length === 0) {
    throw new Error(`camera-planes ${exerciseId}.rationale is required`);
  }
  const spec: CameraPlaneExerciseSpec = {
    evaluation: o.evaluation as EvaluationBucket,
    countPlanes: parsePlaneList(o.countPlanes, `${exerciseId}.countPlanes`),
    cuePlanes: parseCuePlanes(o.cuePlanes, exerciseId),
    defaultHint: o.defaultHint,
    requiredClipCameras: parsePlaneList(
      o.requiredClipCameras,
      `${exerciseId}.requiredClipCameras`,
    ),
    optionalClipCameras:
      o.optionalClipCameras == null
        ? undefined
        : parsePlaneList(
            o.optionalClipCameras,
            `${exerciseId}.optionalClipCameras`,
          ),
    placementNote: o.placementNote,
    rationale: o.rationale,
  };
  assertEvaluationMatchesRequired(exerciseId, spec);
  return spec;
}

export function parseCameraPlaneRegistry(raw: unknown): CameraPlaneRegistry {
  if (raw == null || typeof raw !== "object") {
    throw new Error("camera-planes registry must be an object");
  }
  const root = raw as Record<string, unknown>;
  if (root.schemaVersion !== "1.0") {
    throw new Error(
      `unsupported camera-planes schemaVersion: ${String(root.schemaVersion)}`,
    );
  }
  if (!Array.isArray(root.grandfatheredExerciseIds)) {
    throw new Error("camera-planes grandfatheredExerciseIds must be an array");
  }
  const grandfatheredExerciseIds = root.grandfatheredExerciseIds.map((id, i) => {
    if (typeof id !== "string" || id.length === 0) {
      throw new Error(`camera-planes grandfatheredExerciseIds[${i}] must be a string`);
    }
    return id;
  });
  if (root.exercises == null || typeof root.exercises !== "object") {
    throw new Error("camera-planes exercises must be an object");
  }
  const exercises: Record<string, CameraPlaneExerciseSpec> = {};
  for (const [id, spec] of Object.entries(
    root.exercises as Record<string, unknown>,
  )) {
    exercises[id] = parseExerciseSpec(id, spec);
  }
  return {
    schemaVersion: "1.0",
    updatedAt: typeof root.updatedAt === "string" ? root.updatedAt : undefined,
    notes: typeof root.notes === "string" ? root.notes : undefined,
    grandfatheredExerciseIds,
    exercises,
  };
}

export function loadCameraPlaneRegistry(
  filePath: string = CAMERA_PLANES_SPEC_PATH,
): CameraPlaneRegistry {
  return parseCameraPlaneRegistry(
    JSON.parse(readFileSync(filePath, "utf8")) as unknown,
  );
}

/**
 * 非祖父动作一旦出现在 clips.json，必须已有规格，且 requiredClipCameras 都有非 rejected 片。
 */
export function assertCameraPlaneCoverage(
  clips: readonly CameraPlaneClipRef[],
  registry: CameraPlaneRegistry,
): void {
  const grandfathered = new Set(registry.grandfatheredExerciseIds);
  const byExercise = new Map<string, CameraPlaneClipRef[]>();
  for (const clip of clips) {
    const list = byExercise.get(clip.exerciseId) ?? [];
    list.push(clip);
    byExercise.set(clip.exerciseId, list);
  }
  for (const [exerciseId, list] of byExercise) {
    if (grandfathered.has(exerciseId)) continue;
    const spec = registry.exercises[exerciseId];
    if (spec == null) {
      throw new Error(
        `camera-planes: ${exerciseId} is in clips.json but has no spec. Write docs/exercises/camera-planes/specs.json first (FR-089).`,
      );
    }
    const present = new Set(
      list.filter((c) => c.status !== "rejected").map((c) => c.camera),
    );
    for (const cam of spec.requiredClipCameras) {
      if (!present.has(cam)) {
        throw new Error(
          `camera-planes ${exerciseId}: required camera ${cam} missing from clips.json`,
        );
      }
    }
  }
}
