/**
 * 示范窗位置：默认可在右下，允许拖到全屏任意处，不吸附贴边。
 * 仅把窗口夹在屏幕内，避免整窗拖出可视区。
 * 收起：主窗折向水平近边，屏内留小手柄（FR-084）。
 */
import { layout } from "./theme.js";

export type PipPoint = { x: number; y: number };

export function clampPipPosition(
  x: number,
  y: number,
  screenW: number,
  screenH: number,
  pipW: number = layout.refPersonPipWidth,
  pipH: number = layout.refPersonPipHeight,
): PipPoint {
  const maxX = Math.max(0, screenW - pipW);
  const maxY = Math.max(0, screenH - pipH);
  return {
    x: Math.min(maxX, Math.max(0, x)),
    y: Math.min(maxY, Math.max(0, y)),
  };
}

/** 默认落点：底栏之上、右侧留白。不是强制贴边，只是初次位置。 */
export function defaultPipPosition(
  screenW: number,
  screenH: number,
  pipW: number = layout.refPersonPipWidth,
  pipH: number = layout.refPersonPipHeight,
): PipPoint {
  return clampPipPosition(
    screenW - pipW - 12,
    screenH - pipH - layout.bottomBarHeight - 24,
    screenW,
    screenH,
    pipW,
    pipH,
  );
}

/**
 * 收起后的小手柄位置：按展开窗中心落在左/右半屏，滑向对应水平边。
 * 手柄整颗留在屏内；Y 尽量对齐展开窗垂直中心。
 */
export function collapsedTabPosition(
  expanded: PipPoint,
  screenW: number,
  screenH: number,
  pipW: number = layout.refPersonPipWidth,
  pipH: number = layout.refPersonPipHeight,
  tabW: number = layout.refPersonPipTabWidth,
  tabH: number = layout.refPersonPipTabHeight,
): PipPoint {
  const centerX = expanded.x + pipW / 2;
  const dockRight = centerX >= screenW / 2;
  const x = dockRight ? screenW - tabW : 0;
  const y = expanded.y + pipH / 2 - tabH / 2;
  return clampPipPosition(x, y, screenW, screenH, tabW, tabH);
}

/** 拉开后回到收起前位置，并按展开尺寸夹回屏内。 */
export function restoredPipPosition(
  saved: PipPoint,
  screenW: number,
  screenH: number,
  pipW: number = layout.refPersonPipWidth,
  pipH: number = layout.refPersonPipHeight,
): PipPoint {
  return clampPipPosition(saved.x, saved.y, screenW, screenH, pipW, pipH);
}
