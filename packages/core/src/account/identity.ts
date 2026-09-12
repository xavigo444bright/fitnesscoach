/**
 * FR-100 本机身份。首发不上传（FR-101 不做）。
 */

export const ACCOUNT_VERSION = 1 as const;

export type AccountProvider = "apple" | "phone" | "email" | "wechat";

export type LocalAccount = {
  version: typeof ACCOUNT_VERSION;
  kind: "guest" | "bound";
  id: string;
  provider?: AccountProvider;
  label?: string;
  createdAt: string;
  boundAt?: string;
};

export type AccountIds = { nextId: () => string };

export function createGuestAccount(
  now: string,
  ids: AccountIds,
): LocalAccount {
  return {
    version: ACCOUNT_VERSION,
    kind: "guest",
    id: ids.nextId(),
    createdAt: now,
  };
}

/** 绑定不换 id，课表文件不用搬。 */
export function bindLocalAccount(
  account: LocalAccount,
  provider: AccountProvider,
  now: string,
  label?: string,
): LocalAccount {
  const trimmed = label?.trim();
  return {
    ...account,
    kind: "bound",
    provider,
    label: trimmed && trimmed.length > 0 ? trimmed : undefined,
    boundAt: now,
  };
}

export function releaseToGuest(account: LocalAccount): LocalAccount {
  return {
    version: ACCOUNT_VERSION,
    kind: "guest",
    id: account.id,
    createdAt: account.createdAt,
  };
}

export function accountDisplayName(account: LocalAccount): string {
  if (account.kind === "guest") return "游客";
  if (account.label) return account.label;
  if (account.provider === "apple") return "Apple";
  if (account.provider === "phone") return "手机号";
  if (account.provider === "email") return "邮箱";
  if (account.provider === "wechat") return "微信";
  return "已绑定";
}

export function stringifyLocalAccount(account: LocalAccount): string {
  return JSON.stringify(account);
}

export function parseLocalAccount(raw: string): LocalAccount {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("account must be an object");
  }
  const rec = parsed as {
    version?: unknown;
    kind?: unknown;
    id?: unknown;
    createdAt?: unknown;
    provider?: unknown;
    label?: unknown;
    boundAt?: unknown;
  };
  if (rec.version !== ACCOUNT_VERSION) {
    throw new Error(`unsupported account version: ${String(rec.version)}`);
  }
  if (rec.kind !== "guest" && rec.kind !== "bound") {
    throw new Error("account kind invalid");
  }
  if (typeof rec.id !== "string" || rec.id.trim() === "") {
    throw new Error("account id required");
  }
  if (typeof rec.createdAt !== "string") {
    throw new Error("account createdAt required");
  }
  return {
    version: ACCOUNT_VERSION,
    kind: rec.kind,
    id: rec.id,
    createdAt: rec.createdAt,
    provider:
      rec.provider === "apple" ||
      rec.provider === "phone" ||
      rec.provider === "email" ||
      rec.provider === "wechat"
        ? rec.provider
        : undefined,
    label: typeof rec.label === "string" ? rec.label : undefined,
    boundAt: typeof rec.boundAt === "string" ? rec.boundAt : undefined,
  };
}
