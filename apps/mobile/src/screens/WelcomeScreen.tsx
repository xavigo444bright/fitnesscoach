/**
 * PG-012 欢迎。无本地身份时出现；「先去训练」= 游客。
 */
import { colors, fontSize, space } from '@fitness-coach/ui';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BindLabelSheet from '../components/BindLabelSheet';
import ShellButton from '../components/ShellButton';
import { bindProvider, enterAsGuest } from '../accountStorage';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [labelKind, setLabelKind] = useState<'phone' | 'email' | null>(null);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.lg },
      ]}
    >
      <View style={styles.copy}>
        <Text style={styles.kicker}>Fitness Coach</Text>
        <Text style={styles.title}>先练起来</Text>
        <Text style={styles.body}>
          训练记录只存在这台手机。登录是绑定本机身份，不会上传课表。
        </Text>
      </View>
      <View style={styles.actions}>
        <ShellButton
          label="通过 Apple 登录"
          onPress={() => {
            void bindProvider('apple');
          }}
        />
        <ShellButton
          label="手机号"
          variant="ghost"
          onPress={() => setLabelKind('phone')}
        />
        <ShellButton
          label="邮箱"
          variant="ghost"
          onPress={() => setLabelKind('email')}
        />
        <ShellButton
          label="微信"
          variant="ghost"
          onPress={() => {
            void bindProvider('wechat');
          }}
        />
        <ShellButton
          label="先去训练"
          variant="ghost"
          onPress={() => {
            void enterAsGuest();
          }}
        />
      </View>
      <BindLabelSheet
        kind={labelKind}
        onClose={() => setLabelKind(null)}
        onSubmit={(label) => {
          const kind = labelKind;
          setLabelKind(null);
          if (kind) void bindProvider(kind, label);
        }}
      />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.lg,
    justifyContent: 'space-between',
  },
  copy: {
    gap: space.md,
  },
  kicker: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.hugeStat,
    fontWeight: '700',
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    lineHeight: 24,
  },
  actions: {
    gap: space.sm,
  },
});
