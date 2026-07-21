/**
 * 站位虚线框 + 文案（M3-T5 / FR-022）
 *
 * 大框贴底：覆盖髋膝踝参考区，避免「小框居中」误导用户后退。
 */
import { colors, layout } from '@fitness-coach/ui';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  hint?: string | null;
};

export default function PlacementGuide({ visible, hint }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.root} pointerEvents="none">
      <View style={styles.frameWrap}>
        <View style={styles.frame} />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: layout.bottomBarHeight + 8,
  },
  /** 大框贴底：接近全屏可用区，仅留边距 */
  frameWrap: {
    width: '94%',
    height: '88%',
    maxHeight: '90%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  frame: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: colors.overlayText,
    borderStyle: 'dashed',
    borderRadius: 16,
    opacity: 0.85,
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
