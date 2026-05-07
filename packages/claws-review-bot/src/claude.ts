import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface InvokeClaudeOptions {
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
}

export async function invokeClaude(
  opts: InvokeClaudeOptions
): Promise<string> {
  const tmp = mkdtempSync(join(tmpdir(), "claws-review-bot-"));
  const sysPath = join(tmp, "system.md");
  writeFileSync(sysPath, opts.systemPrompt, "utf8");

  try {
    return await new Promise<string>((resolve, reject) => {
      const proc = spawn(
        "claude",
        ["--print", "--append-system-prompt", `@${sysPath}`],
        { stdio: ["pipe", "pipe", "pipe"] }
      );

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      const timeout = opts.timeoutMs ?? 30 * 60 * 1000;
      const timer = setTimeout(() => {
        proc.kill("SIGKILL");
        reject(new Error(`claude invocation timed out after ${timeout}ms`));
      }, timeout);

      proc.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`claude exited with code ${code}: ${stderr}`));
          return;
        }
        resolve(stdout);
      });

      proc.stdin.write(opts.userPrompt);
      proc.stdin.end();
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
