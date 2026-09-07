/**
 * 训练示范窗（FR-084 / FR-086）：可拖、可收起；默认循环播参考库原片，
 * 点击暂停/播放、可调速；可切参考人+2D 骨。
 */
import {
  type Pose,
  type TrajectoryCameraHint,
  type TrajectoryExerciseId,
} from '@fitness-coach/core';
import {
  colors,
  clipShouldPlay,
  DEFAULT_CLIP_PLAYBACK_RATE,
  formatClipPlaybackRate,
  layout,
  nextClipPlaybackRate,
} from '@fitness-coach/ui';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sampleClipFileName } from '../sampleClips';
import DraggablePip from './DraggablePip';
import PipClipPane from './PipClipPane';
import ReferencePersonPip from './ReferencePersonPip';

export type DemoWindowMode = 'clip' | 'bones';

type Props = {
  screenW: number;
  screenH: number;
  pose: Pose | null;
  cameraHint?: TrajectoryCameraHint;
  exerciseId?: TrajectoryExerciseId;
  onReady?: () => void;
  /** 推荐侧面却被判成正面：停在样片，不把现场乱 Pose 放大成示范骨 */
  forceClip?: boolean;
};

export default function ReferenceDemoWindow({
  screenW,
  screenH,
  pose,
  cameraHint = 'side',
  exerciseId = 'squat',
  onReady,
  forceClip = false,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const fileName = useMemo(
    () => sampleClipFileName(exerciseId, cameraHint),
    [exerciseId, cameraHint],
  );
  const fileStem = fileName?.replace(/\.mp4$/i, '') ?? '';
  const [mode, setMode] = useState<DemoWindowMode>(fileName ? 'clip' : 'bones');
  const [clipPlaying, setClipPlaying] = useState(true);
  const [clipRate, setClipRate] = useState(DEFAULT_CLIP_PLAYBACK_RATE);
  const displayMode: DemoWindowMode = forceClip && fileName ? 'clip' : mode;
  const showClip = displayMode === 'clip';
  const showBones = displayMode === 'bones';
  useEffect(() => {
    setMode(fileName ? 'clip' : 'bones');
  }, [fileName]);

  return (
    <DraggablePip
      screenW={screenW}
      screenH={screenH}
      collapsed={collapsed}
    >
      {collapsed ? (
        <Pressable
          style={styles.tab}
          onPress={() => setCollapsed(false)}
          accessibilityRole="button"
          accessibilityLabel="拉开示范窗"
          hitSlop={4}
        >
          <Text style={styles.tabText}>示</Text>
        </Pressable>
      ) : (
        <View style={styles.frame}>
          <View
            style={showClip ? styles.clipLayer : styles.clipLayerHidden}
            pointerEvents="none"
          >
            <PipClipPane
              exerciseId={exerciseId}
              cameraHint={cameraHint}
              playing={clipShouldPlay(displayMode, clipPlaying)}
              rate={clipRate}
              onReady={onReady}
            />
          </View>
          {showBones ? (
            <ReferencePersonPip
              pose={pose}
              cameraHint={cameraHint}
              exerciseId={exerciseId}
              onReady={onReady}
              showCaption={false}
              bare
            />
          ) : null}
          {showClip ? (
            <Pressable
              style={styles.tapZone}
              onPress={() => setClipPlaying((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={clipPlaying ? '暂停原片' : '播放原片'}
            >
              {clipPlaying ? null : (
                <View style={styles.pauseBadge} pointerEvents="none">
                  <Text style={styles.pauseBadgeText}>播放</Text>
                </View>
              )}
            </Pressable>
          ) : null}
          <View style={styles.chrome} pointerEvents="box-none">
            <View style={styles.topRow} pointerEvents="box-none">
              <View>
                <Text style={styles.title} pointerEvents="none">
                  {showClip ? '原片' : '示范'}
                </Text>
                {showClip && fileStem ? (
                  <Text style={styles.fileHint} pointerEvents="none">
                    {fileStem}
                  </Text>
                ) : null}
              </View>
              <View style={styles.topActions}>
                {showClip ? (
                  <Pressable
                    style={styles.rateBtn}
                    onPress={() => setClipRate((prev) => nextClipPlaybackRate(prev))}
                    accessibilityRole="button"
                    accessibilityLabel={`倍速 ${formatClipPlaybackRate(clipRate)}，点击切换`}
                    hitSlop={6}
                  >
                    <Text style={styles.rateBtnText}>
                      {formatClipPlaybackRate(clipRate)}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.collapseBtn}
                  onPress={() => setCollapsed(true)}
                  accessibilityRole="button"
                  accessibilityLabel="收起示范窗"
                  hitSlop={6}
                >
                  <Text style={styles.collapseBtnText}>收起</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.modeRow}>
              <Pressable
                style={[
                  styles.modeChip,
                  showClip ? styles.modeChipOn : null,
                ]}
                onPress={() => setMode('clip')}
                accessibilityRole="button"
                accessibilityLabel="轮播参考原片"
                accessibilityState={{ selected: showClip }}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    showClip ? styles.modeChipTextOn : null,
                  ]}
                >
                  样片
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modeChip,
                  showBones ? styles.modeChipOn : null,
                  forceClip ? styles.modeChipDisabled : null,
                ]}
                onPress={() => {
                  if (!forceClip) setMode('bones');
                }}
                accessibilityRole="button"
                accessibilityLabel="示范骨加二维骨"
                accessibilityState={{ selected: showBones, disabled: forceClip }}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    showBones ? styles.modeChipTextOn : null,
                  ]}
                >
                  骨骼
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </DraggablePip>
  );
}

const PIP_W = layout.refPersonPipWidth;
const PIP_H = layout.refPersonPipHeight;

const styles = StyleSheet.create({
  tab: {
    width: layout.refPersonPipTabWidth,
    height: layout.refPersonPipTabHeight,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    color: colors.correct,
    fontSize: 16,
    fontWeight: '800',
  },
  frame: {
    width: PIP_W,
    height: PIP_H,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.45)',
  },
  clipLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  clipLayerHidden: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  tapZone: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    bottom: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBadge: {
    minWidth: 56,
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  chrome: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  title: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '700',
  },
  fileHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
    maxWidth: 88,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rateBtn: {
    minHeight: 28,
    minWidth: 36,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBtnText: {
    color: colors.correct,
    fontSize: 11,
    fontWeight: '800',
  },
  collapseBtn: {
    minHeight: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseBtnText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '700',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  modeChip: {
    flex: 1,
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipOn: {
    borderColor: colors.correct,
    backgroundColor: 'rgba(34, 197, 94, 0.22)',
  },
  modeChipDisabled: {
    opacity: 0.45,
  },
  modeChipText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '700',
  },
  modeChipTextOn: {
    color: colors.correct,
  },
});
