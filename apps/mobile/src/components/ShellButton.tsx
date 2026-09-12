import { colors, fontSize, layout, radius } from '@fitness-coach/ui';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
};

export default function ShellButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: Props) {
  const ghost = variant === 'ghost';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.btn,
        ghost ? styles.ghost : styles.primary,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.text, ghost ? styles.ghostText : styles.primaryText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: layout.touchMin,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: colors.cta,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  primaryText: {
    color: colors.onCta,
  },
  ghostText: {
    color: colors.textPrimary,
  },
});
