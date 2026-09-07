/**
 * 2D 骨骼（FR-060）：绿/黄/红关节圆点 + 细骨段连线。
 * 录屏 2026-08-17 00-17-26 的视觉真源。用户口误「参考线」即此，不是 3D 胶囊。
 */
import type { SkeletonScene } from '@fitness-coach/render';
import { colors } from '@fitness-coach/ui';
import { StyleSheet, View } from 'react-native';

export const SKELETON_BONE_H = 3;
export const SKELETON_JOINT = 10;

export function skeletonStatusColor(status: string): string {
  switch (status) {
    case 'warning':
      return colors.warning;
    case 'error':
      return colors.error;
    default:
      return colors.correct;
  }
}

function toPx(
  scene: SkeletonScene,
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number } {
  if (scene.space === 'pixel') return { x, y };
  return { x: x * width, y: y * height };
}

export function drawSkeletonScene(
  scene: SkeletonScene,
  width: number,
  height: number,
  opts: {
    colorFor: (status: string) => string;
    keyPrefix: string;
    opacity?: number;
    drawBones?: boolean;
    jointsOnlyFaults?: boolean;
    zIndex?: number;
  },
) {
  const byIndex = new Map(scene.joints.map((j) => [j.index, j]));
  const halfJ = SKELETON_JOINT / 2;
  const opacity = opts.opacity ?? 1;
  const drawBones = opts.drawBones !== false;
  const zIndex = opts.zIndex;
  return (
    <>
      {drawBones
        ? scene.bones.map((bone) => {
            const a = byIndex.get(bone.from);
            const b = byIndex.get(bone.to);
            if (!a || !b) return null;
            const p1 = toPx(scene, a.x, a.y, width, height);
            const p2 = toPx(scene, b.x, b.y, width, height);
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length < 1) return null;
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            return (
              <View
                key={`${opts.keyPrefix}-b-${bone.from}-${bone.to}`}
                style={[
                  styles.bone,
                  {
                    left: (p1.x + p2.x) / 2 - length / 2,
                    top: (p1.y + p2.y) / 2 - SKELETON_BONE_H / 2,
                    width: length,
                    height: SKELETON_BONE_H,
                    backgroundColor: opts.colorFor(bone.status),
                    opacity,
                    zIndex,
                    transform: [{ rotate: `${angle}deg` }],
                  },
                ]}
              />
            );
          })
        : null}
      {scene.joints.map((j) => {
        if (opts.jointsOnlyFaults && j.status === 'correct') return null;
        const p = toPx(scene, j.x, j.y, width, height);
        return (
          <View
            key={`${opts.keyPrefix}-j-${j.index}`}
            style={[
              styles.joint,
              {
                left: p.x - halfJ,
                top: p.y - halfJ,
                width: SKELETON_JOINT,
                height: SKELETON_JOINT,
                borderRadius: halfJ,
                backgroundColor: opts.colorFor(j.status),
                opacity,
                zIndex,
              },
            ]}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  bone: {
    position: 'absolute',
    borderRadius: 2,
  },
  joint: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.overlayText,
  },
});
