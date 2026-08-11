/**
 * Pose ↔ 轨迹帧稀疏序列化
 */

import type { Landmark, Phase, Pose } from "../types.js";
import type { TrajectoryFrame, TrajectoryLandmark } from "./types.js";

const MAX_LANDMARK_INDEX = 32;

/** Pose → 稀疏 landmarks（跳过 undefined）。 */
export function landmarksFromPose(pose: Pose): TrajectoryLandmark[] {
  const out: TrajectoryLandmark[] = [];
  for (let i = 0; i < pose.length; i += 1) {
    const lm = pose[i];
    if (!lm) continue;
    const row: TrajectoryLandmark = { i, x: lm.x, y: lm.y };
    if (lm.z != null) row.z = lm.z;
    if (lm.visibility != null) row.v = lm.visibility;
    out.push(row);
  }
  return out;
}

/** 稀疏 landmarks → Pose（按 MediaPipe 索引）。 */
export function poseFromLandmarks(landmarks: TrajectoryLandmark[]): Pose {
  const pose: Pose = [];
  for (const lm of landmarks) {
    if (lm.i < 0 || lm.i > MAX_LANDMARK_INDEX) continue;
    const point: Landmark = { x: lm.x, y: lm.y };
    if (lm.z != null) point.z = lm.z;
    if (lm.v != null) point.visibility = lm.v;
    pose[lm.i] = point;
  }
  return pose;
}

export function frameFromPose(
  pose: Pose,
  t: number,
  extras?: { phase?: Phase; driveDeg?: number },
): TrajectoryFrame {
  return {
    t,
    phase: extras?.phase,
    driveDeg: extras?.driveDeg,
    landmarks: landmarksFromPose(pose),
  };
}

export function poseFromFrame(frame: TrajectoryFrame): Pose {
  return poseFromLandmarks(frame.landmarks);
}
