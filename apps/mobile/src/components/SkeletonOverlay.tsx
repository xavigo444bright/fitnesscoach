/**
 * App adapter：用户骨骼 + Ghost（M3-T1/T6 / FR-060/064）
 */
import type { SkeletonScene } from '@fitness-coach/render';
import { colors, layout } from '@fitness-coach/ui';
import { StyleSheet, View } from 'react-native';

type Props = {
  scene: SkeletonScene | null;
  ghost?: SkeletonScene | null;
  width: number;
  height: number;
};

function statusColor(status: string): string {
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

function drawScene(
  scene: SkeletonScene,
  width: number,
  height: number,
  opts: { colorFor: (status: string) => string; keyPrefix: string; opacity: number },
) {
  const byIndex = new Map(scene.joints.map((j) => [j.index, j]));
  return (
    <>
      {scene.bones.map((bone) => {
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
                top: (p1.y + p2.y) / 2 - 1.5,
                width: length,
                backgroundColor: opts.colorFor(bone.status),
                opacity: opts.opacity,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}
      {scene.joints.map((j) => {
        const p = toPx(scene, j.x, j.y, width, height);
        return (
          <View
            key={`${opts.keyPrefix}-j-${j.index}`}
            style={[
              styles.joint,
              {
                left: p.x - 5,
                top: p.y - 5,
                backgroundColor: opts.colorFor(j.status),
                opacity: opts.opacity,
              },
            ]}
          />
        );
      })}
    </>
  );
}

export default function SkeletonOverlay({
  scene,
  ghost,
  width,
  height,
}: Props) {
  if ((!scene && !ghost) || width <= 0 || height <= 0) return null;

  return (
    <View style={[styles.root, { width, height }]} pointerEvents="none">
      {ghost
        ? drawScene(ghost, width, height, {
            colorFor: () => colors.ghost,
            keyPrefix: 'g',
            opacity: layout.ghostOpacity,
          })
        : null}
      {scene
        ? drawScene(scene, width, height, {
            colorFor: statusColor,
            keyPrefix: 'u',
            opacity: 1,
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  bone: {
    position: 'absolute',
    height: 3,
    borderRadius: 2,
  },
  joint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.overlayText,
  },
});
