import { useCallback, useState } from 'react';
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
    return <TrainingScreen onEnd={endTraining} />;
  }

  if (screen === 'devpose') {
    return <DevPoseScreen variant="debug" />;
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
        onBack={() => setScreen('library')}
        onStart={() => setScreen('prepare')}
      />
    );
  }

  return (
    <ExerciseLibraryScreen
      onSelectSquat={() => setScreen('detail')}
      onOpenDevPose={() => setScreen('devpose')}
    />
  );
}
