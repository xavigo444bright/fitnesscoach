import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findLatestInboxVideo } from "./inbox.js";

describe("findLatestInboxVideo", () => {
  const tmp = path.join(os.tmpdir(), `scout-inbox-${process.pid}`);

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("picks the newest matching scout-id mp4", async () => {
    await mkdir(tmp, { recursive: true });
    const older = path.join(tmp, "glute-bridge-side-01-2026-08-20T17-25-36.mp4");
    const newer = path.join(tmp, "glute-bridge-side-01-2026-08-21T00-00-00.mp4");
    await writeFile(older, "a");
    await writeFile(newer, "b");
    await new Promise((r) => setTimeout(r, 20));
    const { utimes } = await import("node:fs/promises");
    await utimes(older, 1, 1);
    await utimes(newer, 2, 2);
    expect(await findLatestInboxVideo(tmp, "glute-bridge-side-01")).toBe(newer);
  });

  it("ignores other scout ids", async () => {
    await mkdir(tmp, { recursive: true });
    await writeFile(path.join(tmp, "lunge-side-01-x.mp4"), "x");
    expect(await findLatestInboxVideo(tmp, "glute-bridge-side-01")).toBeNull();
  });
});
