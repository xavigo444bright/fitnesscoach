/**
 * 欢迎页和我的共用的登录入口。用户名密码和 Apple。
 */
import {
  EXERCISE_CATALOG,
  buildNameQuiz,
  buildRecoveryQuiz,
  calendarDayLocal,
  catalogSetCountsInDays,
  deviceLoginName,
  getCatalogEntry,
  normalizeUsername,
  passwordAcceptable,
  recoveryQuizMatches,
  toggleRecoveryPick,
  type DeviceLogin,
  type NameQuiz,
  type RecoveryQuiz,
} from '@fitness-coach/core';
import { colors, fontSize, layout, radius, space } from '@fitness-coach/ui';
import { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  appleBindFailureMessage,
  bindWithApple,
  loginWithPassword,
  registerWithPassword,
  resetPasswordOnDevice,
  restoreWithDeviceToken,
} from '../accountStorage';
import { confirmWithBiometrics } from '../deviceBiometric';
import { readDeviceLogin, readDeviceLogins } from '../deviceLogin';
import { localAuthMessage, localNameDecoys } from '../localAuth';
import { hydrateWorkoutLog } from '../workoutLogStorage';
import ExercisePoseIcon from './ExercisePoseIcon';
import ShellButton from './ShellButton';

type PasswordMode = 'register' | 'login' | 'reset';

type Sheet =
  | {
      kind: 'password';
      mode: PasswordMode;
      resetToken?: string;
      username?: string;
      accountCount?: number;
    }
  | { kind: 'names'; record: DeviceLogin; quiz: NameQuiz }
  | { kind: 'quiz'; record: DeviceLogin; quiz: RecoveryQuiz };

type Props = {
  showGuest?: boolean;
  onGuest?: () => void;
};

export default function AuthMethodList({ showGuest, onGuest }: Props) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [forgotBusy, setForgotBusy] = useState(false);

  async function continueForgot(record: DeviceLogin, accountCount: number) {
    if (record.username) {
      setSheet({
        kind: 'password',
        mode: 'reset',
        resetToken: record.resetToken,
        username: record.username,
        accountCount,
      });
      return;
    }
    const result = await restoreWithDeviceToken(record.resetToken);
    if (!result.ok) Alert.alert('忘记密码', result.message);
  }

  async function openTrainingQuiz(record: DeviceLogin) {
    const log = await hydrateWorkoutLog();
    const now = new Date().toISOString();
    const quiz = buildRecoveryQuiz(
      catalogSetCountsInDays(log, now),
      EXERCISE_CATALOG.map((item) => item.id),
      `${record.userId}:${calendarDayLocal(now)}`,
    );
    if (!quiz) {
      Alert.alert('忘记密码', '没法在这里改密码。');
      return;
    }
    setSheet({ kind: 'quiz', record, quiz });
  }

  async function onForgot() {
    if (forgotBusy) return;
    setForgotBusy(true);
    try {
      const records = await readDeviceLogins();
      const record = (await readDeviceLogin()) ?? records[records.length - 1];
      if (!record) {
        Alert.alert('忘记密码', '这台手机没有登录记录。');
        return;
      }
      const gate = await confirmWithBiometrics();
      if (gate === 'cancel') return;
      if (gate === 'pass') {
        await continueForgot(record, records.length);
        return;
      }
      const name = deviceLoginName(record);
      if (name) {
        const decoys = await localNameDecoys(name, `${record.userId}:${calendarDayLocal(new Date().toISOString())}`);
        const names = buildNameQuiz(name, decoys, `${record.userId}:${calendarDayLocal(new Date().toISOString())}`);
        if (names) {
          setSheet({ kind: 'names', record, quiz: names });
          return;
        }
      }
      await openTrainingQuiz(record);
    } catch {
      Alert.alert('忘记密码', '这次没能改密码。');
    } finally {
      setForgotBusy(false);
    }
  }

  return (
    <View style={styles.actions}>
      <ShellButton
        label="通过 Apple 登录"
        onPress={() => {
          void bindWithApple().then((result) => {
            if (result.ok) {
              if (result.warning) Alert.alert('Apple 登录', result.warning);
              return;
            }
            const message = appleBindFailureMessage(result.reason, result.detail);
            if (message) Alert.alert('Apple 登录', message);
          });
        }}
      />
      <ShellButton
        label="登录"
        variant="ghost"
        onPress={() => setSheet({ kind: 'password', mode: 'login' })}
      />
      <ShellButton
        label="注册"
        variant="ghost"
        onPress={() => setSheet({ kind: 'password', mode: 'register' })}
      />
      <ShellButton
        label={forgotBusy ? '确认中' : '忘记密码'}
        variant="ghost"
        disabled={forgotBusy}
        onPress={() => {
          void onForgot();
        }}
      />
      {showGuest ? (
        <ShellButton label="先去训练" variant="ghost" onPress={() => onGuest?.()} />
      ) : null}
      <AuthSheet
        sheet={sheet}
        onClose={() => setSheet(null)}
        onOpen={setSheet}
        onTraining={(record) => {
          void openTrainingQuiz(record);
        }}
      />
    </View>
  );
}

function AuthSheet({
  sheet,
  onClose,
  onOpen,
  onTraining,
}: {
  sheet: Sheet | null;
  onClose: () => void;
  onOpen: (sheet: Sheet) => void;
  onTraining: (record: DeviceLogin) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <Pressable style={styles.scrim} onPress={Keyboard.dismiss}>
          <View style={[styles.sheet, { marginBottom: insets.bottom + space.md }]}>
            {sheet?.kind === 'password' ? (
              <PasswordForm
                mode={sheet.mode}
                resetToken={sheet.resetToken}
                username={sheet.username}
                accountCount={sheet.accountCount ?? 1}
                onClose={onClose}
              />
            ) : null}
            {sheet?.kind === 'names' ? (
              <NameQuizForm
                quiz={sheet.quiz}
                onClose={onClose}
                onPass={() => onTraining(sheet.record)}
              />
            ) : null}
            {sheet?.kind === 'quiz' ? (
              <QuizForm
                quiz={sheet.quiz}
                onClose={onClose}
                onPass={() => {
                  if (sheet.record.username) {
                    void readDeviceLogins().then((records) => {
                      onOpen({
                        kind: 'password',
                        mode: 'reset',
                        resetToken: sheet.record.resetToken,
                        username: sheet.record.username,
                        accountCount: records.length,
                      });
                    });
                    return;
                  }
                  void restoreWithDeviceToken(sheet.record.resetToken).then((result) => {
                    if (!result.ok) {
                      Alert.alert('忘记密码', result.message);
                      return;
                    }
                    onClose();
                  });
                }}
              />
            ) : null}
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PasswordForm({
  mode,
  resetToken,
  username: lockedUsername,
  accountCount,
  onClose,
}: {
  mode: PasswordMode;
  resetToken?: string;
  username?: string;
  accountCount: number;
  onClose: () => void;
}) {
  const [username, setUsername] = useState(lockedUsername ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const title = mode === 'register' ? '注册' : mode === 'reset' ? '设置新密码' : '登录';
  const needsUsername = mode !== 'reset';

  async function submit() {
    if (busy) return;
    const name = (lockedUsername ?? username).trim();
    if (needsUsername && !normalizeUsername(name)) {
      setError(localAuthMessage('invalid_username'));
      return;
    }
    if (!passwordAcceptable(password)) {
      setError(localAuthMessage('invalid_password'));
      return;
    }
    setBusy(true);
    setError(null);
    const result =
      mode === 'register'
        ? await registerWithPassword(name, password)
        : mode === 'reset'
          ? await resetPasswordOnDevice(resetToken ?? '', password, name)
          : await loginWithPassword(name, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onClose();
  }

  return (
    <>
      <Text style={styles.title}>{title}</Text>
      {mode === 'reset' && accountCount > 1 ? (
        <Text style={styles.hint}>上次登录：{lockedUsername}</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {needsUsername ? (
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="用户名或邮箱"
          placeholderTextColor={colors.tabInactive}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          keyboardType="email-address"
          style={styles.input}
          accessibilityLabel="用户名或邮箱"
        />
      ) : null}
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={mode === 'login' ? '密码' : '至少 8 位密码'}
        placeholderTextColor={colors.tabInactive}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={mode === 'login' ? 'password' : 'password-new'}
        textContentType={mode === 'login' ? 'password' : 'newPassword'}
        style={styles.input}
        accessibilityLabel="密码"
      />
      <ShellButton
        label={busy ? '提交中' : title}
        disabled={busy}
        onPress={() => {
          void submit();
        }}
      />
      <ShellButton label="取消" variant="ghost" onPress={onClose} />
    </>
  );
}

function NameQuizForm({
  quiz,
  onClose,
  onPass,
}: {
  quiz: NameQuiz;
  onClose: () => void;
  onPass: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Text style={styles.title}>确认账号</Text>
      <Text style={styles.hint}>选出这台手机登录过的名称。</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView style={styles.quizScroll}>
        {quiz.choices.map((name) => {
          const selected = picked === name;
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityLabel={name}
              accessibilityState={{ selected }}
              onPress={() => {
                setError(null);
                setPicked(name);
              }}
              style={[styles.nameRow, selected && styles.choiceOn]}
            >
              <Text style={styles.nameText} numberOfLines={1}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ShellButton
        label="确认"
        disabled={!picked}
        onPress={() => {
          if (picked !== quiz.correct) {
            setError('选得不对。');
            return;
          }
          onPass();
        }}
      />
      <ShellButton label="取消" variant="ghost" onPress={onClose} />
    </>
  );
}

function QuizForm({
  quiz,
  onClose,
  onPass,
}: {
  quiz: RecoveryQuiz;
  onClose: () => void;
  onPass: () => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Text style={styles.title}>确认是你</Text>
      <Text style={styles.hint}>选出近 7 天练得最多的 {quiz.pickCount} 个。</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView style={styles.quizScroll} contentContainerStyle={styles.grid}>
        {quiz.choices.map((id) => {
          const selected = picked.includes(id);
          const name = getCatalogEntry(id)?.name ?? id;
          return (
            <Pressable
              key={id}
              accessibilityRole={quiz.pickCount > 1 ? 'checkbox' : 'button'}
              accessibilityLabel={name}
              accessibilityState={{ selected }}
              onPress={() => {
                setError(null);
                setPicked((current) => toggleRecoveryPick(current, id, quiz.pickCount));
              }}
              style={[styles.choice, selected && styles.choiceOn]}
            >
              <ExercisePoseIcon catalogId={id} size={40} />
              <Text style={styles.choiceName} numberOfLines={2}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ShellButton
        label="确认"
        disabled={picked.length !== quiz.pickCount}
        onPress={() => {
          if (!recoveryQuizMatches(quiz.correctIds, picked)) {
            setError('选得不对。');
            return;
          }
          onPass();
        }}
      />
      <ShellButton label="取消" variant="ghost" onPress={onClose} />
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: space.sm,
  },
  fill: {
    flex: 1,
  },
  scrim: {
    flex: 1,
    backgroundColor: colors.overlayScrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    marginHorizontal: space.md,
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
    lineHeight: 20,
  },
  error: {
    color: colors.error,
    fontSize: fontSize.caption,
    lineHeight: 20,
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
  quizScroll: {
    maxHeight: 280,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  choice: {
    width: '30%',
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.xs,
  },
  choiceOn: {
    borderColor: colors.cta,
    borderWidth: 2,
  },
  choiceName: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
  nameRow: {
    minHeight: layout.touchMin,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    marginBottom: space.sm,
  },
  nameText: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
  },
});
