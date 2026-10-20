import { createHmac, timingSafeEqual } from "node:crypto";
import { SESSION_TTL_MS } from "@fitness-coach/core";

export function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function signSession(
  userId: string,
  expiresAt: string,
  secret: string,
): string {
  const body = Buffer.from(JSON.stringify({ userId, expiresAt }), "utf8").toString(
    "base64url",
  );
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function openSession(
  token: string,
  secret: string,
  now: string,
  stillValid: (expiresAt: string, now: string) => boolean,
): string | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (!sameSecret(sig, expected)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as { userId?: unknown; expiresAt?: unknown };
    if (typeof parsed.userId !== "string" || typeof parsed.expiresAt !== "string") {
      return null;
    }
    if (!stillValid(parsed.expiresAt, now)) return null;
    return parsed.userId;
  } catch {
    return null;
  }
}

export function sessionExpiry(now: string): string {
  return new Date(Date.parse(now) + SESSION_TTL_MS).toISOString();
}
