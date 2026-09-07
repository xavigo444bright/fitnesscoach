import { describe, expect, it } from "vitest";
import { layout } from "./theme.js";
import {
  clampPipPosition,
  collapsedTabPosition,
  defaultPipPosition,
  restoredPipPosition,
} from "./pipPosition.js";

describe("pipPosition（示范窗可拖、不吸附贴边）", () => {
  const W = 390;
  const H = 844;
  const pipW = layout.refPersonPipWidth;
  const pipH = layout.refPersonPipHeight;

  it("高度约比旧 220 高 35%", () => {
    expect(pipH).toBeGreaterThanOrEqual(Math.round(220 * 1.3));
    expect(pipH).toBeLessThanOrEqual(Math.round(220 * 1.4));
  });

  it("夹在屏内，不强制改到边角", () => {
    const mid = clampPipPosition(120, 200, W, H, pipW, pipH);
    expect(mid).toEqual({ x: 120, y: 200 });
  });

  it("超出屏幕时只裁切，不吸附右下", () => {
    const over = clampPipPosition(9999, -40, W, H, pipW, pipH);
    expect(over.x).toBe(W - pipW);
    expect(over.y).toBe(0);
    expect(over.x).not.toBe(0);
  });

  it("默认位置在屏内且窗完整可见", () => {
    const p = defaultPipPosition(W, H, pipW, pipH);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.x + pipW).toBeLessThanOrEqual(W);
    expect(p.y + pipH).toBeLessThanOrEqual(H);
  });

  it("右半屏收起到右缘，手柄完整在屏内", () => {
    const expanded = { x: 200, y: 400 };
    const tab = collapsedTabPosition(expanded, W, H);
    const tabW = layout.refPersonPipTabWidth;
    const tabH = layout.refPersonPipTabHeight;
    expect(tab.x).toBe(W - tabW);
    expect(tab.x).toBeGreaterThanOrEqual(0);
    expect(tab.y).toBeGreaterThanOrEqual(0);
    expect(tab.x + tabW).toBeLessThanOrEqual(W);
    expect(tab.y + tabH).toBeLessThanOrEqual(H);
  });

  it("左半屏收起到 x=0", () => {
    const tab = collapsedTabPosition({ x: 8, y: 120 }, W, H);
    expect(tab.x).toBe(0);
  });

  it("拉开回到收起前位置并夹回屏内", () => {
    const saved = { x: 40, y: 80 };
    expect(restoredPipPosition(saved, W, H)).toEqual(saved);
    const overflow = restoredPipPosition({ x: 9999, y: -20 }, W, H);
    expect(overflow.x).toBe(W - pipW);
    expect(overflow.y).toBe(0);
  });
});
