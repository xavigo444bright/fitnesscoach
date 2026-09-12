/**
 * FR-100 本机身份。与课表分文件，绑定不搬 workout-log。
 */
import {
  bindLocalAccount,
  createGuestAccount,
  parseLocalAccount,
  releaseToGuest,
  stringifyLocalAccount,
  type AccountIds,
  type AccountProvider,
  type LocalAccount,
} from '@fitness-coach/core';
import { File, Paths } from 'expo-file-system';

const FILE_NAME = 'local-account-v1.json';

function accountFile(): File {
  return new File(Paths.document, FILE_NAME);
}

let cached: LocalAccount | null = null;
const listeners = new Set<() => void>();

function emitAccount(): void {
  for (const listener of listeners) listener();
}

export function subscribeAccount(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function peekAccount(): LocalAccount | null {
  return cached;
}

export function makeAccountIds(): AccountIds {
  let n = 0;
  return { nextId: () => `acc-${Date.now().toString(36)}-${++n}` };
}

export async function persistAccount(account: LocalAccount): Promise<void> {
  cached = account;
  const file = accountFile();
  if (!file.exists) file.create();
  file.write(stringifyLocalAccount(account));
  emitAccount();
}

export async function hydrateAccount(): Promise<LocalAccount | null> {
  try {
    const file = accountFile();
    cached = file.exists ? parseLocalAccount(await file.text()) : null;
  } catch {
    cached = null;
  }
  emitAccount();
  return cached;
}

export async function enterAsGuest(): Promise<LocalAccount> {
  const current = peekAccount();
  if (current) return current;
  const created = createGuestAccount(new Date().toISOString(), makeAccountIds());
  await persistAccount(created);
  return created;
}

export async function bindProvider(
  provider: AccountProvider,
  label?: string,
): Promise<LocalAccount> {
  const now = new Date().toISOString();
  const current = peekAccount() ?? createGuestAccount(now, makeAccountIds());
  const bound = bindLocalAccount(current, provider, now, label);
  await persistAccount(bound);
  return bound;
}

export async function signOutToGuest(): Promise<LocalAccount> {
  const current = peekAccount();
  if (!current) return enterAsGuest();
  const next = releaseToGuest(current);
  await persistAccount(next);
  return next;
}
