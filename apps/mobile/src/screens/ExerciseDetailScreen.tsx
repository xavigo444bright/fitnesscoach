/**
 * PG-002 动作详情（M4-T2 / FR-002 / UI-004）
 */
import { SQUAT } from '@fitness-coach/core';
import { colors, fontSize, layout, radius, space } from '@fitness-coach/ui';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  onBack: () => void;
  onStart: () => void;
};

const CAMERA_COPY = {
  side: {
    title: '推荐机位：侧面',
    tips: [
      '手机竖屏，高度约及腰，与地面约 15–30°',
      '站在画面中下部，髋、膝、踝入画即可',
      '左侧或右侧均可，整段动作保持同一侧面',
    ],
  },
  front: {
    title: '推荐机位：正面',
    tips: ['手机竖屏正对身体', '全身入镜，双脚与肩同宽可见'],
  },
} as const;

const SQUAT_CUES = [
  '蹲至大腿约平行（膝角进入底部）',
  '膝与脚尖方向一致，避免内扣（正面更易观察）',
  '躯干适度前倾即可，避免过度折腰',
];

export default function ExerciseDetailScreen({ onBack, onStart }: Props) {
  const camera = CAMERA_COPY[SQUAT.cameraHint];

  return (
    <View style={styles.root}>
      <Pressable onPress={onBack} style={styles.back} accessibilityRole="button">
        <Text style={styles.backText}>← {SQUAT.name}</Text>
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.diagram} accessibilityLabel="侧面机位示意图">
          <View style={styles.phone} />
          <View style={styles.person}>
            <View style={styles.head} />
            <View style={styles.torso} />
            <View style={styles.leg} />
          </View>
          <Text style={styles.diagramCaption}>{camera.title}</Text>
        </View>

        <Text style={styles.section}>动作要点</Text>
        {SQUAT_CUES.map((line) => (
          <Text key={line} style={styles.bullet}>
            · {line}
          </Text>
        ))}

        <Text style={[styles.section, { marginTop: space.lg }]}>摆机位</Text>
        {camera.tips.map((line) => (
          <Text key={line} style={styles.bullet}>
            · {line}
          </Text>
        ))}
      </ScrollView>

      <Pressable
        style={styles.cta}
        onPress={onStart}
        accessibilityRole="button"
        accessibilityLabel="开始训练"
      >
        <Text style={styles.ctaText}>开始训练</Text>
      </Pressable>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.md,
    paddingTop: 56,
    paddingBottom: 24,
  },
  back: {
    minHeight: layout.touchMin,
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  backText: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  body: {
    paddingBottom: space.lg,
  },
  diagram: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.lg,
    marginBottom: space.lg,
    overflow: 'hidden',
  },
  phone: {
    position: 'absolute',
    left: 28,
    width: 36,
    height: 64,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.bg,
  },
  person: {
    alignItems: 'center',
    marginLeft: 40,
  },
  head: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.textSecondary,
  },
  torso: {
    width: 18,
    height: 40,
    marginTop: 4,
    borderRadius: 4,
    backgroundColor: colors.textPrimary,
    transform: [{ rotate: '-18deg' }],
  },
  leg: {
    width: 14,
    height: 36,
    marginTop: 2,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
    transform: [{ rotate: '28deg' }],
  },
  diagramCaption: {
    marginTop: space.md,
    color: colors.textSecondary,
    fontSize: fontSize.caption,
  },
  section: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '700',
    marginBottom: space.sm,
  },
  bullet: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    lineHeight: 24,
    marginBottom: 4,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: colors.overlayText,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
});
