/**
 * FR-096：沙漏与剩余秒同步。上下拖沙子改休息时间。
 */
import { restRemainingFromSandFraction } from '@fitness-coach/core';
import { colors } from '@fitness-coach/ui';
import { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

const BULB_W = 168;
const BULB_H = 128;

type Props = {
  remainingSec: number;
  capacitySec: number;
  onScrub: (remainingSec: number) => void;
  onCommit: (remainingSec: number) => void;
};

export default function RestHourglass({
  remainingSec,
  capacitySec,
  onScrub,
  onCommit,
}: Props) {
  const cap = Math.max(1, capacitySec);
  const fraction = Math.min(1, Math.max(0, remainingSec / cap));
  const heightRef = useRef(BULB_H * 2 + 18);
  const latest = useRef(remainingSec);
  latest.current = remainingSec;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const next = remainingAt(evt.nativeEvent.locationY, heightRef.current, cap);
        latest.current = next;
        onScrub(next);
      },
      onPanResponderMove: (evt) => {
        const next = remainingAt(evt.nativeEvent.locationY, heightRef.current, cap);
        latest.current = next;
        onScrub(next);
      },
      onPanResponderRelease: () => {
        onCommit(latest.current);
      },
      onPanResponderTerminate: () => {
        onCommit(latest.current);
      },
    }),
  ).current;

  const topH = Math.round(fraction * BULB_H);
  const bottomH = Math.round((1 - fraction) * BULB_H);
  const flowing = fraction > 0 && fraction < 1;

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        heightRef.current = e.nativeEvent.layout.height;
      }}
      accessibilityRole="adjustable"
      accessibilityLabel="休息沙漏"
      accessibilityValue={{ min: 0, max: cap, now: remainingSec }}
      {...pan.panHandlers}
    >
      <View style={[styles.bulb, styles.topBulb]}>
        <View style={[styles.sand, { height: topH }]} />
      </View>
      <View style={styles.neck}>
        {flowing ? <View style={styles.stream} /> : null}
      </View>
      <View style={[styles.bulb, styles.bottomBulb]}>
        <View style={[styles.sand, { height: bottomH }]} />
      </View>
    </View>
  );
}

function remainingAt(
  locationY: number,
  height: number,
  capacitySec: number,
): number {
  const span = Math.max(1, height);
  return restRemainingFromSandFraction(locationY / span, capacitySec);
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    alignSelf: 'center',
  },
  bulb: {
    width: BULB_W,
    height: BULB_H,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  topBulb: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: BULB_W / 2,
    borderBottomRightRadius: BULB_W / 2,
    justifyContent: 'flex-end',
  },
  bottomBulb: {
    borderTopLeftRadius: BULB_W / 2,
    borderTopRightRadius: BULB_W / 2,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    justifyContent: 'flex-end',
  },
  neck: {
    width: 18,
    height: 18,
    marginVertical: -6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stream: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.textPrimary,
  },
  sand: {
    width: '100%',
    backgroundColor: colors.textPrimary,
  },
});
