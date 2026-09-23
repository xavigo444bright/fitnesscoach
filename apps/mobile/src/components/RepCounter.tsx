/**
 * CMP-005 RepCounter。T16：结束白胶囊、计数深色胶囊。不改计次逻辑。
 */
import type { RepCounterProps } from '@fitness-coach/ui';
import { colors, fontSize, layout, motion, radius, space } from '@fitness-coach/ui';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = RepCounterProps;

export default function RepCounter({
  count,
  onEnd,
  endLabel = '结束',
  caption = 'Rep',
}: Props) {
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      scale.setValue(1.2);
      Animated.timing(scale, {
        toValue: 1,
        duration: motion.repBumpMs,
        useNativeDriver: true,
      }).start();
    }
    prevCount.current = count;
  }, [count, scale]);

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, space.sm) },
      ]}
    >
      <View style={styles.repChip}>
        <Text style={styles.caption}>{caption}</Text>
        <View style={styles.countSlot}>
          <Animated.Text
            style={[
              styles.count,
              {
                transform: [
                  { scale },
                  { translateY: Platform.OS === 'ios' ? 2 : 0 },
                ],
              },
            ]}
          >
            {count}
          </Animated.Text>
        </View>
      </View>
      {onEnd ? (
        <Pressable
          style={styles.endBtn}
          onPress={onEnd}
          accessibilityRole="button"
          accessibilityLabel={endLabel}
        >
          <Text style={styles.endLabel}>{endLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: layout.bottomBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    backgroundColor: 'transparent',
  },
  repChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    height: layout.touchMin,
    paddingHorizontal: space.md,
    paddingVertical: 0,
    borderRadius: radius.pill,
    backgroundColor: colors.tabBar,
  },
  caption: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  countSlot: {
    height: fontSize.rep,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  count: {
    color: colors.textPrimary,
    fontSize: fontSize.rep,
    lineHeight: fontSize.rep,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  endBtn: {
    minHeight: layout.touchMin,
    minWidth: 88,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.cta,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endLabel: {
    color: colors.onCta,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
});
