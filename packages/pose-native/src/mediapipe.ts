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

export interface WorldLandmarkProbe {
  /** 回调里是否带了 worldLandmarks（米制），不是画面里的 z。 */
  present: boolean;
  count: number;
  hasZ: boolean;
}

const WORLD_KEYS = ["worldLandmarks", "world_landmarks", "poseWorldLandmarks"];

function listsFromWorldValue(value: unknown): RawLandmark[][] {
  if (!Array.isArray(value) || value.length === 0) return [];
  if (Array.isArray(value[0])) {
    return (value as unknown[]).filter(isRawLandmarkList) as RawLandmark[][];
  }
  if (isRawLandmarkList(value)) return [value];
  return [];
}

/** 每人一套世界坐标。单层对象里再找一次，兼容包了一层的回调。 */
function extractWorldLists(payload: unknown): RawLandmark[][] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }
  const obj = payload as Record<string, unknown>;
  for (const key of WORLD_KEYS) {
    const lists = listsFromWorldValue(obj[key]);
    if (lists.length > 0) return lists;
  }
  for (const value of Object.values(obj)) {
    if (!value || typeof value !== "object") continue;
    const nested = extractWorldLists(value);
    if (nested.length > 0) return nested;
  }
  return [];
}

function worldList(payload: unknown): unknown[] | null {
  const lists = extractWorldLists(payload);
  return lists[0] ?? null;
}

function attachWorld(pose: Pose, world: RawLandmark[] | undefined): void {
  if (!world) return;
  for (let i = 0; i < world.length; i += 1) {
    const image = pose[i];
    if (!image) continue;
    const x = asNumber(world[i]?.x);
    const y = asNumber(world[i]?.y);
    const z = asNumber(world[i]?.z);
    if (x == null || y == null || z == null) continue;
    image.wx = x;
    image.wy = y;
    image.wz = z;
  }
}

/** 探测原生回调有没有世界坐标。点会另外写到 Pose 的 wx/wy/wz。 */
export function probeWorldLandmarks(data: unknown): WorldLandmarkProbe {
  const payload = unwrapEvent(data);
  const direct = worldList(payload);
  if (direct) return summarizeWorld(direct);
  if (payload && typeof payload === "object") {
    for (const value of Object.values(payload as Record<string, unknown>)) {
      const nested = worldList(value);
      if (nested) return summarizeWorld(nested);
    }
  }
  return { present: false, count: 0, hasZ: false };
}

function summarizeWorld(list: unknown[]): WorldLandmarkProbe {
  const first = list[0];
  const hasZ =
    typeof first === "object" &&
    first != null &&
    typeof (first as { z?: unknown }).z === "number";
  return { present: true, count: list.length, hasZ };
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

/** 画面里每个人一套 Pose；无人则空数组。世界坐标按人下标对齐，只有一套时给第一人。 */
export function posesFromMediapipeEvent(data: unknown): Pose[] {
  const payload = unwrapEvent(data);
  const lists = extractMediapipePoseLists(payload);
  const worlds = extractWorldLists(payload);
  const out: Pose[] = [];
  lists.forEach((raw, index) => {
    const pose = poseFromRaw(raw);
    if (!pose.some(Boolean)) return;
    const world =
      worlds.length === lists.length
        ? worlds[index]
        : index === 0
          ? worlds[0]
          : undefined;
    attachWorld(pose, world);
    out.push(pose);
  });
  return out;
}
