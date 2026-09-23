import { describe, expect, it } from "vitest";
import {
  dropDeviceLogins,
  lastDeviceLogin,
  parseDeviceLoginStore,
  upsertDeviceLogin,
} from "./deviceRecord.js";

describe("本机登录记录", () => {
  it("旧的单条 JSON 能读成上次登录", () => {
    const store = parseDeviceLoginStore(
      JSON.stringify({ userId: "u1", username: "Ada", resetToken: "tok" }),
      "2026-09-21T00:00:00.000Z",
    );
    expect(store.records).toHaveLength(1);
    expect(lastDeviceLogin(store)?.username).toBe("Ada");
  });

  it("多账号默认最后写入的那个", () => {
    let store = parseDeviceLoginStore("{}", "2026-09-21T00:00:00.000Z");
    store = upsertDeviceLogin(store, {
      userId: "u1",
      username: "Ada",
      resetToken: "a",
      lastUsedAt: "2026-09-20T00:00:00.000Z",
    });
    store = upsertDeviceLogin(store, {
      userId: "u2",
      username: "Bob",
      resetToken: "b",
      lastUsedAt: "2026-09-21T00:00:00.000Z",
    });
    expect(lastDeviceLogin(store)?.username).toBe("Bob");
    expect(store.records).toHaveLength(2);
    const dropped = dropDeviceLogins(store, (item) => item.userId === "u2");
    expect(dropped.records.map((item) => item.username)).toEqual(["Ada"]);
    expect(lastDeviceLogin(dropped)?.username).toBe("Ada");
  });
});
