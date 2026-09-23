import { describe, expect, it } from "vitest";
import {
  createUsernameUser,
  removeDirectoryUser,
  findUsernameUser,
  freshLoginCode,
  judgeLoginCode,
  normalizeEmail,
  normalizePhone,
  normalizeUsername,
  parseDirectory,
  sessionStillValid,
  stringifyDirectory,
  upsertDirectoryUser,
} from "./directory.js";

const NOW = "2026-09-18T15:00:00.000Z";

function ids() {
  let n = 0;
  return { nextId: () => `user-${++n}` };
}

describe("FR-100 账号目录", () => {
  it("邮箱规范化，非法邮箱不建用户", () => {
    expect(normalizeEmail("  A@B.COM ")).toBe("a@b.com");
    expect(normalizeEmail("nope")).toBeNull();
    expect(normalizePhone("+86 138-0013-8000")).toBe("13800138000");
    expect(normalizePhone("123")).toBeNull();
    const missed = upsertDirectoryUser(
      { users: [] },
      { provider: "email", value: "nope" },
      NOW,
      ids(),
    );
    expect(missed.ok).toBe(false);
  });

  it("同一邮箱回到同一用户，不建第二个", () => {
    const first = upsertDirectoryUser(
      { users: [] },
      { provider: "email", value: "A@b.com" },
      NOW,
      ids(),
    );
    if (!first.ok) throw new Error("expected user");
    const second = upsertDirectoryUser(
      first.directory,
      { provider: "email", value: "a@b.com" },
      "2026-09-18T16:00:00.000Z",
      ids(),
    );
    if (!second.ok) throw new Error("expected user");
    expect(second.created).toBe(false);
    expect(second.user.id).toBe(first.user.id);
    expect(second.directory.users).toHaveLength(1);
  });

  it("Apple 邮箱撞上已有邮箱则挂到同一人；另一 Apple 再占则冲突", () => {
    const email = upsertDirectoryUser(
      { users: [] },
      { provider: "email", value: "a@b.com" },
      NOW,
      ids(),
    );
    if (!email.ok) throw new Error("expected user");
    const apple = upsertDirectoryUser(
      email.directory,
      { provider: "apple", appleSub: "sub-1", email: "a@b.com", displayName: "张三" },
      NOW,
      ids(),
    );
    if (!apple.ok) throw new Error("expected user");
    expect(apple.created).toBe(false);
    expect(apple.user.id).toBe(email.user.id);
    expect(apple.user.appleSub).toBe("sub-1");
    const clash = upsertDirectoryUser(
      apple.directory,
      { provider: "apple", appleSub: "sub-2", email: "a@b.com" },
      NOW,
      ids(),
    );
    expect(clash.ok).toBe(false);
  });

  it("微信 openId 第二次仍是同一人", () => {
    const first = upsertDirectoryUser(
      { users: [] },
      { provider: "wechat", wechatOpenId: "openid-1" },
      NOW,
      ids(),
    );
    if (!first.ok) throw new Error("expected user");
    const second = upsertDirectoryUser(
      first.directory,
      { provider: "wechat", wechatOpenId: "openid-1" },
      NOW,
      ids(),
    );
    if (!second.ok) throw new Error("expected user");
    expect(second.user.id).toBe(first.user.id);
    expect(second.created).toBe(false);
  });

  it("验证码：对则过，错则扣次数，过期与锁死都不放行", () => {
    const state = freshLoginCode(NOW, 1000);
    expect(judgeLoginCode(state, true, NOW).ok).toBe(true);
    const wrong = judgeLoginCode(state, false, NOW);
    expect(wrong.ok).toBe(false);
    if (wrong.ok) return;
    expect(wrong.reason).toBe("mismatch");
    expect(wrong.attemptsLeft).toBe(4);
    const expired = judgeLoginCode(state, true, "2026-09-18T15:00:02.000Z");
    expect(expired.ok).toBe(false);
    if (!expired.ok) expect(expired.reason).toBe("expired");
    const locked = judgeLoginCode({ ...state, attemptsLeft: 0 }, true, NOW);
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.reason).toBe("locked");
  });

  it("登录名可以是邮箱，大小写不敏感，不发验证码", () => {
    expect(normalizeUsername("  Ada_1 ")).toBe("Ada_1");
    expect(normalizeUsername("807756840@qq.com")).toBe("807756840@qq.com");
    expect(normalizeUsername("No Space")).toBeNull();
    const made = createUsernameUser(
      { users: [] },
      "  Ada@QQ.com ",
      NOW,
      ids(),
    );
    if (!made.ok) throw new Error("expected user");
    expect(made.user.username).toBe("ada@qq.com");
    expect(made.user.email).toBe("ada@qq.com");
    const found = findUsernameUser(made.directory, "ADA@qq.com");
    expect(found?.id).toBe(made.user.id);
    const clash = createUsernameUser(made.directory, "ada@qq.com", NOW, ids());
    expect(clash.ok).toBe(false);
    expect(removeDirectoryUser(made.directory, made.user.id).users).toEqual([]);
  });

  it("目录 JSON 往返，会话过期可判断", () => {
    const made = upsertDirectoryUser(
      { users: [] },
      { provider: "phone", value: "13800138000" },
      NOW,
      ids(),
    );
    if (!made.ok) throw new Error("expected user");
    const round = parseDirectory(stringifyDirectory(made.directory));
    expect(round).toEqual(made.directory);
    expect(sessionStillValid("2026-09-19T15:00:00.000Z", NOW)).toBe(true);
    expect(sessionStillValid(NOW, NOW)).toBe(false);
    expect(() => parseDirectory("{}")).toThrow(/directory/);
  });
});
