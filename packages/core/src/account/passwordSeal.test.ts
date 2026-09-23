import { describe, expect, it } from "vitest";
import { localPasswordMatches, sealLocalPassword, sha256Hex } from "./passwordSeal.js";

describe("本机密码封印", () => {
  it("sha256 对齐空串和 abc", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("封印不含明文，对了才通过", () => {
    const sealed = sealLocalPassword("correct-horse", "salt-1");
    expect(sealed.includes("correct-horse")).toBe(false);
    expect(localPasswordMatches("correct-horse", sealed)).toBe(true);
    expect(localPasswordMatches("wrong-horse", sealed)).toBe(false);
    expect(localPasswordMatches("correct-horse", "scrypt:aa:bb")).toBe(false);
  });
});
