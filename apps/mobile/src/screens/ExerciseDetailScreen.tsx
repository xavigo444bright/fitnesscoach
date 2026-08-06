/**
 * PG-002 动作详情（FR-002）；catalog 项禁用开始训练
 * 标准动作示意：预渲染 3D 视频（非训练页 Ghost）
 */
import {
  BODY_PART_LABEL,
  EQUIPMENT_LABEL,
  getCatalogEntry,
  isCoachableId,
} from '@fitness-coach/core';
import { colors, fontSize, layout, radius, space } from '@fitness-coach/ui';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ExerciseDemoPlayer from '../components/ExerciseDemoPlayer';

type Props = {
  exerciseId: string;
  onBack: () => void;
  onStart: () => void;
};

const CAMERA_COPY = {
  side: {
    title: '推荐机位：侧面',
    tips: [
      '手机竖屏，高度约及腰，与地面约 15–30°',
      '关键关节入画即可',
      '左侧或右侧均可，整段动作保持同一侧面',
    ],
  },
  front: {
    title: '推荐机位：正面',
    tips: ['手机竖屏正对身体', '全身入镜，关键关节可见'],
  },
} as const;

export default function ExerciseDetailScreen({
  exerciseId,
  onBack,
  onStart,
}: Props) {
  const entry = getCatalogEntry(exerciseId);
  if (!entry) {
    return (
      <View style={styles.root}>
        <Pressable onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.bullet}>未找到该动作</Text>
      </View>
    );
  }

  const camera = CAMERA_COPY[entry.cameraHint];
  const coachable = isCoachableId(entry.id);
  const showDemo = Boolean(entry.demoAsset) || coachable;

  return (
    <View style={styles.root}>
      <Pressable onPress={onBack} style={styles.back} accessibilityRole="button">
        <Text style={styles.backText}>← {entry.name}</Text>
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {showDemo ? (
          <ExerciseDemoPlayer
            exerciseName={entry.name}
            demoAsset={entry.demoAsset}
          />
        ) : (
          <View style={styles.diagram} accessibilityLabel="机位示意图">
            <View style={styles.phone} />
            <View style={styles.person}>
              <View style={styles.head} />
              <View style={styles.torso} />
              <View style={styles.leg} />
            </View>
            <Text style={styles.diagramCaption}>{camera.title}</Text>
          </View>
        )}

        <Text style={styles.meta}>
          {BODY_PART_LABEL[entry.bodyPart]} · {EQUIPMENT_LABEL[entry.equipment]}{' '}
          · {camera.title.replace('推荐机位：', '')}
        </Text>

        <Text style={styles.section}>动作要点</Text>
        {entry.cues.map((line) => (
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

        {entry.statusNote ? (
          <Text style={styles.note}>{entry.statusNote}</Text>
        ) : null}
      </ScrollView>

      <Pressable
        style={[styles.cta, !coachable && styles.ctaDisabled]}
        onPress={coachable ? onStart : undefined}
        disabled={!coachable}
        accessibilityRole="button"
        accessibilityLabel={coachable ? '开始训练' : '即将支持教练'}
      >
        <Text style={[styles.ctaText, !coachable && styles.ctaTextDisabled]}>
          {coachable ? '开始训练' : '即将支持教练'}
        </Text>
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
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    marginBottom: space.md,
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
  note: {
    marginTop: space.lg,
    color: colors.warning,
    fontSize: fontSize.caption,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.85,
  },
  ctaText: {
    color: colors.overlayText,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  ctaTextDisabled: {
    color: colors.textSecondary,
  },
});
