import { RNMediapipe, switchCamera } from '@thinksys/react-native-mediapipe';
import { useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

function countLandmarks(data: unknown): number {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['landmarks', 'landmark', 'poseLandmarks', 'worldLandmarks']) {
      const value = obj[key];
      if (Array.isArray(value)) return value.length;
    }
    for (const value of Object.values(obj)) {
      if (Array.isArray(value) && value.length > 0) {
        if (Array.isArray(value[0])) return (value[0] as unknown[]).length;
        if (typeof value[0] === 'object' && value[0] !== null) return value.length;
      }
    }
  }
  return 0;
}

export default function PoseSpikeScreen() {
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [landmarkCount, setLandmarkCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [rawPreview, setRawPreview] = useState('');
  const frameTimes = useRef<number[]>([]);

  const onLandmark = useCallback((data: unknown) => {
    const now = Date.now();
    const times = frameTimes.current.filter((t) => now - t < 1000);
    times.push(now);
    frameTimes.current = times;
    setFps(times.length);
    setLandmarkCount(countLandmarks(data));
    try {
      setRawPreview(JSON.stringify(data).slice(0, 120));
    } catch {
      setRawPreview(typeof data);
    }
  }, []);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.hint}>正在检查摄像头权限…</Text>
        <Text style={styles.sub}>M0-T4 · Fitness Coach</Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>需要摄像头权限</Text>
        <Text style={styles.hint}>姿态 Spike 需要摄像头才能检测关键点</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrap}>
        <RNMediapipe
          width={Math.floor(width)}
          height={Math.floor(height)}
          onLandmark={onLandmark}
          frameLimit={30}
        />
      </View>

      <View style={styles.hud} pointerEvents="box-none">
        <Text style={styles.hudTitle}>M0-T4 姿态 Spike · MediaPipe</Text>
        <Text style={styles.hudText}>关键点: {landmarkCount}（目标 ≥17）</Text>
        <Text style={styles.hudText}>FPS: {fps}（目标 ≥15）</Text>
        {rawPreview ? (
          <Text style={styles.raw} numberOfLines={2}>
            raw: {rawPreview}
          </Text>
        ) : (
          <Text style={styles.hudMuted}>等待关键点回调…请全身入镜</Text>
        )}
        <Pressable style={styles.button} onPress={() => switchCamera()}>
          <Text style={styles.buttonText}>切换摄像头</Text>
        </Pressable>
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 14,
    borderRadius: 10,
  },
  hudTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  hudText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 2,
  },
  hudMuted: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  raw: {
    color: '#9cf',
    fontSize: 10,
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
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
