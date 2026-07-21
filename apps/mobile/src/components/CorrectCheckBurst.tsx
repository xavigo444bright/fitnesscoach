/**
 * 有效 rep +1 时绿色打勾小动效（UX-007）
 */
import { colors, motion } from '@fitness-coach/ui';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type Props = {
  /** 传入当前 rep；增加时播一次。 */
  repCount: number;
};

export default function CorrectCheckBurst({ repCount }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const prev = useRef(repCount);

  useEffect(() => {
    if (repCount <= prev.current) {
      prev.current = repCount;
      return;
    }
    prev.current = repCount;
    opacity.setValue(0);
    scale.setValue(0.6);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: Math.max(180, motion.correctCheckMs - 120),
          delay: 220,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.12,
          friction: 5,
          tension: 140,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [repCount, opacity, scale]);

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        style={[
          styles.badge,
          { opacity, transform: [{ scale }] },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={styles.check}>✓</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
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
  check: {
    color: colors.overlayText,
    fontSize: 40,
    fontWeight: '700',
    marginTop: -2,
  },
});
