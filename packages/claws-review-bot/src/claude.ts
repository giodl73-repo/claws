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
  aoaiReasoningEffort?: ReasoningEffort;
  aoaiVerbosity?: Verbosity;
  aoaiMaxCompletionTokens?: number;
  /** prompt-cache hint for AOAI; stable string per static-prompt config so
   *  the system prompt prefix hits cache across calls. Cached tokens bill
   *  at ~10% of normal input rate. */
  promptCacheKey?: string;
}

const DEFAULT_RELAY = "http://127.0.0.1:8716";
const DEFAULT_AOAI_API_VERSION = "2025-01-01-preview";
const DEFAULT_REASONING_MAX_COMPLETION_TOKENS = 32000;
const DEFAULT_CHAT_MAX_COMPLETION_TOKENS = 8000;

export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
export type Verbosity = "low" | "medium" | "high";

export function isReasoningModel(deployment: string): boolean {
  // o-series (o1, o3-mini, o4-mini, etc.) and gpt-5+ are reasoning-tier
  // models that don't accept the temperature parameter and prefer
  // role:developer for system instructions. Match deployment names that
  // contain these tokens with or without the hyphen (e.g. reviewer-gpt5,
  // reviewer-o4, gpt-5.1-codex).
  return /(?:^|-)(?:o\d|gpt-?5(?:\.\d+)?)/i.test(deployment);
}

function readPositiveInt(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${raw}`);
  }
  return value;
}

function readEnum<T extends string>(
  name: string,
  allowed: readonly T[]
): T | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  if ((allowed as readonly string[]).includes(raw)) return raw as T;
  throw new Error(`${name} must be one of ${allowed.join(", ")}, got: ${raw}`);
}

export function buildAzureOpenAIChatBody(opts: {
  deployment: string;
  systemPrompt: string;
  userPrompt: string;
  promptCacheKey?: string;
  reasoningEffort?: ReasoningEffort;
  verbosity?: Verbosity;
  maxCompletionTokens?: number;
}): Record<string, unknown> {
  const reasoning = isReasoningModel(opts.deployment);
  const maxCompletionTokens =
    opts.maxCompletionTokens ??
    (reasoning
      ? DEFAULT_REASONING_MAX_COMPLETION_TOKENS
      : DEFAULT_CHAT_MAX_COMPLETION_TOKENS);

  const body: Record<string, unknown> = reasoning
    ? {
        messages: [
          { role: "developer", content: opts.systemPrompt },
          { role: "user", content: opts.userPrompt },
        ],
        max_completion_tokens: maxCompletionTokens,
        reasoning_effort: opts.reasoningEffort ?? "high",
      }
    : {
        messages: [
          { role: "system", content: opts.systemPrompt },
          { role: "user", content: opts.userPrompt },
        ],
        max_completion_tokens: maxCompletionTokens,
        temperature: 0.2,
      };

  if (reasoning && opts.verbosity) {
    body["verbosity"] = opts.verbosity;
  }

  if (opts.promptCacheKey) {
    body["prompt_cache_key"] = opts.promptCacheKey;
  }

  return body;
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
  const reasoningEffort =
    opts.aoaiReasoningEffort ??
    readEnum("AOAI_REASONING_EFFORT", ["none", "minimal", "low", "medium", "high", "xhigh"] as const);
  const verbosity =
    opts.aoaiVerbosity ??
    readEnum("AOAI_VERBOSITY", ["low", "medium", "high"] as const);
  const maxCompletionTokens =
    opts.aoaiMaxCompletionTokens ??
    readPositiveInt("AOAI_MAX_COMPLETION_TOKENS");

  if (!endpoint || !deployment || !apiKey) {
    throw new Error(
      `azure-openai backend requires AOAI_ENDPOINT, AOAI_DEPLOYMENT, AOAI_API_KEY (env vars or opts)`
    );
  }

  const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  // Reasoning deployments (GPT-5.x / o-series) use the reasoning request
  // shape; GPT-4.x style deployments keep the low-temperature chat shape.
  const body = buildAzureOpenAIChatBody({
    deployment,
    systemPrompt: opts.systemPrompt,
    userPrompt: opts.userPrompt,
    ...(opts.promptCacheKey ? { promptCacheKey: opts.promptCacheKey } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
    ...(verbosity ? { verbosity } : {}),
    ...(maxCompletionTokens ? { maxCompletionTokens } : {}),
  });

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
