/**
 * CMP-007 CountdownOverlay（M4-T3 / FR-070 / UX-004）
 */
import type { CountdownOverlayProps } from '@fitness-coach/ui';
import { colors } from '@fitness-coach/ui';
import { StyleSheet, Text, View } from 'react-native';

type Props = CountdownOverlayProps;

export default function CountdownOverlay({ seconds }: Props) {
  if (seconds == null) return null;
  const big = seconds <= 1;
  return (
    <View style={styles.root} pointerEvents="none">
      <Text style={[styles.num, big && styles.numBig]}>{seconds}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  num: {
    color: colors.overlayText,
    fontSize: 96,
    fontWeight: '700',
  },
  numBig: {
    fontSize: 112,
  },
});
