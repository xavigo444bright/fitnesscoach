/**
 * PG-011 计划模板：存名 / 套用列表。
 */
import {
  listWorkoutTemplates,
  templateExerciseSummary,
  type WorkoutLog,
} from '@fitness-coach/core';
import { colors, fontSize, layout, radius, space } from '@fitness-coach/ui';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ShellButton from './ShellButton';

type Props = {
  visible: boolean;
  mode: 'save' | 'pick';
  log: WorkoutLog;
  defaultName: string;
  onClose: () => void;
  onSave: (name: string) => void;
  onApply: (templateId: string) => void;
  onDelete: (templateId: string) => void;
};

export default function TemplateSheet({
  visible,
  mode,
  log,
  defaultName,
  onClose,
  onSave,
  onApply,
  onDelete,
}: Props) {
  const templates = listWorkoutTemplates(log);
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (visible) setName(defaultName);
  }, [visible, defaultName]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Text style={styles.title}>
          {mode === 'save' ? '存为模板' : '套用模板'}
        </Text>
        {mode === 'save' ? (
          <>
            <Text style={styles.label}>名称</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="如 胸日"
              placeholderTextColor={colors.tabInactive}
              style={styles.input}
              accessibilityLabel="模板名称"
            />
            <ShellButton
              label="保存"
              onPress={() => {
                if (name.trim() === '') return;
                onSave(name.trim());
              }}
            />
          </>
        ) : templates.length === 0 ? (
          <Text style={styles.empty}>还没有模板。先打开一节课存一份。</Text>
        ) : (
          <ScrollView>
            {templates.map((template) => (
              <View key={template.id} style={styles.row}>
                <Pressable
                  onPress={() => onApply(template.id)}
                  style={styles.rowMain}
                  accessibilityRole="button"
                  accessibilityLabel={template.name}
                >
                  <Text style={styles.rowTitle}>{template.name}</Text>
                  <Text style={styles.rowMeta}>
                    {templateExerciseSummary(template) || '没有动作'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onDelete(template.id)}
                  style={styles.delBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`删除${template.name}`}
                >
                  <Text style={styles.delText}>删</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
        <ShellButton variant="ghost" label="取消" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 56,
    paddingHorizontal: space.md,
    paddingBottom: space.lg,
    gap: space.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.display,
    fontWeight: '700',
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
  },
  empty: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: layout.touchMin,
  },
  rowMain: {
    flex: 1,
    paddingVertical: space.sm,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  rowMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    marginTop: space.xs,
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
});
