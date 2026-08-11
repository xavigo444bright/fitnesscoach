/**
 * 详情页标准动作预渲染 3D 示意（循环视频）。
 *
 * FR-064 为 P2：当前 Dev Client 可能未编入 ExponentAV。
 * **禁止**在未确认原生模块存在时 require('expo-av')——Hermes 会对缺失原生模块
 * 抛出无法被 try/catch 消掉的红屏。有片 + rebuild 后再打开下方 VIDEO_ENABLED。
 */
import { colors, fontSize, radius, space } from '@fitness-coach/ui';
import { StyleSheet, Text, View } from 'react-native';

/**
 * 需要同时满足：
 * 1) Dev Client 已 `expo run:ios` 编入 expo-av
 * 2) assets/demos 有片且 demoAssets registry 已 require
 * 才改为 true，并恢复 Video 播放分支。
 */
const VIDEO_ENABLED = false;

type Props = {
  exerciseName: string;
  /** catalog.demoAsset，如 squat.mp4 */
  demoAsset?: string;
};

export default function ExerciseDemoPlayer({
  exerciseName,
  demoAsset,
}: Props) {
  // VIDEO_ENABLED 预留给 rebuild 后接回；现阶段恒为占位，避免加载 expo-av。
  void VIDEO_ENABLED;

  return (
    <View
      style={styles.wrap}
      accessibilityLabel={`${exerciseName}标准3D示意待导入`}
    >
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>标准 3D 示意待导入</Text>
        <Text style={styles.placeholderName}>{exerciseName}</Text>
        <Text style={styles.placeholderHint}>
          详情示意片为 P2，不阻塞训练。需播片时重装含 expo-av 的 Dev Client，并将
          mp4 放入 assets/demos/
          {demoAsset ? `\n文件名：${demoAsset}` : ''}
        </Text>
      </View>
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
