import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAuthHandler } from "./handler.js";
import { verifyAppleIdentityToken } from "./apple.js";
import { readDirectoryFile, writeDirectoryFile, writeSupportFile } from "./store.js";

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 8192) {
        reject(new Error("too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown);
      } catch {
        reject(new Error("bad_json"));
      }
    });
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(raw),
  });
  res.end(raw);
}

const dataFile =
  process.env.AUTH_DATA_FILE ??
  join(dirname(fileURLToPath(import.meta.url)), "../data/users.json");
const supportFile =
  process.env.AUTH_SUPPORT_FILE ??
  join(dirname(fileURLToPath(import.meta.url)), "../data/support.json");
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";
const audience = process.env.APPLE_AUDIENCE ?? "com.Myfitco.mobile";

const handle = createAuthHandler({
  directory: readDirectoryFile(dataFile),
  save: (dir) => writeDirectoryFile(dataFile, dir),
  now: () => new Date().toISOString(),
  ids: (() => {
    let n = 0;
    return { nextId: () => `user-${Date.now().toString(36)}-${++n}` };
  })(),
  sessionSecret: process.env.AUTH_SESSION_SECRET ?? "dev-session-secret",
  verifyApple: (token) => verifyAppleIdentityToken(token, audience),
  saveSupport: (notes) => writeSupportFile(supportFile, notes),
});

const server = createServer((req, res) => {
  void (async () => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const body = req.method === "GET" ? undefined : await readBody(req);
      const result = await handle({
        method: req.method ?? "GET",
        path: url.pathname,
        body,
        authorization: req.headers.authorization,
      });
      send(res, result.status, result.body);
    } catch (err) {
      const reason = err instanceof Error && err.message === "bad_json" ? "invalid" : "failed";
      send(res, 400, { ok: false, reason });
    }
  })();
});

server.listen(port, host, () => {
  console.log(`auth listening on ${port}, users ${dataFile}`);
});
