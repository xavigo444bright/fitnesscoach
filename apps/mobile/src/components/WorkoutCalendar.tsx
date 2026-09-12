/**
 * PG-010 月历。哪天练过由 core.trainedCalendarDays 决定。
 */
import {
  calendarMonthDays,
  shiftYearMonth,
} from '@fitness-coach/core';
import { colors, fontSize, layout, radius, space } from '@fitness-coach/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const;

type Props = {
  year: number;
  month: number;
  selectedDay: string;
  trainedDays: ReadonlySet<string>;
  onChangeMonth: (next: { year: number; month: number }) => void;
  onSelectDay: (day: string) => void;
};

export default function WorkoutCalendar({
  year,
  month,
  selectedDay,
  trainedDays,
  onChangeMonth,
  onSelectDay,
}: Props) {
  const cells = calendarMonthDays(year, month);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable
          onPress={() => onChangeMonth(shiftYearMonth(year, month, -1))}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="上个月"
        >
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>
          {year}年{month}月
        </Text>
        <Pressable
          onPress={() => onChangeMonth(shiftYearMonth(year, month, 1))}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="下个月"
        >
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((label) => (
          <Text key={label} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (!day) {
            return <View key={`empty-${index}`} style={styles.cell} />;
          }
          const trained = trainedDays.has(day);
          const selected = day === selectedDay;
          const dateNum = Number(day.slice(8, 10));
          return (
            <Pressable
              key={day}
              onPress={() => onSelectDay(day)}
              style={styles.cell}
              accessibilityRole="button"
              accessibilityLabel={`${month}月${dateNum}日${trained ? ' 有训练' : ''}`}
              accessibilityState={{ selected }}
            >
              <View
                style={[
                  styles.dayInner,
                  selected && styles.daySelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    selected && styles.dayNumOn,
                    !selected && !trained && styles.dayMuted,
                  ]}
                >
                  {dateNum}
                </Text>
                {trained ? (
                  <View
                    style={[styles.dot, selected && styles.dotOn]}
                  />
                ) : (
                  <View style={styles.dotSpacer} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  navBtn: {
    width: layout.touchMin,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    color: colors.textPrimary,
    fontSize: fontSize.display,
    fontWeight: '600',
  },
  monthTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: space.sm,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: fontSize.caption,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.2857%',
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xs,
  },
  dayInner: {
    width: 36,
    minHeight: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: colors.cta,
  },
  dayNum: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  dayNumOn: {
    color: colors.onCta,
  },
  dayMuted: {
    color: colors.tabInactive,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cta,
    marginTop: 2,
  },
  dotOn: {
    backgroundColor: colors.onCta,
  },
  dotSpacer: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
});
