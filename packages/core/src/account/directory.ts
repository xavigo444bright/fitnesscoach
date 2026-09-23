/**
 * FR-100 账号目录。只记用户是谁，不记课表（FR-101 不做）。
 */

import { mergeAppleLabel } from "./identity.js";

export type AuthChannel = "email" | "phone";

export const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;
export const LOGIN_CODE_ATTEMPTS = 5;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizeEmail(raw: string): string | null {
  const text = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return null;
  return text;
}

/** 中国大陆 11 位手机号。允许用户写成 +86。 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local =
    digits.startsWith("86") && digits.length === 13 ? digits.slice(2) : digits;
  if (!/^1\d{10}$/.test(local)) return null;
  return local;
}

export function normalizeAuthTarget(
  channel: AuthChannel,
  raw: string,
): string | null {
  return channel === "email" ? normalizeEmail(raw) : normalizePhone(raw);
}

export function isSixDigitCode(raw: string): boolean {
  return /^\d{6}$/.test(raw.trim());
}

export type DirectoryUser = {
  id: string;
  createdAt: string;
  updatedAt: string;
  email?: string;
  phone?: string;
  appleSub?: string;
  wechatOpenId?: string;
  /** 用户自己起的登录名。大小写按输入保存，比对时忽略大小写。 */
  username?: string;
  /** 密码哈希。明文永不进目录。 */
  passwordHash?: string;
  /** 本机改密凭证的哈希。明文只在签发时返回一次。 */
  resetTokenHash?: string;
  displayName?: string;
};

export type UserDirectory = { users: DirectoryUser[] };

export function emptyDirectory(): UserDirectory {
  return { users: [] };
}

export type ProviderLink =
  | { provider: "email"; value: string; displayName?: string }
  | { provider: "phone"; value: string; displayName?: string }
  | {
      provider: "apple";
      appleSub: string;
      email?: string;
      displayName?: string;
    }
  | { provider: "wechat"; wechatOpenId: string; displayName?: string };

export type LinkResult =
  | {
      ok: true;
      directory: UserDirectory;
      user: DirectoryUser;
      created: boolean;
    }
  | { ok: false; reason: "invalid" | "conflict" };

type Ids = { nextId: () => string };

function cleanName(name?: string): string | undefined {
  const text = name?.trim();
  return text && text.length > 0 ? text : undefined;
}

function writeUser(dir: UserDirectory, user: DirectoryUser): UserDirectory {
  const index = dir.users.findIndex((item) => item.id === user.id);
  if (index < 0) return { users: [...dir.users, user] };
  const users = dir.users.slice();
  users[index] = user;
  return { users };
}

function createUser(
  ids: Ids,
  now: string,
  fields: Omit<DirectoryUser, "id" | "createdAt" | "updatedAt">,
): DirectoryUser {
  return {
    id: ids.nextId(),
    createdAt: now,
    updatedAt: now,
    ...fields,
  };
}

export function upsertDirectoryUser(
  dir: UserDirectory,
  link: ProviderLink,
  now: string,
  ids: Ids,
): LinkResult {
  if (link.provider === "email" || link.provider === "phone") {
    const target =
      link.provider === "email"
        ? normalizeEmail(link.value)
        : normalizePhone(link.value);
    if (!target) return { ok: false, reason: "invalid" };
    const key = link.provider === "email" ? "email" : "phone";
    const existing = dir.users.find((user) => user[key] === target);
    if (existing) {
      return { ok: true, directory: dir, user: existing, created: false };
    }
    const named = cleanName(link.displayName) ?? target;
    const user = createUser(
      ids,
      now,
      link.provider === "email"
        ? { email: target, displayName: named }
        : { phone: target, displayName: named },
    );
    return {
      ok: true,
      directory: writeUser(dir, user),
      user,
      created: true,
    };
  }

  if (link.provider === "wechat") {
    const openId = link.wechatOpenId.trim();
    if (openId.length === 0) return { ok: false, reason: "invalid" };
    const existing = dir.users.find((user) => user.wechatOpenId === openId);
    if (existing) {
      return { ok: true, directory: dir, user: existing, created: false };
    }
    const user = createUser(ids, now, {
      wechatOpenId: openId,
      displayName: cleanName(link.displayName) ?? "微信",
    });
    return { ok: true, directory: writeUser(dir, user), user, created: true };
  }

  const appleSub = link.appleSub.trim();
  if (appleSub.length === 0) return { ok: false, reason: "invalid" };
  const email = link.email ? normalizeEmail(link.email) ?? undefined : undefined;
  const bySub = dir.users.find((user) => user.appleSub === appleSub);
  if (bySub) {
    const displayName = mergeAppleLabel(
      cleanName(link.displayName) ?? email,
      bySub.displayName ?? bySub.email,
    );
    const nextEmail = email ?? bySub.email;
    if (displayName === bySub.displayName && nextEmail === bySub.email) {
      return { ok: true, directory: dir, user: bySub, created: false };
    }
    const user: DirectoryUser = {
      ...bySub,
      email: nextEmail,
      displayName,
      updatedAt: now,
    };
    return { ok: true, directory: writeUser(dir, user), user, created: false };
  }
  if (email) {
    const byEmail = dir.users.find((user) => user.email === email);
    if (byEmail) {
      if (byEmail.appleSub && byEmail.appleSub !== appleSub) {
        return { ok: false, reason: "conflict" };
      }
      const user: DirectoryUser = {
        ...byEmail,
        appleSub,
        updatedAt: now,
        displayName: byEmail.displayName ?? cleanName(link.displayName),
      };
      return {
        ok: true,
        directory: writeUser(dir, user),
        user,
        created: false,
      };
    }
  }
  const user = createUser(ids, now, {
    appleSub,
    email,
    displayName: cleanName(link.displayName) ?? email,
  });
  return { ok: true, directory: writeUser(dir, user), user, created: true };
}

export type LoginCodeState = {
  expiresAt: string;
  attemptsLeft: number;
};

export function freshLoginCode(
  now: string,
  ttlMs = LOGIN_CODE_TTL_MS,
): LoginCodeState {
  return {
    expiresAt: new Date(Date.parse(now) + ttlMs).toISOString(),
    attemptsLeft: LOGIN_CODE_ATTEMPTS,
  };
}

export type CodeVerdict =
  | { ok: true }
  | {
      ok: false;
      reason: "expired" | "locked" | "mismatch";
      attemptsLeft: number;
    };

export function judgeLoginCode(
  state: LoginCodeState,
  matches: boolean,
  now: string,
): CodeVerdict {
  if (state.attemptsLeft <= 0) {
    return { ok: false, reason: "locked", attemptsLeft: 0 };
  }
  if (Date.parse(state.expiresAt) <= Date.parse(now)) {
    return { ok: false, reason: "expired", attemptsLeft: state.attemptsLeft };
  }
  if (!matches) {
    const attemptsLeft = state.attemptsLeft - 1;
    return {
      ok: false,
      reason: attemptsLeft <= 0 ? "locked" : "mismatch",
      attemptsLeft,
    };
  }
  return { ok: true };
}

export function normalizeUsername(raw: string): string | null {
  const email = normalizeEmail(raw);
  if (email) return email;
  const text = raw.trim();
  if (!/^[\p{L}\p{N}_]{3,32}$/u.test(text)) return null;
  return text;
}

export function usernameKey(username: string): string {
  return username.trim().toLocaleLowerCase();
}

/** 至少 8 位，不含空白，最长 72（哈希算法的输入上限）。 */
export function passwordAcceptable(raw: string): boolean {
  return raw.length >= 8 && raw.length <= 72 && !/\s/.test(raw);
}

export function createUsernameUser(
  directory: UserDirectory,
  rawUsername: string,
  now: string,
  ids: Ids,
): LinkResult {
  const username = normalizeUsername(rawUsername);
  if (!username) return { ok: false, reason: "invalid" };
  const key = usernameKey(username);
  const email = normalizeEmail(username);
  if (
    directory.users.some(
      (user) =>
        (user.username && usernameKey(user.username) === key) ||
        (email && user.email === email),
    )
  ) {
    return { ok: false, reason: "conflict" };
  }
  const user = createUser(ids, now, {
    username,
    displayName: username,
    ...(email ? { email } : {}),
  });
  return { ok: true, directory: writeUser(directory, user), user, created: true };
}

export function findUsernameUser(
  directory: UserDirectory,
  rawUsername: string,
): DirectoryUser | undefined {
  const username = normalizeUsername(rawUsername);
  if (!username) return undefined;
  const key = usernameKey(username);
  const email = normalizeEmail(username);
  return directory.users.find(
    (user) =>
      (user.username && usernameKey(user.username) === key) ||
      (email && user.email === email),
  );
}

export function findResetTokenUser(
  directory: UserDirectory,
  resetTokenHash: string,
): DirectoryUser | undefined {
  if (!resetTokenHash) return undefined;
  return directory.users.find((user) => user.resetTokenHash === resetTokenHash);
}

export function applyUserSecrets(
  directory: UserDirectory,
  userId: string,
  secrets: { passwordHash?: string; resetTokenHash?: string },
  now: string,
): { directory: UserDirectory; user: DirectoryUser } | null {
  const existing = directory.users.find((user) => user.id === userId);
  if (!existing) return null;
  const user: DirectoryUser = { ...existing, ...secrets, updatedAt: now };
  return { directory: writeUser(directory, user), user };
}

export function removeDirectoryUser(
  directory: UserDirectory,
  userId: string,
): UserDirectory {
  return { users: directory.users.filter((user) => user.id !== userId) };
}

export function sessionStillValid(expiresAt: string, now: string): boolean {
  return Date.parse(expiresAt) > Date.parse(now);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

export function parseDirectory(raw: string): UserDirectory {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || !("users" in parsed)) {
    throw new Error("directory must be an object");
  }
  const users = (parsed as { users?: unknown }).users;
  if (!Array.isArray(users)) throw new Error("directory users required");
  return {
    users: users.map((item) => {
      if (!item || typeof item !== "object") {
        throw new Error("directory user invalid");
      }
      const rec = item as {
        id?: unknown;
        createdAt?: unknown;
        updatedAt?: unknown;
        email?: unknown;
        phone?: unknown;
        appleSub?: unknown;
        wechatOpenId?: unknown;
        username?: unknown;
        passwordHash?: unknown;
        resetTokenHash?: unknown;
        displayName?: unknown;
      };
      if (typeof rec.id !== "string" || rec.id.trim() === "") {
        throw new Error("directory user id required");
      }
      if (typeof rec.createdAt !== "string" || typeof rec.updatedAt !== "string") {
        throw new Error("directory user timestamps required");
      }
      return {
        id: rec.id,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
        email: optionalString(rec.email),
        phone: optionalString(rec.phone),
        appleSub: optionalString(rec.appleSub),
        wechatOpenId: optionalString(rec.wechatOpenId),
        username: optionalString(rec.username),
        passwordHash: optionalString(rec.passwordHash),
        resetTokenHash: optionalString(rec.resetTokenHash),
        displayName: optionalString(rec.displayName),
      };
    }),
  };
}

export function stringifyDirectory(dir: UserDirectory): string {
  return JSON.stringify(dir);
}
