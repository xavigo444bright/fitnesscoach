import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LEN = 32;

/** scrypt 哈希。返回值可以落盘；明文不要落盘。 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, KEY_LEN).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, encoded] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !encoded) return false;
  const actual = scryptSync(password, salt, KEY_LEN);
  const expected = Buffer.from(encoded, "base64url");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function newResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
