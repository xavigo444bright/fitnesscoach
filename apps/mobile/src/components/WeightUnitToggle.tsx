/**
 * 记重量时的单位：KG / LB 同时可见，圆点标出当前选中。
 */
import type { WeightUnit } from '@fitness-coach/core';
import { colors, fontSize, space } from '@fitness-coach/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const OPTIONS: { key: WeightUnit; label: string }[] = [
  { key: 'kg', label: 'KG' },
  { key: 'lb', label: 'LB' },
];

type Props = {
  unit: WeightUnit;
  onChange: (unit: WeightUnit) => void;
  /** 贴在输入框右侧时不要再留标签下边距。 */
  inline?: boolean;
};

export default function WeightUnitToggle({ unit, onChange, inline }: Props) {
  return (
    <View
      style={[styles.row, inline && styles.rowInline]}
      accessibilityRole="tablist"
    >
      {OPTIONS.map((item, index) => {
        const selected = item.key === unit;
        return (
          <View key={item.key} style={styles.pair}>
            {index === 0 ? null : <Text style={styles.slash}>/</Text>}
            <Pressable
              onPress={() => {
                if (!selected) onChange(item.key);
              }}
              style={styles.hit}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={item.key === 'kg' ? '公斤' : '磅'}
            >
              <View style={[styles.mark, selected && styles.markOn]} />
              <Text style={[styles.label, selected && styles.labelOn]}>
                {item.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: space.xs,
  },
  rowInline: {
    marginBottom: 0,
    alignItems: 'center',
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  slash: {
    color: colors.tabInactive,
    fontSize: fontSize.meta,
    marginHorizontal: 2,
    marginBottom: 1,
  },
  hit: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 28,
    minHeight: 28,
  },
  mark: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 2,
    backgroundColor: colors.border,
  },
  markOn: {
    backgroundColor: colors.cta,
  },
  label: {
    color: colors.tabInactive,
    fontSize: fontSize.meta,
    fontWeight: '700',
  },
  labelOn: {
    color: colors.textPrimary,
  },
});
