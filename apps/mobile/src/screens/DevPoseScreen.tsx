/**
 * DevPose / 训练页共用管线：
 * detect → smooth → filter(校验 0.5 / 绘制 0.2) → validate + 渲染叠加
 * M2A/M3 · M4-T4（variant=training → PG-004）
 */
import {
  ExerciseSubjectLock,
  abortOpenRepCycle,
  hasDemoTrajectory,
  initialLateralRaiseWristMemory,
  initialRepCounterState,
  inferPoseUprightTurn,
  invertQuarterTurn,
  lateralRaiseDriveDeg,
  messageForRepReject,
  poseUprightApplies,
  PoseUprightLatch,
  rotatePoseNormalized,
  stepRep,
  validate,
  type Phase,
  type Pose,
  type QuarterTurn,
  type TrajectoryCameraHint,
  type ValidationResult,
  type ValidationStatus,
} from '@fitness-coach/core';
import {
  getExerciseSession,
  driveAngleHud,
  type ExerciseId,
} from '../exerciseSession';
import {
  DRAW_VISIBILITY_THRESHOLD,
  evaluateLowLight,
  filterByVisibility,
  posesFromMediapipeEvent,
  PoseSmoother,
  timestampMsFromMediapipeEvent,
} from '@fitness-coach/pose-native';
import {
  applyJointColors,
  beginFaultCycle,
  buildSkeletonScene,
  celebrateFixedFaults,
  DEFAULT_FEEDBACK_BAR_CONFIG,
  recoverMessageByIdFor,
  allowSessionCount,
  placementConfigFor,
  composePlacementHint,
  formatPlacementCoachHint,
  evaluatePlacement,
  initialLastFaultState,
  initialWiredFeedbackState,
  noteCycleFaults,
  CameraHintLatch,
  inferCameraHintDetailed,
  canonicalPoseFromUser,
  filterPoseForOverlay,
  isWrongCameraPlane,
  liveSkeletonDrawSpec,
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
import HoldTimerOverlay from '../components/HoldTimerOverlay';
import LastFaultReview from '../components/LastFaultReview';
import PlacementGuide from '../components/PlacementGuide';
import ReferenceDemoWindow from '../components/ReferenceDemoWindow';
import RepCounter from '../components/RepCounter';
import SkeletonOverlay from '../components/SkeletonOverlay';
import {
  getSessionCameraPrefs,
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

/** 姿态输入固定最高档（frameLimit 30 / 全分辨率），不再做质量降级。 */
const POSE_FRAME_LIMIT = 30;

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

function jointsCueFor(id: ExerciseId): string {
  if (id === 'pushup') return '肩、肘、髋、踝';
  if (id === 'glute-bridge') return '肩、髋、膝';
  if (id === 'lunge') return '肩、髋、膝、踝';
  if (id === 'plank') return '肩、髋、踝';
  if (id === 'db-row' || id === 'ohp' || id === 'bench-press') {
    return '肩、肘、髋';
  }
  if (id === 'rdl') return '肩、髋、膝';
  if (id === 'pullup') return '肩、肘';
  if (id === 'db-fly') return '肩、腕';
  if (id === 'dip') return '肩、肘';
  if (id === 'incline-pushup') return '肩、肘、髋、踝';
  if (id === 'cable-crossover') return '肩、腕';
  if (id === 'chest-press-machine') return '肩、肘、髋';
  if (id === 'lateral-raise' || id === 'front-raise') return '肩、肘';
  if (id === 'rear-delt-fly') return '肩、腕';
  if (id === 'face-pull') return '肩、肘';
  if (id === 'pike-pushup') return '肩、肘、髋、踝';
  return '髋、膝、踝';
}

function placementHintFor(
  id: ExerciseId,
  kind: 'empty' | 'fallback',
): string {
  if (id === 'pushup') {
    return kind === 'empty'
      ? '肩肘髋踝入画即可，不必顶满框'
      : '肩肘髋踝入画即可，侧面看清身体一线';
  }
  if (id === 'glute-bridge') {
    return kind === 'empty'
      ? '肩髋膝入画即可，侧面仰卧'
      : '肩髋膝入画即可，侧面看清顶髋';
  }
  if (id === 'lunge') {
    return kind === 'empty'
      ? '肩髋膝踝入画即可，侧面分腿'
      : '肩髋膝踝入画即可，侧面看清前后腿';
  }
  if (id === 'plank') {
    return kind === 'empty'
      ? '请把手机放远并侧对镜头，肩髋踝入画后再计秒'
      : '肩髋踝入画即可，侧面看清身体一线';
  }
  if (id === 'db-row') {
    return kind === 'empty'
      ? '肩肘髋入画即可，侧面划船'
      : '肩肘髋入画即可，侧面看清拉收';
  }
  if (id === 'ohp') {
    return kind === 'empty'
      ? '肩肘髋入画即可，侧面站姿推举'
      : '肩肘髋入画即可，侧面看清锁肘';
  }
  if (id === 'bench-press') {
    return kind === 'empty'
      ? '肩肘髋入画即可，侧面卧推'
      : '肩肘髋入画即可，侧面看清触胸';
  }
  if (id === 'rdl') {
    return kind === 'empty'
      ? '肩髋膝入画即可，侧面髋铰链'
      : '肩髋膝入画即可，侧面看清锁髋与铰链';
  }
  if (id === 'pullup') {
    return kind === 'empty'
      ? '肩肘入画即可，侧面引体'
      : '肩肘入画即可，侧面看清过杆';
  }
  if (id === 'db-fly') {
    return kind === 'empty'
      ? '肩腕入画即可，凳侧 3/4 飞鸟'
      : '肩腕入画即可，3/4 看清开合';
  }
  if (id === 'dip') {
    return kind === 'empty'
      ? '肩肘入画即可，双杠斜前方 3/4'
      : '肩肘入画即可，3/4 看清屈伸与前倾';
  }
  if (id === 'incline-pushup') {
    return kind === 'empty'
      ? '肩肘髋踝入画即可，侧面手撑高处'
      : '肩肘髋踝入画即可，侧面看清身体一线';
  }
  if (id === 'cable-crossover') {
    return kind === 'empty'
      ? '肩腕入画即可，面对龙门'
      : '肩腕入画即可，正面看清开合';
  }
  if (id === 'chest-press-machine') {
    return kind === 'empty'
      ? '肩肘髋入画即可，侧面坐姿推胸'
      : '肩肘髋入画即可，侧面看清收回';
  }
  if (id === 'lateral-raise') {
    return kind === 'empty'
      ? '肩肘入画即可，面对镜头侧平举'
      : '肩肘入画即可，正面看清抬至肩高';
  }
  if (id === 'front-raise') {
    return kind === 'empty'
      ? '肩肘入画即可，侧面前平举'
      : '肩肘入画即可，侧面看清前抬';
  }
  if (id === 'rear-delt-fly') {
    return kind === 'empty'
      ? '肩腕入画即可，斜侧 3/4 俯身飞鸟'
      : '肩腕入画即可，3/4 看清打开';
  }
  if (id === 'face-pull') {
    return kind === 'empty'
      ? '肩肘入画即可，斜前方 3/4 面拉'
      : '肩肘入画即可，3/4 看清拉向面部';
  }
  if (id === 'pike-pushup') {
    return kind === 'empty'
      ? '肩肘髋踝入画即可，侧面倒 V'
      : '肩肘髋踝入画即可，侧面看清髋高与头向地面';
  }
  return '髋膝踝入画即可，不必顶满框';
}

export type DevPoseScreenProps = {
  /** debug = 开发 HUD；training = PG-004 正式训练页 */
  variant?: 'debug' | 'training';
  /** 当前动作；默认深蹲 */
  exerciseId?: ExerciseId;
  /** 训练页「结束」回调，带回会话摘要 */
  onEnd?: (summary: SessionSummaryData) => void;
};

function richestCandidate(candidates: Pose[]): Pose | undefined {
  let best: Pose | undefined;
  let n = -1;
  for (const p of candidates) {
    const c = p.filter(Boolean).length;
    if (c > n) {
      n = c;
      best = p;
    }
  }
  return best;
}

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
  const subjectLockRef = useRef(new ExerciseSubjectLock(exercise.id));
  const raiseWristMem = useRef(initialLateralRaiseWristMemory());
  const uprightLatchRef = useRef(new PoseUprightLatch());
  const repRef = useRef(initialRepCounterState());
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
  const [holdActive, setHoldActive] = useState(false);
  const [skeleton, setSkeleton] = useState<SkeletonScene | null>(null);
  const [refCameraHint, setRefCameraHint] = useState<TrajectoryCameraHint>(
    exercise.def.cameraHint,
  );
  const [canonicalPose, setCanonicalPose] = useState<Pose | null>(null);
  const [lockPipToClip, setLockPipToClip] = useState(false);
  const [showReference, setShowReference] = useState(true);
  const showReferenceRef = useRef(true);
  const trajCameraRef = useRef<TrajectoryCameraHint>(exercise.def.cameraHint);
  const cameraHintLatch = useRef(new CameraHintLatch(8));
  useEffect(() => {
    cameraHintLatch.current.reset();
    trajCameraRef.current = exercise.def.cameraHint;
    setRefCameraHint(exercise.def.cameraHint);
    setCanonicalPose(null);
    subjectLockRef.current = new ExerciseSubjectLock(exercise.id);
    raiseWristMem.current = initialLateralRaiseWristMemory();
    uprightLatchRef.current.reset();
    smootherRef.current.reset();
  }, [exercise.id]);
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

  /**
   * MediaPipe 挂载后：偏好为后置时再 switch 一次。
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
  }, []);

  const onLandmark = useCallback(
    (data: unknown) => {
      const now = Date.now();
      const times = frameTimes.current.filter((t) => now - t < 1000);
      times.push(now);
      frameTimes.current = times;
      const currentFps = times.length;
      setFps(currentFps);

      const candidates = posesFromMediapipeEvent(data);
      const prevTurn = uprightLatchRef.current.value;
      let turn: QuarterTurn = 0;
      if (poseUprightApplies(exercise.id)) {
        const probe = richestCandidate(candidates);
        turn = probe
          ? uprightLatchRef.current.update(inferPoseUprightTurn(probe))
          : uprightLatchRef.current.value;
      }
      if (turn !== prevTurn) {
        smootherRef.current.reset();
        subjectLockRef.current.reset();
      }
      const oriented =
        turn === 0
          ? candidates
          : candidates.map((p) => rotatePoseNormalized(p, turn));
      const detected = subjectLockRef.current.pick(oriented);
      if (subjectLockRef.current.didSwitch()) {
        smootherRef.current.reset();
      }
      if (!detected) {
        setLandmarkCount(0);
        setSkeleton(null);
        setCanonicalPose(null);
        setPlacementVisible(true);
        setPlacementHint(placementHintFor(exercise.id, 'empty'));
        setLowLightHint(null);
        return;
      }
      setLandmarkCount(detected.filter(Boolean).length);
      const light = evaluateLowLight(detected);
      setLowLightHint(light.hint);

      const ts = timestampMsFromMediapipeEvent(data, now);
      const smoothed = smootherRef.current.smooth(detected, ts);
      const forRules = filterByVisibility(smoothed);
      const forDrawUpright = filterByVisibility(
        smoothed,
        DRAW_VISIBILITY_THRESHOLD,
      );
      const forDrawCamera =
        turn === 0
          ? forDrawUpright
          : rotatePoseNormalized(forDrawUpright, invertQuarterTurn(turn));
      // 平板/划船/推举/卧推：绘制阈值喂引擎（踝/肘 vis 常 0.2–0.5）
      const lowVisEngine =
        exercise.id === 'plank' ||
        exercise.id === 'db-row' ||
        exercise.id === 'ohp' ||
        exercise.id === 'bench-press' ||
        exercise.id === 'rdl' ||
        exercise.id === 'pullup' ||
        exercise.id === 'db-fly' ||
        exercise.id === 'dip' ||
        exercise.id === 'incline-pushup' ||
        exercise.id === 'chest-press-machine' ||
        exercise.id === 'lateral-raise' ||
        exercise.id === 'front-raise' ||
        exercise.id === 'rear-delt-fly' ||
        exercise.id === 'face-pull' ||
        exercise.id === 'pike-pushup';
      const forEngine = lowVisEngine ? forDrawUpright : forRules;
      const placement = evaluatePlacement(
        forDrawCamera,
        placementConfigFor(exercise.id),
      );
      const camInf = inferCameraHintDetailed(forEngine);
      const sideOnly =
        exercise.def.cameraHint === 'side' &&
        !hasDemoTrajectory(exercise.id, 'front');
      const frontOnly = exercise.id === 'lateral-raise';
      const angleFn =
        exercise.id === 'lateral-raise'
          ? (pose: Pose) =>
              lateralRaiseDriveDeg(
                pose,
                raiseWristMem.current,
                turn === 0
                  ? pose
                  : rotatePoseNormalized(pose, invertQuarterTurn(turn)),
              )
          : exercise.angleFn;
      // FR-022：能算出驱动角则允许计数；正面误判只提示不冻
      const driveLive = angleFn(forEngine);
      const planeWrong = isWrongCameraPlane({
        requireSidePlane: sideOnly,
        requireFrontPlane: frontOnly,
        observedCamera: camInf.hint,
        observedConfidence: camInf.confidence,
      });
      const allowCount = allowSessionCount(placement, driveLive);
      if (allowCount) {
        placementOkStreak.current += 1;
      } else {
        placementOkStreak.current = 0;
      }
      // 连续 ~0.5s ok 再藏框，减少图1/图2 来回闪
      const composedHint = composePlacementHint(placement, {
        recommendedCamera: exercise.def.cameraHint,
        observedCamera: camInf.hint,
        jointsCue: jointsCueFor(exercise.id),
        holdSecond: exercise.countMode === 'hold_second',
        floorHold:
          exercise.id === 'plank' ||
          exercise.id === 'pushup' ||
          exercise.id === 'incline-pushup' ||
          exercise.id === 'pike-pushup',
        requireFrontPlane: frontOnly,
      });
      const showPlacement =
        (!allowCount &&
          (placement.visible || placementOkStreak.current < 12)) ||
        planeWrong;
      const freezeCount = frontOnly && planeWrong;
      const engineActive = subjectLockRef.current.isExerciseActive();
      if (!engineActive) {
        raiseWristMem.current = initialLateralRaiseWristMemory();
      }
      const prevPhase = prevPhaseRef.current;
      const nextRep = !engineActive
        ? abortOpenRepCycle(repRef.current)
        : allowCount && !freezeCount
          ? stepRep(repRef.current, forEngine, {
              phaseConfig: exercise.phaseConfig,
              rules: exercise.rules,
              angleFn,
              depthRuleId: exercise.depthRuleId,
              exerciseId: exercise.id,
              countMode: exercise.countMode,
              nowMs: now,
            })
          : { ...repRef.current, lastOutcome: null };
      repRef.current = nextRep;
      const phaseNow = nextRep.phaseState.phase;
      prevPhaseRef.current = phaseNow;

      if (engineActive && prevPhase === 'stand' && phaseNow === 'descend') {
        lastFaultRef.current = beginFaultCycle(lastFaultRef.current);
      }

      const idleValidation: ValidationResult = {
        status: 'correct',
        messages: [],
        results: [],
      };
      const result = engineActive
        ? validate(forEngine, phaseNow, exercise.rules)
        : idleValidation;
      const driveAngle = angleFn(forEngine);
      const recoverMap = recoverMessageByIdFor(exercise.id);
      const wired = engineActive
        ? stepWiredFeedback(
            wiredFeedbackRef.current,
            result,
            now,
            undefined,
            {
              ...DEFAULT_FEEDBACK_BAR_CONFIG,
              recoverMessageById: recoverMap,
            },
          )
        : {
            state: initialWiredFeedbackState(),
            items: [] as FeedbackBarItem[],
            newCues: [],
            displayValidation: idleValidation,
          };
      wiredFeedbackRef.current = wired.state;
      if (!engineActive) {
        rejectHintRef.current = null;
        recoverItemsRef.current = [];
        recoverUntil.current = 0;
        rejectHintUntil.current = 0;
      }
      const drawSpec = liveSkeletonDrawSpec({
        requireSidePlane: sideOnly,
        requireFrontPlane: frontOnly,
        observedCamera: camInf.hint,
        observedConfidence: camInf.confidence,
        pose: forDrawCamera,
        strictDrawVisibility: lowVisEngine,
        exerciseId: exercise.id,
      });
      const drawPose = drawSpec.drawLive
        ? filterPoseForOverlay(
            forDrawCamera,
            drawSpec.nearSide,
            drawSpec.minVisibility,
            drawSpec.limbPolicy,
          )
        : forDrawCamera;
      // 骨骼色用 latch 后的 validate，避免噪声一帧把黄骨刷绿
      const scene = drawSpec.drawLive
        ? applyJointColors(
            buildSkeletonScene(drawPose, {
              nearSide: drawSpec.nearSide,
              limbPolicy: drawSpec.limbPolicy,
              minVisibility: drawSpec.minVisibility,
            }),
            wired.displayValidation,
            exercise.rules,
          )
        : null;
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

      if (engineActive && nextRep.lastOutcome?.type === 'rejected') {
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
      } else if (engineActive && nextRep.lastOutcome?.type === 'counted') {
        if (nextRep.count !== lastSpokenRep.current) {
          lastSpokenRep.current = nextRep.count;
          speakCoach(`${nextRep.count}`);
        }
        const celebrated = celebrateFixedFaults(
          lastFaultRef.current,
          recoverMap,
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
      setHoldActive(repUi.holdActive);
      setSkeleton(showPlacement ? null : scene);
      // 站位未稳时不改机位、不切骨骼，示范窗停在推荐样片（FR-068）
      let camHint: TrajectoryCameraHint = trajCameraRef.current;
      if (!showPlacement && hasDemoTrajectory(exercise.id, 'front')) {
        const camInf = inferCameraHintDetailed(forRules);
        const latched = cameraHintLatch.current.update(camInf.hint, {
          confidence: camInf.confidence,
          allowFlip: phaseNow === 'stand',
        });
        if (latched === 'side' || latched === 'front') {
          camHint = latched;
        }
      }
      if (!showPlacement && camHint !== trajCameraRef.current) {
        trajCameraRef.current = camHint;
      }
      const canonPose =
        drawSpec.followUserInPip
          ? canonicalPoseFromUser(drawPose, {
              enabled: showReferenceRef.current,
              cameraHint: camHint,
              exerciseId: exercise.id,
            })
          : null;
      setCanonicalPose(showPlacement ? null : canonPose);
      setLockPipToClip(showPlacement || !drawSpec.followUserInPip);
      if (!showPlacement) setRefCameraHint(camHint);
      setPlacementVisible(showPlacement);
      setPlacementHint(
        composedHint ??
          (placement.visible
            ? (placement.hint ?? placementHintFor(exercise.id, 'fallback'))
            : null),
      );
    },
    [exercise],
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

  const onToggleReference = useCallback(() => {
    setShowReference((prev) => {
      const next = !prev;
      showReferenceRef.current = next;
      if (!next) {
        setCanonicalPose(null);
      }
      return next;
    });
  }, []);

  const onResetReps = useCallback(() => {
    repRef.current = initialRepCounterState();
    raiseWristMem.current = initialLateralRaiseWristMemory();
    lastFaultRef.current = initialLastFaultState();
    lastSpokenRep.current = 0;
    prevPhaseRef.current = 'stand';
    setRepCount(0);
    setHoldActive(false);
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

  const hudAngle = driveAngleHud(exercise.id, kneeDeg);
  const kneeText =
    hudAngle.displayDeg == null ? '—' : `${hudAngle.displayDeg.toFixed(1)}°`;
  const camW = Math.max(160, Math.floor(width));
  const camH = Math.max(160, Math.floor(height));

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrap}>
        <View style={{ width: camW, height: camH }}>
          <RNMediapipe
            key="mp-high"
            width={camW}
            height={camH}
            onLandmark={onLandmark}
            frameLimit={POSE_FRAME_LIMIT}
            face={false}
            leftArm={false}
            rightArm={false}
            leftWrist={false}
            rightWrist={false}
            torso={false}
            leftLeg={false}
            rightLeg={false}
            leftAnkle={false}
            rightAnkle={false}
          />
          <SkeletonOverlay
            scene={skeleton}
            width={camW}
            height={camH}
          />
          <PlacementGuide
            visible={placementVisible}
            hint={formatPlacementCoachHint(placementHint)}
          />
        </View>
      </View>

      {lowLightHint ? (
        <View style={styles.lowLightBanner} pointerEvents="none">
          <Text style={styles.lowLightText}>{lowLightHint}</Text>
        </View>
      ) : null}

      {isTraining ? (
        <View style={styles.trainingTop} pointerEvents="box-none">
          <Text style={styles.fpsChip} pointerEvents="none">
            FPS {fps}
          </Text>
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
            {hudAngle.label}:{' '}
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
            关键点 {landmarkCount} · FPS {fps}
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
          onPress={onToggleVoice}
          accessibilityRole="button"
          accessibilityLabel={voiceOn ? '关闭语音' : '打开语音'}
          hitSlop={8}
        >
          <Text style={styles.actionBtnText}>
            {!speechReady ? '语音×' : voiceOn ? '语音开' : '语音关'}
          </Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={onToggleReference}
          accessibilityRole="button"
          accessibilityLabel={showReference ? '关闭示范窗' : '打开示范窗'}
          hitSlop={8}
        >
          <Text style={styles.actionBtnText}>
            {showReference ? '参考开' : '参考关'}
          </Text>
        </Pressable>
      </View>

      {showReference ? (
        <ReferenceDemoWindow
          screenW={width}
          screenH={height}
          pose={canonicalPose}
          cameraHint={refCameraHint}
          exerciseId={exercise.id}
          forceClip={lockPipToClip}
        />
      ) : null}

      <CorrectCheckBurst
        repCount={repCount}
        enabled={exercise.countMode !== 'hold_second'}
      />
      <HoldTimerOverlay
        active={exercise.countMode === 'hold_second' && holdActive}
        seconds={repCount}
      />

      <View style={styles.bottomBar}>
        <RepCounter
          count={repCount}
          onEnd={isTraining ? onEndSession : onResetReps}
          endLabel={isTraining ? '结束' : '重置'}
          caption={exercise.id === 'plank' ? '秒' : 'Rep'}
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
  fpsChip: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
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
