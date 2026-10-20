import { describe, expect, it } from "vitest";
import { emptyDirectory } from "@fitness-coach/core";
import { createAuthHandler, type AuthResponse } from "./handler.js";

function harness() {
  let n = 0;
  let now = "2026-09-18T15:00:00.000Z";
  const saved: unknown[] = [];
  const handle = createAuthHandler({
    directory: emptyDirectory(),
    save: (dir) => {
      saved.push(JSON.parse(JSON.stringify(dir)) as unknown);
    },
    now: () => now,
    ids: { nextId: () => `user-${++n}` },
    sessionSecret: "secret",
    verifyApple: async (token) =>
      token === "good-apple" ? { sub: "apple-sub", email: "a@b.com" } : null,
  });
  return {
    handle,
    saved,
    setNow: (value: string) => {
      now = value;
    },
  };
}

function userId(result: AuthResponse): string {
  const user = result.body.user as { id: string };
  return user.id;
}

describe("账号服务", () => {
  it("注册只存密码哈希，登录是同一人，错密码不发会话", async () => {
    const { handle, saved } = harness();
    const registered = await handle({
      method: "POST",
      path: "/v1/auth/register",
      body: { username: "Ada", password: "correct-horse" },
    });
    expect(registered.status).toBe(200);
    expect(registered.body.deviceResetToken).toEqual(expect.any(String));
    expect(JSON.stringify(saved)).not.toContain("correct-horse");
    const stored = JSON.stringify(saved);
    expect(stored).toContain("scrypt:");

    const wrong = await handle({
      method: "POST",
      path: "/v1/auth/login",
      body: { username: "ada", password: "nope-nope" },
    });
    expect(wrong.status).toBe(401);
    expect(wrong.body.reason).toBe("mismatch");

    const again = await handle({
      method: "POST",
      path: "/v1/auth/login",
      body: { username: "ada", password: "correct-horse" },
    });
    expect(again.status).toBe(200);
    expect(userId(again)).toBe(userId(registered));

    const me = await handle({
      method: "GET",
      path: "/v1/me",
      authorization: `Bearer ${String(again.body.token)}`,
    });
    expect(me.status).toBe(200);
    expect((me.body.user as { username: string }).username).toBe("Ada");
    expect(me.body.user).not.toHaveProperty("passwordHash");

    const mail = await handle({
      method: "POST",
      path: "/v1/auth/register",
      body: { username: "user@example.com", password: "correct-horse" },
    });
    expect(mail.status).toBe(200);
    expect((mail.body.user as { username: string }).username).toBe("user@example.com");
  });

  it("用户名重复或密码太短都不发会话", async () => {
    const { handle, saved } = harness();
    const short = await handle({
      method: "POST",
      path: "/v1/auth/register",
      body: { username: "Ada", password: "short" },
    });
    expect(short.status).toBe(400);
    expect(saved).toHaveLength(0);

    await handle({
      method: "POST",
      path: "/v1/auth/register",
      body: { username: "Ada", password: "correct-horse" },
    });
    const conflict = await handle({
      method: "POST",
      path: "/v1/auth/register",
      body: { username: "ada", password: "another-one" },
    });
    expect(conflict.status).toBe(409);
  });

  it("本机改密凭证能换新密码，旧凭证和旧密码失效", async () => {
    const { handle } = harness();
    const registered = await handle({
      method: "POST",
      path: "/v1/auth/register",
      body: { username: "Ada", password: "correct-horse" },
    });
    const resetToken = String(registered.body.deviceResetToken);
    const reset = await handle({
      method: "POST",
      path: "/v1/auth/password",
      body: { resetToken, password: "brand-new-pass" },
    });
    expect(reset.status).toBe(200);
    const stale = await handle({
      method: "POST",
      path: "/v1/auth/password",
      body: { resetToken, password: "third-password" },
    });
    expect(stale.status).toBe(401);
    const oldPassword = await handle({
      method: "POST",
      path: "/v1/auth/login",
      body: { username: "Ada", password: "correct-horse" },
    });
    expect(oldPassword.status).toBe(401);
    const next = await handle({
      method: "POST",
      path: "/v1/auth/login",
      body: { username: "Ada", password: "brand-new-pass" },
    });
    expect(next.status).toBe(200);
    expect(userId(next)).toBe(userId(registered));
  });

  it("Apple 凭证通过后记下用户，拒绝的凭证不发会话", async () => {
    const { handle } = harness();
    const apple = await handle({
      method: "POST",
      path: "/v1/auth/apple",
      body: { identityToken: "good-apple", displayName: "张三" },
    });
    expect(apple.status).toBe(200);
    expect(apple.body.deviceResetToken).toEqual(expect.any(String));
    const again = await handle({
      method: "POST",
      path: "/v1/auth/apple",
      body: { identityToken: "good-apple" },
    });
    expect(userId(again)).toBe(userId(apple));
    const rejected = await handle({
      method: "POST",
      path: "/v1/auth/apple",
      body: { identityToken: "nope" },
    });
    expect(rejected.status).toBe(401);
  });

  it("本机改密凭证能让没有密码的 Apple 用户回到同一账号", async () => {
    const { handle } = harness();
    const apple = await handle({
      method: "POST",
      path: "/v1/auth/apple",
      body: { identityToken: "good-apple", displayName: "张三" },
    });
    const resetToken = String(apple.body.deviceResetToken);
    const resumed = await handle({
      method: "POST",
      path: "/v1/auth/device",
      body: { resetToken },
    });
    expect(resumed.status).toBe(200);
    expect(userId(resumed)).toBe(userId(apple));
    const stale = await handle({
      method: "POST",
      path: "/v1/auth/device",
      body: { resetToken },
    });
    expect(stale.status).toBe(401);
  });

  it("过期会话不能读用户，验证码和微信入口已关闭", async () => {
    const { handle, setNow } = harness();
    const registered = await handle({
      method: "POST",
      path: "/v1/auth/register",
      body: { username: "Ada", password: "correct-horse" },
    });
    setNow("2027-01-01T00:00:00.000Z");
    const me = await handle({
      method: "GET",
      path: "/v1/me",
      authorization: `Bearer ${String(registered.body.token)}`,
    });
    expect(me.status).toBe(401);
    const email = await handle({
      method: "POST",
      path: "/v1/auth/email/start",
      body: { email: "a@b.com" },
    });
    expect(email.status).toBe(404);
    const wechat = await handle({
      method: "POST",
      path: "/v1/auth/wechat",
      body: { code: "x" },
    });
    expect(wechat.status).toBe(404);
  });

  it("健康检查不需要登录", async () => {
    const { handle } = harness();
    const health = await handle({ method: "GET", path: "/v1/health" });
    expect(health.status).toBe(200);
    expect(health.body.ok).toBe(true);
  });

  it("能抽出用户名干扰项，改密页留言能记下", async () => {
    const notes: unknown[] = [];
    let n = 0;
    const handle = createAuthHandler({
      directory: emptyDirectory(),
      save: () => {},
      now: () => "2026-09-21T00:00:00.000Z",
      ids: { nextId: () => `id-${++n}` },
      sessionSecret: "secret",
      verifyApple: async () => null,
      saveSupport: (items) => {
        notes.push(...items);
      },
    });
    await handle({
      method: "POST",
      path: "/v1/auth/register",
      body: { username: "Ada", password: "correct-horse" },
    });
    const decoys = await handle({ method: "GET", path: "/v1/auth/decoys" });
    expect(decoys.status).toBe(200);
    expect(decoys.body.names).toEqual(expect.arrayContaining(["Ada"]));
    const sent = await handle({
      method: "POST",
      path: "/v1/support/messages",
      body: { body: "要恢复另一个号", fromLabel: "Ada" },
    });
    expect(sent.status).toBe(200);
    expect(notes).toHaveLength(1);
  });
});
