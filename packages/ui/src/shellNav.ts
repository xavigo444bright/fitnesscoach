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
  { key: "train", label: "训练" },
  { key: "library", label: "动作" },
] as const;

export const LOG_SEGMENTS = [
  { key: "history", label: "记录" },
  { key: "me", label: "我的" },
] as const;

export const DEFAULT_HOME_SEGMENT = "train" as const;
export const DEFAULT_LOG_SEGMENT = "history" as const;

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
