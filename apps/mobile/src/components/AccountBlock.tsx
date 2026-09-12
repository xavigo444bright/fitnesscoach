/**
 * PG-008 记录·我的账号块。绑定/退出不改课表文件。
 */
import { accountDisplayName, type LocalAccount } from '@fitness-coach/core';
import { colors, fontSize, space } from '@fitness-coach/ui';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { bindProvider, signOutToGuest } from '../accountStorage';
import BindLabelSheet from './BindLabelSheet';
import ShellButton from './ShellButton';

type Props = {
  account: LocalAccount;
};

export default function AccountBlock({ account }: Props) {
  const [labelKind, setLabelKind] = useState<'phone' | 'email' | null>(null);
  const guest = account.kind === 'guest';

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>账号</Text>
      <Text style={styles.status}>
        {guest
          ? '游客 · 记录只在这台手机'
          : `已绑定 · ${accountDisplayName(account)}`}
      </Text>
      <Text style={styles.hint}>
        绑定或退出都不会删掉本机课表。首发不上传。
      </Text>
      {guest ? (
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
        </View>
      ) : (
        <ShellButton
          label="退出登录"
          variant="ghost"
          onPress={() => {
            void signOutToGuest();
          }}
        />
      )}
      <BindLabelSheet
        kind={labelKind}
        onClose={() => setLabelKind(null)}
        onSubmit={(label) => {
          const kind = labelKind;
          setLabelKind(null);
          if (kind) void bindProvider(kind, label);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.display,
    fontWeight: '700',
    marginBottom: space.sm,
  },
  status: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '600',
    marginBottom: space.xs,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    lineHeight: 20,
    marginBottom: space.md,
  },
  actions: {
    gap: space.sm,
  },
});
