/**
 * PG-003 训练准备（M4-T3 / FR-070 / FR-022）
 * 摄像头预览 + 站位框 + 3-2-1 倒计时（可跳过）
 * 支持翻转摄像头与质量档（偏好带入训练页）
 */
import type { QualityTier } from '@fitness-coach/pose-native';
import { colors, fontSize, layout, space } from '@fitness-coach/ui';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CountdownOverlay from '../components/CountdownOverlay';
import PlacementGuide from '../components/PlacementGuide';
import {
  cycleSessionQuality,
  getSessionCameraPrefs,
  setSessionFacing,
  setSessionQuality,
  type CameraFacing,
} from '../sessionCameraPrefs';

type Props = {
  onReady: () => void;
  onBack: () => void;
};

export default function PrepareScreen({ onReady, onBack }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [seconds, setSeconds] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const finished = useRef(false);

  const initial = getSessionCameraPrefs();
  const [facing, setFacing] = useState<CameraFacing>(initial.facing);
  const [tier, setTier] = useState<QualityTier>(initial.qualityTier);
  const [manual, setManual] = useState(initial.qualityManual);

  useEffect(() => {
    if (!running) return;
    finished.current = false;
    setSeconds(3);
    const id = setInterval(() => {
      setSeconds((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          clearInterval(id);
          if (!finished.current) {
            finished.current = true;
            setTimeout(() => onReady(), 0);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onReady]);

  const skip = () => {
    finished.current = true;
    setRunning(false);
    setSeconds(null);
    onReady();
  };

  const onFlip = () => {
    const next: CameraFacing = facing === 'front' ? 'back' : 'front';
    setFacing(next);
    setSessionFacing(next);
  };

  const onCycleQuality = () => {
    const next = cycleSessionQuality();
    setTier(next);
    setManual(true);
  };

  const onAutoQuality = () => {
    setManual(false);
    setSessionQuality(tier, false);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <StatusBar style="light" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>需要摄像头权限</Text>
        <Text style={styles.hint}>准备页需预览机位与站位框</Text>
        <Pressable style={styles.button} onPress={() => void requestPermission()}>
          <Text style={styles.buttonText}>允许使用摄像头</Text>
        </Pressable>
        <Pressable onPress={onBack}>
          <Text style={styles.link}>返回</Text>
        </Pressable>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView style={StyleSheet.absoluteFill} facing={facing} />
      <PlacementGuide
        visible
        hint="髋膝踝入画即可，不必顶满框"
      />
      <CountdownOverlay seconds={seconds} />

      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
      </View>

      <View style={styles.topActions} pointerEvents="box-none">
        <Pressable
          style={styles.actionBtn}
          onPress={onFlip}
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
      </View>

      <View style={styles.bottom}>
        {!running ? (
          <Pressable style={styles.button} onPress={() => setRunning(true)}>
            <Text style={styles.buttonText}>开始倒计时</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.skip} onPress={skip}>
            <Text style={styles.skipText}>跳过</Text>
          </Pressable>
        )}
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111',
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '700',
    marginBottom: space.sm,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    marginBottom: space.lg,
    textAlign: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 52,
    left: space.md,
    zIndex: 20,
  },
  backBtn: {
    minHeight: layout.touchMin,
    justifyContent: 'center',
  },
  backText: {
    color: colors.overlayText,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  topActions: {
    position: 'absolute',
    top: 52,
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
  bottom: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: 40,
    alignItems: 'center',
    zIndex: 20,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.overlayText,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  skip: {
    minHeight: layout.touchMin,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  skipText: {
    color: colors.overlayText,
    fontSize: fontSize.body,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  link: {
    marginTop: space.md,
    color: colors.primary,
    fontSize: fontSize.body,
  },
});
