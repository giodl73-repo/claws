import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface InvokeClaudeOptions {
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
  /** override LLM_BACKEND env var */
  backend?: "relay" | "azure-openai";
  /** for relay backend */
  relayUrl?: string;
  /** for azure-openai backend */
  aoaiEndpoint?: string;
  aoaiDeployment?: string;
  aoaiApiKey?: string;
  aoaiApiVersion?: string;
  /** prompt-cache hint for AOAI; stable string per static-prompt config so
   *  the system prompt prefix hits cache across calls. Cached tokens bill
   *  at ~10% of normal input rate. */
  promptCacheKey?: string;
}

const DEFAULT_RELAY = "http://127.0.0.1:8716";
const DEFAULT_AOAI_API_VERSION = "2025-01-01-preview";

function isReasoningModel(deployment: string): boolean {
  // o-series (o1, o3-mini, o4-mini, etc.) and gpt-5+ are reasoning-tier
  // models that don't accept the temperature parameter and prefer
  // role:developer for system instructions. Match deployment names that
  // contain these tokens with or without the hyphen (e.g. reviewer-gpt5,
  // reviewer-o4, gpt-5.1-codex).
  return /(?:^|-)(?:o\d|gpt-?5(?:\.\d+)?)/i.test(deployment);
}

type RelayRunResp = { job_id: string };
type RelayStatusResp = { status: "running" | "done" | "failed" };
type RelayResultResp = {
  status: "running" | "done" | "failed";
  exit_code: number | null;
  stdout: string;
};

interface AOAIResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Invoke the LLM. Backend selected by `opts.backend` or env `LLM_BACKEND`
 * (default: `relay` for local dev, `azure-openai` in production).
 */
export async function invokeClaude(
  opts: InvokeClaudeOptions
): Promise<string> {
  const backend =
    opts.backend ?? (process.env["LLM_BACKEND"] as InvokeClaudeOptions["backend"]) ?? "relay";

  if (backend === "azure-openai") {
    return invokeAzureOpenAI(opts);
  }
  return invokeViaRelay(opts);
}

async function invokeAzureOpenAI(opts: InvokeClaudeOptions): Promise<string> {
  const endpoint = opts.aoaiEndpoint ?? process.env["AOAI_ENDPOINT"];
  const deployment = opts.aoaiDeployment ?? process.env["AOAI_DEPLOYMENT"];
  const apiKey = opts.aoaiApiKey ?? process.env["AOAI_API_KEY"];
  const apiVersion = opts.aoaiApiVersion ?? process.env["AOAI_API_VERSION"] ?? DEFAULT_AOAI_API_VERSION;

  if (!endpoint || !deployment || !apiKey) {
    throw new Error(
      `azure-openai backend requires AOAI_ENDPOINT, AOAI_DEPLOYMENT, AOAI_API_KEY (env vars or opts)`
    );
  }

  const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const reasoning = isReasoningModel(deployment);

  // Reasoning models (o-series) require role:developer for system-tier
  // instructions and don't accept the temperature parameter; non-reasoning
  // models (gpt-4.x) use the conventional role:system + temperature shape.
  const body: Record<string, unknown> = reasoning
    ? {
        messages: [
          { role: "developer", content: opts.systemPrompt },
          { role: "user", content: opts.userPrompt },
        ],
        max_completion_tokens: 32000,
        reasoning_effort: "high",
      }
    : {
        messages: [
          { role: "system", content: opts.systemPrompt },
          { role: "user", content: opts.userPrompt },
        ],
        max_completion_tokens: 8000,
        temperature: 0.2,
      };

  if (opts.promptCacheKey) {
    body["prompt_cache_key"] = opts.promptCacheKey;
  }

  const timeout = opts.timeoutMs ?? 30 * 60 * 1000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`AOAI request failed: ${resp.status} ${text}`);
    }

    const data = (await resp.json()) as AOAIResponse;
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error(`AOAI response had no choices: ${JSON.stringify(data)}`);
    }

    if (data.usage) {
      console.error(
        `[llm] AOAI usage: prompt=${data.usage.prompt_tokens} completion=${data.usage.completion_tokens} total=${data.usage.total_tokens}`
      );
    }

    return choice.message.content;
  } finally {
    clearTimeout(timer);
  }
}

async function invokeViaRelay(opts: InvokeClaudeOptions): Promise<string> {
  const relay = opts.relayUrl ?? process.env["RELAY_URL"] ?? DEFAULT_RELAY;
  const tmp = mkdtempSync(join(tmpdir(), "claws-review-bot-"));

  const systemPath = join(tmp, "system.md");
  const userPath = join(tmp, "user.md");
  const launcherPath = join(tmp, "run.sh");

  writeFileSync(systemPath, opts.systemPrompt, "utf8");
  writeFileSync(userPath, opts.userPrompt, "utf8");

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
    const runJson = (await runResp.json()) as RelayRunResp;

    const timeout = opts.timeoutMs ?? 30 * 60 * 1000;
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5000));

      const statusResp = await fetch(`${relay}/status/${runJson.job_id}`);
      if (!statusResp.ok) {
        throw new Error(
          `relay /status failed: ${statusResp.status} ${await statusResp.text()}`
        );
      }
      const status = (await statusResp.json()) as RelayStatusResp;
      if (status.status === "done" || status.status === "failed") {
        const resultResp = await fetch(`${relay}/result/${runJson.job_id}`);
        if (!resultResp.ok) {
          throw new Error(
            `relay /result failed: ${resultResp.status} ${await resultResp.text()}`
          );
        }
        const result = (await resultResp.json()) as RelayResultResp;
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
