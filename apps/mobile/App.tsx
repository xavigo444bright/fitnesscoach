import { isCoachableId } from '@fitness-coach/core';
import { useCallback, useState } from 'react';
import type { ExerciseId } from './src/exerciseSession';
import DevPoseScreen from './src/screens/DevPoseScreen';
import ExerciseDetailScreen from './src/screens/ExerciseDetailScreen';
import ExerciseLibraryScreen from './src/screens/ExerciseLibraryScreen';
import PrepareScreen from './src/screens/PrepareScreen';
import SessionSummaryScreen from './src/screens/SessionSummaryScreen';
import TrainingScreen from './src/screens/TrainingScreen';
import type { SessionSummaryData } from './src/types/session';

type Screen =
  | 'library'
  | 'detail'
  | 'prepare'
  | 'training'
  | 'summary'
  | 'devpose';

export default function App() {
  const [screen, setScreen] = useState<Screen>('library');
  const [catalogId, setCatalogId] = useState('squat');
  const [exerciseId, setExerciseId] = useState<ExerciseId>('squat');
  const [summary, setSummary] = useState<SessionSummaryData | null>(null);

  const goTraining = useCallback(() => setScreen('training'), []);

  const endTraining = useCallback((data: SessionSummaryData) => {
    setSummary(data);
    setScreen('summary');
  }, []);

  if (screen === 'summary' && summary) {
    return (
      <SessionSummaryScreen
        summary={summary}
        onRetry={() => setScreen('prepare')}
        onBack={() => {
          setSummary(null);
          setScreen('library');
        }}
      />
    );
  }

  if (screen === 'training') {
    return (
      <TrainingScreen exerciseId={exerciseId} onEnd={endTraining} />
    );
  }

  if (screen === 'devpose') {
    return <DevPoseScreen variant="debug" exerciseId="squat" />;
  }

  if (screen === 'prepare') {
    return (
      <PrepareScreen
        onBack={() => setScreen('detail')}
        onReady={goTraining}
      />
    );
  }

  if (screen === 'detail') {
    return (
      <ExerciseDetailScreen
        exerciseId={catalogId}
        onBack={() => setScreen('library')}
        onStart={() => {
          if (isCoachableId(catalogId)) {
            setExerciseId(catalogId);
            setScreen('prepare');
          }
        }}
      />
    );
  }

  return (
    <ExerciseLibraryScreen
      onSelectExercise={(id) => {
        setCatalogId(id);
        if (isCoachableId(id)) setExerciseId(id);
        setScreen('detail');
      }}
      onOpenDevPose={() => setScreen('devpose')}
    />
  );
}
