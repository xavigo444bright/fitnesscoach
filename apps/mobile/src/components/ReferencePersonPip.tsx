/**
 * 示范窗「骨骼」参考人（FR-084 / FR-085）：窗内拟合用户当前 Pose，不跟样片。
 * 浅灰人体底 + 按 catalog.activeMuscles 强调主动肌；绿骨盖在色块上。
 */
import {
  type Pose,
  type TrajectoryExerciseId,
} from '@fitness-coach/core';
import {
  aabbFromRig,
  buildRig3d,
  buildSkeletonScene,
  fitAabbToPixelRect,
  mapSkeletonToPip,
  mapToPipPx,
  pipVolumesToPaint,
  type CameraHint,
  type PipFit,
  type PipVolumePaint,
} from '@fitness-coach/render';
import { colors, layout, muscleFill } from '@fitness-coach/ui';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { drawSkeletonScene } from './skeleton2d';

type Props = {
  pose: Pose | null;
  cameraHint?: CameraHint;
  exerciseId?: TrajectoryExerciseId;
  onReady?: () => void;
  /** 外层已有窗框时去掉标题与边框 */
  showCaption?: boolean;
  bare?: boolean;
};

const PIP_W = layout.refPersonPipWidth;
const PIP_H = layout.refPersonPipHeight;

function volumeView(paint: PipVolumePaint, fit: PipFit) {
  const vol = paint.volume;
  const c = mapToPipPx(vol.x, vol.y, fit);
  const w = Math.max(8, Math.abs(vol.rx) * 2 * fit.scale * paint.scale);
  const h = Math.max(8, Math.abs(vol.ry) * 2 * fit.scale * paint.scale);
  const angle = (Math.atan2(vol.dirY, vol.dirX) * 180) / Math.PI - 90;
  return (
    <View
      key={vol.id}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: c.x - w / 2,
        top: c.y - h / 2,
        width: w,
        height: h,
        borderRadius: Math.max(w, h) / 2,
        backgroundColor: muscleFill(vol.kind, paint.emphasis),
        zIndex: paint.emphasis === 'active' ? 1 : 0,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

export default function ReferencePersonPip({
  pose,
  cameraHint = 'side',
  exerciseId = 'squat',
  onReady,
  showCaption = true,
  bare = false,
}: Props) {
  const readyOnce = useRef(false);
  const rig = pose
    ? buildRig3d(pose, { cameraHint, exerciseId })
    : null;
  const aabb = rig ? aabbFromRig(rig) : null;
  const fit = aabb ? fitAabbToPixelRect(aabb, PIP_W, PIP_H) : null;
  const paints =
    pose && rig && fit
      ? pipVolumesToPaint(rig.volumes, { exerciseId, cameraHint, pose })
      : [];
  const skeleton = pose && fit
    ? mapSkeletonToPip(buildSkeletonScene(pose), fit)
    : null;

  useEffect(() => {
    if (rig && fit && !readyOnce.current) {
      readyOnce.current = true;
      onReady?.();
    }
  }, [rig, fit, onReady]);

  return (
    <View style={[styles.root, bare ? styles.bare : null]} pointerEvents="none">
      {fit ? paints.map((paint) => volumeView(paint, fit)) : null}
      {skeleton
        ? drawSkeletonScene(skeleton, PIP_W, PIP_H, {
            colorFor: () => colors.correct,
            keyPrefix: 'pip',
            zIndex: 4,
          })
        : null}
      {showCaption ? <Text style={styles.caption}>示范</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: PIP_W,
    height: PIP_H,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.45)',
  },
  bare: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
  },
  caption: {
    position: 'absolute',
    top: 6,
    left: 8,
    zIndex: 5,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '700',
  },
});
