/**
 * App adapter：用户 2D 骨骼（M3 / FR-060）
 *
 * 身上只画跟自己的实时骨骼（M12 之前那套贴身跟踪）。
 * 样片姿势/样片循环只出现在示范窗，不叠回摄像头。
 */
import type { SkeletonScene } from '@fitness-coach/render';
import { StyleSheet, View } from 'react-native';
import { drawSkeletonScene, skeletonStatusColor } from './skeleton2d';

type Props = {
  scene: SkeletonScene | null;
  width: number;
  height: number;
};

export default function SkeletonOverlay({ scene, width, height }: Props) {
  if (!scene || width <= 0 || height <= 0) return null;

  return (
    <View style={[styles.root, { width, height }]} pointerEvents="none">
      {drawSkeletonScene(scene, width, height, {
        colorFor: skeletonStatusColor,
        keyPrefix: 'user',
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
});
