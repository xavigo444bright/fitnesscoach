/**
 * 把 rig 的归一化 AABB 等比装进像素矩形并居中。
 * 小窗参考人用同一套映射，避免 expo-gl viewport 把人钉在左下/贴底。
 */

import type { Rig3dScene } from "./rig3d.js";
import type { SkeletonScene } from "./types.js";

export type Aabb2 = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type PipFit = {
  scale: number;
  originX: number;
  originY: number;
};

export function aabbFromRig(rig: Rig3dScene): Aabb2 | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const j of rig.joints) add(j.x, j.y);
  for (const v of rig.volumes) {
    const len = Math.hypot(v.dirX, v.dirY) || 1;
    const ux = v.dirX / len;
    const uy = v.dirY / len;
    const px = -uy;
    const py = ux;
    const rx = Math.abs(v.rx);
    const ry = Math.abs(v.ry);
    for (const sx of [-1, 1] as const) {
      for (const sy of [-1, 1] as const) {
        add(
          v.x + sx * rx * px + sy * ry * ux,
          v.y + sx * rx * py + sy * ry * uy,
        );
      }
    }
  }
  if (!Number.isFinite(minX) || maxX - minX < 1e-6 || maxY - minY < 1e-6) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

export function fitAabbToPixelRect(
  aabb: Aabb2,
  pipW: number,
  pipH: number,
  margin = 0.1,
): PipFit {
  const spanX = Math.max(1e-6, aabb.maxX - aabb.minX);
  const spanY = Math.max(1e-6, aabb.maxY - aabb.minY);
  const scale = Math.min(
    (pipW * (1 - 2 * margin)) / spanX,
    (pipH * (1 - 2 * margin)) / spanY,
  );
  const cx = (aabb.minX + aabb.maxX) / 2;
  const cy = (aabb.minY + aabb.maxY) / 2;
  return {
    scale,
    originX: pipW / 2 - cx * scale,
    originY: pipH / 2 - cy * scale,
  };
}

export function mapToPipPx(
  x: number,
  y: number,
  fit: PipFit,
): { x: number; y: number } {
  return { x: x * fit.scale + fit.originX, y: y * fit.scale + fit.originY };
}

/** 把归一化 2D 骨骼映到小窗像素，与体积同一套 fit。 */
export function mapSkeletonToPip(
  scene: SkeletonScene,
  fit: PipFit,
): SkeletonScene {
  return {
    ...scene,
    space: "pixel",
    joints: scene.joints.map((j) => {
      const p = mapToPipPx(j.x, j.y, fit);
      return { ...j, x: p.x, y: p.y };
    }),
  };
}
