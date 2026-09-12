/**
 * FR-093：跟练结束组表。次数可改，重量手填；写入走 applyFollowAlongSet。
 */
import {
  applyFollowAlongSet,
  effectiveBodyweightKg,
  getCatalogEntry,
  isTimedCatalogId,
  openWorkout,
  suggestedWeightKg,
} from '@fitness-coach/core';
import { colors, fontSize, layout, radius, space } from '@fitness-coach/ui';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShellButton from '../components/ShellButton';
import type { RootStackParamList } from '../navigation/types';
import {
  commitWorkoutLog,
  peekWorkoutLog,
  subscribeWorkoutLog,
} from '../workoutLogStorage';

function parseOptionalNumber(raw: string): number | undefined {
  const t = raw.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export default function FollowAlongLogScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'FollowAlongLog'>>();
  const { catalogId, cameraReps, formSummary } = route.params;
  const timed = isTimedCatalogId(catalogId);
  const name = getCatalogEntry(catalogId)?.name ?? catalogId;
  const [countText, setCountText] = useState(String(cameraReps));
  const [kgText, setKgText] = useState('');
  const [bodyweightKg, setBodyweightKg] = useState<number | undefined>(
    peekWorkoutLog().bodyweightKg,
  );

  useEffect(() => {
    const fillKg = () => {
      const stored = peekWorkoutLog();
      const session = openWorkout(stored);
      setBodyweightKg(effectiveBodyweightKg(stored, session));
      const suggest = suggestedWeightKg(
        stored,
        { kind: 'catalog', catalogId },
        session,
      );
      if (suggest == null) return;
      setKgText((cur) => (cur === '' ? String(suggest) : cur));
    };
    fillKg();
    return subscribeWorkoutLog(fillKg);
  }, [catalogId]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + space.md }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
        <Text style={styles.kicker}>记入本节</Text>
        <Text style={styles.title}>{name}</Text>
        {formSummary ? (
          <Text style={styles.summary}>{formSummary}</Text>
        ) : null}
        <Text style={styles.label}>{timed ? '秒（相机预填，可改）' : '次数（相机预填，可改）'}</Text>
        <TextInput
          value={countText}
          onChangeText={setCountText}
          keyboardType="decimal-pad"
          style={styles.input}
          accessibilityLabel={timed ? '秒' : '次数'}
        />
        {timed ? null : (
          <>
            <Text style={styles.label}>公斤</Text>
            <TextInput
              value={kgText}
              onChangeText={setKgText}
              keyboardType="decimal-pad"
              placeholder="选填"
              placeholderTextColor={colors.tabInactive}
              style={styles.input}
              accessibilityLabel="公斤"
            />
            {bodyweightKg == null ? null : (
              <ShellButton
                variant="ghost"
                label="用自重"
                onPress={() => setKgText(String(bodyweightKg))}
              />
            )}
          </>
        )}
        <ShellButton
          label="写入本组"
          onPress={() => {
            const counted = parseOptionalNumber(countText) ?? cameraReps;
            void commitWorkoutLog((log, ids) =>
              applyFollowAlongSet(
                log,
                {
                  catalogId,
                  cameraReps,
                  reps: counted,
                  weightKg: timed ? undefined : parseOptionalNumber(kgText),
                  formSummary,
                },
                new Date().toISOString(),
                ids,
              ),
            ).then(() => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              });
            });
          }}
        />
      </View>
      <StatusBar style="light" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingHorizontal: space.md,
    paddingTop: space.lg,
    gap: space.sm,
  },
  kicker: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.display,
    fontWeight: '700',
    marginBottom: space.sm,
  },
  summary: {
    color: colors.warning,
    fontSize: fontSize.caption,
    marginBottom: space.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
  },
  input: {
    minHeight: layout.touchMin,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: space.sm,
    fontSize: fontSize.body,
    marginBottom: space.sm,
  },
});
