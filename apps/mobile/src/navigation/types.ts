import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ExerciseId } from '../exerciseSession';
import type { SessionSummaryData } from '../types/session';

export type MainTabParamList = {
  Home: { workoutId?: string; openedFrom?: 'log' } | undefined;
  Log: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Detail: { catalogId: string; workoutId?: string };
  Prepare: { exerciseId: ExerciseId; workoutId?: string };
  Training: { exerciseId: ExerciseId; workoutId?: string };
  Summary: { summary: SessionSummaryData; exerciseId: ExerciseId };
  FollowAlongLog: {
    catalogId: string;
    cameraReps: number;
    formSummary?: string;
    workoutId?: string;
  };
  RestTimer: { durationSec: number };
  DevPose: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
