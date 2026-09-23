/**
 * 记录 · 我的：成就柜（T19-R7）。砖上不放戳；标题旁无计数。
 */
import {
  PR_PREVIEW_LIMIT,
  exerciseDisplayName,
  exerciseKey,
  formatWeightAmount,
  personalRecords,
  visiblePersonalRecords,
  weightUnitLabel,
  type WorkoutLog,
} from '@fitness-coach/core';
import { colors, fontSize, layout, radius, space } from '@fitness-coach/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  log: WorkoutLog;
};

export default function PrBoard({ log }: Props) {
  const [expanded, setExpanded] = useState(false);
  const rows = personalRecords(log);
  const shown = visiblePersonalRecords(rows, expanded);
  const canToggle = rows.length > PR_PREVIEW_LIMIT;

  return (
    <View style={styles.wrap} accessibilityLabel="成就">
      <Text style={styles.title}>成就</Text>
      <Text style={styles.lead}>每个动作最重的一组。记下重量就会点亮。</Text>
      {rows.length === 0 ? (
        <View style={styles.emptyTile}>
          <Text style={styles.emptyKicker}>未点亮</Text>
          <Text style={styles.emptyBody}>先在训练里给某组填上重量。</Text>
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            {shown.map((row) => {
              const name = exerciseDisplayName(row.exercise);
              const amount = formatWeightAmount(row.weightKg, row.weightUnit);
              const unitLabel = weightUnitLabel(row.weightUnit);
              return (
                <View
                  key={exerciseKey(row.exercise)}
                  style={styles.tile}
                  accessibilityLabel={`${name} ${amount}${unitLabel} ${row.reps}次`}
                >
                  <Text style={styles.tileKicker}>BEST</Text>
                  <Text style={styles.tileName} numberOfLines={2}>
                    {name}
                  </Text>
                  <Text style={styles.tileKg}>{amount}</Text>
                  <Text style={styles.tileMeta}>
                    {unitLabel} · {row.reps} 次
                  </Text>
                </View>
              );
            })}
          </View>
          {canToggle ? (
            <Pressable
              onPress={() => setExpanded((value) => !value)}
              style={styles.toggle}
              accessibilityRole="button"
              accessibilityLabel={expanded ? '收起成就' : '展开全部成就'}
            >
              <Text style={styles.toggleText}>
                {expanded ? '收起' : `展开全部 · 还有 ${rows.length - shown.length} 个`}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.display,
    fontWeight: '700',
    marginBottom: space.xs,
  },
  lead: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    lineHeight: 20,
    marginBottom: space.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  tile: {
    width: '48%',
    flexGrow: 0,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    minHeight: 148,
    alignItems: 'center',
  },
  tileKicker: {
    color: colors.tabInactive,
    fontSize: fontSize.meta,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: space.xs,
  },
  tileName: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 36,
  },
  tileKg: {
    color: colors.textPrimary,
    fontSize: fontSize.hugeStat,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: space.sm,
  },
  tileMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  toggle: {
    minHeight: layout.touchMin,
    marginTop: space.sm,
    justifyContent: 'center',
  },
  toggleText: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
  emptyTile: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    minHeight: 120,
    justifyContent: 'center',
  },
  emptyKicker: {
    color: colors.tabInactive,
    fontSize: fontSize.meta,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: space.sm,
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    lineHeight: 22,
  },
});
