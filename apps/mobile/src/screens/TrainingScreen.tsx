/**
 * PG-004 正式训练页（M4-T4）
 * 组装 pose + render：骨骼 / 色编码 / FeedbackBar / Ghost / Rep。
 */
import type { ExerciseId } from '../exerciseSession';
import type { SessionSummaryData } from '../types/session';
import DevPoseScreen from './DevPoseScreen';

type Props = {
  exerciseId: ExerciseId;
  onEnd: (summary: SessionSummaryData) => void;
};

export default function TrainingScreen({ exerciseId, onEnd }: Props) {
  return (
    <DevPoseScreen
      variant="training"
      exerciseId={exerciseId}
      onEnd={onEnd}
    />
  );
}
