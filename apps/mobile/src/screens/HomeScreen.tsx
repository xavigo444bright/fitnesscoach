/**
 * PG-001 首页壳：页内 动作 | 训练（FR-110）
 */
import { isCoachableId } from '@fitness-coach/core';
import {
  DEFAULT_HOME_SEGMENT,
  HOME_SEGMENTS,
  colors,
  fontSize,
  layout,
  space,
} from '@fitness-coach/ui';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  CompositeNavigationProp,
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SegmentedControl from '../components/SegmentedControl';
import SegmentPager from '../components/SegmentPager';
import TodayWorkoutList from '../components/TodayWorkoutList';
import WorkoutSessionPane from '../components/WorkoutSessionPane';
import { tabBarContentPadding } from '../navigation/chrome';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import ExerciseLibraryScreen from './ExerciseLibraryScreen';
import {
  peekWorkoutLog,
  subscribeWorkoutLog,
} from '../workoutLogStorage';

type HomeSegment = (typeof HOME_SEGMENTS)[number]['key'];

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HomeNavigation>();
  const route = useRoute<RouteProp<MainTabParamList, 'Home'>>();
  const [segment, setSegment] = useState<HomeSegment>(DEFAULT_HOME_SEGMENT);
  const [log, setLog] = useState(peekWorkoutLog);
  const bottomPad = tabBarContentPadding(insets.bottom);
  const focusWorkoutId = route.params?.workoutId;

  useEffect(() => subscribeWorkoutLog(() => setLog(peekWorkoutLog())), []);

  useEffect(() => {
    if (focusWorkoutId) setSegment('train');
  }, [focusWorkoutId]);

  useFocusEffect(
    useCallback(() => {
      setLog(peekWorkoutLog());
    }, []),
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.md }]}>
      <Text style={styles.kicker}>首页</Text>
      <SegmentedControl
        items={HOME_SEGMENTS}
        value={segment}
        onChange={setSegment}
      />
      <View style={{ flex: 1, marginTop: layout.pageSectionGap }}>
        <SegmentPager
          items={HOME_SEGMENTS}
          value={segment}
          onChange={setSegment}
        >
          <ExerciseLibraryScreen
            embedded
            contentBottomInset={bottomPad}
            onSelectExercise={(id) => {
              navigation.navigate('Detail', {
                catalogId: id,
                workoutId: focusWorkoutId,
              });
            }}
            onOpenDevPose={
              __DEV__
                ? () => {
                    navigation.navigate('DevPose');
                  }
                : undefined
            }
          />
          {focusWorkoutId ? (
            <WorkoutSessionPane
              log={log}
              workoutId={focusWorkoutId}
              contentBottomInset={bottomPad}
              onClose={() => {
                const fromLog = route.params?.openedFrom === 'log';
                navigation.setParams({
                  workoutId: undefined,
                  openedFrom: undefined,
                });
                if (fromLog) navigation.navigate('Log');
              }}
              onOpenRest={(durationSec) => {
                navigation.navigate('RestTimer', { durationSec });
              }}
              onFollowAlong={(catalogId) => {
                if (!isCoachableId(catalogId) || !focusWorkoutId) return;
                navigation.navigate('Prepare', {
                  exerciseId: catalogId,
                  workoutId: focusWorkoutId,
                });
              }}
            />
          ) : (
            <TodayWorkoutList
              log={log}
              contentBottomInset={bottomPad}
              onOpenWorkout={(workoutId) => {
                navigation.setParams({
                  workoutId,
                  openedFrom: undefined,
                });
              }}
            />
          )}
        </SegmentPager>
      </View>
      <StatusBar style="light" />
    </View>
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
});
