/**
 * 这台手机上登录过的账号。退出不删。新手机没有这份记录。
 */
import {
  deviceLoginName,
  dropDeviceLogins,
  emptyDeviceLoginStore,
  lastDeviceLogin,
  parseDeviceLoginStore,
  stringifyDeviceLoginStore,
  upsertDeviceLogin,
  type DeviceLogin,
} from '@fitness-coach/core';
import { File, Paths } from 'expo-file-system';

export type { DeviceLogin };

const FILE_NAME = 'device-login-v1.json';

function loginFile(): File {
  return new File(Paths.document, FILE_NAME);
}

async function readStore() {
  try {
    const file = loginFile();
    if (!file.exists) return emptyDeviceLoginStore();
    return parseDeviceLoginStore(await file.text(), new Date().toISOString());
  } catch {
    return emptyDeviceLoginStore();
  }
}

async function writeStore(store: ReturnType<typeof emptyDeviceLoginStore>): Promise<void> {
  const file = loginFile();
  if (!file.exists) file.create();
  file.write(stringifyDeviceLoginStore(store));
}

export { deviceLoginName };

export async function readDeviceLogin(): Promise<DeviceLogin | null> {
  return lastDeviceLogin(await readStore());
}

export async function readDeviceLogins(): Promise<DeviceLogin[]> {
  return (await readStore()).records;
}

export async function forgetDeviceLogins(
  match: (record: DeviceLogin) => boolean,
): Promise<void> {
  await writeStore(dropDeviceLogins(await readStore(), match));
}

export async function writeDeviceLogin(
  record: Omit<DeviceLogin, 'lastUsedAt'> & { lastUsedAt?: string },
): Promise<void> {
  const now = new Date().toISOString();
  const next: DeviceLogin = {
    userId: record.userId,
    resetToken: record.resetToken,
    lastUsedAt: record.lastUsedAt ?? now,
    ...(record.username?.trim() ? { username: record.username.trim() } : {}),
    ...(record.label?.trim() || record.username?.trim()
      ? { label: (record.label ?? record.username)?.trim() }
      : {}),
  };
  await writeStore(upsertDeviceLogin(await readStore(), next));
}
