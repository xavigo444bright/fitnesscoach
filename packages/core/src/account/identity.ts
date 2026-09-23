/**
 * FR-100 本机身份。课表仍不上传（FR-101 不做）。
 * 用户名和密码哈希只在这台手机，不经过自建服务器。
 */

export const ACCOUNT_VERSION = 1 as const;

export type AccountProvider = "apple" | "phone" | "email" | "wechat" | "username";

export type LocalAccount = {
  version: typeof ACCOUNT_VERSION;
  kind: "guest" | "bound";
  id: string;
  provider?: AccountProvider;
  label?: string;
  /** Apple user 等提供商稳定 id。 */
  providerSubject?: string;
  /** 服务器用户 id。没有则只是本机绑定。 */
  remoteUserId?: string;
  /** 服务器签发的登录凭证。 */
  sessionToken?: string;
  createdAt: string;
  boundAt?: string;
};

export type AppleNameParts = {
  email?: string | null;
  givenName?: string | null;
  familyName?: string | null;
};

function cleanApplePart(value: string | null | undefined): string | undefined {
  const text = value?.trim();
  if (!text || text === "Apple") return undefined;
  return text;
}

function joinAppleName(family?: string, given?: string): string {
  const parts = [family, given].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return "";
  const latin = parts.every((part) => /^[A-Za-z][A-Za-z .'-]*$/.test(part));
  return latin ? parts.join(" ") : parts.join("");
}

export function appleAccountLabel(parts: AppleNameParts): string | undefined {
  const name = joinAppleName(
    cleanApplePart(parts.familyName),
    cleanApplePart(parts.givenName),
  );
  if (name.length > 0) return name;
  return cleanApplePart(parts.email)?.includes("@")
    ? cleanApplePart(parts.email)
    : undefined;
}

/**
 * 姓名优先于邮箱，已记下的姓名优先于这次没再带来的邮箱。
 * 「Apple」是占位，不当成账号名。
 */
export function mergeAppleLabel(
  incoming: string | null | undefined,
  saved: string | null | undefined,
): string | undefined {
  const next = cleanApplePart(incoming);
  const prev = cleanApplePart(saved);
  const nextIsName = Boolean(next && !next.includes("@"));
  const prevIsName = Boolean(prev && !prev.includes("@"));
  if (nextIsName) return next;
  if (prevIsName) return prev;
  return next ?? prev;
}

/** 只为了显示。身份以系统登录框为准，这里不校验签名。 */
export function emailFromAppleIdentityToken(
  token: string | null | undefined,
): string | undefined {
  const segment = token?.split(".")[1];
  if (!segment) return undefined;
  try {
    const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const json = globalThis.atob(padded + pad);
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || !("email" in parsed)) return undefined;
    const email = (parsed as { email?: unknown }).email;
    return typeof email === "string" ? cleanApplePart(email) : undefined;
  } catch {
    return undefined;
  }
}

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
  providerSubject?: string,
): LocalAccount {
  const trimmed = label?.trim();
  const subject = providerSubject?.trim();
  return {
    ...account,
    kind: "bound",
    provider,
    label: trimmed && trimmed.length > 0 ? trimmed : undefined,
    providerSubject: subject && subject.length > 0 ? subject : undefined,
    boundAt: now,
  };
}

export type AppleCredentialInput = {
  user: string;
  email?: string | null;
  fullName?: {
    givenName?: string | null;
    familyName?: string | null;
  } | null;
};

/** 系统框成功后的本机绑定。user 空则失败，不写绑定。 */
export function bindFromAppleCredential(
  account: LocalAccount,
  now: string,
  cred: AppleCredentialInput,
): LocalAccount {
  const user = cred.user.trim();
  if (user.length === 0) {
    throw new Error("apple credential user required");
  }
  return bindLocalAccount(
    account,
    "apple",
    now,
    appleAccountLabel({
      email: cred.email,
      givenName: cred.fullName?.givenName,
      familyName: cred.fullName?.familyName,
    }),
    user,
  );
}

/** 服务器认人之后写入本机。不改课表文件。 */
export function attachRemoteSession(
  account: LocalAccount,
  now: string,
  input: {
    provider: AccountProvider;
    remoteUserId: string;
    sessionToken: string;
    label?: string;
    providerSubject?: string;
  },
): LocalAccount {
  const remoteUserId = input.remoteUserId.trim();
  const sessionToken = input.sessionToken.trim();
  if (remoteUserId.length === 0 || sessionToken.length === 0) {
    throw new Error("remote session required");
  }
  return {
    ...bindLocalAccount(
      account,
      input.provider,
      now,
      input.label,
      input.providerSubject ?? remoteUserId,
    ),
    remoteUserId,
    sessionToken,
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
  if (account.provider === "username") return "用户名";
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
    providerSubject?: unknown;
    remoteUserId?: unknown;
    sessionToken?: unknown;
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
      rec.provider === "wechat" ||
      rec.provider === "username"
        ? rec.provider
        : undefined,
    label: typeof rec.label === "string" ? rec.label : undefined,
    providerSubject:
      typeof rec.providerSubject === "string" && rec.providerSubject.trim() !== ""
        ? rec.providerSubject
        : undefined,
    remoteUserId:
      typeof rec.remoteUserId === "string" && rec.remoteUserId.trim() !== ""
        ? rec.remoteUserId
        : undefined,
    sessionToken:
      typeof rec.sessionToken === "string" && rec.sessionToken.trim() !== ""
        ? rec.sessionToken
        : undefined,
    boundAt: typeof rec.boundAt === "string" ? rec.boundAt : undefined,
  };
}
