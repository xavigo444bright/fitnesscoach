import { spawn } from "node:child_process";

export function argValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  return args[i + 1];
}

/** 重复出现的 `--flag a --flag b` 全部收下（不含逗号拆分）。 */
export function argValues(args: string[], name: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name && args[i + 1] != null && args[i + 1] !== "") {
      out.push(args[i + 1]!);
      i += 1;
    }
  }
  return out;
}

export function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

export function runCapture(
  cmd: string,
  args: string[],
  opts?: { cwd?: string; timeoutMs?: number },
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts?.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer =
      opts?.timeoutMs != null
        ? setTimeout(() => {
            child.kill("SIGTERM");
            reject(new Error(`${cmd} timed out after ${opts.timeoutMs}ms`));
          }, opts.timeoutMs)
        : null;
    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

export async function toolVersion(
  cmd: string,
  versionArgs: string[] = ["--version"],
): Promise<string | null> {
  try {
    const r = await runCapture(cmd, versionArgs, { timeoutMs: 15_000 });
    if (r.code !== 0) return null;
    const line = (r.stdout || r.stderr).trim().split("\n")[0];
    return line ?? null;
  } catch {
    return null;
  }
}

export function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

export function looksLikeDirectVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(u.pathname);
  } catch {
    return false;
  }
}

export function slugFromUrlOrPath(input: string): string {
  try {
    if (isHttpUrl(input)) {
      const u = new URL(input);
      const host = u.hostname.replace(/^www\./, "").replace(/\W+/g, "-");
      const leaf = pathLeaf(u.pathname).replace(/\.[^.]+$/, "") || "clip";
      return `${host}-${leaf}`.slice(0, 64);
    }
  } catch {
    /* fall through */
  }
  return pathLeaf(input)
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]+/g, "-")
    .slice(0, 64);
}

function pathLeaf(p: string): string {
  const parts = p.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? "source";
}
