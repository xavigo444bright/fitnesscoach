/**
 * 课模块卡片。已结束的课可左滑删除。
 */
import { colors, fontSize, layout, radius, space } from '@fitness-coach/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

type Props = {
  title: string;
  meta: string;
  summary: string;
  badge?: string;
  onPress: () => void;
  onDelete?: () => void;
};

export default function WorkoutModuleCard({
  title,
  meta,
  summary,
  badge,
  onPress,
  onDelete,
}: Props) {
  const card = (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.top}>
        <Text style={styles.title}>{title}</Text>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      </View>
      <Text style={styles.meta}>{meta}</Text>
      <Text style={styles.summary}>{summary}</Text>
    </Pressable>
  );

  if (!onDelete) return card;

  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          onPress={onDelete}
          style={styles.delete}
          accessibilityRole="button"
          accessibilityLabel={`删除${title}`}
        >
          <Text style={styles.deleteText}>删除</Text>
        </Pressable>
      )}
    >
      {card}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
    minHeight: layout.touchMin,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.xs,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  badge: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    marginBottom: space.sm,
  },
  summary: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    lineHeight: 22,
  },
  delete: {
    width: 88,
    marginBottom: space.md,
    marginLeft: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: colors.overlayText,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
});
