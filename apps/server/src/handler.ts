import {
  applyUserSecrets,
  createUsernameUser,
  directoryLoginNames,
  findResetTokenUser,
  findUsernameUser,
  passwordAcceptable,
  pickNameDecoys,
  sessionStillValid,
  upsertDirectoryUser,
  type DirectoryUser,
  type UserDirectory,
} from "@fitness-coach/core";
import { hashPassword, hashResetToken, newResetToken, verifyPassword } from "./passwords.js";
import { openSession, sessionExpiry, signSession } from "./tokens.js";

export type PublicUser = {
  id: string;
  username?: string;
  email?: string;
  phone?: string;
  displayName?: string;
};

export type AuthRequest = {
  method: string;
  path: string;
  body?: unknown;
  authorization?: string;
};

export type AuthResponse = {
  status: number;
  body: Record<string, unknown>;
};

export type AppleCheck = {
  sub: string;
  email?: string;
};

export type SupportNote = {
  id: string;
  createdAt: string;
  fromLabel?: string;
  userId?: string;
  body: string;
};

export type AuthDeps = {
  directory: UserDirectory;
  save: (dir: UserDirectory) => void;
  now: () => string;
  ids: { nextId: () => string };
  sessionSecret: string;
  verifyApple: (identityToken: string) => Promise<AppleCheck | null>;
  saveSupport?: (notes: SupportNote[]) => void;
};

function publicUser(user: DirectoryUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
  };
}

function fail(status: number, reason: string): AuthResponse {
  return { status, body: { ok: false, reason } };
}

function readString(body: unknown, key: string): string {
  if (!body || typeof body !== "object") return "";
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function createAuthHandler(deps: AuthDeps) {
  let directory = deps.directory;
  const support: SupportNote[] = [];

  function commit(next: UserDirectory): void {
    directory = next;
    deps.save(next);
  }

  function issue(user: DirectoryUser): AuthResponse {
    const resetToken = newResetToken();
    const saved = applyUserSecrets(
      directory,
      user.id,
      { resetTokenHash: hashResetToken(resetToken) },
      deps.now(),
    );
    if (!saved) return fail(500, "failed");
    commit(saved.directory);
    const expiresAt = sessionExpiry(deps.now());
    const token = signSession(user.id, expiresAt, deps.sessionSecret);
    return {
      status: 200,
      body: {
        ok: true,
        token,
        expiresAt,
        user: publicUser(saved.user),
        deviceResetToken: resetToken,
      },
    };
  }

  return async function handle(input: AuthRequest): Promise<AuthResponse> {
    const method = input.method.toUpperCase();
    const path = input.path;

    if (method === "GET" && path === "/v1/health") {
      return { status: 200, body: { ok: true } };
    }

    if (method === "GET" && path === "/v1/me") {
      const header = input.authorization ?? "";
      const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
      const userId = token
        ? openSession(token, deps.sessionSecret, deps.now(), sessionStillValid)
        : null;
      if (!userId) return fail(401, "unauthorized");
      const user = directory.users.find((item) => item.id === userId);
      if (!user) return fail(401, "unauthorized");
      return { status: 200, body: { ok: true, user: publicUser(user) } };
    }

    if (method === "GET" && path === "/v1/auth/decoys") {
      const names = pickNameDecoys(directoryLoginNames(directory), [], 5, deps.now());
      return { status: 200, body: { ok: true, names } };
    }

    if (method !== "POST") return fail(404, "not_found");

    if (path === "/v1/auth/register") {
      const username = readString(input.body, "username");
      const password = readString(input.body, "password");
      if (!passwordAcceptable(password)) return fail(400, "invalid_password");
      const created = createUsernameUser(directory, username, deps.now(), deps.ids);
      if (!created.ok) return fail(created.reason === "conflict" ? 409 : 400, created.reason);
      const hashed = applyUserSecrets(
        created.directory,
        created.user.id,
        { passwordHash: hashPassword(password) },
        deps.now(),
      );
      if (!hashed) return fail(500, "failed");
      commit(hashed.directory);
      return issue(hashed.user);
    }

    if (path === "/v1/auth/login") {
      const username = readString(input.body, "username");
      const password = readString(input.body, "password");
      const user = findUsernameUser(directory, username);
      if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
        return fail(401, "mismatch");
      }
      return issue(user);
    }

    if (path === "/v1/auth/device") {
      const resetToken = readString(input.body, "resetToken");
      if (!resetToken) return fail(400, "invalid");
      const user = findResetTokenUser(directory, hashResetToken(resetToken));
      if (!user) return fail(401, "unauthorized");
      return issue(user);
    }

    if (path === "/v1/auth/password") {
      const resetToken = readString(input.body, "resetToken");
      const password = readString(input.body, "password");
      if (!resetToken || !passwordAcceptable(password)) return fail(400, "invalid");
      const user = findResetTokenUser(directory, hashResetToken(resetToken));
      if (!user) return fail(401, "unauthorized");
      const hashed = applyUserSecrets(
        directory,
        user.id,
        { passwordHash: hashPassword(password) },
        deps.now(),
      );
      if (!hashed) return fail(500, "failed");
      commit(hashed.directory);
      return issue(hashed.user);
    }

    if (path === "/v1/auth/apple") {
      const identityToken = readString(input.body, "identityToken");
      if (identityToken.length === 0) return fail(400, "invalid");
      const checked = await deps.verifyApple(identityToken);
      if (!checked) return fail(401, "apple_rejected");
      const linked = upsertDirectoryUser(
        directory,
        {
          provider: "apple",
          appleSub: checked.sub,
          email: checked.email,
          displayName: readString(input.body, "displayName") || undefined,
        },
        deps.now(),
        deps.ids,
      );
      if (!linked.ok) return fail(409, linked.reason);
      commit(linked.directory);
      return issue(linked.user);
    }

    if (path === "/v1/support/messages") {
      const text = readString(input.body, "body").trim();
      if (text.length < 1 || text.length > 500) return fail(400, "invalid");
      const resetToken = readString(input.body, "resetToken");
      const user = resetToken
        ? findResetTokenUser(directory, hashResetToken(resetToken))
        : undefined;
      const fromLabel =
        readString(input.body, "fromLabel").trim() ||
        user?.username ||
        user?.displayName;
      const note: SupportNote = {
        id: deps.ids.nextId(),
        createdAt: deps.now(),
        body: text,
        ...(fromLabel ? { fromLabel } : {}),
        ...(user ? { userId: user.id } : {}),
      };
      support.push(note);
      deps.saveSupport?.(support.slice());
      return { status: 200, body: { ok: true } };
    }

    return fail(404, "not_found");
  };
}
