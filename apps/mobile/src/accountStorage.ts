/**
 * FR-100 本机身份。与课表分文件。用户名和密码哈希只在这台手机。
 */
import {
  bindLocalAccount,
  appleAccountLabel,
  createGuestAccount,
  emailFromAppleIdentityToken,
  mergeAppleLabel,
  parseLocalAccount,
  releaseToGuest,
  stringifyLocalAccount,
  type AccountIds,
  type LocalAccount,
} from '@fitness-coach/core';
import * as AppleAuthentication from 'expo-apple-authentication';
import { File, Paths } from 'expo-file-system';
import { writeDeviceLogin } from './deviceLogin';
import {
  forgetLocalIdentity,
  localAuthMessage,
  loginLocalPassword,
  registerLocalPassword,
  rememberAppleUser,
  resetLocalPassword,
  resumeLocalDevice,
  savedAppleLabel,
  type LocalSession,
} from './localAuth';

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

export type AppleBindResult =
  | { ok: true; account: LocalAccount; warning?: string }
  | {
      ok: false;
      reason: 'canceled' | 'unavailable' | 'failed';
      detail?: string;
    };

export function appleBindFailureMessage(
  reason: Exclude<AppleBindResult, { ok: true }>['reason'],
  detail?: string,
): string | null {
  if (reason === 'canceled') return null;
  if (reason === 'unavailable') return '这台安装还不能用 Apple 登录。';
  if (detail && /entitlement|capability|applesignin/i.test(detail) && !/unknown/i.test(detail)) {
    return 'App ID 还没打开 Sign in with Apple。';
  }
  return '这次没完成。';
}

function appleErrorDetail(err: unknown): string {
  if (!err || typeof err !== 'object') return String(err);
  const rec = err as { code?: unknown; message?: unknown };
  const code = rec.code != null ? String(rec.code) : '';
  const message = rec.message != null ? String(rec.message) : '';
  return [code, message].filter((s) => s.length > 0).join(' ');
}

function isAppleCanceled(err: unknown): boolean {
  if (!err || typeof err !== 'object' || !('code' in err)) return false;
  const code = String((err as { code?: unknown }).code);
  return (
    code === 'ERR_REQUEST_CANCELED' ||
    code === 'ERR_CANCELED' ||
    /canceled/i.test(code)
  );
}

/** 系统 Sign in with Apple。取消不写文件；无能力不伪绑定。 */
export async function bindWithApple(): Promise<AppleBindResult> {
  let available = false;
  try {
    available = await AppleAuthentication.isAvailableAsync();
  } catch {
    available = false;
  }
  if (!available) return { ok: false, reason: 'unavailable' };
  try {
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const now = new Date().toISOString();
    const current = peekAccount() ?? createGuestAccount(now, makeAccountIds());
    const fromApple = appleAccountLabel({
      email: cred.email,
      givenName: cred.fullName?.givenName,
      familyName: cred.fullName?.familyName,
    });
    const tokenEmail = emailFromAppleIdentityToken(cred.identityToken);
    const saved = await savedAppleLabel(cred.user);
    const label = mergeAppleLabel(fromApple ?? tokenEmail, saved);
    const bound = bindLocalAccount(current, 'apple', now, label, cred.user);
    const remembered = await rememberAppleUser({
      appleSub: cred.user,
      email: cred.email ?? tokenEmail,
      displayName: label,
    });
    if (remembered.ok) {
      await writeDeviceLogin({
        userId: remembered.user.id,
        label: label ?? remembered.user.displayName,
        resetToken: remembered.resetToken,
      });
    }
    await persistAccount(bound);
    return { ok: true, account: bound };
  } catch (err) {
    if (isAppleCanceled(err)) return { ok: false, reason: 'canceled' };
    const detail = appleErrorDetail(err);
    console.warn('[apple-bind]', detail);
    return { ok: false, reason: 'failed', detail };
  }
}

async function adoptLocalUser(result: Extract<LocalSession, { ok: true }>): Promise<LocalAccount> {
  const now = new Date().toISOString();
  const current = peekAccount() ?? createGuestAccount(now, makeAccountIds());
  const username = result.user.username?.trim();
  const provider = username ? 'username' : 'apple';
  const label = username ?? result.user.displayName;
  const bound = bindLocalAccount(
    current,
    provider,
    now,
    label,
    result.user.appleSub ?? result.user.id,
  );
  await writeDeviceLogin({
    userId: result.user.id,
    username,
    label: label ?? username,
    resetToken: result.resetToken,
  });
  await persistAccount(bound);
  return bound;
}

export async function registerWithPassword(
  username: string,
  password: string,
): Promise<{ ok: true; account: LocalAccount } | { ok: false; message: string }> {
  const result = await registerLocalPassword(username, password);
  if (!result.ok) return { ok: false, message: localAuthMessage(result.reason) };
  return { ok: true, account: await adoptLocalUser(result) };
}

export async function loginWithPassword(
  username: string,
  password: string,
): Promise<{ ok: true; account: LocalAccount } | { ok: false; message: string }> {
  const result = await loginLocalPassword(username, password);
  if (!result.ok) return { ok: false, message: localAuthMessage(result.reason) };
  return { ok: true, account: await adoptLocalUser(result) };
}

export async function restoreWithDeviceToken(
  resetToken: string,
): Promise<{ ok: true; account: LocalAccount } | { ok: false; message: string }> {
  const result = await resumeLocalDevice(resetToken);
  if (!result.ok) return { ok: false, message: localAuthMessage(result.reason) };
  return { ok: true, account: await adoptLocalUser(result) };
}

export async function resetPasswordOnDevice(
  resetToken: string,
  password: string,
  _username: string,
): Promise<{ ok: true; account: LocalAccount } | { ok: false; message: string }> {
  const result = await resetLocalPassword(resetToken, password);
  if (!result.ok) return { ok: false, message: localAuthMessage(result.reason) };
  return { ok: true, account: await adoptLocalUser(result) };
}

export async function signOutToGuest(): Promise<LocalAccount> {
  const current = peekAccount();
  if (!current) return enterAsGuest();
  const next = releaseToGuest(current);
  await persistAccount(next);
  return next;
}

/** 删掉这台手机上的登录名和密码。课表文件不动。 */
export async function deleteLocalAccount(): Promise<LocalAccount> {
  const current = peekAccount();
  if (current && current.kind === 'bound') {
    await forgetLocalIdentity({
      providerSubject: current.providerSubject,
      label: current.label,
      remoteUserId: current.remoteUserId,
    });
  }
  return signOutToGuest();
}
