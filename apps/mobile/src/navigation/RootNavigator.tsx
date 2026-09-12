/**
 * NativeStack 包 2 个 BottomTab；跟练 / 组表 sheet / 倒计时全屏栈盖住底栏（FR-110）。
 */
import { addSlot, ensureOpenWorkout, isCoachableId } from '@fitness-coach/core';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { peekAccount, subscribeAccount } from '../accountStorage';
import FloatingTabBar from '../components/FloatingTabBar';
import DevPoseScreen from '../screens/DevPoseScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import FollowAlongLogScreen from '../screens/FollowAlongLogScreen';
import HomeScreen from '../screens/HomeScreen';
import LogScreen from '../screens/LogScreen';
import PrepareScreen from '../screens/PrepareScreen';
import RestTimerScreen from '../screens/RestTimerScreen';
import SessionSummaryScreen from '../screens/SessionSummaryScreen';
import TrainingScreen from '../screens/TrainingScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { commitWorkoutLog } from '../workoutLogStorage';
import type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: '首页' }}
      />
      <Tab.Screen name="Log" component={LogScreen} options={{ title: '记录' }} />
    </Tab.Navigator>
  );
}

function DetailRoute({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Detail'>) {
  const { catalogId } = route.params;
  return (
    <ExerciseDetailScreen
      exerciseId={catalogId}
      onBack={() => navigation.goBack()}
      onJoin={() => {
        let workoutId = '';
        void commitWorkoutLog((log, ids) => {
          const open = ensureOpenWorkout(log, new Date().toISOString(), ids);
          workoutId = open.workoutId;
          return addSlot(open.log, open.workoutId, { kind: 'catalog', catalogId }, ids)
            .log;
        }).then(() => {
          navigation.navigate('MainTabs', {
            screen: 'Home',
            params: { workoutId },
          });
        });
      }}
      onStart={() => {
        if (!isCoachableId(catalogId)) return;
        navigation.navigate('Prepare', { exerciseId: catalogId });
      }}
    />
  );
}

function PrepareRoute({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Prepare'>) {
  const { exerciseId } = route.params;
  return (
    <PrepareScreen
      onBack={() => navigation.goBack()}
      onReady={() => navigation.navigate('Training', { exerciseId })}
    />
  );
}

function TrainingRoute({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Training'>) {
  const { exerciseId } = route.params;
  return (
    <TrainingScreen
      exerciseId={exerciseId}
      onEnd={(summary) => {
        navigation.replace('FollowAlongLog', {
          catalogId: exerciseId,
          cameraReps: summary.reps,
          formSummary: summary.topIssue?.message,
        });
      }}
    />
  );
}

function SummaryRoute({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Summary'>) {
  const { summary, exerciseId } = route.params;
  return (
    <SessionSummaryScreen
      summary={summary}
      onRetry={() => navigation.replace('Prepare', { exerciseId })}
      onBack={() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }}
    />
  );
}

function DevPoseRoute() {
  return <DevPoseScreen variant="debug" exerciseId="squat" />;
}

export default function RootNavigator() {
  const [account, setAccount] = useState(peekAccount);
  useEffect(() => subscribeAccount(() => setAccount(peekAccount())), []);

  return (
    <Stack.Navigator
      key={account ? 'signed-in' : 'welcome'}
      screenOptions={{ headerShown: false }}
    >
      {account == null ? (
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Detail" component={DetailRoute} />
          <Stack.Screen
            name="Prepare"
            component={PrepareRoute}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name="Training"
            component={TrainingRoute}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="FollowAlongLog" component={FollowAlongLogScreen} />
          <Stack.Screen
            name="RestTimer"
            component={RestTimerScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="Summary" component={SummaryRoute} />
          {__DEV__ ? (
            <Stack.Screen name="DevPose" component={DevPoseRoute} />
          ) : null}
        </>
      )}
    </Stack.Navigator>
  );
}
