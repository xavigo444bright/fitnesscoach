/**
 * PG-004 FeedbackBar 最小实现（M3-T3）
 */
import type { FeedbackBarItem } from '@fitness-coach/render';
import { colors, layout } from '@fitness-coach/ui';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  items: FeedbackBarItem[];
};

function barColor(item: FeedbackBarItem): string {
  if (item.phase === 'recovered' || item.severity === 'correct') {
    return colors.correct;
  }
  if (item.severity === 'warning') return colors.warning;
  return colors.error;
}

export default function FeedbackBar({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      {items.slice(0, layout.feedbackBarMaxLines).map((item) => (
        <Text
          key={`${item.phase}-${item.ruleId}`}
          style={[styles.line, { color: barColor(item) }]}
          numberOfLines={1}
        >
          {item.phase === 'recovered' ? '✓ ' : '⚠ '}
          {item.message}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: layout.feedbackBarMinHeight,
    backgroundColor: colors.overlayScrim,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  line: {
    color: colors.overlayText,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
});
