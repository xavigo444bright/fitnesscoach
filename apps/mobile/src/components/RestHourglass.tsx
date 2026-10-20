/**
 * FR-096：圆腰沙漏。玻璃是抗锯齿轮廓，沙子用原生三角形。
 * 按下停在当前秒数，上下拖才改时间。
 */
import { restRemainingFromDrag } from '@fitness-coach/core';
import { colors } from '@fitness-coach/ui';
import { useRef } from 'react';
import { Image, PanResponder, StyleSheet, View } from 'react-native';

const OUTLINE = require('../../assets/rest-hourglass-outline.png');

const GLASS_W = 160;
const GLASS_H = 294;
const INK = colors.textPrimary;
/** 玻璃腰线。上腔沙尖穿过颈口收成锥，下腔沙堆落在瓶底弧线之上。 */
const MID = 147;
const NECK = 14;
const TOP_LIMIT = 34;
const BOT_LIMIT = 230;

type Props = {
  remainingSec: number;
  capacitySec: number;
  locked?: boolean;
  onScrub: (remainingSec: number) => void;
  onCommit: (remainingSec: number) => void;
};

export default function RestHourglass({
  remainingSec,
  capacitySec,
  locked = false,
  onScrub,
  onCommit,
}: Props) {
  const cap = Math.max(1, capacitySec);
  const fraction = Math.min(1, Math.max(0, remainingSec / cap));
  const heightRef = useRef(GLASS_H);
  const latest = useRef(remainingSec);
  const lockedRef = useRef(locked);
  const scrubRef = useRef(onScrub);
  const commitRef = useRef(onCommit);
  const capRef = useRef(cap);
  latest.current = remainingSec;
  lockedRef.current = locked;
  scrubRef.current = onScrub;
  commitRef.current = onCommit;
  capRef.current = cap;

  const grant = useRef({ y: 0, remaining: 0, moved: false });
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !lockedRef.current,
      onMoveShouldSetPanResponder: () => !lockedRef.current,
      onPanResponderGrant: (evt) => {
        grant.current = {
          y: evt.nativeEvent.pageY,
          remaining: latest.current,
          moved: false,
        };
      },
      onPanResponderMove: (evt) => {
        const dy = evt.nativeEvent.pageY - grant.current.y;
        if (!grant.current.moved && Math.abs(dy) < 3) return;
        grant.current.moved = true;
        const next = restRemainingFromDrag(
          grant.current.remaining,
          dy,
          heightRef.current,
          capRef.current,
        );
        latest.current = next;
        scrubRef.current(next);
      },
      onPanResponderRelease: () => {
        if (!grant.current.moved) return;
        commitRef.current(latest.current);
      },
      onPanResponderTerminate: () => {
        if (!grant.current.moved) return;
        commitRef.current(latest.current);
      },
    }),
  ).current;

  const cx = GLASS_W / 2;
  const topTip = MID + NECK;
  const topRoom = topTip - TOP_LIMIT;
  const botRoom = BOT_LIMIT - (MID + NECK);
  const topH = fraction > 0.01 ? fraction * topRoom : 0;
  const botH = fraction < 0.99 ? (1 - fraction) * botRoom : 0;
  const topMouth = Math.min(44, Math.max(8, topH * 0.7));
  const botHalf = Math.min(30, Math.max(10, botH * 0.7));
  const dip = Math.min(12, Math.max(4, topMouth * 0.22));

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
      <View style={styles.glass} pointerEvents="none">
        {topH > 4 ? (
          <View
            style={[
              styles.tri,
              {
                left: cx - topMouth,
                top: topTip - topH,
                borderLeftWidth: topMouth,
                borderRightWidth: topMouth,
                borderTopWidth: topH,
              },
            ]}
          />
        ) : null}
        {topH > dip + 8 ? (
          <View
            style={{
              position: 'absolute',
              left: cx - topMouth,
              top: topTip - topH + dip - topMouth * 2,
              width: topMouth * 2,
              height: topMouth * 2,
              borderRadius: topMouth,
              backgroundColor: '#000000',
            }}
          />
        ) : null}
        {botH > 4 ? (
          <View
            style={[
              styles.triDown,
              {
                left: cx - botHalf,
                top: BOT_LIMIT - botH,
                borderLeftWidth: botHalf,
                borderRightWidth: botHalf,
                borderBottomWidth: botH,
              },
            ]}
          />
        ) : null}
        <Image source={OUTLINE} style={StyleSheet.absoluteFill} resizeMode="stretch" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    alignSelf: 'center',
  },
  glass: {
    width: GLASS_W,
    height: GLASS_H,
  },
  tri: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: INK,
  },
  triDown: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: INK,
  },
});
