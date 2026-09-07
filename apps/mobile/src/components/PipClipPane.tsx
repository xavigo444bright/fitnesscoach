/**
 * 示范窗「样片」层：只播参考库原片（轨迹 source.label 对应 mp4）。
 * 无播放器时占位，不拿轨迹骨骼冒充原片。
 *
 * 钩子顺序必须固定：热更新改顺序会让 React 报
 * Cannot read property 'length' of undefined。
 */
import type {
  TrajectoryCameraHint,
  TrajectoryExerciseId,
} from '@fitness-coach/core';
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { isAvNativeReady } from '../avNative';
import { resolveSampleClip } from '../sampleClips';

type VideoComp = ComponentType<{
  source: number;
  playing: boolean;
  rate: number;
  onReady?: () => void;
  onError?: () => void;
}>;

let cachedVideo: VideoComp | undefined;
let loadThrew = false;

function loadPipVideo(): VideoComp | null {
  if (cachedVideo) return cachedVideo;
  if (loadThrew) return null;
  if (!isAvNativeReady()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedVideo = require('./PipSampleVideo').default as VideoComp;
    return cachedVideo;
  } catch {
    loadThrew = true;
    return null;
  }
}

class ClipErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };

  static getDerivedStateFromError(): { crashed: boolean } {
    return { crashed: true };
  }

  render(): ReactNode {
    if (this.state.crashed) return this.props.fallback;
    return this.props.children;
  }
}

type Props = {
  exerciseId: TrajectoryExerciseId;
  cameraHint: TrajectoryCameraHint;
  playing: boolean;
  rate: number;
  onReady?: () => void;
};

export default function PipClipPane({
  exerciseId,
  cameraHint,
  playing,
  rate,
  onReady,
}: Props) {
  const clip = resolveSampleClip(exerciseId, cameraHint);
  const [avFailed, setAvFailed] = useState(false);
  const [playerTick, setPlayerTick] = useState(0);
  const readyOnce = useRef(false);
  const onVideoError = useCallback(() => setAvFailed(true), []);

  useEffect(() => {
    if (loadPipVideo()) {
      setPlayerTick((n) => n + 1);
      return;
    }
    const t = setTimeout(() => setPlayerTick((n) => n + 1), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setAvFailed(false);
  }, [clip?.fileName]);

  const VideoComp = playerTick >= 0 ? loadPipVideo() : null;
  const canPlay = Boolean(clip && VideoComp && !avFailed);

  useEffect(() => {
    if (canPlay || readyOnce.current) return;
    readyOnce.current = true;
    onReady?.();
  }, [canPlay, onReady]);

  const placeholder = (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>参考原片无法播放</Text>
      <Text style={styles.placeholderFile}>
        {clip?.fileName ?? '未打进安装包'}
      </Text>
      <Text style={styles.placeholderHint}>
        {clip
          ? VideoComp
            ? '原片解码失败。可先切「骨骼」对照。'
            : '当前 App 未编入播放器。可先切「骨骼」对照。'
          : '后续动作原片按需下载（NFR-010），不打进包。可切「骨骼」对照。'}
      </Text>
    </View>
  );

  if (!canPlay || !clip || !VideoComp) return placeholder;

  return (
    <View style={styles.fill}>
      <ClipErrorBoundary fallback={placeholder}>
        <VideoComp
          source={clip.source}
          playing={playing}
          rate={rate}
          onReady={onReady}
          onError={onVideoError}
        />
      </ClipErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  placeholderTitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  placeholderFile: {
    color: 'rgba(34, 197, 94, 0.9)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
});
