/**
 * PG-009 本节课组表（FR-091 UI）。容量走 core.workoutVolumeKg。
 */
import {
  EXERCISE_CATALOG,
  EQUIPMENT_LABEL,
  DEFAULT_REST_SEC,
  addSet,
  addSlot,
  copySet,
  effectiveBodyweightKg,
  endWorkout,
  exerciseDisplayName,
  lastLoadForExercise,
  patchSet,
  patchWorkout,
  removeSet,
  removeSlot,
  saveWorkoutAsTemplate,
  suggestedWeightKg,
  workoutById,
  workoutExerciseSummary,
  workoutTitleDisplay,
  workoutVolumeKg,
  type LogSet,
  type LogSlot,
  type WorkoutLog,
} from '@fitness-coach/core';
import { colors, fontSize, layout, radius, space } from '@fitness-coach/ui';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import EmptyPane from './EmptyPane';
import ShellButton from './ShellButton';
import TemplateSheet from './TemplateSheet';
import { commitWorkoutLog } from '../workoutLogStorage';

const PLACEHOLDER_REPS = 8;
const PLACEHOLDER_SEC = 45;

type Props = {
  log: WorkoutLog;
  workoutId: string;
  contentBottomInset: number;
  onOpenRest: (durationSec: number) => void;
  onClose: () => void;
};

function parseOptionalNumber(raw: string): number | undefined {
  const t = raw.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export default function WorkoutSessionPane({
  log,
  workoutId,
  contentBottomInset,
  onOpenRest,
  onClose,
}: Props) {
  const workout = workoutById(log, workoutId);
  const isOpen = workout?.status === 'open';
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    workout?.slots[0]?.id ?? null,
  );
  const [repsText, setRepsText] = useState('');
  const [kgText, setKgText] = useState('');
  const [secText, setSecText] = useState('');
  const [titleText, setTitleText] = useState(workout?.title ?? '');
  const effectiveBw = effectiveBodyweightKg(log, workout);
  const [bwText, setBwText] = useState(
    effectiveBw != null ? String(effectiveBw) : '',
  );

  useEffect(() => {
    setTitleText(workout?.title ?? '');
  }, [workout?.id]);

  useEffect(() => {
    const next = effectiveBodyweightKg(log, workout);
    setBwText(next != null ? String(next) : '');
  }, [log.bodyweightKg, workout?.id, workout?.bodyweightKg]);

  useEffect(() => {
    if (!workout) {
      setSelectedSlotId(null);
      return;
    }
    if (
      selectedSlotId &&
      workout.slots.some((s) => s.id === selectedSlotId)
    ) {
      return;
    }
    setSelectedSlotId(workout.slots[0]?.id ?? null);
  }, [workout, selectedSlotId]);

  const selectedSlot: LogSlot | undefined = useMemo(
    () => workout?.slots.find((s) => s.id === selectedSlotId),
    [workout, selectedSlotId],
  );

  useEffect(() => {
    if (!selectedSlot) {
      setRepsText('');
      setKgText('');
      setSecText('');
      return;
    }
    const last = lastLoadForExercise(log, selectedSlot.exercise);
    const suggestKg = suggestedWeightKg(log, selectedSlot.exercise, workout);
    if (selectedSlot.countMode === 'timed') {
      setSecText(last ? String(last.reps) : '');
      setRepsText('');
      setKgText('');
      return;
    }
    setRepsText(last ? String(last.reps) : '');
    setKgText(suggestKg != null ? String(suggestKg) : '');
    setSecText('');
  }, [selectedSlot?.id, log]);

  if (!workout) {
    return (
      <View style={[styles.wrap, { paddingBottom: contentBottomInset }]}>
        <EmptyPane title="找不到这节课" body="返回今日列表再选一节。" />
        <View style={styles.emptyCta}>
          <ShellButton label="返回今日训练" onPress={onClose} />
        </View>
      </View>
    );
  }

  const volume = workoutVolumeKg(workout);
  const timed = selectedSlot?.countMode === 'timed';

  const applySessionMeta = (next: WorkoutLog) =>
    patchWorkout(next, workout.id, {
      title: titleText,
      bodyweightKg: parseOptionalNumber(bwText) ?? null,
    });

  const persistTitle = (title: string) => {
    void commitWorkoutLog((next) =>
      patchWorkout(next, workout.id, { title }),
    );
  };

  const logCurrentSet = () => {
    if (!selectedSlot) return;
    void commitWorkoutLog((next, ids) => {
      const patched = applySessionMeta(next);
      if (timed) {
        const sec = parseOptionalNumber(secText) ?? PLACEHOLDER_SEC;
        return addSet(
          patched,
          workout.id,
          selectedSlot.id,
          { durationSec: sec },
          ids,
        ).log;
      }
      const reps = parseOptionalNumber(repsText) ?? PLACEHOLDER_REPS;
      return addSet(
        patched,
        workout.id,
        selectedSlot.id,
        {
          reps,
          weightKg: parseOptionalNumber(kgText),
        },
        ids,
      ).log;
    });
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: space.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={onClose}
          style={styles.backRow}
          accessibilityRole="button"
          accessibilityLabel="返回"
        >
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <TextInput
          value={titleText}
          onChangeText={(t) => {
            setTitleText(t);
            persistTitle(t);
          }}
          onEndEditing={() => persistTitle(titleText)}
          placeholder="训练主题，如 推日"
          placeholderTextColor={colors.tabInactive}
          style={styles.themeInput}
          accessibilityLabel="训练主题"
        />
        <View style={styles.aggregateRow}>
          <Text style={styles.aggregate}>
            {workoutExerciseSummary(workout) || '还没有动作'}
          </Text>
          <Pressable
            onPress={
              workout.slots.length === 0
                ? undefined
                : () => setSaveTemplateOpen(true)
            }
            disabled={workout.slots.length === 0}
            style={styles.templateIcon}
            accessibilityRole="button"
            accessibilityLabel="存为模板"
            accessibilityState={{ disabled: workout.slots.length === 0 }}
          >
            <Ionicons
              name="bookmark-outline"
              size={20}
              color={
                workout.slots.length === 0
                  ? colors.tabInactive
                  : colors.textSecondary
              }
            />
          </Pressable>
        </View>
        {isOpen ? null : <Text style={styles.ended}>已结束</Text>}
        <View style={styles.metaRow}>
          <Text style={styles.volume}>容量 {volume} kg</Text>
          <View style={styles.bwCell}>
            <Text style={styles.bwCellLabel}>自重</Text>
            <TextInput
              value={bwText}
              onChangeText={setBwText}
              onEndEditing={() => {
                void commitWorkoutLog((next) =>
                  patchWorkout(next, workout.id, {
                    bodyweightKg: parseOptionalNumber(bwText) ?? null,
                  }),
                );
              }}
              placeholder={
                log.bodyweightKg != null ? String(log.bodyweightKg) : '—'
              }
              placeholderTextColor={colors.tabInactive}
              keyboardType="decimal-pad"
              style={styles.bwCellInput}
              accessibilityLabel="本节自重"
            />
            <Text style={styles.bwCellUnit}>kg</Text>
          </View>
        </View>
        {workout.slots.length === 0 ? (
          <Text style={styles.hint}>先加动作，再记组。</Text>
        ) : null}
        {workout.slots.map((slot) => (
          <View
            key={slot.id}
            style={[
              styles.slot,
              selectedSlotId === slot.id && styles.slotOn,
            ]}
          >
            <Pressable
              onPress={() => setSelectedSlotId(slot.id)}
              accessibilityRole="button"
              accessibilityLabel={exerciseDisplayName(slot.exercise)}
            >
              <Text style={styles.slotTitle}>
                {exerciseDisplayName(slot.exercise)}
              </Text>
            </Pressable>
            {slot.sets.length === 0 ? (
              <Text style={styles.meta}>还没有组</Text>
            ) : (
              <>
                <View style={styles.setHead}>
                  <Text style={[styles.setHeadCell, styles.colNum]}>组</Text>
                  <Text style={[styles.setHeadCell, styles.colVal]}>
                    {slot.countMode === 'timed' ? '秒' : '次'}
                  </Text>
                  {slot.countMode === 'timed' ? null : (
                    <Text style={[styles.setHeadCell, styles.colVal]}>kg</Text>
                  )}
                  <Text style={[styles.setHeadCell, styles.colDel]} />
                </View>
                {slot.sets.map((set, i) => (
                  <SetRow
                    key={set.id}
                    index={i}
                    set={set}
                    timed={slot.countMode === 'timed'}
                    onPatch={(patch) => {
                      void commitWorkoutLog((next) =>
                        patchSet(next, workout.id, slot.id, set.id, patch),
                      );
                    }}
                    onDelete={() => {
                      void commitWorkoutLog((next) =>
                        removeSet(next, workout.id, slot.id, set.id),
                      );
                    }}
                    onCopy={() => {
                      void commitWorkoutLog((next, ids) =>
                        copySet(next, workout.id, slot.id, set.id, ids).log,
                      );
                    }}
                  />
                ))}
              </>
            )}
            {selectedSlotId === slot.id ? (
              <Pressable
                onPress={() => {
                  void commitWorkoutLog((next) =>
                    removeSlot(next, workout.id, slot.id),
                  );
                }}
                style={styles.removeSlot}
                accessibilityRole="button"
                accessibilityLabel="移除动作"
              >
                <Text style={styles.removeSlotText}>移除动作</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        {selectedSlot ? (
          <View style={styles.composer}>
            {timed ? (
              <Field
                label="秒"
                value={secText}
                onChange={setSecText}
                placeholder={String(PLACEHOLDER_SEC)}
              />
            ) : (
              <View style={styles.row}>
                <Field
                  label="次数"
                  value={repsText}
                  onChange={setRepsText}
                  placeholder={String(PLACEHOLDER_REPS)}
                />
                <Field
                  label="公斤"
                  value={kgText}
                  onChange={setKgText}
                  placeholder="选填"
                />
              </View>
            )}
            {timed || parseOptionalNumber(bwText) == null ? null : (
              <ShellButton
                variant="ghost"
                label="用自重"
                onPress={() => setKgText(String(parseOptionalNumber(bwText)))}
              />
            )}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: contentBottomInset }]}>
        {selectedSlot ? (
          <>
            <ShellButton label="记一组" onPress={logCurrentSet} />
            <View style={{ height: space.sm }} />
          </>
        ) : null}
        <View style={styles.dockRow}>
          <View style={styles.dockHalf}>
            <ShellButton
              variant="ghost"
              label="休息"
              disabled={!selectedSlot || selectedSlot.sets.length === 0}
              onPress={() => onOpenRest(DEFAULT_REST_SEC)}
            />
          </View>
          <View style={styles.dockHalf}>
            <ShellButton
              variant="ghost"
              label="加动作"
              onPress={() => setPickerOpen(true)}
            />
          </View>
        </View>
        <View style={{ height: space.sm }} />
        {isOpen ? (
          <ShellButton
            label="结束课"
            onPress={() => {
              void commitWorkoutLog((next) =>
                endWorkout(
                  applySessionMeta(next),
                  workout.id,
                  new Date().toISOString(),
                ),
              ).then(() => {
                onClose();
              });
            }}
          />
        ) : (
          <ShellButton
            label="保存"
            onPress={() => {
              void commitWorkoutLog((next) => applySessionMeta(next)).then(
                () => {
                  onClose();
                },
              );
            }}
          />
        )}
      </View>

      <AddExerciseModal
        visible={pickerOpen}
        customName={customName}
        onChangeCustom={setCustomName}
        onClose={() => setPickerOpen(false)}
        onPickCatalog={(catalogId) => {
          void (async () => {
            let slotId = '';
            await commitWorkoutLog((next, ids) => {
              const added = addSlot(
                next,
                workout.id,
                { kind: 'catalog', catalogId },
                ids,
              );
              slotId = added.slotId;
              return added.log;
            });
            setSelectedSlotId(slotId);
            setPickerOpen(false);
          })();
        }}
        onPickCustom={() => {
          if (customName.trim() === '') return;
          void (async () => {
            let slotId = '';
            await commitWorkoutLog((next, ids) => {
              const added = addSlot(
                next,
                workout.id,
                { kind: 'custom', name: customName },
                ids,
              );
              slotId = added.slotId;
              return added.log;
            });
            setSelectedSlotId(slotId);
            setCustomName('');
            setPickerOpen(false);
          })();
        }}
      />
      <TemplateSheet
        visible={saveTemplateOpen}
        mode="save"
        log={log}
        defaultName={titleText.trim() || workoutTitleDisplay(workout)}
        onClose={() => setSaveTemplateOpen(false)}
        onSave={(name) => {
          void commitWorkoutLog((next, ids) =>
            saveWorkoutAsTemplate(
              applySessionMeta(next),
              workout.id,
              name,
              new Date().toISOString(),
              ids,
            ).log,
          ).then(() => {
            setSaveTemplateOpen(false);
          });
        }}
        onApply={() => undefined}
        onDelete={() => undefined}
      />
    </View>
  );
}

function SetRow({
  index,
  set,
  timed,
  onPatch,
  onDelete,
  onCopy,
}: {
  index: number;
  set: LogSet;
  timed: boolean;
  onPatch: (patch: { reps?: number; weightKg?: number; durationSec?: number }) => void;
  onDelete: () => void;
  onCopy: () => void;
}) {
  return (
    <View style={styles.setRow}>
      <Text style={[styles.setIndex, styles.colNum]}>{index + 1}</Text>
      {timed ? (
        <EditableNum
          value={set.durationSec}
          accessibilityLabel={`第${index + 1}组秒`}
          onCommit={(n) => {
            if (n == null) return;
            onPatch({ durationSec: n });
          }}
        />
      ) : (
        <>
          <EditableNum
            value={set.reps}
            accessibilityLabel={`第${index + 1}组次数`}
            onCommit={(n) => {
              if (n == null) return;
              onPatch({ reps: n });
            }}
          />
          <EditableNum
            value={set.weightKg}
            accessibilityLabel={`第${index + 1}组公斤`}
            onCommit={(n) => onPatch({ weightKg: n })}
          />
        </>
      )}
      <Pressable
        onPress={onCopy}
        style={styles.delBtn}
        accessibilityRole="button"
        accessibilityLabel={`复制第${index + 1}组`}
      >
        <Ionicons
          name="copy-outline"
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>
      <Pressable
        onPress={onDelete}
        style={styles.delBtn}
        accessibilityRole="button"
        accessibilityLabel={`删除第${index + 1}组`}
      >
        <Text style={styles.delText}>删</Text>
      </Pressable>
    </View>
  );
}

function EditableNum({
  value,
  onCommit,
  accessibilityLabel,
}: {
  value: number | undefined;
  onCommit: (n: number | undefined) => void;
  accessibilityLabel: string;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => {
    setText(value == null ? '' : String(value));
  }, [value]);
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onEndEditing={() => onCommit(parseOptionalNumber(text))}
      keyboardType="decimal-pad"
      style={styles.setInput}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  onCommit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onCommit?: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onEndEditing={onCommit}
        placeholder={placeholder}
        placeholderTextColor={colors.tabInactive}
        keyboardType="decimal-pad"
        style={styles.input}
        accessibilityLabel={label}
      />
    </View>
  );
}

function AddExerciseModal({
  visible,
  customName,
  onChangeCustom,
  onClose,
  onPickCatalog,
  onPickCustom,
}: {
  visible: boolean;
  customName: string;
  onChangeCustom: (v: string) => void;
  onClose: () => void;
  onPickCatalog: (id: string) => void;
  onPickCustom: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Text style={styles.modalTitle}>加动作</Text>
        <View style={styles.row}>
          <TextInput
            value={customName}
            onChangeText={onChangeCustom}
            placeholder="自定义名称"
            placeholderTextColor={colors.tabInactive}
            style={[styles.input, { flex: 1 }]}
            accessibilityLabel="自定义动作名"
          />
          <ShellButton label="添加" onPress={onPickCustom} />
        </View>
        <ScrollView>
          {EXERCISE_CATALOG.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => onPickCatalog(e.id)}
              style={styles.pickRow}
              accessibilityRole="button"
              accessibilityLabel={e.name}
            >
              <Text style={styles.pickName}>{e.name}</Text>
              <Text style={styles.meta}>{EQUIPMENT_LABEL[e.equipment]}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <ShellButton variant="ghost" label="取消" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  emptyCta: {
    marginTop: space.lg,
  },
  backRow: {
    minHeight: layout.touchMin,
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  themeInput: {
    color: colors.textPrimary,
    fontSize: fontSize.display,
    fontWeight: '700',
    minHeight: layout.touchMin,
    marginBottom: space.sm,
  },
  aggregateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.sm,
  },
  aggregate: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.body,
    lineHeight: 22,
  },
  templateIcon: {
    width: layout.touchMin,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    marginBottom: space.lg,
    flexWrap: 'wrap',
  },
  volume: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
  ended: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    marginBottom: space.sm,
  },
  bwCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    minHeight: 36,
  },
  bwCellLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
  },
  bwCellInput: {
    minWidth: 48,
    color: colors.textPrimary,
    fontSize: fontSize.caption,
    fontWeight: '700',
    paddingVertical: 4,
  },
  bwCellUnit: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    marginBottom: space.md,
  },
  slot: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  slotOn: {
    borderColor: colors.cta,
  },
  slotTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '700',
    marginBottom: space.sm,
  },
  setHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.xs,
    gap: space.sm,
  },
  setHeadCell: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    textTransform: 'uppercase',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.touchMin,
    gap: space.sm,
    marginTop: space.xs,
  },
  colNum: {
    width: 28,
  },
  colVal: {
    flex: 1,
  },
  colDel: {
    width: 88,
  },
  setIndex: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  setInput: {
    flex: 1,
    minHeight: layout.touchMin,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
    paddingHorizontal: space.sm,
    fontSize: fontSize.body,
  },
  delBtn: {
    width: 44,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delText: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  removeSlot: {
    marginTop: space.sm,
    minHeight: layout.touchMin,
    justifyContent: 'center',
  },
  removeSlotText: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
  },
  composer: {
    marginTop: space.md,
    marginBottom: space.lg,
    gap: space.md,
  },
  row: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'flex-end',
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    marginBottom: space.xs,
  },
  input: {
    minHeight: layout.touchMin,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: space.sm,
    fontSize: fontSize.body,
  },
  dock: {
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  dockRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  dockHalf: {
    flex: 1,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 56,
    paddingHorizontal: space.md,
    paddingBottom: space.lg,
    gap: space.md,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.display,
    fontWeight: '700',
  },
  pickRow: {
    minHeight: layout.touchMin,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pickName: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
  },
});
