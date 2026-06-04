import { describe, expect, it } from "vitest";
import { buildAzureOpenAIChatBody, isReasoningModel } from "./claude.js";

describe("isReasoningModel", () => {
  it("recognizes GPT-5.5 deployment names", () => {
    expect(isReasoningModel("reviewer-gpt-5.5")).toBe(true);
    expect(isReasoningModel("gpt-5.5")).toBe(true);
    expect(isReasoningModel("reviewer-gpt5")).toBe(true);
  });

  it("does not classify GPT-4.x deployments as reasoning models", () => {
    expect(isReasoningModel("coder-gpt-4.1-mini")).toBe(false);
  });
});

describe("buildAzureOpenAIChatBody", () => {
  it("uses the GPT-5.5 reasoning chat shape", () => {
    const body = buildAzureOpenAIChatBody({
      deployment: "reviewer-gpt-5.5",
      systemPrompt: "system",
      userPrompt: "user",
      promptCacheKey: "cache-key",
      reasoningEffort: "xhigh",
      verbosity: "high",
      maxCompletionTokens: 128000,
    });

    expect(body).toEqual({
      messages: [
        { role: "developer", content: "system" },
        { role: "user", content: "user" },
      ],
      max_completion_tokens: 128000,
      reasoning_effort: "xhigh",
      verbosity: "high",
      prompt_cache_key: "cache-key",
    });
  });

  it("keeps legacy chat deployments on the temperature shape", () => {
    const body = buildAzureOpenAIChatBody({
      deployment: "coder-gpt-4.1-mini",
      systemPrompt: "system",
      userPrompt: "user",
    });

    expect(body).toEqual({
      messages: [
        { role: "system", content: "system" },
        { role: "user", content: "user" },
      ],
      max_completion_tokens: 8000,
      temperature: 0.2,
    });
  });
});
