/**
 * App adapter：用户骨骼 + 示范参考骨架（M3 / FR-060 / FR-068）
 *
 * 参考开：青色 anatomy guides（脊柱/头/肢/髋）+ 用户「纠错色点」（无白线）。
 * 参考关：完整用户绿/黄/红骨。
 */
import type { GuidePath, SkeletonScene } from '@fitness-coach/render';
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
const REF_OPACITY = 0.92;
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

function strokePx(
  scene: SkeletonScene,
  strokeWidth: number,
  width: number,
  height: number,
): number {
  const short = Math.min(width, height);
  if (scene.space === 'pixel') {
    return Math.max(3, Math.min(14, strokeWidth));
  }
  return Math.max(3.5, Math.min(16, strokeWidth * short));
}

/** 折线 → 旋转 View 骨段 */
function drawPolyline(
  points: { x: number; y: number }[],
  opts: {
    keyPrefix: string;
    color: string;
    opacity: number;
    boneHeight: number;
  },
) {
  const segs = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 1) continue;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    segs.push(
      <View
        key={`${opts.keyPrefix}-${i}`}
        style={[
          styles.bone,
          {
            left: (p1.x + p2.x) / 2 - length / 2,
            top: (p1.y + p2.y) / 2 - opts.boneHeight / 2,
            width: length,
            height: opts.boneHeight,
            backgroundColor: opts.color,
            opacity: opts.opacity,
            borderRadius: opts.boneHeight / 2,
            transform: [{ rotate: `${angle}deg` }],
          },
        ]}
      />,
    );
  }
  return segs;
}

function drawGuides(
  scene: SkeletonScene,
  guides: GuidePath[],
  width: number,
  height: number,
) {
  return guides.map((g) => {
    const pts = g.points.map((p) => toPx(scene, p.x, p.y, width, height));
    const h = strokePx(scene, g.strokeWidth, width, height);
    const opacity =
      g.kind === 'spine' ? REF_OPACITY : g.kind === 'head' ? 0.85 : REF_OPACITY;
    return drawPolyline(pts, {
      keyPrefix: `g-${g.id}`,
      color: REF_COLOR,
      opacity,
      boneHeight: h,
    });
  });
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
    /** 仅绘制非 correct 关节（指导模式） */
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
  const hasGuides = Boolean(ghost?.guides && ghost.guides.length > 0);

  return (
    <View style={[styles.root, { width, height }]} pointerEvents="none">
      {ghost
        ? hasGuides
          ? (
              <>
                {drawGuides(ghost, ghost.guides!, width, height)}
                {drawScene(ghost, width, height, {
                  colorFor: () => REF_COLOR,
                  keyPrefix: 'g',
                  opacity: 0.75,
                  boneHeight: 2,
                  jointSize: REF_JOINT,
                  drawBones: false,
                })}
              </>
            )
          : drawScene(ghost, width, height, {
              colorFor: () => REF_COLOR,
              keyPrefix: 'g',
              opacity: REF_OPACITY,
              boneHeight: 5,
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
