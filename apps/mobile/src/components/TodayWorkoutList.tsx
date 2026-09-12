/**
 * 首页·训练：今日课模块列表。点进模块才编辑（T12-R4）。
 */
import {
  applyWorkoutTemplate,
  createWorkout,
  homeDayWorkouts,
  listWorkoutTemplates,
  removeWorkoutTemplate,
  workoutExerciseSummary,
  workoutTitleDisplay,
  workoutVolumeKg,
  removeWorkout,
  type WorkoutLog,
} from '@fitness-coach/core';
import { colors, fontSize, layout, radius, space } from '@fitness-coach/ui';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import EmptyPane from './EmptyPane';
import ShellButton from './ShellButton';
import WorkoutModuleCard from './WorkoutModuleCard';
import TemplateSheet from './TemplateSheet';
import { commitWorkoutLog } from '../workoutLogStorage';

type Props = {
  log: WorkoutLog;
  contentBottomInset: number;
  onOpenWorkout: (workoutId: string) => void;
};

export default function TodayWorkoutList({
  log,
  contentBottomInset,
  onOpenWorkout,
}: Props) {
  const today = homeDayWorkouts(log, new Date().toISOString());
  const [chooserOpen, setChooserOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const hasTemplates = listWorkoutTemplates(log).length > 0;

  const startNew = () => {
    let createdId = '';
    void commitWorkoutLog((next, ids) => {
      const created = createWorkout(next, new Date().toISOString(), ids);
      createdId = created.workoutId;
      return created.log;
    }).then(() => {
      if (createdId) onOpenWorkout(createdId);
    });
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: space.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {today.length === 0 ? (
          <EmptyPane
            title="今天还没有训练"
            body="点新建训练，可选自由训练或套用模板。"
          />
        ) : (
          today.map((workout) => (
            <WorkoutModuleCard
              key={workout.id}
              title={workoutTitleDisplay(workout)}
              badge={workout.status === 'open' ? '进行中' : '已结束'}
              meta={`容量 ${workoutVolumeKg(workout)} kg`}
              summary={workoutExerciseSummary(workout) || '还没有动作'}
              onPress={() => onOpenWorkout(workout.id)}
              onDelete={
                workout.status === 'ended'
                  ? () => {
                      void commitWorkoutLog((next) =>
                        removeWorkout(next, workout.id),
                      );
                    }
                  : undefined
              }
            />
          ))
        )}
      </ScrollView>
      <View style={[styles.dock, { paddingBottom: contentBottomInset }]}>
        <ShellButton label="新建训练" onPress={() => setChooserOpen(true)} />
      </View>
      <Modal
        visible={chooserOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setChooserOpen(false)}
      >
        <Pressable
          style={styles.scrim}
          onPress={() => setChooserOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="关闭"
        >
          <Pressable style={styles.chooser} onPress={() => undefined}>
            <Text style={styles.chooserTitle}>新建训练</Text>
            <Pressable
              onPress={() => {
                setChooserOpen(false);
                startNew();
              }}
              style={styles.chooserRow}
              accessibilityRole="button"
              accessibilityLabel="自由训练"
            >
              <Text style={styles.chooserLabel}>自由训练</Text>
              <Text style={styles.chooserHint}>空白课，自己加动作</Text>
            </Pressable>
            <Pressable
              onPress={
                hasTemplates
                  ? () => {
                      setChooserOpen(false);
                      setPickOpen(true);
                    }
                  : undefined
              }
              disabled={!hasTemplates}
              style={styles.chooserRow}
              accessibilityRole="button"
              accessibilityLabel="训练模板"
              accessibilityState={{ disabled: !hasTemplates }}
            >
              <Text
                style={[
                  styles.chooserLabel,
                  !hasTemplates && styles.chooserOff,
                ]}
              >
                训练模板
              </Text>
              <Text style={styles.chooserHint}>
                {hasTemplates ? '套用已保存的课' : '还没有模板'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <TemplateSheet
        visible={pickOpen}
        mode="pick"
        log={log}
        defaultName=""
        onClose={() => setPickOpen(false)}
        onSave={() => undefined}
        onApply={(templateId) => {
          let createdId = '';
          void commitWorkoutLog((next, ids) => {
            const applied = applyWorkoutTemplate(
              next,
              templateId,
              new Date().toISOString(),
              ids,
            );
            createdId = applied.workoutId;
            return applied.log;
          }).then(() => {
            setPickOpen(false);
            if (createdId) onOpenWorkout(createdId);
          });
        }}
        onDelete={(templateId) => {
          void commitWorkoutLog((next) =>
            removeWorkoutTemplate(next, templateId),
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  dock: {
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  scrim: {
    flex: 1,
    backgroundColor: colors.overlayScrim,
    justifyContent: 'flex-end',
    paddingHorizontal: space.md,
    paddingBottom: space.xl,
  },
  chooser: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  chooserTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '700',
    marginBottom: space.xs,
  },
  chooserRow: {
    minHeight: layout.touchMin,
    justifyContent: 'center',
    paddingVertical: space.sm,
  },
  chooserLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  chooserHint: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    marginTop: 2,
  },
  chooserOff: {
    color: colors.tabInactive,
  },
});
