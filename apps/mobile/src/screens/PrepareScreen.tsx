/**
 * PG-003 训练准备（FR-022）
 * 摄像头预览 + 站位文案；点开始即进训练（无 3-2-1）。
 */
import { colors, fontSize, layout, space } from '@fitness-coach/ui';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PlacementGuide from '../components/PlacementGuide';
import {
  getSessionCameraPrefs,
  setSessionFacing,
  type CameraFacing,
} from '../sessionCameraPrefs';

type Props = {
  onReady: () => void;
  onBack: () => void;
};

export default function PrepareScreen({ onReady, onBack }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  const initial = getSessionCameraPrefs();
  const [facing, setFacing] = useState<CameraFacing>(initial.facing);

  const onFlip = () => {
    const next: CameraFacing = facing === 'front' ? 'back' : 'front';
    setFacing(next);
    setSessionFacing(next);
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
        hint="整幅画面都可用，髋膝踝入画即可"
      />

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
      </View>

      <View style={styles.bottom}>
        <Pressable style={styles.button} onPress={onReady}>
          <Text style={styles.buttonText}>开始训练</Text>
        </Pressable>
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
  link: {
    marginTop: space.md,
    color: colors.primary,
    fontSize: fontSize.body,
  },
});
