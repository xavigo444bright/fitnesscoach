/**
 * App adapter：用户骨骼 + 示范参考（M3 / FR-060）
 *
 * 当前参考层仍为 2D 骨架占位（轨迹对齐逻辑可复用）。
 * 产品方向为 FR-068 Plan C：3D 骨骼+肌肉；本组件将随后替换绘制层。
 */
import type { SkeletonScene } from '@fitness-coach/render';
import { colors } from '@fitness-coach/ui';
import { StyleSheet, View } from 'react-native';

type Props = {
  scene: SkeletonScene | null;
  ghost?: SkeletonScene | null;
  width: number;
  height: number;
  /** 参考开时隐藏用户白线，仅保留非 correct 关节色点 */
  guideMode?: boolean;
};

const REF_COLOR = '#38BDF8';
const REF_OPACITY = 0.85;
const REF_BONE_H = 5;
const REF_JOINT = 9;
const USER_BONE_H = 3;
const USER_JOINT = 10;

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
  opts: {
    colorFor: (status: string) => string;
    keyPrefix: string;
    opacity: number;
    boneHeight: number;
    jointSize: number;
    drawBones: boolean;
    jointsOnlyFaults?: boolean;
  },
) {
  const byIndex = new Map(scene.joints.map((j) => [j.index, j]));
  const halfJ = opts.jointSize / 2;
  return (
    <>
      {opts.drawBones
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
                    top: (p1.y + p2.y) / 2 - opts.boneHeight / 2,
                    width: length,
                    height: opts.boneHeight,
                    backgroundColor: opts.colorFor(bone.status),
                    opacity: opts.opacity,
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
                width: opts.jointSize,
                height: opts.jointSize,
                borderRadius: halfJ,
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
  guideMode = false,
}: Props) {
  if ((!scene && !ghost) || width <= 0 || height <= 0) return null;
  const guiding = guideMode && Boolean(ghost);

  return (
    <View style={[styles.root, { width, height }]} pointerEvents="none">
      {ghost
        ? drawScene(ghost, width, height, {
            colorFor: () => REF_COLOR,
            keyPrefix: 'g',
            opacity: REF_OPACITY,
            boneHeight: REF_BONE_H,
            jointSize: REF_JOINT,
            drawBones: true,
          })
        : null}
      {scene
        ? drawScene(scene, width, height, {
            colorFor: statusColor,
            keyPrefix: 'u',
            opacity: 1,
            boneHeight: USER_BONE_H,
            jointSize: USER_JOINT,
            drawBones: !guiding,
            jointsOnlyFaults: guiding,
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
    borderRadius: 2,
  },
  joint: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.overlayText,
  },
});
