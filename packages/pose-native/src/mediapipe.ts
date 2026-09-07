/**
 * @fitness-coach/pose-native — MediaPipe 回调 → core Pose（M2A-T4 / VT-P2-002）
 *
 * RN `@thinksys/react-native-mediapipe` 已在原生侧完成 detect；
 * 本适配层只做格式对齐，供 filter → smooth → validate 管线使用。
 */

import type { Landmark, Pose } from "@fitness-coach/core";

type RawLandmark = {
  x?: unknown;
  y?: unknown;
  z?: unknown;
  visibility?: unknown;
};

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function unwrapEvent(data: unknown): unknown {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return data;
    }
  }
  return data;
}

function isRawLandmarkList(value: unknown): value is RawLandmark[] {
  return Array.isArray(value) && value.length > 0 && !Array.isArray(value[0]);
}

/** 从 nativeEvent / Android emit 载荷中取出 landmarks 数组（第一人，兼容旧回调）。 */
export function extractMediapipeLandmarks(data: unknown): RawLandmark[] | null {
  const lists = extractMediapipePoseLists(data);
  return lists[0] ?? null;
}

/**
 * 取出画面里所有人的 33 点。
 * 新原生：`poses: Landmark[][]`；旧包只有 `landmarks` 则一人。
 */
export function extractMediapipePoseLists(data: unknown): RawLandmark[][] {
  const payload = unwrapEvent(data);
  if (!payload) return [];
  if (Array.isArray(payload)) {
    if (payload.length === 0) return [];
    if (Array.isArray(payload[0])) {
      return (payload as unknown[]).filter(isRawLandmarkList) as RawLandmark[][];
    }
    return [payload as RawLandmark[]];
  }
  if (typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const poses = obj.poses;
  if (Array.isArray(poses) && poses.length > 0) {
    if (Array.isArray(poses[0])) {
      return (poses as unknown[]).filter(isRawLandmarkList) as RawLandmark[][];
    }
    if (isRawLandmarkList(poses)) return [poses];
  }
  for (const key of ["landmarks", "landmark", "poseLandmarks"]) {
    const value = obj[key];
    if (!Array.isArray(value) || value.length === 0) continue;
    if (Array.isArray(value[0])) {
      return (value as unknown[]).filter(isRawLandmarkList) as RawLandmark[][];
    }
    return [value as RawLandmark[]];
  }
  return [];
}

function poseFromRaw(raw: RawLandmark[]): Pose {
  const pose: Pose = [];
  for (let i = 0; i < raw.length; i += 1) {
    const lm = raw[i];
    const x = asNumber(lm?.x);
    const y = asNumber(lm?.y);
    if (x == null || y == null) {
      pose[i] = undefined;
      continue;
    }
    const next: Landmark = { x, y };
    const z = asNumber(lm?.z);
    if (z != null) next.z = z;
    const visibility = asNumber(lm?.visibility);
    if (visibility != null) next.visibility = visibility;
    pose[i] = next;
  }
  return pose;
}

/** 取帧时间戳（ms）；缺失则用 Date.now()。 */
export function timestampMsFromMediapipeEvent(
  data: unknown,
  fallbackMs: number = Date.now(),
): number {
  const payload = unwrapEvent(data);
  if (!payload || typeof payload !== "object") return fallbackMs;
  const additional = (payload as Record<string, unknown>).additionalData;
  if (!additional || typeof additional !== "object") return fallbackMs;
  const pts = asNumber(
    (additional as Record<string, unknown>).presentationTimeStamp,
  );
  if (pts == null) return fallbackMs;
  // iOS CMTime 可能是秒；若 < 1e12 视为秒
  return pts < 1e12 ? pts * 1000 : pts;
}

/**
 * MediaPipe 回调 → Pose（33 点索引对齐 LandmarkIndex）。
 * 多人时取第一人（兼容旧调用）；训练页请用 posesFromMediapipeEvent。
 */
export function poseFromMediapipeEvent(data: unknown): Pose | null {
  const all = posesFromMediapipeEvent(data);
  return all[0] ?? null;
}

/** 画面里每个人一套 Pose；无人则空数组。 */
export function posesFromMediapipeEvent(data: unknown): Pose[] {
  const lists = extractMediapipePoseLists(data);
  const out: Pose[] = [];
  for (const raw of lists) {
    const pose = poseFromRaw(raw);
    if (pose.some(Boolean)) out.push(pose);
  }
  return out;
}
