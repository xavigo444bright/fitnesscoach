import { describe, expect, it } from "vitest";
import {
  CLIP_PLAYBACK_RATES,
  clipPlayerInitialStatus,
  clipShouldPlay,
  formatClipPlaybackRate,
  nextClipPlaybackRate,
  shouldRestartClipLoop,
} from "./clipPlayback.js";

describe("clipPlayback（原片暂停/倍速）", () => {
  it("倍速按 0.5 → 1 → 1.5 → 2 循环", () => {
    let rate: number = 0.5;
    const seen: number[] = [];
    for (let i = 0; i < CLIP_PLAYBACK_RATES.length; i += 1) {
      seen.push(rate);
      rate = nextClipPlaybackRate(rate);
    }
    expect(seen).toEqual([0.5, 1, 1.5, 2]);
    expect(rate).toBe(0.5);
  });

  it("未知倍速从 0.5 起跳", () => {
    expect(nextClipPlaybackRate(3)).toBe(0.5);
  });

  it("文案带 x", () => {
    expect(formatClipPlaybackRate(0.5)).toBe("0.5x");
    expect(formatClipPlaybackRate(1)).toBe("1x");
    expect(formatClipPlaybackRate(1.5)).toBe("1.5x");
    expect(formatClipPlaybackRate(2)).toBe("2x");
  });
});

describe("shouldRestartClipLoop（FR-086 换片后仍循环）", () => {
  it("播完且仍在播放 → 重开", () => {
    expect(
      shouldRestartClipLoop({ isLoaded: true, didJustFinish: true }, true),
    ).toBe(true);
  });

  it("用户已暂停 → 不重开", () => {
    expect(
      shouldRestartClipLoop({ isLoaded: true, didJustFinish: true }, false),
    ).toBe(false);
  });

  it("未播完或不加载 → 不重开", () => {
    expect(
      shouldRestartClipLoop({ isLoaded: true, didJustFinish: false }, true),
    ).toBe(false);
    expect(shouldRestartClipLoop({ isLoaded: false }, true)).toBe(false);
  });
});

describe("clipShouldPlay（骨骼模式不停掉播放器）", () => {
  it("骨骼模式强制暂停，切回样片才播", () => {
    expect(clipShouldPlay("bones", true)).toBe(false);
    expect(clipShouldPlay("clip", true)).toBe(true);
    expect(clipShouldPlay("clip", false)).toBe(false);
  });

  it("换片初始状态始终带 isLooping", () => {
    const status = clipPlayerInitialStatus(true, 1.5);
    expect(status.isLooping).toBe(true);
    expect(status.shouldPlay).toBe(true);
    expect(status.rate).toBe(1.5);
    expect(status.isMuted).toBe(true);
  });
});
