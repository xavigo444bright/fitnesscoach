/**
 * NativeStack 包 2 个 BottomTab；跟练 / 组表 sheet / 倒计时全屏栈盖住底栏（FR-110）。
 */
import { isCoachableId } from '@fitness-coach/core';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
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
import { lockSessionOrientation } from '../orientationPolicy';
import type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function useSessionOrientation(allowLandscape: boolean) {
  useFocusEffect(
    useCallback(() => {
      lockSessionOrientation(allowLandscape);
    }, [allowLandscape]),
  );
}

function MainTabs() {
  useSessionOrientation(false);
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
  const { catalogId, workoutId } = route.params;
  useSessionOrientation(false);
  return (
    <ExerciseDetailScreen
      exerciseId={catalogId}
      onBack={() => navigation.goBack()}
      onStart={() => {
        if (!isCoachableId(catalogId)) return;
        navigation.navigate('Prepare', { exerciseId: catalogId, workoutId });
      }}
    />
  );
}

function PrepareRoute({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Prepare'>) {
  const { exerciseId, workoutId } = route.params;
  useSessionOrientation(true);
  return (
    <PrepareScreen
      onBack={() => navigation.goBack()}
      onReady={() => navigation.navigate('Training', { exerciseId, workoutId })}
    />
  );
}

function TrainingRoute({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Training'>) {
  const { exerciseId, workoutId } = route.params;
  useSessionOrientation(true);
  return (
    <TrainingScreen
      exerciseId={exerciseId}
      onEnd={(summary) => {
        navigation.replace('FollowAlongLog', {
          catalogId: exerciseId,
          cameraReps: summary.reps,
          formSummary: summary.topIssue?.message,
          workoutId,
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
  useSessionOrientation(false);
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
  useSessionOrientation(true);
  return <DevPoseScreen variant="debug" exerciseId="squat" />;
}

function FollowAlongRoute() {
  useSessionOrientation(false);
  return <FollowAlongLogScreen />;
}

function RestRoute() {
  useSessionOrientation(true);
  return <RestTimerScreen />;
}

function WelcomeRoute() {
  useSessionOrientation(false);
  return <WelcomeScreen />;
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
        <Stack.Screen name="Welcome" component={WelcomeRoute} />
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
          <Stack.Screen name="FollowAlongLog" component={FollowAlongRoute} />
          <Stack.Screen
            name="RestTimer"
            component={RestRoute}
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
