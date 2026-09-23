import { describe, expect, it } from "vitest";
import {
  accountDisplayName,
  attachRemoteSession,
  bindFromAppleCredential,
  bindLocalAccount,
  createGuestAccount,
  emailFromAppleIdentityToken,
  mergeAppleLabel,
  parseLocalAccount,
  releaseToGuest,
  stringifyLocalAccount,
  type AccountIds,
} from "./identity.js";

function ids(): AccountIds {
  let n = 0;
  return { nextId: () => `acc-${++n}` };
}

describe("FR-100 本机身份", () => {
  it("游客绑定后 id 不变，退出仍是同一 id", () => {
    const guest = createGuestAccount("2026-09-12T15:00:00.000Z", ids());
    expect(guest.kind).toBe("guest");
    expect(accountDisplayName(guest)).toBe("游客");
    const bound = bindLocalAccount(
      guest,
      "apple",
      "2026-09-12T15:01:00.000Z",
    );
    expect(bound.id).toBe(guest.id);
    expect(bound.kind).toBe("bound");
    expect(bound.provider).toBe("apple");
    expect(accountDisplayName(bound)).toBe("Apple");
    const guestAgain = releaseToGuest(bound);
    expect(guestAgain.id).toBe(guest.id);
    expect(guestAgain.kind).toBe("guest");
    expect(guestAgain.provider).toBeUndefined();
    expect(guestAgain.providerSubject).toBeUndefined();
  });

  it("Apple credential 写入 subject，空 user 不绑定", () => {
    const guest = createGuestAccount("2026-09-16T01:00:00.000Z", ids());
    const bound = bindFromAppleCredential(guest, "2026-09-16T01:01:00.000Z", {
      user: "001234.abcd",
      email: "a@privaterelay.appleid.com",
      fullName: { givenName: "三", familyName: "张" },
    });
    expect(bound.kind).toBe("bound");
    expect(bound.id).toBe(guest.id);
    expect(bound.provider).toBe("apple");
    expect(bound.providerSubject).toBe("001234.abcd");
    expect(bound.label).toBe("张三");
    expect(accountDisplayName(bound)).toBe("张三");
    const latin = bindFromAppleCredential(guest, "2026-09-16T01:01:00.000Z", {
      user: "001234.abcd",
      fullName: { givenName: "Xavier", familyName: "Go" },
    });
    expect(latin.label).toBe("Go Xavier");
    expect(mergeAppleLabel("x@privaterelay.appleid.com", "张三")).toBe("张三");
    expect(mergeAppleLabel(undefined, "Apple")).toBeUndefined();
    const payload = btoa(JSON.stringify({ email: "x@privaterelay.appleid.com" }))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    expect(emailFromAppleIdentityToken(`aaa.${payload}.bbb`)).toBe(
      "x@privaterelay.appleid.com",
    );
    const round = parseLocalAccount(stringifyLocalAccount(bound));
    expect(round.providerSubject).toBe("001234.abcd");
    expect(() =>
      bindFromAppleCredential(guest, "2026-09-16T01:02:00.000Z", { user: "  " }),
    ).toThrow(/apple credential user required/);
  });

  it("JSON 往返保留 id，不要求课表一起改写", () => {
    const guest = createGuestAccount("2026-09-12T15:00:00.000Z", ids());
    const bound = bindLocalAccount(
      guest,
      "email",
      "2026-09-12T15:02:00.000Z",
      "a@b.com",
    );
    const round = parseLocalAccount(stringifyLocalAccount(bound));
    expect(round).toEqual(bound);
    expect(round.id).toBe(guest.id);
  });

  it("服务器会话写入后，退出不再带着凭证", () => {
    const guest = createGuestAccount("2026-09-18T15:00:00.000Z", ids());
    const bound = attachRemoteSession(guest, "2026-09-18T15:01:00.000Z", {
      provider: "email",
      remoteUserId: "user-1",
      sessionToken: "token-1",
      label: "a@b.com",
    });
    expect(bound.remoteUserId).toBe("user-1");
    expect(bound.sessionToken).toBe("token-1");
    expect(bound.id).toBe(guest.id);
    const round = parseLocalAccount(stringifyLocalAccount(bound));
    expect(round.sessionToken).toBe("token-1");
    const guestAgain = releaseToGuest(bound);
    expect(guestAgain.remoteUserId).toBeUndefined();
    expect(guestAgain.sessionToken).toBeUndefined();
    expect(guestAgain.kind).toBe("guest");
  });
});
