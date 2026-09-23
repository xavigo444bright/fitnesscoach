/**
 * 详情页示范：复用训练示范窗同一套压缩原片（T18）。
 * 不是 FR-064 预渲染 3D。无播放器 / 无片时占位，不冒充骨骼。
 */
import {
  isCoachableId,
  type CameraHint,
} from '@fitness-coach/core';
import {
  DEFAULT_CLIP_PLAYBACK_RATE,
  colors,
  fontSize,
  radius,
  space,
} from '@fitness-coach/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import PipClipPane from './PipClipPane';

type Props = {
  exerciseId: string;
  exerciseName: string;
  cameraHint: CameraHint;
};

export default function ExerciseDemoPlayer({
  exerciseId,
  exerciseName,
  cameraHint,
}: Props) {
  const [playing, setPlaying] = useState(true);

  if (!isCoachableId(exerciseId)) {
    return (
      <View
        style={styles.wrap}
        accessibilityLabel={`${exerciseName}暂无示范片`}
      >
        <Text style={styles.placeholderTitle}>暂无示范片</Text>
        <Text style={styles.placeholderHint}>{exerciseName} · 即将支持教练</Text>
      </View>
    );
  }

  return (
    <Pressable
      style={styles.wrap}
      onPress={() => setPlaying((on) => !on)}
      accessibilityRole="button"
      accessibilityLabel={
        playing ? `${exerciseName}示范片，点一下暂停` : `${exerciseName}示范片，点一下继续`
      }
    >
      <PipClipPane
        exerciseId={exerciseId}
        cameraHint={cameraHint}
        playing={playing}
        rate={DEFAULT_CLIP_PLAYBACK_RATE}
        unavailableHint="示范片暂时播不了。机位说明仍在下方。"
      />
      <View style={styles.caption} pointerEvents="none">
        <Text style={styles.captionText}>
          {playing ? '示范 · 点一下暂停' : '已暂停 · 点一下继续'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: space.lg,
    minHeight: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '700',
    marginBottom: space.sm,
  },
  placeholderHint: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 8,
    paddingHorizontal: space.sm,
    backgroundColor: colors.bg,
  },
  captionText: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
});
