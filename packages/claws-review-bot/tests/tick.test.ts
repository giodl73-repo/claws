import { describe, expect, it, vi } from "vitest";

import { PullDiffTooLargeError } from "../src/gh.js";
import { runTick } from "../src/tick.js";
import {
  getIssueComments,
  getPull,
  getPullDiff,
  listPrReviews,
} from "../src/gh.js";

vi.mock("../src/gh.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/gh.js")>();
  return {
    ...actual,
    getPull: vi.fn(),
    getPullDiff: vi.fn(),
    getIssueComments: vi.fn(),
    findPriorVerdict: vi.fn(() => null),
    postIssueComment: vi.fn(),
    submitPrReview: vi.fn(),
    listPrReviews: vi.fn(),
  };
});

vi.mock("../src/voice.js", () => ({
  loadVoice: vi.fn(() => "reviewer voice"),
}));

vi.mock("../src/claude.js", () => ({
  invokeClaude: vi.fn(),
}));

vi.mock("../src/storage.js", () => ({
  writeVerdictBlob: vi.fn(),
  extractMarker: vi.fn(() => "comment"),
  tryAcquirePrLock: vi.fn(),
  releasePrLock: vi.fn(),
}));

describe("runTick", () => {
  it("skips PRs whose diff exceeds the GHE API line limit", async () => {
    vi.mocked(getPull).mockReturnValue({
      number: 3023,
      title: "large refactor",
      user: { login: "author" },
      draft: false,
      updated_at: "2026-06-22T16:00:00Z",
      head: { sha: "abcdef1234567890" },
      base: { ref: "main" },
    });
    vi.mocked(getIssueComments).mockReturnValue([]);
    vi.mocked(listPrReviews).mockReturnValue([]);
    vi.mocked(getPullDiff).mockImplementation(() => {
      throw new PullDiffTooLargeError(
        "bic/lobster",
        3023,
        new Error(
          "gh api repos/bic/lobster/pulls/3023 failed (status 1): gh: Sorry, the diff exceeded the maximum number of lines (20000) (HTTP 406)"
        )
      );
    });

    const result = await runTick({ repo: "bic/lobster", num: 3023 });

    expect(result).toEqual({
      skipped: true,
      reason:
        "diff exceeds GitHub Enterprise's 20,000-line API limit - skipping automated review instead of failing poll",
    });
  });
});
