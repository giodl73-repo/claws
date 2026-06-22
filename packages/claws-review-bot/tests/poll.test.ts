import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { listOpenPulls } from "../src/gh.js";
import { runPoll } from "../src/poll.js";
import { runTick } from "../src/tick.js";

vi.mock("../src/gh.js", () => ({
  listOpenPulls: vi.fn(),
}));

vi.mock("../src/tick.js", () => ({
  runTick: vi.fn(),
}));

let tempDirs: string[] = [];

afterEach(() => {
  vi.clearAllMocks();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("runPoll", () => {
  it("stops a poll cycle after the configured review budget is reached", async () => {
    const dir = mkdtempSync(join(tmpdir(), "claws-review-bot-"));
    tempDirs.push(dir);

    vi.mocked(listOpenPulls).mockReturnValue([
      {
        number: 1,
        title: "one",
        user: { login: "alice" },
        draft: false,
        updated_at: "2026-06-22T17:00:00Z",
        head: { sha: "1111111111111111" },
        base: { ref: "main" },
      },
      {
        number: 2,
        title: "two",
        user: { login: "bob" },
        draft: false,
        updated_at: "2026-06-22T17:01:00Z",
        head: { sha: "2222222222222222" },
        base: { ref: "main" },
      },
    ]);
    vi.mocked(runTick).mockResolvedValue({
      skipped: false,
      verdictBody: "reviewed",
      postedCommentId: 123,
    });

    await runPoll({
      repos: ["bic/lobster"],
      seenPath: join(dir, "seen.json"),
      onceOnly: true,
      postComments: true,
      maxReviewsPerCycle: 1,
    });

    expect(runTick).toHaveBeenCalledTimes(1);
    expect(runTick).toHaveBeenCalledWith({
      repo: "bic/lobster",
      num: 1,
      postComment: true,
    });
  });

  it("does not count skipped PRs against the review budget", async () => {
    const dir = mkdtempSync(join(tmpdir(), "claws-review-bot-"));
    tempDirs.push(dir);

    vi.mocked(listOpenPulls).mockReturnValue([
      {
        number: 1,
        title: "skip",
        user: { login: "alice" },
        draft: false,
        updated_at: "2026-06-22T17:00:00Z",
        head: { sha: "1111111111111111" },
        base: { ref: "main" },
      },
      {
        number: 2,
        title: "review",
        user: { login: "bob" },
        draft: false,
        updated_at: "2026-06-22T17:01:00Z",
        head: { sha: "2222222222222222" },
        base: { ref: "main" },
      },
    ]);
    vi.mocked(runTick)
      .mockResolvedValueOnce({ skipped: true, reason: "cheap skip" })
      .mockResolvedValueOnce({
        skipped: false,
        verdictBody: "reviewed",
        postedCommentId: 124,
      });

    await runPoll({
      repos: ["bic/lobster"],
      seenPath: join(dir, "seen.json"),
      onceOnly: true,
      postComments: true,
      maxReviewsPerCycle: 1,
    });

    expect(runTick).toHaveBeenCalledTimes(2);
  });
});
