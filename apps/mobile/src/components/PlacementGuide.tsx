/**
 * 站位文案（M3-T5 / FR-022）
 *
 * 全画面即站位区，不再画虚线框。未入镜只出提示。
 */
import { colors, fontSize, layout } from '@fitness-coach/ui';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTr } from '../i18n';

type Props = {
  visible: boolean;
  hint?: string | null;
};

export default function PlacementGuide({ visible, hint }: Props) {
  const insets = useSafeAreaInsets();
  const tr = useTr();
  if (!visible || !hint) return null;
  return (
    <View style={styles.root} pointerEvents="none">
      <View
        style={[
          styles.hintBar,
          {
            bottom: layout.bottomBarHeight + Math.max(insets.bottom, 8),
            left: Math.max(16, insets.left),
          },
        ]}
      >
        <Text
          style={styles.hint}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          allowFontScaling={false}
        >
          {tr(hint)}
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
    maxWidth: 280,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.overlayScrim,
    borderRadius: 8,
    overflow: 'hidden',
  },
  hint: {
    color: colors.overlayText,
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
});
