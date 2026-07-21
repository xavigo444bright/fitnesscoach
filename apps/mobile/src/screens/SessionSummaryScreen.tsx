/**
 * PG-005 训练总结（M4-T5 / FR-072）
 */
import { colors, space } from '@fitness-coach/ui';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import SessionSummary from '../components/SessionSummary';
import type { SessionSummaryData } from '../types/session';

type Props = {
  summary: SessionSummaryData;
  onRetry: () => void;
  onBack: () => void;
};

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SessionSummaryScreen({
  summary,
  onRetry,
  onBack,
}: Props) {
  return (
    <View style={styles.root}>
      <SessionSummary
        reps={summary.reps}
        durationLabel={formatDuration(summary.durationMs)}
        topIssue={summary.topIssue}
        onRetry={onRetry}
        onBack={onBack}
      />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.md,
    paddingTop: 80,
    paddingBottom: 24,
    justifyContent: 'center',
  },
});
