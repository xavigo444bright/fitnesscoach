/**
 * 账号目录只在这台手机。不访问 8787，不上传课表。
 */
import {
  applyUserSecrets,
  createUsernameUser,
  directoryLoginNames,
  emptyDirectory,
  findResetTokenUser,
  findUsernameUser,
  localPasswordMatches,
  mergeAppleLabel,
  normalizeUsername,
  parseDirectory,
  passwordAcceptable,
  pickNameDecoys,
  removeDirectoryUser,
  sealLocalPassword,
  sha256Hex,
  stringifyDirectory,
  upsertDirectoryUser,
  usernameKey,
  type DirectoryUser,
  type UserDirectory,
} from '@fitness-coach/core';
import { File, Paths } from 'expo-file-system';
import { forgetDeviceLogins } from './deviceLogin';

const FILE_NAME = 'local-directory-v1.json';
const NAME_POOL = ['linxia', 'zhou_ning', 'chenke', 'suwan', 'hean'];

export type LocalSession =
  | { ok: true; user: DirectoryUser; resetToken: string }
  | { ok: false; reason: string };

function directoryFile(): File {
  return new File(Paths.document, FILE_NAME);
}

function nextIds(): { nextId: () => string } {
  let n = 0;
  return { nextId: () => `dir-${Date.now().toString(36)}-${++n}` };
}

function randomSecret(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) cryptoObj.getRandomValues(bytes);
  else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function resetHash(token: string): string {
  return sha256Hex(`reset:${token}`);
}

async function readDir(): Promise<UserDirectory> {
  try {
    const file = directoryFile();
    if (!file.exists) return emptyDirectory();
    return parseDirectory(await file.text());
  } catch {
    return emptyDirectory();
  }
}

async function writeDir(dir: UserDirectory): Promise<void> {
  const file = directoryFile();
  if (!file.exists) file.create();
  file.write(stringifyDirectory(dir));
}

async function issueReset(
  dir: UserDirectory,
  user: DirectoryUser,
  now: string,
  passwordHash?: string,
): Promise<LocalSession> {
  const resetToken = randomSecret(32);
  const applied = applyUserSecrets(
    dir,
    user.id,
    {
      ...(passwordHash ? { passwordHash } : {}),
      resetTokenHash: resetHash(resetToken),
    },
    now,
  );
  if (!applied) return { ok: false, reason: 'unauthorized' };
  await writeDir(applied.directory);
  return { ok: true, user: applied.user, resetToken };
}

function seal(password: string): string {
  return sealLocalPassword(password, randomSecret());
}

export function localAuthMessage(reason: string): string {
  if (reason === 'invalid' || reason === 'invalid_username') {
    return '登录名可以是 3 到 32 位用户名，或邮箱。';
  }
  if (reason === 'invalid_password') return '密码至少 8 位，不能有空格。';
  if (reason === 'conflict') return '这台手机上已经有这个用户名。';
  if (reason === 'mismatch') return '用户名或密码不对。';
  if (reason === 'unauthorized') return '这台手机上的登录记录对不上。请重新注册，或用 Apple 登录。';
  return '登录没完成，请再试。课表不会被改。';
}

export async function registerLocalPassword(
  rawUsername: string,
  password: string,
): Promise<LocalSession> {
  if (!normalizeUsername(rawUsername)) return { ok: false, reason: 'invalid_username' };
  if (!passwordAcceptable(password)) return { ok: false, reason: 'invalid_password' };
  const now = new Date().toISOString();
  const created = createUsernameUser(await readDir(), rawUsername, now, nextIds());
  if (!created.ok) return { ok: false, reason: created.reason };
  return issueReset(created.directory, created.user, now, seal(password));
}

export async function loginLocalPassword(
  rawUsername: string,
  password: string,
): Promise<LocalSession> {
  if (!normalizeUsername(rawUsername)) return { ok: false, reason: 'invalid_username' };
  if (!passwordAcceptable(password)) return { ok: false, reason: 'invalid_password' };
  const dir = await readDir();
  const user = findUsernameUser(dir, rawUsername);
  if (!user?.passwordHash || !localPasswordMatches(password, user.passwordHash)) {
    return { ok: false, reason: 'mismatch' };
  }
  return issueReset(dir, user, new Date().toISOString());
}

export async function resetLocalPassword(
  resetToken: string,
  password: string,
): Promise<LocalSession> {
  if (!passwordAcceptable(password)) return { ok: false, reason: 'invalid_password' };
  const dir = await readDir();
  const user = findResetTokenUser(dir, resetHash(resetToken));
  if (!user?.username) return { ok: false, reason: 'unauthorized' };
  return issueReset(dir, user, new Date().toISOString(), seal(password));
}

export async function resumeLocalDevice(resetToken: string): Promise<LocalSession> {
  const dir = await readDir();
  const user = findResetTokenUser(dir, resetHash(resetToken));
  if (!user) return { ok: false, reason: 'unauthorized' };
  return issueReset(dir, user, new Date().toISOString());
}

export async function savedAppleLabel(appleSub: string): Promise<string | undefined> {
  const user = (await readDir()).users.find((item) => item.appleSub === appleSub);
  if (!user) return undefined;
  return mergeAppleLabel(user.displayName, user.email);
}

export async function rememberAppleUser(input: {
  appleSub: string;
  email?: string;
  displayName?: string;
}): Promise<LocalSession> {
  const now = new Date().toISOString();
  const linked = upsertDirectoryUser(
    await readDir(),
    {
      provider: 'apple',
      appleSub: input.appleSub,
      email: input.email,
      displayName: input.displayName,
    },
    now,
    nextIds(),
  );
  if (!linked.ok) return { ok: false, reason: linked.reason };
  return issueReset(linked.directory, linked.user, now);
}

export async function localNameDecoys(correct: string, salt: string): Promise<string[]> {
  const pool = [...directoryLoginNames(await readDir()), ...NAME_POOL];
  return pickNameDecoys(pool, [correct], 3, salt);
}

export async function forgetLocalIdentity(hint: {
  providerSubject?: string;
  label?: string;
  remoteUserId?: string;
}): Promise<void> {
  const dir = await readDir();
  const label = hint.label?.trim();
  const labelKey = label ? usernameKey(label) : '';
  const doomed = dir.users.filter((user) => {
    if (hint.providerSubject && (user.id === hint.providerSubject || user.appleSub === hint.providerSubject)) {
      return true;
    }
    if (hint.remoteUserId && user.id === hint.remoteUserId) return true;
    if (labelKey && user.username && usernameKey(user.username) === labelKey) return true;
    return false;
  });
  let next = dir;
  for (const user of doomed) next = removeDirectoryUser(next, user.id);
  await writeDir(next);
  const ids = new Set(doomed.map((user) => user.id));
  if (hint.providerSubject) ids.add(hint.providerSubject);
  if (hint.remoteUserId) ids.add(hint.remoteUserId);
  await forgetDeviceLogins((record) => {
    if (ids.has(record.userId)) return true;
    if (labelKey && record.username && usernameKey(record.username) === labelKey) return true;
    return false;
  });
}
