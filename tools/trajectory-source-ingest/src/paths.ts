import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** tools/trajectory-source-ingest */
export const INGEST_ROOT = path.resolve(HERE, "..");
/** 仓库根 */
export const REPO_ROOT = path.resolve(INGEST_ROOT, "../..");

export const TRAJECTORY_SOURCE_ROOT = path.join(
  REPO_ROOT,
  "media",
  "trajectory-source",
);

export const EXTRACT_ROOT = path.join(REPO_ROOT, "tools", "trajectory-extract");

export const VIDEO_TO_POSE_SCRIPT = path.join(
  EXTRACT_ROOT,
  "scripts",
  "video_to_pose_dump.py",
);

export const EXTRACT_VENV_PYTHON = path.join(
  EXTRACT_ROOT,
  ".venv",
  "bin",
  "python",
);

export const INGEST_VENV_PYTHON = path.join(
  INGEST_ROOT,
  ".venv",
  "bin",
  "python",
);

export const POSE_MODEL = path.join(
  EXTRACT_ROOT,
  "models",
  "pose_landmarker_lite.task",
);

export function exerciseDirs(exerciseId: string): {
  root: string;
  inbox: string;
  candidates: string;
} {
  const root = path.join(TRAJECTORY_SOURCE_ROOT, exerciseId);
  return {
    root,
    inbox: path.join(root, "_inbox"),
    candidates: path.join(root, "_candidates"),
  };
}
