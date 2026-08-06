/**
 * DevPose / 训练页共用管线：detect → filter → smooth → validate + 渲染叠加
 * M2A/M3 · M4-T4（variant=training → PG-004）
 */
import {
  initialRepCounterState,
  messageForRepReject,
  stepRep,
  validate,
  type Phase,
  type ValidationStatus,
} from '@fitness-coach/core';
import {
  getExerciseSession,
  type ExerciseId,
} from '../exerciseSession';
import {
  AdaptiveQualityController,
  evaluateLowLight,
  filterByVisibility,
  poseFromMediapipeEvent,
  PoseSmoother,
  timestampMsFromMediapipeEvent,
  type QualityTier,
} from '@fitness-coach/pose-native';
import {
  applyJointColors,
  beginFaultCycle,
  buildSkeletonScene,
  celebrateFixedFaults,
  DEFAULT_FEEDBACK_BAR_CONFIG,
  evaluatePlacement,
  initialLastFaultState,
  initialWiredFeedbackState,
  noteCycleFaults,
  repDisplayFromState,
  sealRejectedCycle,
  stepWiredFeedback,
  toggleFaultReview,
  type FeedbackBarItem,
  type SkeletonScene,
} from '@fitness-coach/render';
import { colors, motion } from '@fitness-coach/ui';
import { RNMediapipe, switchCamera } from '@thinksys/react-native-mediapipe';
import { useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import FeedbackBar from '../components/FeedbackBar';
import CorrectCheckBurst from '../components/CorrectCheckBurst';
import LastFaultReview from '../components/LastFaultReview';
import PlacementGuide from '../components/PlacementGuide';
import RepCounter from '../components/RepCounter';
import SkeletonOverlay from '../components/SkeletonOverlay';
import {
  getSessionCameraPrefs,
  setSessionQuality,
  toggleSessionFacing,
} from '../sessionCameraPrefs';
import type { SessionSummaryData } from '../types/session';
import {
  hydrateVoiceEnabled,
  isSpeechNativeReady,
  isVoiceEnabled,
  setVoiceEnabled,
  speakCoach,
} from '../voiceCoach';

function statusColor(status: ValidationStatus | '—'): string {
  switch (status) {
    case 'correct':
      return colors.correct;
    case 'warning':
      return colors.warning;
    case 'error':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

export type DevPoseScreenProps = {
  /** debug = 开发 HUD；training = PG-004 正式训练页 */
  variant?: 'debug' | 'training';
  /** 当前动作；默认深蹲 */
  exerciseId?: ExerciseId;
  /** 训练页「结束」回调，带回会话摘要 */
  onEnd?: (summary: SessionSummaryData) => void;
};

export default function DevPoseScreen({
  variant = 'debug',
  exerciseId = 'squat',
  onEnd,
}: DevPoseScreenProps) {
  const isTraining = variant === 'training';
  const exercise = getExerciseSession(exerciseId);
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();

  const smootherRef = useRef(new PoseSmoother());
  const repRef = useRef(initialRepCounterState());
  const qualityRef = useRef(new AdaptiveQualityController());
  const wiredFeedbackRef = useRef(initialWiredFeedbackState());
  const lastFaultRef = useRef(initialLastFaultState());
  const prevPhaseRef = useRef<Phase>('stand');
  const frameTimes = useRef<number[]>([]);
  const sessionStartedAt = useRef(Date.now());
  const issueCounts = useRef<Record<string, { message: string; count: number }>>(
    {},
  );
  /** 站位框隐藏迟滞：连续 ok 帧数，避免框闪烁。 */
  const placementOkStreak = useRef(0);

  const [fps, setFps] = useState(0);
  const [landmarkCount, setLandmarkCount] = useState(0);
  const [kneeDeg, setKneeDeg] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('stand');
  const [voiceOn, setVoiceOn] = useState(true);
  const [speechReady, setSpeechReady] = useState(false);
  const lastSpokenRep = useRef(0);

  useEffect(() => {
    void hydrateVoiceEnabled().then((on) => setVoiceOn(on));
    setSpeechReady(isSpeechNativeReady());
  }, []);
  const [status, setStatus] = useState<ValidationStatus | '—'>('—');
  const [feedbackItems, setFeedbackItems] = useState<FeedbackBarItem[]>([]);
  const [repCount, setRepCount] = useState(0);
  const [tier, setTier] = useState<QualityTier>('high');
  const [manual, setManual] = useState(false);
  const [frameLimit, setFrameLimit] = useState(30);
  const [inputScale, setInputScale] = useState(1);
  const [skeleton, setSkeleton] = useState<SkeletonScene | null>(null);
  const [placementVisible, setPlacementVisible] = useState(false);
  const [placementHint, setPlacementHint] = useState<string | null>(null);
  const [lowLightHint, setLowLightHint] = useState<string | null>(null);
  /** 半蹲/深度不足不计次时的置顶提示（约 2.5s）。 */
  const rejectHintUntil = useRef(0);
  const rejectRuleIdRef = useRef('rep-shallow');
  const rejectHintRef = useRef<string | null>(null);
  const [rejectHint, setRejectHint] = useState<string | null>(null);
  const recoverUntil = useRef(0);
  const recoverItemsRef = useRef<FeedbackBarItem[]>([]);
  const [recoverItems, setRecoverItems] = useState<FeedbackBarItem[]>([]);
  const [faultIssues, setFaultIssues] = useState(
    initialLastFaultState().issues,
  );
  const [faultReviewing, setFaultReviewing] = useState(false);

  const syncQualityUi = useCallback(() => {
    const p = qualityRef.current.profile();
    setTier(p.tier);
    setManual(qualityRef.current.isManual());
    setFrameLimit(p.frameLimit);
    setInputScale(p.inputScale);
  }, []);

  /** 从准备页带入质量档。 */
  useEffect(() => {
    const prefs = getSessionCameraPrefs();
    qualityRef.current.setManualTier(prefs.qualityTier);
    if (!prefs.qualityManual) {
      qualityRef.current.clearManual();
    }
    syncQualityUi();
  }, [syncQualityUi]);

  /**
   * MediaPipe 视图按 frameLimit/inputScale remount 后会回到默认前置；
   * 偏好为后置时每次挂载后再 switch 一次。
   */
  useEffect(() => {
    if (getSessionCameraPrefs().facing !== 'back') return;
    const t = setTimeout(() => {
      try {
        switchCamera();
      } catch {
        /* native 未就绪时忽略 */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [frameLimit, inputScale]);

  const onLandmark = useCallback(
    (data: unknown) => {
      const now = Date.now();
      const times = frameTimes.current.filter((t) => now - t < 1000);
      times.push(now);
      frameTimes.current = times;
      const currentFps = times.length;
      setFps(currentFps);

      const prevLimit = qualityRef.current.profile().frameLimit;
      qualityRef.current.observeFps(currentFps, now);
      const profile = qualityRef.current.profile();
      if (profile.frameLimit !== prevLimit) {
        syncQualityUi();
      }

      const detected = poseFromMediapipeEvent(data);
      if (!detected) {
        setLandmarkCount(0);
        setSkeleton(null);
        setPlacementVisible(true);
        setPlacementHint(
          exercise.id === 'pushup'
            ? '肩肘髋踝入画即可，不必顶满框'
            : '髋膝踝入画即可，不必顶满框',
        );
        setLowLightHint(null);
        return;
      }
      setLandmarkCount(detected.filter(Boolean).length);
      const light = evaluateLowLight(detected);
      setLowLightHint(light.hint);

      if (!qualityRef.current.shouldProcessFrame()) return;

      const ts = timestampMsFromMediapipeEvent(data, now);
      const filtered = filterByVisibility(detected);
      const smoothed = smootherRef.current.smooth(filtered, ts);
      const placement = evaluatePlacement(smoothed);
      if (placement.reason === 'ok') {
        placementOkStreak.current += 1;
      } else {
        placementOkStreak.current = 0;
      }
      // 连续 ~0.5s ok 再藏框，减少图1/图2 来回闪
      const showPlacement =
        placement.visible || placementOkStreak.current < 12;
      const prevPhase = prevPhaseRef.current;
      const nextRep = stepRep(repRef.current, smoothed, {
        phaseConfig: exercise.phaseConfig,
        rules: exercise.rules,
        angleFn: exercise.angleFn,
        depthRuleId: exercise.depthRuleId,
        exerciseId: exercise.id,
      });
      repRef.current = nextRep;
      const phaseNow = nextRep.phaseState.phase;
      prevPhaseRef.current = phaseNow;

      if (prevPhase === 'stand' && phaseNow === 'descend') {
        lastFaultRef.current = beginFaultCycle(lastFaultRef.current);
      }

      const result = validate(smoothed, phaseNow, exercise.rules);
      const driveAngle = exercise.angleFn(smoothed);
      const wired = stepWiredFeedback(wiredFeedbackRef.current, result, now);
      wiredFeedbackRef.current = wired.state;
      // 骨骼色用 latch 后的 validate，避免噪声一帧把黄骨刷绿
      const scene = applyJointColors(
        buildSkeletonScene(smoothed),
        wired.displayValidation,
        exercise.rules,
      );
      for (const cue of wired.newCues) {
        const prev = issueCounts.current[cue.id];
        issueCounts.current[cue.id] = {
          message: cue.message,
          count: (prev?.count ?? 0) + 1,
        };
        speakCoach(cue.message);
      }

      // 本周期已确认纠错 → 缓冲，供半蹲结算后回看
      const cycleIssues = wired.items
        .filter((i) => i.phase === 'correcting')
        .map((i) => ({
          id: i.ruleId,
          message: i.message,
          severity: (i.severity === 'warning' ? 'warning' : 'error') as
            | 'warning'
            | 'error',
        }));
      if (cycleIssues.length > 0) {
        lastFaultRef.current = noteCycleFaults(
          lastFaultRef.current,
          cycleIssues,
        );
      }

      let reject = rejectHintRef.current;
      let recover = recoverItemsRef.current;
      if (now > recoverUntil.current) {
        recover = [];
      }

      if (nextRep.lastOutcome?.type === 'rejected') {
        const msg = messageForRepReject(
          nextRep.lastOutcome.reason,
          exercise.id,
        );
        speakCoach(msg);
        rejectHintUntil.current = now + 2500;
        rejectRuleIdRef.current =
          nextRep.lastOutcome.reason === 'shallow'
            ? 'rep-shallow'
            : exercise.depthRuleId;
        reject = msg;
        const id = rejectRuleIdRef.current;
        const prev = issueCounts.current[id];
        issueCounts.current[id] = {
          message: msg,
          count: (prev?.count ?? 0) + 1,
        };
        lastFaultRef.current = sealRejectedCycle(lastFaultRef.current, {
          id,
          message: msg,
          severity: 'error',
        });
      } else if (nextRep.lastOutcome?.type === 'counted') {
        if (nextRep.count !== lastSpokenRep.current) {
          lastSpokenRep.current = nextRep.count;
          speakCoach(`${nextRep.count}`);
        }
        const celebrated = celebrateFixedFaults(
          lastFaultRef.current,
          DEFAULT_FEEDBACK_BAR_CONFIG.recoverMessageById,
        );
        lastFaultRef.current = celebrated.state;
        if (celebrated.recovered.length > 0) {
          recoverUntil.current = now + motion.feedbackRecoveredMs;
          recover = celebrated.recovered.map((r) => ({
            ruleId: r.id,
            message: r.message,
            severity: 'correct' as const,
            phase: 'recovered' as const,
          }));
        }
        reject = null;
      } else if (reject && now > rejectHintUntil.current) {
        reject = null;
      }

      rejectHintRef.current = reject;
      recoverItemsRef.current = recover;

      const repUi = repDisplayFromState(nextRep);
      let barItems: FeedbackBarItem[] =
        reject != null
          ? [
              {
                ruleId: rejectRuleIdRef.current,
                message: reject,
                severity: 'error' as const,
                phase: 'correcting' as const,
              },
              ...wired.items.filter(
                (i) =>
                  i.ruleId !== 'rep-shallow' &&
                  i.ruleId !== exercise.depthRuleId,
              ),
            ].slice(0, 2)
          : wired.items;

      if (recover.length > 0 && reject == null) {
        barItems = [...recover, ...barItems]
          .filter(
            (item, idx, arr) =>
              arr.findIndex((x) => x.ruleId === item.ruleId) === idx,
          )
          .slice(0, 2);
      }

      setPhase(phaseNow);
      setKneeDeg(driveAngle);
      setStatus(result.status);
      setFeedbackItems(barItems);
      setRejectHint(reject);
      setRecoverItems(recover);
      setFaultIssues(lastFaultRef.current.issues);
      setFaultReviewing(lastFaultRef.current.reviewing);
      setRepCount(repUi.count);
      setSkeleton(scene);
      setPlacementVisible(showPlacement);
      setPlacementHint(
        showPlacement
          ? (placement.hint ??
              (exercise.id === 'pushup'
                ? '肩肘髋踝入画即可，侧面看清身体一线'
                : '髋膝踝入画即可，不必顶满框'))
          : null,
      );
    },
    [syncQualityUi, exercise],
  );

  const onToggleFaultReview = useCallback(() => {
    lastFaultRef.current = toggleFaultReview(lastFaultRef.current);
    setFaultIssues(lastFaultRef.current.issues);
    setFaultReviewing(lastFaultRef.current.reviewing);
  }, []);

  const onToggleVoice = useCallback(() => {
    const next = !isVoiceEnabled();
    void setVoiceEnabled(next).then(() => setVoiceOn(next));
  }, []);

  const onResetReps = useCallback(() => {
    repRef.current = initialRepCounterState();
    lastFaultRef.current = initialLastFaultState();
    lastSpokenRep.current = 0;
    prevPhaseRef.current = 'stand';
    setRepCount(0);
    setPhase('stand');
    setFaultIssues([]);
    setFaultReviewing(false);
    setRecoverItems([]);
    setRejectHint(null);
  }, []);

  const buildSummary = useCallback((): SessionSummaryData => {
    const issues = Object.values(issueCounts.current);
    const topIssue =
      issues.length === 0
        ? undefined
        : issues.reduce((a, b) => (b.count > a.count ? b : a));
    return {
      reps: repRef.current.count,
      durationMs: Date.now() - sessionStartedAt.current,
      topIssue,
    };
  }, []);

  const onEndSession = useCallback(() => {
    if (onEnd) {
      onEnd(buildSummary());
      return;
    }
    onResetReps();
  }, [onEnd, buildSummary, onResetReps]);

  const onCycleQuality = useCallback(() => {
    qualityRef.current.cycleManual();
    const p = qualityRef.current.profile();
    setSessionQuality(p.tier, true);
    syncQualityUi();
  }, [syncQualityUi]);

  const onAutoQuality = useCallback(() => {
    qualityRef.current.clearManual();
    setSessionQuality(qualityRef.current.profile().tier, false);
    syncQualityUi();
  }, [syncQualityUi]);

  const onFlipCamera = useCallback(() => {
    try {
      switchCamera();
      toggleSessionFacing();
    } catch {
      /* ignore */
    }
  }, []);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.hint}>正在检查摄像头权限…</Text>
        <Text style={styles.sub}>
          {isTraining ? '训练中 · PG-004' : 'DevPose 调试'}
        </Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>需要摄像头权限</Text>
        <Text style={styles.hint}>需要摄像头才能实时分析动作</Text>
        {!permission.canAskAgain && (
          <Text style={styles.warning}>
            请到：设置 → Fitness Coach → 摄像头 → 打开
          </Text>
        )}
        <Pressable style={styles.button} onPress={() => void requestPermission()}>
          <Text style={styles.buttonText}>允许使用摄像头</Text>
        </Pressable>
        <StatusBar style="dark" />
      </View>
    );
  }

  const kneeText = kneeDeg == null ? '—' : `${kneeDeg.toFixed(1)}°`;
  const camW = Math.max(160, Math.floor(width * inputScale));
  const camH = Math.max(160, Math.floor(height * inputScale));

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrap}>
        <View style={{ width: camW, height: camH }}>
          <RNMediapipe
            key={`mp-${frameLimit}-${inputScale}`}
            width={camW}
            height={camH}
            onLandmark={onLandmark}
            frameLimit={frameLimit}
          />
          <SkeletonOverlay
            scene={skeleton}
            width={camW}
            height={camH}
          />
          <PlacementGuide visible={placementVisible} hint={placementHint} />
        </View>
      </View>

      {lowLightHint ? (
        <View style={styles.lowLightBanner} pointerEvents="none">
          <Text style={styles.lowLightText}>{lowLightHint}</Text>
        </View>
      ) : null}

      {isTraining ? (
        <View style={styles.trainingTop} pointerEvents="box-none">
          <FeedbackBar items={feedbackItems} />
          <LastFaultReview
            issues={faultIssues}
            reviewing={faultReviewing}
            onToggle={onToggleFaultReview}
          />
        </View>
      ) : (
        <View style={styles.hud} pointerEvents="box-none">
          <FeedbackBar items={feedbackItems} />
          <LastFaultReview
            issues={faultIssues}
            reviewing={faultReviewing}
            onToggle={onToggleFaultReview}
          />
          <Text style={styles.hudTitle}>DevPose · 调试</Text>
          <Text style={styles.hudText}>
            {exercise.id === 'pushup' ? '肘角' : '膝角'}:{' '}
            <Text style={styles.hudEm}>{kneeText}</Text>
            {' · '}
            {exercise.def.name}
          </Text>
          <Text style={styles.hudText}>
            status:{' '}
            <Text style={[styles.hudEm, { color: statusColor(status) }]}>
              {status}
            </Text>
          </Text>
          <Text style={styles.hudText}>phase: {phase}</Text>
          <Text style={styles.hudMuted}>
            关键点 {landmarkCount} · FPS {fps} · quality {tier}
            {manual ? ' (手动)' : ' (自动)'} · scale {inputScale} · lim{' '}
            {frameLimit}
          </Text>
        </View>
      )}

      <View style={styles.topActions} pointerEvents="box-none">
        <Pressable
          style={styles.actionBtn}
          onPress={onFlipCamera}
          accessibilityRole="button"
          accessibilityLabel="切换摄像头"
          hitSlop={8}
        >
          <Text style={styles.actionBtnText}>翻转</Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={onCycleQuality}
          accessibilityRole="button"
          accessibilityLabel={`质量档 ${tier}`}
          hitSlop={8}
        >
          <Text style={styles.actionBtnText}>质量 {tier}</Text>
        </Pressable>
        {manual ? (
          <Pressable
            style={styles.actionBtn}
            onPress={onAutoQuality}
            accessibilityRole="button"
            accessibilityLabel="恢复自动质量"
            hitSlop={8}
          >
            <Text style={styles.actionBtnText}>自动</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.actionBtn}
          onPress={onToggleVoice}
          accessibilityRole="button"
          accessibilityLabel={voiceOn ? '关闭语音' : '打开语音'}
          hitSlop={8}
        >
          <Text style={styles.actionBtnText}>
            {!speechReady ? '语音×' : voiceOn ? '语音开' : '语音关'}
          </Text>
        </Pressable>
      </View>

      <CorrectCheckBurst repCount={repCount} />

      <View style={styles.bottomBar}>
        <RepCounter
          count={repCount}
          onEnd={isTraining ? onEndSession : onResetReps}
          endLabel={isTraining ? '结束' : '重置'}
        />
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  cameraWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  center: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  hint: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  sub: {
    marginTop: 12,
    color: '#999',
    fontSize: 13,
  },
  warning: {
    color: '#c00',
    textAlign: 'center',
    marginBottom: 16,
  },
  hud: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 100,
    backgroundColor: 'rgba(0,0,0,0.78)',
    padding: 14,
    borderRadius: 10,
  },
  trainingTop: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 100,
    paddingRight: 168,
  },
  topActions: {
    position: 'absolute',
    top: 56,
    right: 12,
    zIndex: 120,
    elevation: 120,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    maxWidth: 220,
  },
  actionBtn: {
    minHeight: 44,
    minWidth: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  lowLightBanner: {
    position: 'absolute',
    top: 120,
    left: 24,
    right: 24,
    zIndex: 110,
    elevation: 110,
    backgroundColor: 'rgba(180, 90, 0, 0.92)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  lowLightText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  hudTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  hudText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 2,
  },
  hudEm: {
    fontWeight: '700',
    color: '#fff',
  },
  hudMuted: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 4,
  },
  msg: {
    color: '#F5C542',
    fontSize: 12,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  button: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonSecondary: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#444',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 100,
  },
});
