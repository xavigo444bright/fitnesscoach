/**
 * 本机面容 / 指纹。没有装进当前开发包时返回 quiz，绝不加载会红屏的 JS 包装。
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

type LocalAuthNative = {
  hasHardwareAsync?: () => Promise<boolean>;
  isEnrolledAsync?: () => Promise<boolean>;
  authenticateAsync?: (options: {
    promptMessage?: string;
    cancelLabel?: string;
    disableDeviceFallback?: boolean;
    fallbackLabel?: string;
  }) => Promise<{ success: boolean; error?: string }>;
};

export async function confirmWithBiometrics(): Promise<'pass' | 'quiz' | 'cancel'> {
  try {
    const native = requireOptionalNativeModule<LocalAuthNative>('ExpoLocalAuthentication');
    if (!native?.hasHardwareAsync || !native.isEnrolledAsync || !native.authenticateAsync) {
      return 'quiz';
    }
    const has = await native.hasHardwareAsync();
    const enrolled = await native.isEnrolledAsync();
    if (!has || !enrolled) return 'quiz';
    const result = await native.authenticateAsync({
      promptMessage: '验证后才能改密码',
      cancelLabel: '取消',
      disableDeviceFallback: true,
      fallbackLabel: '改用训练题',
    });
    if (result.success) return 'pass';
    const error = result.error ?? '';
    if (
      error === 'not_enrolled' ||
      error === 'not_available' ||
      error === 'passcode_not_set' ||
      error === 'user_fallback'
    ) {
      return 'quiz';
    }
    return 'cancel';
  } catch {
    return 'quiz';
  }
}
