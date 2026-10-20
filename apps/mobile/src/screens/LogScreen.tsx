/**
 * NAV-LOG：记录列表（结束课写入）+ 我的身体数据（自重）。
 */
import {
  backdateKind,
  calendarDayLabel,
  calendarDayLocal,
  createBackdatedWorkout,
  removeWorkout,
  setBodyweightKg,
  trainedCalendarDays,
  workoutExerciseSummary,
  workoutTitleDisplay,
  workoutVolumeKg,
  workoutsOnCalendarDay,
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
import { useMemo, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { peekAccount, subscribeAccount } from '../accountStorage';
import AccountBlock from '../components/AccountBlock';
import EmptyPane from '../components/EmptyPane';
import PrBoard from '../components/PrBoard';
import SegmentedControl from '../components/SegmentedControl';
import SegmentPager from '../components/SegmentPager';
import ShellButton from '../components/ShellButton';
import WorkoutCalendar from '../components/WorkoutCalendar';
import WorkoutModuleCard from '../components/WorkoutModuleCard';
import { scrollIntoKeyboard } from '../keyboardField';
import {
  setLanguagePreference,
  systemLanguage,
  useLanguagePreference,
  useTr,
} from '../i18n';
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

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const tr = useTr();
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
      <Text style={styles.kicker}>{tr('记录')}</Text>
      <SegmentedControl
        items={LOG_SEGMENTS}
        value={segment}
        onChange={setSegment}
      />
      <View style={{ flex: 1, marginTop: layout.pageSectionGap }}>
        <SegmentPager
          items={LOG_SEGMENTS}
          value={segment}
          onChange={setSegment}
        >
          <HistoryPane
            log={log}
            onOpenWorkout={(workoutId) => {
              navigation.navigate('Home', { workoutId, openedFrom: 'log' });
            }}
            onBackdate={(day) => {
              let createdId = '';
              void commitWorkoutLog((next, ids) => {
                const created = createBackdatedWorkout(
                  next,
                  day,
                  new Date().toISOString(),
                  ids,
                );
                createdId = created.workoutId;
                return created.log;
              }).then(() => {
                if (!createdId) return;
                navigation.navigate('Home', {
                  workoutId: createdId,
                  openedFrom: 'log',
                });
              });
            }}
          />
          <MeBodyPane
            account={account}
            log={log}
            bodyweightKg={log.bodyweightKg}
            onSave={(kg) => {
              void commitWorkoutLog((next) => setBodyweightKg(next, kg));
            }}
          />
        </SegmentPager>
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
  onBackdate,
}: {
  log: ReturnType<typeof peekWorkoutLog>;
  onOpenWorkout: (workoutId: string) => void;
  onBackdate: (day: string) => void;
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
  const kind = backdateKind(selectedDay, new Date().toISOString());

  return (
    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
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
        <>
          <EmptyPane
            title={kind === 'today' ? '今天还没有训练' : trainedDays.size === 0 ? '还没有记录' : '这天没有训练'}
            body={
              kind === 'future'
                ? '还不能记还没到的日期。'
                : kind === 'today'
                  ? '从这里开始今天的训练。'
                  : trainedDays.size === 0
                    ? '可以补记过去的一天。'
                    : '这天还没有课，可以补记。'
            }
          />
          {kind === 'future' ? null : (
            <View style={styles.backdate}>
              <ShellButton
                label={kind === 'today' ? '开始今天训练' : '补记这天'}
                onPress={() => onBackdate(selectedDay)}
              />
            </View>
          )}
        </>
      ) : (
        dayWorkouts.map((workout) => (
          <WorkoutModuleCard
            key={workout.id}
            title={workoutTitleDisplay(workout)}
            meta={`${calendarDayLabel(workout.endedAt ?? workout.startedAt)} · 容量 ${workoutVolumeKg(workout, log.bodyweightKg)} kg`}
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
  log,
  bodyweightKg,
  onSave,
}: {
  account: ReturnType<typeof peekAccount>;
  log: ReturnType<typeof peekWorkoutLog>;
  bodyweightKg?: number;
  onSave: (kg: number | undefined) => void;
}) {
  const tr = useTr();
  const preference = useLanguagePreference();
  const [text, setText] = useState(
    bodyweightKg != null ? String(bodyweightKg) : '',
  );
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const inputRef = useRef<TextInput>(null);
  const keyboardHeight = useRef(0);
  useEffect(() => {
    setText(bodyweightKg != null ? String(bodyweightKg) : '');
  }, [bodyweightKg]);
  useEffect(() => {
    const show =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (event: KeyboardEvent) => {
      keyboardHeight.current = event.endCoordinates?.height ?? 0;
      scrollIntoKeyboard(
        inputRef.current,
        keyboardHeight.current,
        scrollY,
        scrollRef.current,
      );
    };
    const onHide = () => {
      keyboardHeight.current = 0;
    };
    const showSub = Keyboard.addListener(show, onShow);
    const hideSub = Keyboard.addListener(hide, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          scrollY.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: space.xl }}
      >
      {account ? <AccountBlock account={account} /> : null}
      <PrBoard log={log} />
      <Text style={styles.meTitle}>{tr('语言')}</Text>
      <View style={styles.langRow}>
        {(systemLanguage() === 'zh'
          ? ([
              ['zh', '中文'],
              ['en', 'English'],
            ] as const)
          : ([
              ['en', 'English'],
              ['zh', '中文'],
            ] as const)
        ).map(([key, label]) => {
          const on = (preference === 'system' ? systemLanguage() : preference) === key;
          return (
            <Pressable
              key={key}
              onPress={() => {
                void setLanguagePreference(key);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.langChip, on && styles.langChipOn]}
            >
              <Text style={[styles.langLabel, on && styles.langLabelOn]}>
                {tr(label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.meTitle}>{tr('身体数据')}</Text>
      <Text style={styles.meHint}>{tr('自重会带到训练页小格。')}</Text>
      <Text style={styles.fieldLabel}>{tr('自重 kg')}</Text>
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        onFocus={() =>
          scrollIntoKeyboard(
            inputRef.current,
            keyboardHeight.current,
            scrollY,
            scrollRef.current,
          )
        }
        onEndEditing={() => {
          const shown = bodyweightKg != null ? String(bodyweightKg) : '';
          if (text === shown) return;
          const raw = text.trim();
          if (raw === '') {
            onSave(undefined);
            return;
          }
          const n = Number(raw);
          onSave(Number.isFinite(n) ? n : undefined);
        }}
        placeholder="70"
        placeholderTextColor={colors.tabInactive}
        keyboardType="decimal-pad"
        style={styles.input}
        accessibilityLabel={tr('自重公斤')}
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
  langRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.xl,
  },
  langChip: {
    minHeight: layout.touchMin,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  langChipOn: {
    backgroundColor: colors.cta,
    borderColor: colors.cta,
  },
  langLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  langLabelOn: {
    color: colors.onCta,
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
  backdate: {
    marginTop: space.lg,
  },
});
