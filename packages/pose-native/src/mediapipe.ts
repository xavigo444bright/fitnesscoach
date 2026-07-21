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

/** 从 nativeEvent / Android emit 载荷中取出 landmarks 数组。 */
export function extractMediapipeLandmarks(data: unknown): RawLandmark[] | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    // 偶发 [[lm, …]] 嵌套
    if (Array.isArray(data[0])) return data[0] as RawLandmark[];
    return data as RawLandmark[];
  }
  if (typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  for (const key of ["landmarks", "landmark", "poseLandmarks"]) {
    const value = obj[key];
    if (!Array.isArray(value) || value.length === 0) continue;
    if (Array.isArray(value[0])) return value[0] as RawLandmark[];
    return value as RawLandmark[];
  }
  return null;
}

/** 取帧时间戳（ms）；缺失则用 Date.now()。 */
export function timestampMsFromMediapipeEvent(
  data: unknown,
  fallbackMs: number = Date.now(),
): number {
  if (!data || typeof data !== "object") return fallbackMs;
  const additional = (data as Record<string, unknown>).additionalData;
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
 * 无效点 → undefined。
 */
export function poseFromMediapipeEvent(data: unknown): Pose | null {
  const raw = extractMediapipeLandmarks(data);
  if (!raw) return null;

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
