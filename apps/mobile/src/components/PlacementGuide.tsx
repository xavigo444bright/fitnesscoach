/**
 * 站位文案（M3-T5 / FR-022）
 *
 * 全画面即站位区，不再画虚线框。未入镜只出提示。
 */
import { colors, layout } from '@fitness-coach/ui';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  hint?: string | null;
};

export default function PlacementGuide({ visible, hint }: Props) {
  if (!visible || !hint) return null;
  return (
    <View style={styles.root} pointerEvents="none">
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  hint: {
    position: 'absolute',
    bottom: layout.bottomBarHeight + 20,
    left: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.overlayScrim,
    color: colors.overlayText,
    fontSize: 18,
    fontWeight: '600',
    overflow: 'hidden',
    borderRadius: 8,
    textAlign: 'center',
  },
});
