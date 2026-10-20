import { createRemoteJWKSet, jwtVerify } from "jose";

const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

export async function verifyAppleIdentityToken(
  identityToken: string,
  audience: string,
): Promise<{ sub: string; email?: string } | null> {
  try {
    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience,
    });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}
