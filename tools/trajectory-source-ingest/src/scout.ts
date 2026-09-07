/**
 * ASSET-SCOUT 清单（docs/exercises/asset-scout/clips.json）。
 * ingest 必须绑 scout id；不根据 status 拒绝下载。
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assertCameraPlaneCoverage,
  isScoutCamera,
  loadCameraPlaneRegistry,
} from "./cameraPlanes.js";
import { REPO_ROOT } from "./paths.js";
import type { ScoutCamera } from "./types.js";

export const SCOUT_CLIPS_PATH = path.join(
  REPO_ROOT,
  "docs",
  "exercises",
  "asset-scout",
  "clips.json",
);

export type ScoutStatus =
  | "proposed"
  | "authorized"
  | "rejected"
  | "ingested";

export type ScoutRole = "primary" | "backup";

/** 静力支撑 vs 动态次数。scout 入出点按此限长，禁止把口播/摆机位算进窗。 */
export type ScoutWindowKind = "reps" | "hold";

/**
 * 时间从哪来。`user-verified` 才可当核查通过；其余仍须目视。
 * ingest 不读此字段当下载开关。
 */
export type ScoutTimeSource =
  | "user-verified"
  | "seeked"
  | "transcript"
  | "short-clip"
  | "unverified";

/** 动态：≥2 次完整 ROM 的干净循环，不是整段教程。 */
export const SCOUT_REPS_SEC_MIN = 4;
export const SCOUT_REPS_SEC_MAX = 15;
/**
 * proposed 查找带默认上限。≥2 次完整 ROM 即停，不要为凑满 15s 塞第三循环或讲解。
 * 硬上限仍 15s：仅 `user-verified` 的慢动作两次可以超过本值。
 */
export const SCOUT_REPS_SEC_PREFERRED_MAX = 10;
/** 静力：姿势已经标准之后的支撑，不是从趴地/跪姿讲解起。 */
export const SCOUT_HOLD_SEC_MIN = 3;
export const SCOUT_HOLD_SEC_MAX = 8;

const HOLD_EXERCISES = new Set(["plank", "side-plank"]);

export type ScoutCameraStability = "locked" | "handheld" | "moving";

export interface ScoutClip {
  id: string;
  exerciseId: string;
  name: string;
  camera: ScoutCamera;
  url: string;
  title?: string;
  channel?: string;
  startSec: number | null;
  endSec: number | null;
  timeNote?: string;
  why: string;
  status: ScoutStatus;
  role: ScoutRole;
  windowKind: ScoutWindowKind;
  timeSource: ScoutTimeSource;
  /**
   * 窗内机位是否基本锁死。持续绕拍/推轨会把运镜写进 2D 骨，不能当轨迹真源。
   * 未填 = 未检。
   */
  cameraStability?: ScoutCameraStability;
}

export interface ScoutRegistry {
  schemaVersion: string;
  updatedAt?: string;
  notes?: string;
  clips: ScoutClip[];
}

const STATUSES = new Set<ScoutStatus>([
  "proposed",
  "authorized",
  "rejected",
  "ingested",
]);

function isCamera(v: unknown): v is ScoutCamera {
  return isScoutCamera(v);
}

function isStatus(v: unknown): v is ScoutStatus {
  return typeof v === "string" && STATUSES.has(v as ScoutStatus);
}

function isWindowKind(v: unknown): v is ScoutWindowKind {
  return v === "reps" || v === "hold";
}

function isTimeSource(v: unknown): v is ScoutTimeSource {
  return (
    v === "user-verified" ||
    v === "seeked" ||
    v === "transcript" ||
    v === "short-clip" ||
    v === "unverified"
  );
}

function isCameraStability(v: unknown): v is ScoutCameraStability {
  return v === "locked" || v === "handheld" || v === "moving";
}

/**
 * `--scout-id a,b` 或重复 `--scout-id a --scout-id b`。
 * 一次授权后整批 ingest，不要拆成 N 次命令让用户逐条点网络允许。
 */
export function parseScoutIdList(rawParts: string[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const part of rawParts) {
    for (const id of part.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (seen.has(id)) {
        throw new Error(`duplicate --scout-id ${id}`);
      }
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function inferWindowKind(exerciseId: string): ScoutWindowKind {
  return HOLD_EXERCISES.has(exerciseId) ? "hold" : "reps";
}

export function lookWindowLimits(kind: ScoutWindowKind): {
  min: number;
  max: number;
} {
  return kind === "hold"
    ? { min: SCOUT_HOLD_SEC_MIN, max: SCOUT_HOLD_SEC_MAX }
    : { min: SCOUT_REPS_SEC_MIN, max: SCOUT_REPS_SEC_MAX };
}

export interface LookWindowSec {
  startSec: number;
  endSec: number;
}

/**
 * 字幕/口令给出的是查找带；真正写入 clips.json 的是「行程可读」交集。
 * 特写、半截 ROM 落在查找带前几秒时应被丢掉，而不是把整条片否决。
 */
export function intersectSearchBandWithReadableRom(
  searchBand: LookWindowSec,
  readableRom: LookWindowSec,
): LookWindowSec {
  const startSec = Math.max(searchBand.startSec, readableRom.startSec);
  const endSec = Math.min(searchBand.endSec, readableRom.endSec);
  if (endSec <= startSec) {
    throw new Error(
      "readable ROM does not overlap search band; pick another stretch or another source",
    );
  }
  return { startSec, endSec };
}

/**
 * proposed/authorized 必须给出 Pose 可用短窗。
 * ingested 历史窗（含 2s 俯卧撑）不套本限。rejected 不校验。
 *
 * 入点语义（人工 vs 字幕，见 asset-scout.md `lunge-side-01`）：
 * 字幕「开始做次数」只是查找带；startSec 必须是「完整行程已在画幅里可读」。
 * 部位特写否决的是窗头，不是整条片源。
 */
export function assertScoutLookWindow(clip: ScoutClip): void {
  if (clip.status === "rejected" || clip.status === "ingested") return;
  if (clip.startSec == null || clip.endSec == null) {
    throw new Error(
      `scout ${clip.id}: proposed/authorized clips need numeric startSec/endSec (Pose loop, not whole tutorial)`,
    );
  }
  if (clip.endSec <= clip.startSec) {
    throw new Error(`scout ${clip.id}: endSec must be > startSec`);
  }
  if (clip.startSec < 0) {
    throw new Error(`scout ${clip.id}: startSec must be ≥ 0`);
  }
  const dur = clip.endSec - clip.startSec;
  const { min, max } = lookWindowLimits(clip.windowKind);
  if (dur + 1e-9 < min || dur - 1e-9 > max) {
    throw new Error(
      `scout ${clip.id}: ${clip.windowKind} look-window is ${dur}s; allowed ${min}–${max}s (exclude talk/setup/mistakes/variations)`,
    );
  }
  const proposedGuess =
    clip.status === "proposed" &&
    clip.windowKind === "reps" &&
    (clip.timeSource === "unverified" ||
      clip.timeSource === "short-clip" ||
      clip.timeSource === "transcript");
  if (proposedGuess && dur - 1e-9 > SCOUT_REPS_SEC_PREFERRED_MAX) {
    throw new Error(
      `scout ${clip.id}: proposed ${clip.timeSource} reps look-window is ${dur}s; stop after ≥2 complete ROM (prefer ${min}–${SCOUT_REPS_SEC_PREFERRED_MAX}s). Do not pad extra cycles or talk. Hard max ${max}s only after user-verified slow reps.`,
    );
  }
}

function parseClip(raw: unknown, index: number): ScoutClip {
  if (raw == null || typeof raw !== "object") {
    throw new Error(`scout clip[${index}] must be an object`);
  }
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== "string" || c.id.length === 0) {
    throw new Error(`scout clip[${index}] missing id`);
  }
  if (typeof c.exerciseId !== "string" || c.exerciseId.length === 0) {
    throw new Error(`scout ${c.id}: missing exerciseId`);
  }
  if (!isCamera(c.camera)) {
    throw new Error(`scout ${c.id}: camera must be side|front|three_quarter`);
  }
  if (typeof c.url !== "string" || c.url.length === 0) {
    throw new Error(`scout ${c.id}: missing url`);
  }
  if (typeof c.why !== "string") {
    throw new Error(`scout ${c.id}: missing why`);
  }
  if (!isStatus(c.status)) {
    throw new Error(`scout ${c.id}: invalid status`);
  }
  if (c.role !== "primary" && c.role !== "backup") {
    throw new Error(`scout ${c.id}: role must be primary|backup`);
  }
  if (c.startSec != null && typeof c.startSec !== "number") {
    throw new Error(`scout ${c.id}: startSec must be number or null`);
  }
  if (c.endSec != null && typeof c.endSec !== "number") {
    throw new Error(`scout ${c.id}: endSec must be number or null`);
  }
  if (c.cameraStability != null && !isCameraStability(c.cameraStability)) {
    throw new Error(
      `scout ${c.id}: cameraStability must be locked|handheld|moving`,
    );
  }
  const windowKind = isWindowKind(c.windowKind)
    ? c.windowKind
    : inferWindowKind(c.exerciseId);
  const timeSource: ScoutTimeSource = isTimeSource(c.timeSource)
    ? c.timeSource
    : clipStatusDefaultTimeSource(c.status);
  const clip: ScoutClip = {
    id: c.id,
    exerciseId: c.exerciseId,
    name: typeof c.name === "string" ? c.name : c.exerciseId,
    camera: c.camera,
    url: c.url,
    title: typeof c.title === "string" ? c.title : undefined,
    channel: typeof c.channel === "string" ? c.channel : undefined,
    startSec: typeof c.startSec === "number" ? c.startSec : null,
    endSec: typeof c.endSec === "number" ? c.endSec : null,
    timeNote: typeof c.timeNote === "string" ? c.timeNote : undefined,
    why: c.why,
    status: c.status,
    role: c.role,
    windowKind,
    timeSource,
    cameraStability: isCameraStability(c.cameraStability)
      ? c.cameraStability
      : undefined,
  };
  assertScoutLookWindow(clip);
  return clip;
}

function clipStatusDefaultTimeSource(status: ScoutStatus): ScoutTimeSource {
  if (status === "ingested") return "user-verified";
  return "unverified";
}

export function loadScoutRegistry(
  filePath: string = SCOUT_CLIPS_PATH,
): ScoutRegistry {
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  if (parsed == null || typeof parsed !== "object") {
    throw new Error("scout registry must be an object");
  }
  const root = parsed as Record<string, unknown>;
  if (root.schemaVersion !== "1.0") {
    throw new Error(`unsupported scout schemaVersion: ${String(root.schemaVersion)}`);
  }
  if (!Array.isArray(root.clips) || root.clips.length === 0) {
    throw new Error("scout registry clips[] is empty");
  }
  const clips = root.clips.map((c, i) => parseClip(c, i));
  const ids = new Set<string>();
  for (const clip of clips) {
    if (ids.has(clip.id)) {
      throw new Error(`duplicate scout id: ${clip.id}`);
    }
    ids.add(clip.id);
  }
  const planes = loadCameraPlaneRegistry();
  assertCameraPlaneCoverage(clips, planes);
  return {
    schemaVersion: "1.0",
    updatedAt: typeof root.updatedAt === "string" ? root.updatedAt : undefined,
    notes: typeof root.notes === "string" ? root.notes : undefined,
    clips,
  };
}

export function requireScoutClip(scoutId: string): ScoutClip {
  const reg = loadScoutRegistry();
  const clip = reg.clips.find((c) => c.id === scoutId);
  if (!clip) {
    const known = reg.clips.map((c) => c.id).join(", ");
    throw new Error(`unknown --scout-id ${scoutId}. known: ${known}`);
  }
  return clip;
}

export function youtubeVideoId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m?.[1] ?? null;
}

export function urlsReferToSameSource(a: string, b: string): boolean {
  const ia = youtubeVideoId(a);
  const ib = youtubeVideoId(b);
  if (ia && ib) return ia === ib;
  return path.normalize(a) === path.normalize(b);
}

/** `local:media/...` → 仓库内绝对路径。 */
export function resolveScoutUrl(url: string): string {
  if (url.startsWith("local:")) {
    return path.join(REPO_ROOT, url.slice("local:".length));
  }
  return url;
}

export function assertScoutMatches(
  clip: ScoutClip,
  opts: { exercise?: string; camera?: ScoutCamera; url?: string },
): void {
  if (opts.exercise != null && opts.exercise !== clip.exerciseId) {
    throw new Error(
      `--exercise ${opts.exercise} does not match scout ${clip.id} (${clip.exerciseId})`,
    );
  }
  if (opts.camera != null && opts.camera !== clip.camera) {
    throw new Error(
      `--camera ${opts.camera} does not match scout ${clip.id} (${clip.camera})`,
    );
  }
  if (opts.url != null && !urlsReferToSameSource(opts.url, clip.url)) {
    throw new Error(
      `--url does not match scout ${clip.id} (${clip.url})`,
    );
  }
}
