/**
 * 手机号 / 邮箱本机绑定输入。不上传。
 */
import { colors, fontSize, layout, radius, space } from '@fitness-coach/ui';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShellButton from './ShellButton';

type Kind = 'phone' | 'email';

type Props = {
  kind: Kind | null;
  onClose: () => void;
  onSubmit: (label: string) => void;
};

export default function BindLabelSheet({ kind, onClose, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const title = kind === 'phone' ? '手机号' : '邮箱';
  const placeholder = kind === 'phone' ? '11 位手机号' : 'you@example.com';
  const valid =
    kind === 'phone'
      ? text.trim().length >= 6
      : kind === 'email'
        ? text.includes('@')
        : false;

  useEffect(() => {
    setText('');
  }, [kind]);

  return (
    <Modal
      visible={kind != null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.avoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.scrim}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="关闭"
          />
          <View
            style={[
              styles.sheet,
              { marginBottom: Math.max(insets.bottom, space.md) },
            ]}
          >
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.hint}>只存在本机，不会上传。</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={colors.tabInactive}
              keyboardType={kind === 'phone' ? 'phone-pad' : 'email-address'}
              autoCapitalize="none"
              autoFocus
              style={styles.input}
              accessibilityLabel={title}
            />
            <ShellButton
              label="绑定"
              disabled={!valid}
              onPress={() => {
                onSubmit(text.trim());
                setText('');
              }}
            />
            <ShellButton label="取消" variant="ghost" onPress={onClose} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avoid: {
    flex: 1,
  },
  scrim: {
    flex: 1,
    backgroundColor: colors.overlayScrim,
    justifyContent: 'flex-end',
    paddingHorizontal: space.md,
  },
  sheet: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  hint: {
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
});
