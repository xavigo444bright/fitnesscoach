/**
 * NAV-LOG：记录列表（结束课写入）+ 我的身体数据（自重）。
 */
import {
  calendarDayLabel,
  calendarDayLocal,
  setBodyweightKg,
  trainedCalendarDays,
  workoutExerciseSummary,
  workoutTitleDisplay,
  workoutVolumeKg,
  workoutsOnCalendarDay,
  removeWorkout,
} from '@fitness-coach/core';
import {
  DEFAULT_LOG_SEGMENT,
  LOG_SEGMENTS,
  colors,
  fontSize,
  layout,
  radius,
  space,
} from '@fitness-coach/ui';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { peekAccount, subscribeAccount } from '../accountStorage';
import AccountBlock from '../components/AccountBlock';
import EmptyPane from '../components/EmptyPane';
import SegmentedControl from '../components/SegmentedControl';
import WorkoutCalendar from '../components/WorkoutCalendar';
import WorkoutModuleCard from '../components/WorkoutModuleCard';
import { tabBarContentPadding } from '../navigation/chrome';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import {
  commitWorkoutLog,
  peekWorkoutLog,
  subscribeWorkoutLog,
} from '../workoutLogStorage';

type LogSegment = (typeof LOG_SEGMENTS)[number]['key'];

type LogNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Log'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function parseOptionalNumber(raw: string): number | undefined {
  const t = raw.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<LogNavigation>();
  const [segment, setSegment] = useState<LogSegment>(DEFAULT_LOG_SEGMENT);
  const [log, setLog] = useState(peekWorkoutLog);
  const [account, setAccount] = useState(peekAccount);
  const bottomPad = tabBarContentPadding(insets.bottom);

  useEffect(() => subscribeWorkoutLog(() => setLog(peekWorkoutLog())), []);
  useEffect(() => subscribeAccount(() => setAccount(peekAccount())), []);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + space.md, paddingBottom: bottomPad },
      ]}
    >
      <Text style={styles.kicker}>记录</Text>
      <SegmentedControl
        items={LOG_SEGMENTS}
        value={segment}
        onChange={setSegment}
      />
      <View style={{ flex: 1, marginTop: layout.pageSectionGap }}>
        {segment === 'history' ? (
          <HistoryPane
            log={log}
            onOpenWorkout={(workoutId) => {
              navigation.navigate('Home', { workoutId, openedFrom: 'log' });
            }}
          />
        ) : (
          <MeBodyPane
            account={account}
            bodyweightKg={log.bodyweightKg}
            onSave={(kg) => {
              void commitWorkoutLog((next) => setBodyweightKg(next, kg));
            }}
          />
        )}
      </View>
      <StatusBar style="light" />
    </View>
  );
}

function yearMonthFromDay(day: string): { year: number; month: number } {
  const [year, month] = day.split('-');
  return { year: Number(year), month: Number(month) };
}

function HistoryPane({
  log,
  onOpenWorkout,
}: {
  log: ReturnType<typeof peekWorkoutLog>;
  onOpenWorkout: (workoutId: string) => void;
}) {
  const today = calendarDayLocal(new Date().toISOString());
  const initial = yearMonthFromDay(today);
  const [selectedDay, setSelectedDay] = useState(today);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const trainedDays = useMemo(
    () => new Set(trainedCalendarDays(log)),
    [log],
  );
  const dayWorkouts = workoutsOnCalendarDay(log, selectedDay);

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <WorkoutCalendar
        year={year}
        month={month}
        selectedDay={selectedDay}
        trainedDays={trainedDays}
        onChangeMonth={(next) => {
          setYear(next.year);
          setMonth(next.month);
        }}
        onSelectDay={setSelectedDay}
      />
      {dayWorkouts.length === 0 ? (
        <EmptyPane
          title={trainedDays.size === 0 ? '还没有记录' : '这天没有训练'}
          body={
            trainedDays.size === 0
              ? '结束一节课后会出现在这里。'
              : '点有标记的日期查看当天的课。'
          }
        />
      ) : (
        dayWorkouts.map((workout) => (
          <WorkoutModuleCard
            key={workout.id}
            title={workoutTitleDisplay(workout)}
            meta={`${calendarDayLabel(workout.endedAt ?? workout.startedAt)} · 容量 ${workoutVolumeKg(workout)} kg`}
            summary={workoutExerciseSummary(workout) || '没有动作'}
            onPress={() => onOpenWorkout(workout.id)}
            onDelete={() => {
              void commitWorkoutLog((next) => removeWorkout(next, workout.id));
            }}
          />
        ))
      )}
    </ScrollView>
  );
}

function MeBodyPane({
  account,
  bodyweightKg,
  onSave,
}: {
  account: ReturnType<typeof peekAccount>;
  bodyweightKg?: number;
  onSave: (kg: number | undefined) => void;
}) {
  const [text, setText] = useState(
    bodyweightKg != null ? String(bodyweightKg) : '',
  );
  useEffect(() => {
    setText(bodyweightKg != null ? String(bodyweightKg) : '');
  }, [bodyweightKg]);

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ paddingBottom: space.xl }}
    >
      {account ? <AccountBlock account={account} /> : null}
      <Text style={styles.meTitle}>身体数据</Text>
      <Text style={styles.meHint}>自重会带到训练页小格。</Text>
      <Text style={styles.fieldLabel}>自重 kg</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={() => onSave(parseOptionalNumber(text))}
        placeholder="70"
        placeholderTextColor={colors.tabInactive}
        keyboardType="decimal-pad"
        style={styles.input}
        accessibilityLabel="自重公斤"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.md,
  },
  kicker: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    marginBottom: space.md,
  },
  meTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.display,
    fontWeight: '700',
    marginBottom: space.sm,
  },
  meHint: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    lineHeight: 20,
    marginBottom: space.lg,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    marginBottom: space.xs,
  },
  input: {
    minHeight: layout.touchMin,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: space.sm,
    fontSize: fontSize.body,
  },
});
