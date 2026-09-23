/**
 * FR-093：跟练结束组表。次数可改，重量手填；写入走 applyFollowAlongSet。
 */
import {
  applyFollowAlongSet,
  effectiveBodyweightKg,
  formatWeightAmount,
  getCatalogEntry,
  isTimedCatalogId,
  openWorkout,
  parseWeightToKg,
  retargetWeightText,
  suggestedWeightKg,
  weightUnitLabel,
  workoutById,
  type WeightUnit,
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
import WeightUnitToggle from '../components/WeightUnitToggle';
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
  const { catalogId, cameraReps, formSummary, workoutId } = route.params;
  const timed = isTimedCatalogId(catalogId);
  const name = getCatalogEntry(catalogId)?.name ?? catalogId;
  const [countText, setCountText] = useState(String(cameraReps));
  const [kgText, setKgText] = useState('');
  const [entryUnit, setEntryUnit] = useState<WeightUnit>('kg');
  const [bodyweightKg, setBodyweightKg] = useState<number | undefined>(
    peekWorkoutLog().bodyweightKg,
  );

  useEffect(() => {
    const fillKg = () => {
      const stored = peekWorkoutLog();
      const session = workoutId
        ? workoutById(stored, workoutId)
        : openWorkout(stored);
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
  }, [catalogId, workoutId]);

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
            <WeightUnitToggle
              unit={entryUnit}
              onChange={(next) => {
                setKgText((cur) => retargetWeightText(cur, entryUnit, next));
                setEntryUnit(next);
              }}
            />
            <TextInput
              value={kgText}
              onChangeText={setKgText}
              keyboardType="decimal-pad"
              placeholder="选填"
              placeholderTextColor={colors.tabInactive}
              style={styles.input}
              accessibilityLabel={weightUnitLabel(entryUnit)}
            />
            {bodyweightKg == null ? null : (
              <ShellButton
                variant="ghost"
                label="用自重"
                onPress={() =>
                  setKgText(formatWeightAmount(bodyweightKg, entryUnit))
                }
              />
            )}
          </>
        )}
        <View style={styles.actions}>
          <View style={styles.actionHalf}>
            <ShellButton
              variant="ghost"
              label="跳过"
              onPress={() => {
                navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'MainTabs',
                      params: workoutId
                        ? { screen: 'Home', params: { workoutId } }
                        : undefined,
                    },
                  ],
                });
              }}
            />
          </View>
          <View style={styles.actionHalf}>
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
                      weightKg: timed
                        ? undefined
                        : parseWeightToKg(kgText, entryUnit),
                      weightUnit: timed ? undefined : entryUnit,
                      formSummary,
                    },
                    new Date().toISOString(),
                    ids,
                    workoutId,
                  ),
                ).then((next) => {
                  const targetId = workoutId ?? openWorkout(next)?.id;
                  navigation.reset({
                    index: 0,
                    routes: [
                      {
                        name: 'MainTabs',
                        params: targetId
                          ? { screen: 'Home', params: { workoutId: targetId } }
                          : undefined,
                      },
                    ],
                  });
                });
              }}
            />
          </View>
        </View>
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
  actions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.sm,
  },
  actionHalf: {
    flex: 1,
  },
});
