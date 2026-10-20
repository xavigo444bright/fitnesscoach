/**
 * PG-009 本节课组表（FR-091 UI）。容量走 core.workoutVolumeKg。
 */
import {
  EQUIPMENT_LABEL,
  DEFAULT_REST_SEC,
  addSet,
  addSlot,
  copySet,
  effectiveBodyweightKg,
  endWorkout,
  exerciseDisplayName,
  followAlongCatalogId,
  formatWeightAmount,
  isBodyweightRef,
  lastLoadForExercise,
  parseWeightToKg,
  patchSet,
  patchSlot,
  patchWorkout,
  removeSet,
  removeSlot,
  saveWorkoutAsTemplate,
  searchCatalogExercises,
  suggestedWeightKg,
  uniqueCatalogMatchForQuery,
  workoutById,
  workoutExerciseSummary,
  workoutTitleDisplay,
  workoutVolumeKg,
  recordedWeightUnit,
  retargetWeightText,
  weightUnitLabel,
  type LogSet,
  type LogSlot,
  type WeightUnit,
  type WorkoutLog,
} from '@fitness-coach/core';
import { colors, fontSize, layout, radius, space } from '@fitness-coach/ui';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Animated,
  Keyboard,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type KeyboardEvent,
} from 'react-native';
import EmptyPane from './EmptyPane';
import ExercisePoseIcon from './ExercisePoseIcon';
import ShellButton from './ShellButton';
import WeightUnitToggle from './WeightUnitToggle';
import TemplateSheet from './TemplateSheet';
import { commitWorkoutLog } from '../workoutLogStorage';
import { scrollIntoKeyboard, type WindowNode } from '../keyboardField';
import { useTr } from '../i18n';

const PLACEHOLDER_REPS = 8;
const PLACEHOLDER_SEC = 45;
/** 标题字号下最多排下的视觉字宽。汉字算 1，英文约 0.55。再长就降字号，不省略。 */
const SLOT_NAME_FULL_UNITS = 6;

function nameVisualUnits(name: string): number {
  let units = 0;
  for (const ch of name) {
    const code = ch.codePointAt(0) ?? 0;
    units += code > 0xff ? 1 : 0.55;
  }
  return units;
}

function slotNameFontSize(name: string): number {
  const units = nameVisualUnits(name);
  if (units <= SLOT_NAME_FULL_UNITS) return fontSize.title;
  if (units <= 8) return fontSize.body;
  if (units <= 11) return fontSize.caption;
  return fontSize.meta;
}
const composerFocused = { current: false };

type FieldNode = WindowNode & {
  measureLayout: View['measureLayout'];
};

/** 底栏只在快速输入聚焦时抬起。课名、自重、已记的组、加动作都不抬。 */
const keyboardGate = {
  composer: () => {},
  other: (_node: FieldNode | null) => {},
  dropDock: () => {},
};
const HOLD_MS = 250;
const REVEAL_X = 72;
const COL_INDEX = 32;
const COL_REPS = 56;
const COL_LOAD = 68;
const COL_UNIT = 76;
const COL_ACTION = 36;

function useBlankHold(onReveal: () => void) {
  const holding = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const frame = useRef<number | null>(null);
  const arm = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);
  const [progress, setProgress] = useState(0);

  const stop = () => {
    holding.current = false;
    if (arm.current != null) clearTimeout(arm.current);
    arm.current = null;
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setProgress(0);
  };

  useEffect(
    () => () => {
      holding.current = false;
      if (arm.current != null) clearTimeout(arm.current);
      if (frame.current != null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const tick = () => {
    if (!holding.current) return;
    const next = Math.min(1, (Date.now() - startedAt.current) / HOLD_MS);
    setProgress(next);
    if (next >= 1) {
      holding.current = false;
      frame.current = null;
      onReveal();
      return;
    }
    frame.current = requestAnimationFrame(tick);
  };

  return {
    progress,
    stop,
    onTouchStart: (event: GestureResponderEvent) => {
      holding.current = true;
      startedAt.current = Date.now();
      origin.current = {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
      };
      arm.current = setTimeout(() => {
        arm.current = null;
        if (!holding.current) return;
        frame.current = requestAnimationFrame(tick);
      }, 60);
    },
    onTouchMove: (event: GestureResponderEvent) => {
      if (!holding.current) return;
      const dx = event.nativeEvent.pageX - origin.current.x;
      const dy = event.nativeEvent.pageY - origin.current.y;
      if (dx * dx + dy * dy > 64) stop();
    },
    onTouchEnd: stop,
    onTouchCancel: stop,
  };
}

type Props = {
  log: WorkoutLog;
  workoutId: string;
  contentBottomInset: number;
  onOpenRest: (durationSec: number) => void;
  onFollowAlong: (catalogId: string) => void;
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
  onFollowAlong,
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
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [entryUnit, setEntryUnit] = useState<WeightUnit>('kg');
  const [secText, setSecText] = useState('');
  const [titleText, setTitleText] = useState(workout?.title ?? '');
  const effectiveBw = effectiveBodyweightKg(log, workout);
  const [bwText, setBwText] = useState(
    effectiveBw != null ? String(effectiveBw) : '',
  );
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const tr = useTr();
  const [liftDock, setLiftDock] = useState(false);
  const keyboardInsetRef = useRef(0);
  const focusedFieldRef = useRef<FieldNode | null>(null);
  const pickerOpenRef = useRef(false);
  pickerOpenRef.current = pickerOpen;
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const contentRef = useRef<View>(null);
  const composerRef = useRef<View>(null);
  const titleRef = useRef<TextInput>(null);
  const bwRef = useRef<TextInput>(null);
  const pendingReveal = useRef(false);
  const revealComposerRef = useRef<() => void>(() => undefined);
  const skipComposerScroll = useRef(true);

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
      setLeftText('');
      setRightText('');
      return;
    }
    setRepsText(last ? String(last.reps) : '');
    setEntryUnit('kg');
    setSecText('');
    if (selectedSlot.loadMode === 'sides') {
      const split = last?.weightLeftKg != null || last?.weightRightKg != null;
      setLeftText(
        split
          ? last?.weightLeftKg != null
            ? String(last.weightLeftKg)
            : ''
          : last
            ? String(last.weightKg)
            : '',
      );
      setRightText(
        split && last?.weightRightKg != null ? String(last.weightRightKg) : '',
      );
      setKgText('');
      return;
    }
    setKgText(suggestKg != null ? String(suggestKg) : '');
    setLeftText('');
    setRightText('');
  }, [selectedSlot?.id, selectedSlot?.loadMode, log]);

  const scrollField = (node: WindowNode | null) => {
    scrollIntoKeyboard(
      node,
      keyboardInsetRef.current,
      scrollY,
      scrollRef.current,
      space.md,
    );
  };

  revealComposerRef.current = () => {
    const content = contentRef.current;
    const composer = composerRef.current;
    if (!content || !composer) return;
    if (keyboardInsetRef.current > 0) {
      pendingReveal.current = false;
      scrollField(composer);
      return;
    }
    composer.measureLayout(
      content,
      (_x, y) => {
        pendingReveal.current = false;
        scrollRef.current?.scrollTo({
          y: Math.max(0, y - space.lg),
          animated: true,
        });
      },
      () => undefined,
    );
  };

  keyboardGate.composer = () => {
    composerFocused.current = true;
    pendingReveal.current = true;
    focusedFieldRef.current = null;
    if (keyboardInsetRef.current > 0 && !pickerOpenRef.current) {
      setLiftDock(true);
    }
  };
  keyboardGate.other = (node) => {
    composerFocused.current = false;
    focusedFieldRef.current = node;
    setLiftDock(false);
    if (keyboardInsetRef.current > 0) scrollField(node);
  };
  keyboardGate.dropDock = () => {
    composerFocused.current = false;
    focusedFieldRef.current = null;
    setLiftDock(false);
  };

  useEffect(() => {
    const showName =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideName =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (event: KeyboardEvent) => {
      const height = event.endCoordinates?.height ?? 0;
      keyboardInsetRef.current = height;
      if (Platform.OS === 'ios') {
        LayoutAnimation.configureNext(
          LayoutAnimation.create(
            event.duration && event.duration > 0 ? event.duration : 250,
            LayoutAnimation.Types.keyboard,
            LayoutAnimation.Properties.opacity,
          ),
        );
      }
      setKeyboardHeight(height);
      const lift = composerFocused.current && !pickerOpenRef.current;
      setLiftDock(lift);
      if (lift) {
        setTimeout(
          () => revealComposerRef.current(),
          Platform.OS === 'ios' ? 280 : 80,
        );
        return;
      }
      if (pickerOpenRef.current) return;
      const node = focusedFieldRef.current;
      if (!node) return;
      setTimeout(() => scrollField(node), Platform.OS === 'ios' ? 280 : 80);
    };
    const onHide = (event: KeyboardEvent) => {
      keyboardInsetRef.current = 0;
      if (Platform.OS === 'ios') {
        LayoutAnimation.configureNext(
          LayoutAnimation.create(
            event.duration && event.duration > 0 ? event.duration : 250,
            LayoutAnimation.Types.keyboard,
            LayoutAnimation.Properties.opacity,
          ),
        );
      }
      setKeyboardHeight(0);
      setLiftDock(false);
    };
    const showSub = Keyboard.addListener(showName, onShow);
    const hideSub = Keyboard.addListener(hideName, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (skipComposerScroll.current) {
      skipComposerScroll.current = false;
      return;
    }
    pendingReveal.current = true;
    const timer = setTimeout(() => revealComposerRef.current(), 50);
    return () => clearTimeout(timer);
  }, [selectedSlotId]);

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

  const volume = workoutVolumeKg(workout, log.bodyweightKg);
  const timed = selectedSlot?.countMode === 'timed';
  const sides = selectedSlot?.loadMode === 'sides';
  const bodyweightSlot =
    selectedSlot != null &&
    !timed &&
    isBodyweightRef(selectedSlot.exercise);

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
      if (selectedSlot.loadMode === 'sides') {
        return addSet(
          patched,
          workout.id,
          selectedSlot.id,
          {
            reps,
            weightLeftKg: parseWeightToKg(leftText, entryUnit),
            weightRightKg: parseWeightToKg(rightText, entryUnit),
            weightUnit: entryUnit,
          },
          ids,
        ).log;
      }
      return addSet(
        patched,
        workout.id,
        selectedSlot.id,
        {
          reps,
          weightKg: parseWeightToKg(kgText, entryUnit),
          weightUnit: entryUnit,
        },
        ids,
      ).log;
    });
  };

  const onComposerFocus = () => {
    keyboardGate.composer();
  };

  return (
    <View
      style={[
        styles.wrap,
        liftDock ? { paddingBottom: keyboardHeight } : null,
      ]}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: space.lg,
          paddingHorizontal: space.md,
        }}
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          scrollY.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View ref={contentRef} collapsable={false}>
        <Pressable
          onPress={onClose}
          style={styles.backRow}
          accessibilityRole="button"
          accessibilityLabel={tr('返回')}
        >
          <Text style={styles.backText}>{tr('返回')}</Text>
        </Pressable>
        <TextInput
          ref={titleRef}
          value={titleText}
          onFocus={() => keyboardGate.other(titleRef.current)}
          onChangeText={(t) => {
            setTitleText(t);
            persistTitle(t);
          }}
          onEndEditing={() => persistTitle(titleText)}
          placeholder={tr('训练主题，如 推日')}
          placeholderTextColor={colors.tabInactive}
          style={styles.themeInput}
          accessibilityLabel={tr('训练主题')}
        />
        <View style={styles.aggregateRow}>
          <Text style={styles.aggregate}>
            {tr(workoutExerciseSummary(workout) || '还没有动作')}
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
            accessibilityLabel={tr('存为模板')}
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
        {isOpen ? null : <Text style={styles.ended}>{tr('已结束')}</Text>}
        <View style={styles.metaRow}>
          <Text style={styles.volume}>{tr(`容量 ${volume} kg`)}</Text>
          <View style={styles.bwCell}>
            <Text style={styles.bwCellLabel}>{tr('自重')}</Text>
            <TextInput
              ref={bwRef}
              value={bwText}
              onFocus={() => keyboardGate.other(bwRef.current)}
              onChangeText={setBwText}
              onEndEditing={() => {
                const stored = effectiveBodyweightKg(log, workout);
                const shown = stored != null ? String(stored) : '';
                if (bwText === shown) return;
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
              accessibilityLabel={tr('本节自重')}
            />
            <Text style={styles.bwCellUnit}>kg</Text>
          </View>
        </View>
        {workout.slots.length === 0 ? (
          <Text style={styles.hint}>{tr('先加动作，再记组。')}</Text>
        ) : null}
        {workout.slots.map((slot) => (
          <View key={slot.id}>
          <SlotCard
            slot={slot}
            selected={selectedSlotId === slot.id}
            onSelect={() => {
              if (slot.id !== selectedSlotId) pendingReveal.current = true;
              setSelectedSlotId(slot.id);
            }}
            onFollow={
              followAlongCatalogId(slot.exercise)
                ? () => {
                    const catalogId = followAlongCatalogId(slot.exercise);
                    if (catalogId) onFollowAlong(catalogId);
                  }
                : undefined
            }
            onToggleSides={() => {
              void commitWorkoutLog((next) =>
                patchSlot(next, workout.id, slot.id, {
                  loadMode: slot.loadMode === 'sides' ? 'single' : 'sides',
                }),
              );
            }}
            onPatchSet={(setId, patch) => {
              void commitWorkoutLog((next) =>
                patchSet(next, workout.id, slot.id, setId, patch),
              );
            }}
            onDeleteSet={(setId) => {
              void commitWorkoutLog((next) =>
                removeSet(next, workout.id, slot.id, setId),
              );
            }}
            onCopySet={(setId) => {
              void commitWorkoutLog((next, ids) =>
                copySet(next, workout.id, slot.id, setId, ids).log,
              );
            }}
            onRemove={() => {
              void commitWorkoutLog((next) =>
                removeSlot(next, workout.id, slot.id),
              );
            }}
          />
          {selectedSlotId === slot.id && selectedSlot ? (
          <View
            ref={composerRef}
            collapsable={false}
            style={styles.composer}
            onLayout={() => {
              if (!pendingReveal.current) return;
              revealComposerRef.current();
            }}
          >
            {timed ? (
              <Field
                onFocus={onComposerFocus}
                label="秒"
                value={secText}
                onChange={setSecText}
                placeholder={String(PLACEHOLDER_SEC)}
                fill
              />
            ) : sides ? (
              <View style={styles.row}>
                <Field
                  onFocus={onComposerFocus}
                  label="次数"
                  value={repsText}
                  onChange={setRepsText}
                  placeholder={String(PLACEHOLDER_REPS)}
                />
                <Field
                  onFocus={onComposerFocus}
                  label="左"
                  value={leftText}
                  onChange={setLeftText}
                  placeholder="选填"
                />
                <Field
                  onFocus={onComposerFocus}
                  label="右"
                  value={rightText}
                  onChange={setRightText}
                  placeholder="选填"
                />
                <WeightUnitToggle
                  unit={entryUnit}
                  onChange={(next) => {
                    setLeftText((cur) =>
                      retargetWeightText(cur, entryUnit, next),
                    );
                    setRightText((cur) =>
                      retargetWeightText(cur, entryUnit, next),
                    );
                    setEntryUnit(next);
                  }}
                />
              </View>
            ) : (
              <View style={styles.composerRow}>
                <Field
                  onFocus={onComposerFocus}
                  label="次数"
                  value={repsText}
                  onChange={setRepsText}
                  placeholder={String(PLACEHOLDER_REPS)}
                  fill
                />
                <View style={styles.composerField}>
                  <WeightUnitToggle
                    unit={entryUnit}
                    onChange={(next) => {
                      setKgText((cur) =>
                        retargetWeightText(cur, entryUnit, next),
                      );
                      setEntryUnit(next);
                    }}
                  />
                  <TextInput
                    value={kgText}
                    onChangeText={setKgText}
                    onFocus={onComposerFocus}
                    placeholder={tr('选填')}
                    placeholderTextColor={colors.tabInactive}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    accessibilityLabel={tr('重量')}
                  />
                </View>
              </View>
            )}
            {bodyweightSlot ? (
              <Text style={styles.meta}>
                {tr(
                  effectiveBw != null
                    ? '未填重量时按自重计入'
                    : '填了自重后，未填重量的组按自重计入',
                )}
              </Text>
            ) : null}
            {timed ||
            sides ||
            bodyweightSlot ||
            parseOptionalNumber(bwText) == null ? null : (
              <ShellButton
                variant="ghost"
                label="用自重"
                onPress={() => {
                  const kg = parseOptionalNumber(bwText);
                  if (kg == null) return;
                  setKgText(formatWeightAmount(kg, entryUnit));
                }}
              />
            )}
          </View>
          ) : null}
          </View>
        ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.dock,
          {
            paddingBottom: liftDock ? space.sm : contentBottomInset,
          },
        ]}
      >
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
              onPress={() => {
                keyboardGate.dropDock();
                setPickerOpen(true);
              }}
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
            pendingReveal.current = true;
            setSelectedSlotId(slotId);
            setPickerOpen(false);
          })();
        }}
        onPickCustom={() => {
          const name = customName.trim();
          if (name === '') return;
          const catalog = uniqueCatalogMatchForQuery(name);
          void (async () => {
            let slotId = '';
            await commitWorkoutLog((next, ids) => {
              const added = addSlot(
                next,
                workout.id,
                catalog
                  ? { kind: 'catalog', catalogId: catalog.id }
                  : { kind: 'custom', name },
                ids,
              );
              slotId = added.slotId;
              return added.log;
            });
            pendingReveal.current = true;
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

function SlotCard({
  slot,
  selected,
  onSelect,
  onFollow,
  onToggleSides,
  onPatchSet,
  onDeleteSet,
  onCopySet,
  onRemove,
}: {
  slot: LogSlot;
  selected: boolean;
  onSelect: () => void;
  onFollow?: () => void;
  onToggleSides: () => void;
  onPatchSet: (
    setId: string,
    patch: {
      reps?: number;
      weightKg?: number;
      weightLeftKg?: number;
      weightRightKg?: number;
      weightUnit?: WeightUnit;
      durationSec?: number;
    },
  ) => void;
  onDeleteSet: (setId: string) => void;
  onCopySet: (setId: string) => void;
  onRemove: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const skipClose = useRef(false);
  const slide = useRef(new Animated.Value(0)).current;
  const hold = useBlankHold(() => {
    skipClose.current = true;
    setRevealed(true);
  });
  const timed = slot.countMode === 'timed';
  const sides = slot.loadMode === 'sides';
  const tr = useTr();
  const name = exerciseDisplayName(slot.exercise);
  const shownName = tr(name);
  const titleSize = slotNameFontSize(shownName);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: revealed ? -REVEAL_X : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [revealed, slide]);

  const onHoldStart = (event: GestureResponderEvent) => {
    if (revealed) return;
    hold.onTouchStart(event);
  };
  const onHoldEnd = () => {
    hold.onTouchEnd();
    if (skipClose.current) {
      skipClose.current = false;
      return;
    }
    if (revealed) setRevealed(false);
  };

  const table = (
    <>
      <View style={styles.setHead}>
        <Text style={[styles.setHeadCell, { width: COL_INDEX }]}>{tr('组')}</Text>
        <Text style={[styles.setHeadCell, { width: COL_REPS }]}>
          {tr(timed ? '秒' : '次')}
        </Text>
        {timed ? null : sides ? (
          <>
            <Text style={[styles.setHeadCell, { width: COL_LOAD }]}>{tr('左')}</Text>
            <Text style={[styles.setHeadCell, { width: COL_LOAD }]}>{tr('右')}</Text>
            <View style={{ width: COL_UNIT }} />
          </>
        ) : (
          <>
            <Text style={[styles.setHeadCell, { width: COL_LOAD }]}>{tr('重量')}</Text>
            <View style={{ width: COL_UNIT }} />
          </>
        )}
        <View style={{ width: COL_ACTION }} />
        <View style={{ width: COL_ACTION }} />
      </View>
      {slot.sets.map((set, i) => (
        <SetRow
          key={set.id}
          index={i}
          set={set}
          timed={timed}
          sides={sides}
          onPatch={(patch) => onPatchSet(set.id, patch)}
          onDelete={() => onDeleteSet(set.id)}
          onCopy={() => onCopySet(set.id)}
        />
      ))}
    </>
  );

  return (
    <View
      style={[
        styles.slot,
        selected && styles.slotOn,
        hold.progress > 0 && styles.slotCharging,
      ]}
      accessibilityHint={tr('按住空白处，卡片左滑后点删除')}
    >
      <Pressable
        onPress={onRemove}
        style={styles.revealDelete}
        accessibilityRole="button"
        accessibilityLabel={`${tr('删除')} ${shownName}`}
      >
        <Text style={styles.revealDeleteText}>{tr('删除')}</Text>
      </Pressable>
      <Animated.View
        style={[styles.slotFace, { transform: [{ translateX: slide }] }]}
      >
        <View
          style={styles.holdLayer}
          onTouchStart={onHoldStart}
          onTouchMove={hold.onTouchMove}
          onTouchEnd={onHoldEnd}
          onTouchCancel={onHoldEnd}
        />
        {hold.progress > 0 ? (
          <View
            pointerEvents="none"
            style={[styles.charge, { width: `${hold.progress * 100}%` }]}
          />
        ) : null}
        <View style={styles.slotHead}>
          <Pressable
            onPress={() => {
              if (revealed) {
                setRevealed(false);
                return;
              }
              onSelect();
            }}
            onTouchStart={onHoldStart}
            onTouchMove={hold.onTouchMove}
            onTouchEnd={onHoldEnd}
            onTouchCancel={onHoldEnd}
            style={styles.slotHeadMain}
            accessibilityRole="button"
            accessibilityLabel={shownName}
          >
            <ExercisePoseIcon
              catalogId={
                slot.exercise.kind === 'catalog'
                  ? slot.exercise.catalogId
                  : undefined
              }
              size={36}
            />
            <View style={styles.slotTitleWrap}>
              <Text
                style={[styles.slotTitle, { fontSize: titleSize }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={fontSize.meta / titleSize}
                ellipsizeMode="clip"
              >
                {shownName}
              </Text>
            </View>
          </Pressable>
          {timed ? null : (
            <Pressable
              onPress={onToggleSides}
              style={styles.followBtn}
              accessibilityRole="button"
              accessibilityLabel={tr('左右分别记重')}
              accessibilityState={{ selected: sides }}
            >
              <Text style={[styles.followText, !sides && styles.followOff]}>
                {tr('左右')}
              </Text>
            </Pressable>
          )}
          {onFollow ? (
            <Pressable
              onPress={onFollow}
              style={styles.followBtn}
              accessibilityRole="button"
              accessibilityLabel={`${tr('跟练')} ${shownName}`}
            >
              <Text style={styles.followText}>{tr('跟练')}</Text>
            </Pressable>
          ) : null}
        </View>
        {slot.sets.length === 0 ? (
          <Text style={styles.meta} pointerEvents="none">
            {tr('还没有组')}
          </Text>
        ) : (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.setScroll}
          >
            <View>{table}</View>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

function SetRow({
  index,
  set,
  timed,
  sides,
  onPatch,
  onDelete,
  onCopy,
}: {
  index: number;
  set: LogSet;
  timed: boolean;
  sides: boolean;
  onPatch: (patch: {
    reps?: number;
    weightKg?: number;
    weightLeftKg?: number;
    weightRightKg?: number;
    weightUnit?: WeightUnit;
    durationSec?: number;
  }) => void;
  onDelete: () => void;
  onCopy: () => void;
}) {
  const tr = useTr();
  const unit = recordedWeightUnit(set.weightUnit);
  const leftShown =
    set.weightLeftKg != null && set.weightLeftKg > 0
      ? set.weightLeftKg
      : set.weightRightKg != null && set.weightRightKg > 0
        ? undefined
        : set.weightKg;
  return (
    <View style={styles.setRow}>
      <Text style={[styles.setIndex, { width: COL_INDEX }]}>{index + 1}</Text>
      {timed ? (
        <EditableNum
          value={set.durationSec}
          width={COL_REPS}
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
            width={COL_REPS}
            accessibilityLabel={`第${index + 1}组次数`}
            onCommit={(n) => {
              if (n == null) return;
              onPatch({ reps: n });
            }}
          />
          {sides ? (
            <>
              <WeightNum
                storedKg={leftShown}
                unit={unit}
                width={COL_LOAD}
                showUnit={false}
                accessibilityLabel={`第${index + 1}组左侧重量`}
                onCommit={({ weightKg: next, weightUnit }) => {
                  onPatch({
                    weightLeftKg: next,
                    weightRightKg: set.weightRightKg,
                    weightKg: undefined,
                    weightUnit,
                  });
                }}
              />
              <WeightNum
                storedKg={set.weightRightKg}
                unit={unit}
                width={COL_LOAD}
                showUnit={false}
                accessibilityLabel={`第${index + 1}组右侧重量`}
                onCommit={({ weightKg: next, weightUnit }) => {
                  onPatch({
                    weightLeftKg: leftShown,
                    weightRightKg: next,
                    weightKg: undefined,
                    weightUnit,
                  });
                }}
              />
              <View style={[styles.unitCol, { width: COL_UNIT }]}>
                <WeightUnitToggle
                  inline
                  unit={unit}
                  onChange={(next) => {
                    onPatch({ weightUnit: next });
                  }}
                />
              </View>
            </>
          ) : (
            <WeightNum
              storedKg={set.weightKg}
              unit={unit}
              width={COL_LOAD}
              accessibilityLabel={`第${index + 1}组${weightUnitLabel(unit)}`}
              onCommit={(patch) => onPatch(patch)}
            />
          )}
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
        <Text style={styles.delText}>{tr('删')}</Text>
      </Pressable>
    </View>
  );
}

function WeightNum({
  storedKg,
  unit,
  width,
  showUnit = true,
  onCommit,
  accessibilityLabel,
}: {
  storedKg: number | undefined;
  unit: WeightUnit;
  width: number;
  showUnit?: boolean;
  onCommit: (patch: { weightKg?: number; weightUnit: WeightUnit }) => void;
  accessibilityLabel: string;
}) {
  const shown = storedKg == null ? '' : formatWeightAmount(storedKg, unit);
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState(shown);
  const [textUnit, setTextUnit] = useState(unit);
  useEffect(() => {
    setText(shown);
    setTextUnit(unit);
  }, [shown, unit]);
  const input = (
    <TextInput
      ref={inputRef}
      value={text}
      onChangeText={setText}
      onFocus={() => keyboardGate.other(inputRef.current)}
      onEndEditing={() => {
        const baseline =
          storedKg == null ? '' : formatWeightAmount(storedKg, textUnit);
        if (text === baseline && textUnit === unit) return;
        onCommit({
          weightKg: parseWeightToKg(text, textUnit),
          weightUnit: textUnit,
        });
      }}
      keyboardType="decimal-pad"
      style={[styles.setInput, { width }]}
      accessibilityLabel={accessibilityLabel}
    />
  );
  if (!showUnit) return input;
  return (
    <View style={[styles.weightCell, { width: width + space.sm + COL_UNIT }]}>
      {input}
      <View style={[styles.unitCol, { width: COL_UNIT }]}>
        <WeightUnitToggle
          inline
          unit={textUnit}
          onChange={(next) => {
            const nextText = retargetWeightText(text, textUnit, next);
            setText(nextText);
            setTextUnit(next);
            onCommit({
              weightKg: parseWeightToKg(nextText, next),
              weightUnit: next,
            });
          }}
        />
      </View>
    </View>
  );
}

function EditableNum({
  value,
  width,
  onCommit,
  accessibilityLabel,
}: {
  value: number | undefined;
  width: number;
  onCommit: (n: number | undefined) => void;
  accessibilityLabel: string;
}) {
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => {
    setText(value == null ? '' : String(value));
  }, [value]);
  return (
    <TextInput
      ref={inputRef}
      value={text}
      onChangeText={setText}
      onFocus={() => keyboardGate.other(inputRef.current)}
      onEndEditing={() => onCommit(parseOptionalNumber(text))}
      keyboardType="decimal-pad"
      style={[styles.setInput, { width }]}
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
  onFocus,
  fill = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onCommit?: () => void;
  onFocus?: () => void;
  fill?: boolean;
}) {
  const tr = useTr();
  const shown = tr(label);
  return (
    <View style={fill ? styles.composerField : styles.field}>
      <Text style={styles.fieldLabel}>{shown}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        onEndEditing={onCommit}
        placeholder={tr(placeholder)}
        placeholderTextColor={colors.tabInactive}
        keyboardType="decimal-pad"
        style={styles.input}
        accessibilityLabel={shown}
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
  const tr = useTr();
  const hits = useMemo(
    () => searchCatalogExercises(customName),
    [customName],
  );
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Text style={styles.modalTitle}>{tr('加动作')}</Text>
        <View style={styles.row}>
          <TextInput
            value={customName}
            onChangeText={onChangeCustom}
            onFocus={() => keyboardGate.dropDock()}
            placeholder={tr('搜索或自定义名称')}
            placeholderTextColor={colors.tabInactive}
            style={[styles.input, { flex: 1 }]}
            accessibilityLabel={tr('搜索或自定义动作名')}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <ShellButton
            label="添加"
            onPress={onPickCustom}
            disabled={customName.trim() === ''}
          />
        </View>
        <ScrollView>
          {hits.length === 0 ? (
            <Text style={styles.hint}>{tr('没有匹配的动作，可点添加记自定义名')}</Text>
          ) : (
            hits.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => onPickCatalog(e.id)}
                style={styles.pickRow}
                accessibilityRole="button"
                accessibilityLabel={tr(e.name)}
              >
                <ExercisePoseIcon catalogId={e.id} size={36} />
                <View style={styles.pickMeta}>
                  <Text style={styles.pickName}>{tr(e.name)}</Text>
                  <Text style={styles.meta}>{tr(EQUIPMENT_LABEL[e.equipment])}</Text>
                </View>
              </Pressable>
            ))
          )}
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
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  slotFace: {
    backgroundColor: colors.surface,
    padding: space.md,
  },
  revealDelete: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: REVEAL_X,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealDeleteText: {
    color: colors.overlayText,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  slotOn: {
    borderColor: colors.cta,
  },
  slotCharging: {
    borderColor: colors.cta,
  },
  holdLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  charge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.cta,
    opacity: 0.16,
  },
  slotHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.sm,
  },
  slotHeadMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: layout.touchMin,
  },
  slotTitleWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: space.md,
    justifyContent: 'center',
  },
  slotTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  followBtn: {
    flexShrink: 0,
    minHeight: layout.touchMin,
    minWidth: layout.touchMin,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.sm,
  },
  followText: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  followOff: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  setScroll: {
    flexGrow: 0,
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
    minHeight: 36,
    gap: space.sm,
    marginTop: space.xs,
  },
  setIndex: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  setInput: {
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
    paddingHorizontal: space.sm,
    paddingVertical: 0,
    fontSize: fontSize.body,
  },
  weightCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  unitCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  delBtn: {
    width: COL_ACTION,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delText: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    fontWeight: '700',
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
    flexWrap: 'wrap',
    gap: space.md,
    alignItems: 'flex-end',
  },
  field: {
    flexGrow: 1,
    flexBasis: 72,
    minWidth: 72,
    maxWidth: 120,
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
  composerRow: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'flex-end',
  },
  composerField: {
    flex: 1,
    minWidth: 0,
  },
  dock: {
    paddingTop: space.sm,
    paddingHorizontal: space.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: space.sm,
  },
  pickMeta: {
    flex: 1,
    gap: 2,
  },
  pickName: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
  },
});
