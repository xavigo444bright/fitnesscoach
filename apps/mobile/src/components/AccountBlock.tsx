/**
 * PG-008 记录·我的账号块。退出和删除账号都不改课表文件。
 */
import { accountDisplayName, type LocalAccount } from '@fitness-coach/core';
import { colors, fontSize, space } from '@fitness-coach/ui';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { deleteLocalAccount, signOutToGuest } from '../accountStorage';
import AuthMethodList from './AuthMethodList';
import ShellButton from './ShellButton';

type Props = {
  account: LocalAccount;
};

export default function AccountBlock({ account }: Props) {
  const guest = account.kind === 'guest';

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>账号</Text>
      <Text style={styles.status}>{accountDisplayName(account)}</Text>
      {guest ? (
        <AuthMethodList />
      ) : (
        <View style={styles.actions}>
          <ShellButton
            label="退出登录"
            variant="ghost"
            onPress={() => {
              void signOutToGuest();
            }}
          />
          <ShellButton
            label="删除账号"
            variant="ghost"
            onPress={() => {
              Alert.alert(
                '删除账号',
                '这台手机上的登录名和密码会被清掉。训练记录还留在手机里。若用过 Apple 登录，可在系统设置里撤销本 App。',
                [
                  { text: '取消', style: 'cancel' },
                  {
                    text: '删除',
                    style: 'destructive',
                    onPress: () => {
                      void deleteLocalAccount();
                    },
                  },
                ],
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.xl,
  },
  actions: {
    gap: space.sm,
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
    marginBottom: space.md,
  },
});
