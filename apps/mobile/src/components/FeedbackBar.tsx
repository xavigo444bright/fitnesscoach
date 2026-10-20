/**
 * PG-004 FeedbackBar 最小实现（M3-T3）
 */
import type { FeedbackBarItem } from '@fitness-coach/render';
import { colors, fontSize, layout } from '@fitness-coach/ui';
import { StyleSheet, Text, View } from 'react-native';
import { useTr } from '../i18n';

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
  const tr = useTr();
  if (items.length === 0) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      {items.slice(0, layout.feedbackBarMaxLines).map((item) => (
        <Text
          key={`${item.phase}-${item.ruleId}`}
          style={[styles.line, { color: barColor(item) }]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          allowFontScaling={false}
        >
          {item.phase === 'recovered' ? '✓ ' : '⚠ '}
          {tr(item.message)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minHeight: layout.feedbackBarMinHeight,
    backgroundColor: colors.overlayScrim,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  line: {
    color: colors.overlayText,
    fontSize: fontSize.feedback,
    fontWeight: '600',
    marginBottom: 2,
  },
});
