import { describe, expect, it } from "vitest";
import {
  accountDisplayName,
  bindLocalAccount,
  createGuestAccount,
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
});
