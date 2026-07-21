/**
 * CMP-008 SessionSummary（M4-T5 / FR-072）
 */
import type { SessionSummaryProps } from '@fitness-coach/ui';
import { colors, fontSize, layout, radius, space } from '@fitness-coach/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = SessionSummaryProps;

export default function SessionSummary({
  reps,
  durationLabel,
  topIssue,
  onRetry,
  onBack,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>本次训练完成</Text>
      <Text style={styles.stats}>
        {reps} rep · {durationLabel}
      </Text>
      {topIssue ? (
        <Text style={styles.issue}>
          最常见问题：{topIssue.message}（{topIssue.count}）
        </Text>
      ) : (
        <Text style={styles.issueOk}>未记录到持续错误，继续保持</Text>
      )}
      <View style={styles.actions}>
        <Pressable
          style={styles.primary}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="再来一组"
        >
          <Text style={styles.primaryText}>再来一组</Text>
        </Pressable>
        <Pressable
          style={styles.secondary}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="返回"
        >
          <Text style={styles.secondaryText}>返回</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  stats: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  issue: {
    color: colors.warning,
    fontSize: fontSize.body,
    lineHeight: 24,
  },
  issueOk: {
    color: colors.correct,
    fontSize: fontSize.body,
    lineHeight: 24,
  },
  actions: {
    marginTop: space.sm,
    gap: space.sm,
  },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: colors.overlayText,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  secondary: {
    borderRadius: radius.sm,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  secondaryText: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
});
