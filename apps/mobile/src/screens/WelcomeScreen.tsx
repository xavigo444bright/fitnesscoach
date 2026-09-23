/**
 * PG-012 欢迎。无本地身份时出现；「先去训练」= 游客。
 */
import { colors, fontSize, space } from '@fitness-coach/ui';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { enterAsGuest } from '../accountStorage';
import AuthMethodList from '../components/AuthMethodList';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

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
        <Text style={styles.body}>登录名和课表都只在这台手机。换手机要重新注册，或用 Apple 登录。</Text>
      </View>
      <AuthMethodList
        showGuest
        onGuest={() => {
          void enterAsGuest();
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
});
