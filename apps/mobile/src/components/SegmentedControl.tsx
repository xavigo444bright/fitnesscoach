/**
 * 页内分段（app-ia：厚白下划线，不是第三 Tab）。
 */
import { colors, fontSize, layout, space } from '@fitness-coach/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type SegmentItem<K extends string> = { key: K; label: string };

type Props<K extends string> = {
  items: readonly SegmentItem<K>[];
  value: K;
  onChange: (key: K) => void;
};

export default function SegmentedControl<K extends string>({
  items,
  value,
  onChange,
}: Props<K>) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {items.map((item) => {
        const selected = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
            style={styles.item}
          >
            <Text style={[styles.label, selected && styles.labelOn]}>
              {item.label}
            </Text>
            <View style={[styles.underline, selected && styles.underlineOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.lg,
    minHeight: layout.touchMin,
    alignItems: 'flex-end',
  },
  item: {
    minHeight: layout.touchMin,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.title,
    fontWeight: '600',
  },
  labelOn: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  underline: {
    marginTop: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  underlineOn: {
    backgroundColor: colors.cta,
  },
});
