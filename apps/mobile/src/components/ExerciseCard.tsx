/**
 * CMP-001 ExerciseCard（M4-T1 / FR-001）
 */
import type { ExerciseCardProps } from '@fitness-coach/ui';
import { colors, fontSize, layout, radius, space } from '@fitness-coach/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = ExerciseCardProps;

export default function ExerciseCard({
  name,
  bodyPart,
  cameraHint,
  onPress,
}: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}，${bodyPart}，${cameraHint}`}
    >
      <View style={styles.thumb}>
        <Text style={styles.thumbLabel}>{name.slice(0, 1)}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.caption}>
          {bodyPart} · {cameraHint}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: layout.touchMin + 24,
    gap: space.md,
  },
  pressed: {
    opacity: 0.85,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLabel: {
    color: colors.primary,
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  meta: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '700',
    marginBottom: 4,
  },
  caption: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
  },
});
