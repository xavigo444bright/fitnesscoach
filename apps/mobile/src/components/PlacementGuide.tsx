/**
 * 站位文案（M3-T5 / FR-022）
 *
 * 全画面即站位区，不再画虚线框。未入镜只出提示。
 */
import { colors, fontSize, layout } from '@fitness-coach/ui';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  hint?: string | null;
};

export default function PlacementGuide({ visible, hint }: Props) {
  if (!visible || !hint) return null;
  return (
    <View style={styles.root} pointerEvents="none">
      <View style={styles.hintBar}>
        <Text
          style={styles.hint}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.62}
          allowFontScaling={false}
          ellipsizeMode="clip"
        >
          {hint}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  hintBar: {
    position: 'absolute',
    bottom: layout.bottomBarHeight + 20,
    left: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.overlayScrim,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  hint: {
    color: colors.overlayText,
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
});
