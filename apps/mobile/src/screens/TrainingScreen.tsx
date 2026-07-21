/**
 * PG-004 正式训练页（M4-T4）
 * 组装 pose + render：骨骼 / 色编码 / FeedbackBar / Ghost / Rep。
 */
import DevPoseScreen from './DevPoseScreen';
import type { SessionSummaryData } from '../types/session';

type Props = {
  onEnd: (summary: SessionSummaryData) => void;
};

export default function TrainingScreen({ onEnd }: Props) {
  return <DevPoseScreen variant="training" onEnd={onEnd} />;
}
