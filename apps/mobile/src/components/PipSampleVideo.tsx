/**
 * 仅在 ExponentAV 存在时由 PipClipPane 动态 require。
 * 先把 Metro 资源落到本地 file://，避免真机 ATS 拦 LAN HTTP 导致播不了。
 * 换片用同一 AVPlayer：unload → loadAsync(isLooping)，禁止拆掉 Video 再挂新的。
 */
import {
  clipPlayerInitialStatus,
  shouldRestartClipLoop,
} from '@fitness-coach/ui';
import { Asset } from 'expo-asset';
import { ResizeMode, Video, type AVPlaybackStatus } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type PipSampleVideoProps = {
  source: number;
  playing: boolean;
  rate: number;
  onReady?: () => void;
  onError?: () => void;
};

async function localUriForClip(source: number): Promise<string> {
  const asset = Asset.fromModule(source);
  await asset.downloadAsync();
  const local = asset.localUri ?? asset.uri;
  if (!local) throw new Error('sample clip uri empty');
  return local;
}

export default function PipSampleVideo({
  source,
  playing,
  rate,
  onReady,
  onError,
}: PipSampleVideoProps) {
  const [uri, setUri] = useState<string | null>(null);
  const [hostReady, setHostReady] = useState(false);
  const videoRef = useRef<Video>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const loopingFixForUri = useRef<string | null>(null);
  const restartingRef = useRef(false);
  const loadGen = useRef(0);
  const loadingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const local = await localUriForClip(source);
        if (!cancelled) setUri(local);
      } catch {
        if (!cancelled) onErrorRef.current?.();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  useEffect(() => {
    loopingFixForUri.current = null;
    restartingRef.current = false;
  }, [uri]);

  useEffect(() => {
    if (!uri || !hostReady) return;
    const v = videoRef.current;
    if (!v) return;
    const gen = (loadGen.current += 1);
    let cancelled = false;
    loadingRef.current = true;
    void (async () => {
      try {
        await v.unloadAsync();
      } catch {
        /* 首次尚未 load */
      }
      if (cancelled || gen !== loadGen.current) return;
      try {
        await v.loadAsync(
          { uri },
          clipPlayerInitialStatus(playingRef.current, rateRef.current),
          false,
        );
        if (cancelled || gen !== loadGen.current) return;
        if (playingRef.current) {
          await v.playAsync();
        } else {
          await v.pauseAsync();
        }
      } catch {
        if (!cancelled) onErrorRef.current?.();
      } finally {
        if (gen === loadGen.current) loadingRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
      loadingRef.current = false;
      void v.unloadAsync().catch(() => undefined);
    };
  }, [uri, hostReady]);

  useEffect(() => {
    if (loadingRef.current) return;
    const v = videoRef.current;
    if (!v) return;
    void v
      .setStatusAsync(clipPlayerInitialStatus(playing, rate))
      .catch(() => undefined);
  }, [playing, rate]);

  const onStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (
      playingRef.current &&
      status.isLooping === false &&
      loopingFixForUri.current !== uri
    ) {
      loopingFixForUri.current = uri;
      void videoRef.current?.setIsLoopingAsync(true).catch(() => undefined);
    }
    if (
      shouldRestartClipLoop(status, playingRef.current) &&
      !restartingRef.current
    ) {
      restartingRef.current = true;
      void videoRef.current
        ?.replayAsync()
        .then(() => videoRef.current?.setIsLoopingAsync(true))
        .catch(() => undefined)
        .finally(() => {
          restartingRef.current = false;
        });
    }
  };

  return (
    <View style={styles.fill}>
      <Video
        ref={videoRef}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.CONTAIN}
        isMuted
        shouldCorrectPitch={false}
        useNativeControls={false}
        progressUpdateIntervalMillis={250}
        onPlaybackStatusUpdate={onStatus}
        onReadyForDisplay={() => onReadyRef.current?.()}
        onError={() => onErrorRef.current?.()}
        onLayout={() => setHostReady(true)}
        pointerEvents="none"
      />
      {uri ? null : <Text style={styles.loading}>载入原片…</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
  },
});
