/**
 * CMP-005 RepCounter（M3-T7 · UX-003）
 */
import type { RepCounterProps } from '@fitness-coach/ui';
import { colors, fontSize, layout, motion } from '@fitness-coach/ui';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = RepCounterProps;

export default function RepCounter({
  count,
  onEnd,
  endLabel = '结束',
}: Props) {
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
    <View style={styles.bar}>
      <View style={styles.repBlock}>
        <Text style={styles.caption}>Rep</Text>
        <Animated.Text style={[styles.count, { transform: [{ scale }] }]}>
          {count}
        </Animated.Text>
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
    height: layout.bottomBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.overlayScrim,
  },
  repBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  caption: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    fontWeight: '400',
  },
  count: {
    color: colors.overlayText,
    fontSize: fontSize.rep,
    fontWeight: '700',
  },
  endBtn: {
    minHeight: layout.touchMin,
    minWidth: layout.touchMin,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endLabel: {
    color: colors.overlayText,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
});
