/**
 * PG-003 训练准备（FR-022）
 * 摄像头预览 + 站位文案；点开始即进训练（无 3-2-1）。
 */
import { Ionicons } from '@expo/vector-icons';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlacementGuide from '../components/PlacementGuide';
import { useTr } from '../i18n';
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
  const insets = useSafeAreaInsets();
  const tr = useTr();
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
        <Text style={styles.title}>{tr('需要摄像头权限')}</Text>
        <Text style={styles.hint}>{tr('准备页需预览机位与站位框')}</Text>
        <Pressable style={styles.button} onPress={() => void requestPermission()}>
          <Text style={styles.buttonText}>{tr('允许使用摄像头')}</Text>
        </Pressable>
        <Pressable onPress={onBack}>
          <Text style={styles.link}>{tr('返回')}</Text>
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
        hint={tr('整幅画面都可用，髋膝踝入画即可')}
      />

      <View style={[styles.topBar, { top: insets.top + 8, left: Math.max(16, insets.left) }]}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← {tr('返回')}</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.topActions,
          { top: insets.top + 8, right: Math.max(12, insets.right) },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.actionBtn}
          onPress={onFlip}
          accessibilityRole="button"
          accessibilityLabel={tr('切换摄像头')}
          hitSlop={8}
        >
          <Ionicons name="camera-reverse-outline" size={18} color="#fff" />
        </Pressable>
      </View>

      <View
        style={[
          styles.bottom,
          {
            left: Math.max(16, insets.left),
            right: Math.max(16, insets.right),
            bottom: Math.max(16, insets.bottom),
          },
        ]}
      >
        <Pressable style={styles.button} onPress={onReady}>
          <Text style={styles.buttonText}>{tr('开始训练')}</Text>
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
    zIndex: 120,
    elevation: 120,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    position: 'absolute',
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
