/**
 * 上一不标准 rep 问题回看（UX-008）
 */
import type { FaultIssue } from '@fitness-coach/render';
import { colors, fontSize, layout, space } from '@fitness-coach/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  issues: FaultIssue[];
  reviewing: boolean;
  onToggle: () => void;
};

export default function LastFaultReview({
  issues,
  reviewing,
  onToggle,
}: Props) {
  if (issues.length === 0) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        style={styles.chip}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={reviewing ? '收起上次问题' : '查看上次问题'}
        hitSlop={8}
      >
        <Text style={styles.chipText}>
          {reviewing ? '收起上次问题' : `查看上次问题 · ${issues.length}`}
        </Text>
      </Pressable>
      {reviewing
        ? issues.slice(0, 2).map((iss) => (
            <View key={iss.id} style={styles.card}>
              <Text
                style={[
                  styles.msg,
                  {
                    color:
                      iss.severity === 'warning'
                        ? colors.warning
                        : colors.error,
                  },
                ]}
                numberOfLines={2}
              >
                ⚠ {iss.message}
              </Text>
            </View>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.sm,
    alignItems: 'flex-start',
    gap: 6,
  },
  chip: {
    minHeight: layout.touchMin,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
  },
  chipText: {
    color: colors.overlayText,
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.overlayScrim,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  msg: {
    fontSize: fontSize.feedback,
    fontWeight: '600',
  },
});
