/**
 * App 壳导航契约（FR-110 / docs/app-ia.md）。
 * 禁止第三 Tab、禁止中间凸起钮。
 */

export const SHELL_TABS = [
  { key: "home", label: "首页" },
  { key: "log", label: "记录" },
] as const;

export type ShellTabKey = (typeof SHELL_TABS)[number]["key"];

export const HOME_SEGMENTS = [
  { key: "library", label: "动作" },
  { key: "train", label: "训练" },
] as const;

export const LOG_SEGMENTS = [
  { key: "history", label: "记录" },
  { key: "me", label: "我的" },
] as const;

export const DEFAULT_HOME_SEGMENT = "library" as const;
export const DEFAULT_LOG_SEGMENT = "history" as const;

export type HomeSegmentKey = (typeof HOME_SEGMENTS)[number]["key"];
export type LogSegmentKey = (typeof LOG_SEGMENTS)[number]["key"];

export function segmentIndexOf<K extends string>(
  items: readonly { key: K }[],
  key: K,
): number {
  const i = items.findIndex((item) => item.key === key);
  return i < 0 ? 0 : i;
}

export function segmentKeyAt<K extends string>(
  items: readonly { key: K }[],
  index: number,
): K {
  if (items.length === 0) {
    throw new Error("segmentKeyAt: empty items");
  }
  const clamped = Math.min(Math.max(0, index), items.length - 1);
  return items[clamped]!.key;
}

export function pageOffsetX(index: number, pageWidth: number): number {
  if (pageWidth <= 0) return 0;
  return Math.max(0, index) * pageWidth;
}

export function pageIndexFromOffset(
  offsetX: number,
  pageWidth: number,
  pageCount: number,
): number {
  if (pageWidth <= 0 || pageCount <= 0) return 0;
  return Math.min(pageCount - 1, Math.max(0, Math.round(offsetX / pageWidth)));
}

/** 全屏栈路由：不在 Tab 内，底栏不可见。 */
export const FULLSCREEN_STACK_ROUTES = [
  "Detail",
  "Prepare",
  "Training",
  "Summary",
  "FollowAlongLog",
  "RestTimer",
  "DevPose",
] as const;

export type FullscreenStackRoute = (typeof FULLSCREEN_STACK_ROUTES)[number];

export function isFullscreenStackRoute(name: string): boolean {
  return (FULLSCREEN_STACK_ROUTES as readonly string[]).includes(name);
}

export function shellTabCount(): number {
  return SHELL_TABS.length;
}
