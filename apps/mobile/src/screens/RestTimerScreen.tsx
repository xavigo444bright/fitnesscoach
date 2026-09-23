/**
 * FR-096：组间倒计时。剩余秒由 core 按墙钟计算，拖沙漏改剩余。
 */
import {
  restDurationForRemaining,
  restRemainingSec,
  restSandCapacitySec,
} from '@fitness-coach/core';
import { colors, fontFamily, fontSize, space } from '@fitness-coach/ui';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RestHourglass from '../components/RestHourglass';
import ShellButton from '../components/ShellButton';
import type { RootStackParamList } from '../navigation/types';

export default function RestTimerScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RestTimer'>>();
  const capacitySec = restSandCapacitySec(route.params.durationSec);
  const startedAtMs = useRef(Date.now());
  const [durationSec, setDurationSec] = useState(route.params.durationSec);
  const [scrub, setScrub] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const live = restRemainingSec(durationSec, startedAtMs.current, nowMs);
  const remaining = scrub ?? live;

  const dismiss = () => {
    navigation.goBack();
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + space.lg,
          paddingBottom: insets.bottom + space.lg,
        },
      ]}
    >
      <Text style={styles.kicker}>组间休息</Text>
      <View style={styles.glassBlock}>
        <RestHourglass
          remainingSec={remaining}
          capacitySec={capacitySec}
          onScrub={setScrub}
          onCommit={(next) => {
            setDurationSec(
              restDurationForRemaining(startedAtMs.current, Date.now(), next),
            );
            setScrub(null);
          }}
        />
        <Text
          style={styles.seconds}
          accessibilityLabel={`剩余 ${remaining} 秒`}
        >
          {remaining}
        </Text>
        <Text style={styles.hint}>上下滑动沙子可改时间</Text>
      </View>
      <View style={styles.actions}>
        <View style={styles.actionHalf}>
          <ShellButton label="跳过" onPress={dismiss} />
        </View>
        <View style={styles.actionHalf}>
          <ShellButton label="停止" onPress={dismiss} />
        </View>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: space.lg,
    justifyContent: 'space-between',
  },
  kicker: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
  glassBlock: {
    alignItems: 'center',
    gap: space.md,
  },
  seconds: {
    color: colors.textPrimary,
    fontSize: fontSize.hugeStat,
    fontWeight: '700',
    fontFamily: fontFamily.fallback,
    textAlign: 'center',
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
    marginBottom: space.lg,
  },
  actionHalf: {
    flex: 1,
  },
});
