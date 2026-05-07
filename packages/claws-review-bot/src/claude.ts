import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface InvokeClaudeOptions {
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
  relayUrl?: string;
}

interface RunResponse {
  job_id: string;
  script: string;
  started_at: string;
}

interface StatusResponse {
  job_id: string;
  status: "running" | "done" | "failed";
  exit_code: number | null;
  last_lines: string[];
  elapsed_s: number;
}

interface ResultResponse {
  job_id: string;
  status: "running" | "done" | "failed";
  exit_code: number | null;
  stdout: string;
  duration_s: number | null;
}

const DEFAULT_RELAY = "http://127.0.0.1:8716";

/**
 * Invoke claude via the local relay (http://127.0.0.1:8716).
 *
 * The relay spawns subprocesses outside Claude Code's process tree so that
 * nested `claude --print` invocations work correctly. We can't call `claude`
 * directly from inside a Claude Code session — it sees CLAUDECODE in env and
 * refuses to run, or hangs.
 *
 * Flow: write prompts to a temp dir + a launcher .sh, POST to relay, poll
 * until done, GET result.
 */
export async function invokeClaude(
  opts: InvokeClaudeOptions
): Promise<string> {
  const relay = opts.relayUrl ?? DEFAULT_RELAY;
  const tmp = mkdtempSync(join(tmpdir(), "claws-review-bot-"));

  const systemPath = join(tmp, "system.md");
  const userPath = join(tmp, "user.md");
  const launcherPath = join(tmp, "run.sh");

  writeFileSync(systemPath, opts.systemPrompt, "utf8");
  writeFileSync(userPath, opts.userPrompt, "utf8");

  // Launcher reads prompts from the same dir it lives in. This avoids passing
  // long content as args (would hit OS arg-size limits on big diffs).
  const launcher = [
    `#!/usr/bin/env bash`,
    `set -euo pipefail`,
    `dir="$(cd "$(dirname "$0")" && pwd)"`,
    `cat "$dir/user.md" | claude --print --append-system-prompt "@$dir/system.md"`,
  ].join("\n");
  writeFileSync(launcherPath, launcher, "utf8");

  try {
    const runResp = await fetch(`${relay}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script: launcherPath }),
    });
    if (!runResp.ok) {
      throw new Error(
        `relay /run failed: ${runResp.status} ${await runResp.text()}`
      );
    }
    const { job_id } = (await runResp.json()) as RunResponse;

    const timeout = opts.timeoutMs ?? 30 * 60 * 1000;
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5000));

      const statusResp = await fetch(`${relay}/status/${job_id}`);
      if (!statusResp.ok) {
        throw new Error(
          `relay /status failed: ${statusResp.status} ${await statusResp.text()}`
        );
      }
      const status = (await statusResp.json()) as StatusResponse;
      if (status.status === "done" || status.status === "failed") {
        const resultResp = await fetch(`${relay}/result/${job_id}`);
        if (!resultResp.ok) {
          throw new Error(
            `relay /result failed: ${resultResp.status} ${await resultResp.text()}`
          );
        }
        const result = (await resultResp.json()) as ResultResponse;
        if (status.status === "failed") {
          throw new Error(
            `claude (via relay) exited with code ${result.exit_code}; stdout:\n${result.stdout}`
          );
        }
        return result.stdout;
      }
    }

    throw new Error(`claude invocation timed out after ${timeout}ms`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
