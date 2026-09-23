/**
 * 这台手机上登录过的账号。退出不删。新手机没有这份记录。
 */
export type DeviceLogin = {
  userId: string;
  username?: string;
  label?: string;
  resetToken: string;
  lastUsedAt: string;
};

export type DeviceLoginStore = {
  lastUserId: string;
  records: DeviceLogin[];
};

function clean(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function asRecord(raw: unknown, fallbackTime: string): DeviceLogin | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as {
    userId?: unknown;
    username?: unknown;
    label?: unknown;
    resetToken?: unknown;
    lastUsedAt?: unknown;
  };
  const userId = clean(rec.userId);
  const resetToken = clean(rec.resetToken);
  if (!userId || !resetToken) return null;
  const username = clean(rec.username);
  const label = clean(rec.label) ?? username;
  return {
    userId,
    resetToken,
    lastUsedAt: clean(rec.lastUsedAt) ?? fallbackTime,
    ...(username ? { username } : {}),
    ...(label ? { label } : {}),
  };
}

export function emptyDeviceLoginStore(): DeviceLoginStore {
  return { lastUserId: "", records: [] };
}

export function parseDeviceLoginStore(raw: string, now = "1970-01-01T00:00:00.000Z"): DeviceLoginStore {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") return emptyDeviceLoginStore();
  const rec = parsed as { lastUserId?: unknown; records?: unknown; userId?: unknown };
  if (Array.isArray(rec.records)) {
    const records = rec.records
      .map((item) => asRecord(item, now))
      .filter((item): item is DeviceLogin => item !== null);
    const lastUserId =
      clean(rec.lastUserId) ?? records[records.length - 1]?.userId ?? "";
    return { lastUserId, records };
  }
  const single = asRecord(parsed, now);
  if (!single) return emptyDeviceLoginStore();
  return { lastUserId: single.userId, records: [single] };
}

export function stringifyDeviceLoginStore(store: DeviceLoginStore): string {
  return JSON.stringify(store);
}

export function lastDeviceLogin(store: DeviceLoginStore): DeviceLogin | null {
  if (store.records.length === 0) return null;
  const byId = store.records.find((item) => item.userId === store.lastUserId);
  if (byId) return byId;
  return [...store.records].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))[0] ?? null;
}

export function deviceLoginName(record: DeviceLogin): string | undefined {
  return record.username ?? record.label;
}

export function dropDeviceLogins(
  store: DeviceLoginStore,
  match: (record: DeviceLogin) => boolean,
): DeviceLoginStore {
  const records = store.records.filter((item) => !match(item));
  const lastStillThere = records.some((item) => item.userId === store.lastUserId);
  return {
    lastUserId: lastStillThere
      ? store.lastUserId
      : (records[records.length - 1]?.userId ?? ""),
    records,
  };
}

export function upsertDeviceLogin(
  store: DeviceLoginStore,
  next: DeviceLogin,
): DeviceLoginStore {
  const records = store.records.filter((item) => item.userId !== next.userId);
  records.push(next);
  return { lastUserId: next.userId, records };
}
