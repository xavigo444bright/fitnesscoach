/**
 * PG-001 动作库（M4-T1 / FR-001 / UI-003）
 * MVP 仅深蹲一张卡片。
 */
import { SQUAT } from '@fitness-coach/core';
import { colors, fontSize, space } from '@fitness-coach/ui';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ExerciseCard from '../components/ExerciseCard';

type Props = {
  onSelectSquat: () => void;
  onOpenDevPose?: () => void;
};

const CAMERA_HINT_LABEL: Record<string, string> = {
  side: '侧面机位',
  front: '正面机位',
};

export default function ExerciseLibraryScreen({
  onSelectSquat,
  onOpenDevPose,
}: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>健身教练</Text>
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <ExerciseCard
          name={SQUAT.name}
          bodyPart="下肢"
          cameraHint={CAMERA_HINT_LABEL[SQUAT.cameraHint] ?? SQUAT.cameraHint}
          onPress={onSelectSquat}
        />
        <Text style={styles.hint}>MVP 仅 1 个动作</Text>
      </ScrollView>
      {onOpenDevPose ? (
        <Pressable style={styles.devLink} onPress={onOpenDevPose}>
          <Text style={styles.devLinkText}>调试姿态（DevPose）</Text>
        </Pressable>
      ) : null}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.md,
    paddingTop: 56,
    paddingBottom: 24,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: space.lg,
  },
  list: {
    paddingBottom: space.xl,
    gap: space.md,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    textAlign: 'center',
    marginTop: space.sm,
  },
  devLink: {
    alignSelf: 'center',
    padding: space.sm,
  },
  devLinkText: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    textDecorationLine: 'underline',
  },
});
