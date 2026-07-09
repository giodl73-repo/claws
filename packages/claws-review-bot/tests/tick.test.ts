import { beforeEach, describe, expect, it, vi } from "vitest";

import { PullDiffTooLargeError } from "../src/gh.js";
import { runTick } from "../src/tick.js";
import {
  findPriorVerdict,
  getIssueComments,
  getPull,
  getPullDiff,
  listPrReviews,
  postIssueComment,
  submitPrReview,
} from "../src/gh.js";
import { invokeClaude } from "../src/claude.js";
import { extractMarker } from "../src/storage.js";

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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findPriorVerdict).mockReturnValue(null);
    vi.mocked(listPrReviews).mockReturnValue([]);
    vi.mocked(extractMarker).mockReturnValue("comment");
  });

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

  it("submits a formal approval for clean reevals with a bold punctuated none summary", async () => {
    const verdictBody = [
      "<!-- claws-lobster-architect:reeval:abcdef123 -->",
      "",
      "## Architect Review — PR #4076 @ `abcdef123`",
      "",
      "## Delta summary (vs `890e7b63c`)",
      "- **Resolved**: F1.",
      "- **Still open**: <none>.",
      "- **New** (regression detection): <none>.",
      "- **Wontfix-asserted (conceded)**: <none>.",
      "",
      "## Findings",
      "",
      "### F1 — [Minor | code] — Status: resolved",
      "**Recommendation**: resolved.",
    ].join("\n");

    vi.mocked(getPull).mockReturnValue({
      number: 4076,
      title: "cowork",
      user: { login: "Galin-Iliev" },
      draft: false,
      updated_at: "2026-07-08T03:00:00Z",
      head: { sha: "abcdef1234567890" },
      base: { ref: "main" },
    });
    vi.mocked(getIssueComments).mockReturnValue([]);
    vi.mocked(getPullDiff).mockReturnValue(
      "diff --git a/src/lib.rs b/src/lib.rs\n+pub fn changed() {}\n"
    );
    vi.mocked(invokeClaude).mockResolvedValue(verdictBody);
    vi.mocked(extractMarker).mockReturnValue("reeval:abcdef123");
    vi.mocked(submitPrReview).mockReturnValue({
      id: 198631500,
      state: "APPROVED",
      body: verdictBody,
      submitted_at: "2026-07-08T03:24:56Z",
    });

    const result = await runTick({
      repo: "bic/lobster",
      num: 4076,
      postComment: true,
    });

    expect(result).toEqual({
      skipped: false,
      verdictBody,
      approveReviewId: 198631500,
    });
    expect(submitPrReview).toHaveBeenCalledWith(
      "bic/lobster",
      4076,
      verdictBody,
      "APPROVE"
    );
    expect(postIssueComment).not.toHaveBeenCalled();
  });

  it("recovers a prior same-SHA clean reeval by approving without another LLM call", async () => {
    const verdictBody = [
      "<!-- claws-lobster-architect:reeval:fd45d41af -->",
      "",
      "## Architect Review — PR #4076 @ `fd45d41af`",
      "",
      "## Delta summary (vs `890e7b63c`)",
      "- **Resolved**: F1.",
      "- **Still open**: <none>.",
      "- **New** (regression detection): <none>.",
      "- **Wontfix-asserted (conceded)**: <none>.",
      "",
      "## Findings",
      "",
      "### F1 — [Minor | code] — Status: resolved",
      "**Recommendation**: resolved.",
    ].join("\n");
    const priorComment = {
      id: 198631441,
      user: { login: "giodl" },
      body: verdictBody,
      created_at: "2026-07-08T03:24:56Z",
      updated_at: "2026-07-08T03:24:56Z",
    };

    vi.mocked(getPull).mockReturnValue({
      number: 4076,
      title: "cowork",
      user: { login: "Galin-Iliev" },
      draft: false,
      updated_at: "2026-07-08T03:24:56Z",
      head: { sha: "fd45d41afe84393e4cfab7b42efe94abf6868209" },
      base: { ref: "main" },
    });
    vi.mocked(getIssueComments).mockReturnValue([priorComment]);
    vi.mocked(findPriorVerdict).mockReturnValue({
      comment: priorComment,
      marker: "reeval:fd45d41af",
      shaInMarker: "fd45d41af",
    });
    vi.mocked(submitPrReview).mockReturnValue({
      id: 198631600,
      state: "APPROVED",
      body: verdictBody,
      submitted_at: "2026-07-08T14:00:00Z",
    });

    const result = await runTick({
      repo: "bic/lobster",
      num: 4076,
      postComment: true,
    });

    expect(result).toEqual({
      skipped: false,
      verdictBody,
      approveReviewId: 198631600,
    });
    expect(getPullDiff).not.toHaveBeenCalled();
    expect(invokeClaude).not.toHaveBeenCalled();
    expect(submitPrReview).toHaveBeenCalledWith(
      "bic/lobster",
      4076,
      verdictBody,
      "APPROVE"
    );
  });
});
