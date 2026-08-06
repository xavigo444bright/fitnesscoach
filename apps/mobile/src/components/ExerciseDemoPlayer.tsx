/**
 * 详情页标准动作预渲染 3D 示意（循环视频）。
 * 无本地资源时显示占位，不回退骨架 Ghost。
 */
import { colors, fontSize, radius, space } from '@fitness-coach/ui';
import { ResizeMode, Video } from 'expo-av';
import { StyleSheet, Text, View } from 'react-native';
import { resolveDemoAsset } from '../demoAssets';

type Props = {
  exerciseName: string;
  /** catalog.demoAsset，如 squat.mp4 */
  demoAsset?: string;
};

export default function ExerciseDemoPlayer({
  exerciseName,
  demoAsset,
}: Props) {
  const source = resolveDemoAsset(demoAsset);

  if (source == null) {
    return (
      <View
        style={styles.wrap}
        accessibilityLabel={`${exerciseName}标准3D示意待导入`}
      >
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>标准 3D 示意待导入</Text>
          <Text style={styles.placeholderName}>{exerciseName}</Text>
          <Text style={styles.placeholderHint}>
            将预渲染循环片放入 assets/demos/
            {demoAsset ? `\n文件名：${demoAsset}` : ''}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityLabel={`${exerciseName}标准动作示意`}>
      <Video
        style={styles.video}
        source={source}
        resizeMode={ResizeMode.CONTAIN}
        isLooping
        shouldPlay
        isMuted
        useNativeControls={false}
      />
      <Text style={styles.caption}>标准动作示意（循环）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: space.lg,
    minHeight: 220,
  },
  video: {
    width: '100%',
    height: 240,
    backgroundColor: '#FFFFFF',
  },
  caption: {
    textAlign: 'center',
    paddingVertical: space.sm,
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    backgroundColor: '#FFFFFF',
  },
  placeholder: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
  },
  placeholderTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '700',
    marginBottom: space.sm,
  },
  placeholderName: {
    color: '#E85D04',
    fontSize: fontSize.title,
    fontWeight: '800',
    marginBottom: space.md,
  },
  placeholderHint: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});
