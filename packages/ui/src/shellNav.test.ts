import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOME_SEGMENT,
  DEFAULT_LOG_SEGMENT,
  FULLSCREEN_STACK_ROUTES,
  HOME_SEGMENTS,
  LOG_SEGMENTS,
  SHELL_TABS,
  isFullscreenStackRoute,
  pageIndexFromOffset,
  pageOffsetX,
  segmentIndexOf,
  segmentKeyAt,
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
    expect(HOME_SEGMENTS.map((s) => s.label)).toEqual(["动作", "训练"]);
    expect(LOG_SEGMENTS.map((s) => s.label)).toEqual(["记录", "我的"]);
    expect(DEFAULT_HOME_SEGMENT).toBe("library");
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

  it("maps segment keys to page index and swipe offset", () => {
    expect(segmentIndexOf(HOME_SEGMENTS, "library")).toBe(0);
    expect(segmentIndexOf(HOME_SEGMENTS, "train")).toBe(1);
    expect(segmentKeyAt(HOME_SEGMENTS, 0)).toBe("library");
    expect(segmentKeyAt(HOME_SEGMENTS, 1)).toBe("train");
    expect(segmentKeyAt(LOG_SEGMENTS, 99)).toBe("me");
    expect(pageOffsetX(1, 390)).toBe(390);
    expect(pageOffsetX(0, 0)).toBe(0);
    expect(pageIndexFromOffset(200, 390, 2)).toBe(1);
    expect(pageIndexFromOffset(-10, 390, 2)).toBe(0);
    expect(pageIndexFromOffset(800, 390, 2)).toBe(1);
  });
});
