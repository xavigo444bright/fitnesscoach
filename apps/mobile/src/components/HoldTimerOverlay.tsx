/**
 * hold_second 计时：与打勾同一角落，撑稳时显示秒数。
 */
import type { HoldTimerOverlayProps } from '@fitness-coach/ui';
import { colors, layout, motion } from '@fitness-coach/ui';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = HoldTimerOverlayProps;

export default function HoldTimerOverlay({ active, seconds }: Props) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const prevActive = useRef(false);
  const prevSeconds = useRef(seconds);

  useEffect(() => {
    if (!active) {
      prevActive.current = false;
      prevSeconds.current = seconds;
      return;
    }
    if (!prevActive.current) {
      opacity.setValue(0);
      scale.setValue(0.6);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 140,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (seconds > prevSeconds.current) {
      scale.setValue(1.2);
      Animated.timing(scale, {
        toValue: 1,
        duration: motion.repBumpMs,
        useNativeDriver: true,
      }).start();
    }
    prevActive.current = true;
    prevSeconds.current = seconds;
  }, [active, seconds, opacity, scale]);

  if (!active) return null;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingLeft: Math.max(16, insets.left),
          paddingBottom: layout.bottomBarHeight + Math.max(insets.bottom, 8) + 8,
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[styles.badge, { opacity, transform: [{ scale }] }]}
        accessibilityRole="text"
        accessibilityLabel={`计时进行中 ${seconds} 秒`}
      >
        <Text
          style={[styles.num, seconds >= 100 ? styles.numLong : null]}
        >
          {seconds}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    zIndex: 90,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.correct,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.overlayText,
  },
  num: {
    color: colors.overlayText,
    fontSize: 40,
    fontWeight: '700',
    marginTop: -2,
  },
  numLong: {
    fontSize: 28,
  },
});
