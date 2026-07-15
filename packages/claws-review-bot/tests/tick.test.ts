import { beforeEach, describe, expect, it, vi } from "vitest";

import { PullDiffTooLargeError } from "../src/gh.js";
import { runTick } from "../src/tick.js";
import {
  findPriorVerdict,
  getIssueComments,
  getPull,
  getPullDiff,
  listPrReviewComments,
  listPrReviews,
  postIssueComment,
  submitPrReview,
} from "../src/gh.js";
import { invokeClaude } from "../src/claude.js";
import { extractMarker, tryAcquirePrLock } from "../src/storage.js";

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
    listPrReviewComments: vi.fn(),
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
    vi.mocked(listPrReviewComments).mockReturnValue([]);
    vi.mocked(extractMarker).mockReturnValue("comment");
    vi.mocked(tryAcquirePrLock).mockResolvedValue(true);
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

  it("re-evaluates the same SHA when a maintainer posts the required decision", async () => {
    const priorBody = [
      "<!-- claws-lobster-architect:reeval:abcdef123 -->",
      "",
      "## Architect Review — PR #5000 @ `abcdef123`",
      "",
      "## Delta summary (vs `890e7b63c`)",
      "- **Resolved**: <none>.",
      "- **Still open**: F1.",
      "- **New** (regression detection): <none>.",
      "- **Wontfix-asserted (conceded)**: <none>.",
      "",
      "## Findings",
      "",
      "### F1 — [Major | block | maintainer-decision] — Status: open",
      "**Recommendation**: maintainer must accept the rollout risk.",
    ].join("\n");
    const approveBody = [
      "<!-- claws-lobster-architect:approve -->",
      "",
      "## Architect Review — PR #5000 @ `abcdef123` — APPROVE",
      "",
      "**Total review history**: 1 finding raised across 2 ticks; all resolved.",
    ].join("\n");
    const priorComment = {
      id: 200,
      user: { login: "giodl" },
      body: priorBody,
      created_at: "2026-07-15T01:00:00Z",
      updated_at: "2026-07-15T01:00:00Z",
      author_association: "MEMBER",
    };
    const maintainerComment = {
      id: 201,
      user: { login: "maintainer" },
      body: "Decision: accept the rollout risk and proceed with this option.",
      created_at: "2026-07-15T02:00:00Z",
      updated_at: "2026-07-15T02:00:00Z",
      author_association: "MEMBER",
    };

    vi.mocked(getPull).mockReturnValue({
      number: 5000,
      title: "risk-gated change",
      user: { login: "author" },
      draft: false,
      updated_at: "2026-07-15T02:00:00Z",
      head: { sha: "abcdef1234567890" },
      base: { ref: "main" },
    });
    vi.mocked(getIssueComments).mockReturnValue([
      priorComment,
      maintainerComment,
    ]);
    vi.mocked(findPriorVerdict).mockReturnValue({
      comment: priorComment,
      marker: "reeval:abcdef123",
      shaInMarker: "abcdef123",
    });
    vi.mocked(getPullDiff).mockReturnValue(
      "diff --git a/src/lib.rs b/src/lib.rs\n+pub fn changed() {}\n"
    );
    vi.mocked(invokeClaude).mockResolvedValue(approveBody);
    vi.mocked(extractMarker).mockReturnValue("approve");
    vi.mocked(submitPrReview).mockReturnValue({
      id: 202,
      state: "APPROVED",
      body: approveBody,
      submitted_at: "2026-07-15T02:05:00Z",
    });

    const result = await runTick({
      repo: "bic/lobster",
      num: 5000,
      postComment: true,
    });

    expect(result.approveReviewId).toBe(202);
    expect(invokeClaude).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrompt: expect.stringContaining(
          "@maintainer [MEMBER] 2026-07-15T02:00:00Z"
        ),
      })
    );
    expect(submitPrReview).toHaveBeenCalledWith(
      "bic/lobster",
      5000,
      approveBody,
      "APPROVE"
    );
  });

  it("re-evaluates the same SHA when a maintainer decision is in a formal review", async () => {
    const priorBody = [
      "<!-- claws-lobster-architect:reeval:abcdef123 -->",
      "",
      "## Architect Review — PR #5001 @ `abcdef123`",
      "",
      "## Delta summary (vs `890e7b63c`)",
      "- **Resolved**: <none>.",
      "- **Still open**: F1.",
      "- **New** (regression detection): <none>.",
      "- **Wontfix-asserted (conceded)**: <none>.",
      "",
      "## Findings",
      "",
      "### F1 — [Major | block | maintainer-decision] — Status: open",
    ].join("\n");
    const approveBody = [
      "<!-- claws-lobster-architect:approve -->",
      "",
      "## Architect Review — PR #5001 @ `abcdef123` — APPROVE",
    ].join("\n");
    const priorComment = {
      id: 300,
      user: { login: "giodl" },
      body: priorBody,
      created_at: "2026-07-15T01:00:00Z",
      updated_at: "2026-07-15T01:00:00Z",
      author_association: "MEMBER",
    };

    vi.mocked(getPull).mockReturnValue({
      number: 5001,
      title: "review-gated change",
      user: { login: "author" },
      draft: false,
      updated_at: "2026-07-15T02:00:00Z",
      head: { sha: "abcdef1234567890" },
      base: { ref: "main" },
    });
    vi.mocked(getIssueComments).mockReturnValue([priorComment]);
    vi.mocked(findPriorVerdict).mockReturnValue({
      comment: priorComment,
      marker: "reeval:abcdef123",
      shaInMarker: "abcdef123",
    });
    vi.mocked(listPrReviews).mockReturnValue([
      {
        id: 301,
        state: "COMMENTED",
        body: "Maintainer decision: accept the compatibility risk.",
        submitted_at: "2026-07-15T02:00:00Z",
        commit_id: "abcdef1234567890",
        user: { login: "maintainer" },
        author_association: "MEMBER",
      },
    ]);
    vi.mocked(getPullDiff).mockReturnValue(
      "diff --git a/src/lib.rs b/src/lib.rs\n+pub fn changed() {}\n"
    );
    vi.mocked(invokeClaude).mockResolvedValue(approveBody);
    vi.mocked(extractMarker).mockReturnValue("approve");
    vi.mocked(submitPrReview).mockReturnValue({
      id: 302,
      state: "APPROVED",
      body: approveBody,
      submitted_at: "2026-07-15T02:05:00Z",
    });

    const result = await runTick({
      repo: "bic/lobster",
      num: 5001,
      postComment: true,
    });

    expect(result.approveReviewId).toBe(302);
    expect(invokeClaude).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrompt: expect.stringContaining(
          "@maintainer [MEMBER] 2026-07-15T02:00:00Z"
        ),
      })
    );
  });

  it("uses a source-qualified lock when an inline maintainer comment triggers re-evaluation", async () => {
    const priorBody = [
      "<!-- claws-lobster-architect:reeval:abcdef123 -->",
      "",
      "## Architect Review — PR #5002 @ `abcdef123`",
      "",
      "## Findings",
      "",
      "### F1 — [Major | block | maintainer-decision] — Status: open",
    ].join("\n");
    const approveBody = [
      "<!-- claws-lobster-architect:approve -->",
      "",
      "## Architect Review — PR #5002 @ `abcdef123` — APPROVE",
    ].join("\n");
    const priorComment = {
      id: 400,
      user: { login: "giodl" },
      body: priorBody,
      created_at: "2026-07-15T01:00:00Z",
      updated_at: "2026-07-15T01:00:00Z",
      author_association: "MEMBER",
    };

    vi.mocked(getPull).mockReturnValue({
      number: 5002,
      title: "inline-review-gated change",
      user: { login: "author" },
      draft: false,
      updated_at: "2026-07-15T02:00:00Z",
      head: { sha: "abcdef1234567890" },
      base: { ref: "main" },
    });
    vi.mocked(getIssueComments).mockReturnValue([priorComment]);
    vi.mocked(findPriorVerdict).mockReturnValue({
      comment: priorComment,
      marker: "reeval:abcdef123",
      shaInMarker: "abcdef123",
    });
    vi.mocked(listPrReviewComments).mockReturnValue([
      {
        id: 400,
        user: { login: "maintainer" },
        body: "Decision: this ownership boundary is accepted.",
        created_at: "2026-07-15T02:00:00Z",
        updated_at: "2026-07-15T02:00:00Z",
        author_association: "MEMBER",
      },
    ]);
    vi.mocked(getPullDiff).mockReturnValue(
      "diff --git a/src/lib.rs b/src/lib.rs\n+pub fn changed() {}\n"
    );
    vi.mocked(invokeClaude).mockResolvedValue(approveBody);
    vi.mocked(extractMarker).mockReturnValue("approve");
    vi.mocked(submitPrReview).mockReturnValue({
      id: 401,
      state: "APPROVED",
      body: approveBody,
      submitted_at: "2026-07-15T02:05:00Z",
    });
    process.env["STORAGE_CONNECTION_STRING"] = "UseDevelopmentStorage=true";

    try {
      const result = await runTick({
        repo: "bic/lobster",
        num: 5002,
        postComment: true,
      });

      expect(result.approveReviewId).toBe(401);
      expect(tryAcquirePrLock).toHaveBeenCalledWith(
        "bic/lobster",
        5002,
        "abcdef1234567890",
        "UseDevelopmentStorage=true",
        "verdicts",
        "inline400"
      );
    } finally {
      delete process.env["STORAGE_CONNECTION_STRING"];
    }
  });

  it("does not re-evaluate for bot chatter or outsider comments", async () => {
    const priorBody = [
      "<!-- claws-lobster-architect:reeval:abcdef123 -->",
      "",
      "## Architect Review — PR #5003 @ `abcdef123`",
      "",
      "## Findings",
      "",
      "### F1 — [Major | code] — Status: open",
    ].join("\n");
    const priorComment = {
      id: 500,
      user: { login: "giodl" },
      body: priorBody,
      created_at: "2026-07-15T01:00:00Z",
      updated_at: "2026-07-15T01:00:00Z",
      author_association: "MEMBER",
    };

    vi.mocked(getPull).mockReturnValue({
      number: 5003,
      title: "unchanged change",
      user: { login: "author" },
      draft: false,
      updated_at: "2026-07-15T02:00:00Z",
      head: { sha: "abcdef1234567890" },
      base: { ref: "main" },
    });
    vi.mocked(getIssueComments).mockReturnValue([
      priorComment,
      {
        id: 501,
        user: { login: "azure-pipelines[bot]" },
        body: "Build completed.",
        created_at: "2026-07-15T02:00:00Z",
        updated_at: "2026-07-15T02:00:00Z",
        author_association: "MEMBER",
      },
      {
        id: 502,
        user: { login: "outside-user" },
        body: "I would choose option B.",
        created_at: "2026-07-15T02:01:00Z",
        updated_at: "2026-07-15T02:01:00Z",
        author_association: "NONE",
      },
    ]);
    vi.mocked(findPriorVerdict).mockReturnValue({
      comment: priorComment,
      marker: "reeval:abcdef123",
      shaInMarker: "abcdef123",
    });

    const result = await runTick({
      repo: "bic/lobster",
      num: 5003,
      postComment: true,
    });

    expect(result).toEqual({
      skipped: true,
      reason:
        "head SHA abcdef123 unchanged since last review and no new author or maintainer comments",
    });
    expect(getPullDiff).not.toHaveBeenCalled();
    expect(invokeClaude).not.toHaveBeenCalled();
  });
});
