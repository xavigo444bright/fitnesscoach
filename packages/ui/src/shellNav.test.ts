import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOME_SEGMENT,
  DEFAULT_LOG_SEGMENT,
  FULLSCREEN_STACK_ROUTES,
  HOME_SEGMENTS,
  LOG_SEGMENTS,
  SHELL_TABS,
  isFullscreenStackRoute,
  shellTabCount,
} from "./shellNav.js";

describe("shellNav (FR-110)", () => {
  it("has exactly two tabs labelled 首页 and 记录", () => {
    expect(shellTabCount()).toBe(2);
    expect(SHELL_TABS.map((t) => t.key)).toEqual(["home", "log"]);
    expect(SHELL_TABS.map((t) => t.label)).toEqual(["首页", "记录"]);
    expect(SHELL_TABS.some((t) => /plus|start|center/i.test(t.key))).toBe(
      false,
    );
  });

  it("keeps home/log segments in-page (not extra tabs)", () => {
    expect(HOME_SEGMENTS.map((s) => s.label)).toEqual(["训练", "动作"]);
    expect(LOG_SEGMENTS.map((s) => s.label)).toEqual(["记录", "我的"]);
    expect(DEFAULT_HOME_SEGMENT).toBe("train");
    expect(DEFAULT_LOG_SEGMENT).toBe("history");
  });

  it("hides chrome on prepare/training/summary/detail", () => {
    expect(isFullscreenStackRoute("Prepare")).toBe(true);
    expect(isFullscreenStackRoute("Training")).toBe(true);
    expect(isFullscreenStackRoute("Summary")).toBe(true);
    expect(isFullscreenStackRoute("Detail")).toBe(true);
    expect(isFullscreenStackRoute("FollowAlongLog")).toBe(true);
    expect(isFullscreenStackRoute("RestTimer")).toBe(true);
    expect(isFullscreenStackRoute("Home")).toBe(false);
    expect(FULLSCREEN_STACK_ROUTES).not.toContain("MainTabs");
  });
});
