/**
 * Expo 54 的 ExponentAV 走 JSI / expo.modules，不一定出现在 NativeModules。
 * 必须先 ensureNativeModulesAreInstalled（requireOptionalNativeModule 会做），
 * 再用可选加载；未编入时返回 null，禁止硬 require('expo-av')。
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

export function isAvNativeReady(): boolean {
  try {
    return requireOptionalNativeModule('ExponentAV') != null;
  } catch {
    return false;
  }
}
