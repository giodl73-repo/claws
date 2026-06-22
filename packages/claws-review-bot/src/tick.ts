import {
  getPull,
  getPullDiff,
  getIssueComments,
  findPriorVerdict,
  isPullDiffTooLargeError,
  postIssueComment,
  submitPrReview,
  listPrReviews,
} from "./gh.js";
import { invokeClaude } from "./claude.js";
import { loadVoice } from "./voice.js";
import {
  writeVerdictBlob,
  extractMarker,
  tryAcquirePrLock,
  releasePrLock,
} from "./storage.js";
import type { GhComment } from "./gh.js";

export interface TickOptions {
  repo: string;
  num: number;
  dryRun?: boolean;
  postComment?: boolean;
}

export interface TickResult {
  skipped: boolean;
  reason?: string;
  verdictBody?: string;
  postedCommentId?: number;
  approveReviewId?: number;
  blobUrl?: string;
}

/**
 * Decide whether a verdict represents an effective approval, regardless
 * of which marker the LLM emitted. Some clean-delta reevals don't get
 * the :approve marker (LLM is conservative on first-clean-delta), so
 * we also detect "Still open: <none>" or zero finding headers as approves.
 */
function isApproveVerdict(body: string, marker: string): boolean {
  if (marker === "approve") return true;
  if (!marker.startsWith("reeval")) return false;

  // Empty findings section = effective approve. Match either "Still open:
  // <none>" OR no `### F` headers AND no `### LQ` headers under Findings.
  if (/^\s*-\s*Still open:\s*<none>\s*$/m.test(body)) return true;

  // No F/LQ headers at all in the body = empty verdict
  if (!/^### (F-new\d+|F\d+|LQ\d+)\b/m.test(body)) return true;

  return false;
}

const MAX_DIFF_CHARS = 120_000; // ~30k tokens at 4 chars/token

const DOCS_EXT = /\.(md|svg|png|jpg|jpeg|gif|webp|pdf|txt|rst|adoc|markdown)$/i;
const LOCK_FILES = new Set([
  "Cargo.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "composer.lock",
  "poetry.lock",
  "uv.lock",
  "Gemfile.lock",
  "Pipfile.lock",
  "go.sum",
]);
const LICENSE_PATHS = /^(LICENSE|LICENCE|COPYING)(\.\w+)?$/;

const FINDING_ID_RE = /\b(F-new\d+|F\d+|LQ\d+)\b/;
const FIX_KEYWORDS_RE =
  /\b(addressed|fixed|resolved|won't fix|wontfix|disagree|will fix|deferred|in-progress|please re-?review)\b/i;
const BOT_MENTION_RE = /@giodl\b/i;

// Author-bot prefixes — comments that start with these markers are
// automated acknowledgments, not author intent. They tend to repeat every
// cycle and trigger pointless reevals if we treat them as substantive.
// Add new prefixes here as we discover other team bots. The match is
// against the trimmed body's first ~80 chars.
const AUTHOR_BOT_PREFIX_RE =
  /^\s*\[(bot|peer-review)\]|^\s*<!--\s*(automaton|architect-review|peer-review)/i;
const ACK_BOILERPLATE_RE =
  /^\s*\[bot\]\s*(Acknowledg|Thanks (for|@)|Confirmed|Noted)/i;

function changedFilePaths(diffText: string): string[] {
  const paths = new Set<string>();
  for (const m of diffText.matchAll(/^diff --git a\/(\S+) b\/(\S+)/gm)) {
    if (m[1]) paths.add(m[1]);
    if (m[2]) paths.add(m[2]);
  }
  return [...paths];
}

function isDocsOnlyDiff(diffText: string): boolean {
  const paths = changedFilePaths(diffText);
  if (paths.length === 0) return false;
  return paths.every((p) => {
    const base = p.split("/").pop() ?? p;
    return (
      DOCS_EXT.test(p) ||
      LOCK_FILES.has(base) ||
      LICENSE_PATHS.test(base)
    );
  });
}

function isSubstantiveAuthorComment(body: string): boolean {
  // Author-bot acknowledgments / peer-review templates don't carry author
  // intent. They're auto-posted in response to our (and others') reviews
  // and would otherwise loop us into reviewing every cycle.
  if (AUTHOR_BOT_PREFIX_RE.test(body) || ACK_BOILERPLATE_RE.test(body)) {
    return false;
  }
  return (
    FINDING_ID_RE.test(body) ||
    FIX_KEYWORDS_RE.test(body) ||
    BOT_MENTION_RE.test(body)
  );
}

function capDiff(d: string): { diff: string; truncated: boolean } {
  if (d.length <= MAX_DIFF_CHARS) return { diff: d, truncated: false };
  const truncated =
    d.slice(0, MAX_DIFF_CHARS) +
    `\n\n... [diff truncated; original ${d.length} chars (~${Math.ceil(
      d.length / 4
    )} tokens); first ${MAX_DIFF_CHARS} chars shown to control review cost]\n`;
  return { diff: truncated, truncated: true };
}

function extractShaFromVerdictHeader(body: string): string | null {
  const match = body.match(/## Architect Review — PR #\d+ @ `([a-f0-9]+)`/);
  return match && match[1] ? match[1] : null;
}

function newAuthorCommentsSincePrior(
  comments: GhComment[],
  authorLogin: string,
  priorComment?: GhComment
): GhComment[] {
  return comments.filter(
    (c) =>
      c.user.login === authorLogin &&
      (!priorComment || new Date(c.created_at) > new Date(priorComment.created_at))
  );
}

export async function runTick(opts: TickOptions): Promise<TickResult> {
  const pull = getPull(opts.repo, opts.num);
  const headSha = pull.head.sha;
  const shortSha = headSha.slice(0, 9);

  const comments = getIssueComments(opts.repo, opts.num);
  const prior = findPriorVerdict(comments);

  // ---- Cheap skip paths (no diff fetch, no LLM call) ----

  // C-prime. Formal-approve-then-stop: when we submit a formal APPROVE PR
  // review (not an issue comment), findPriorVerdict can't see it next
  // tick. Without this check, every author-bot ack comment triggers a
  // fresh reeval that re-approves at $0.15 each.
  //
  // Self-login: hardcoded `giodl` for now. The container's GH_TOKEN is
  // for that user; if we ever switch to a service account we'll source
  // this from `gh api user --jq .login` once at startup.
  try {
    const myApproves = listPrReviews(opts.repo, opts.num).filter(
      (r) =>
        r.user?.login === "giodl" &&
        r.state === "APPROVED" &&
        r.commit_id === headSha
    );
    if (myApproves.length > 0) {
      return {
        skipped: true,
        reason: `already formally APPROVED at SHA ${shortSha} (${myApproves.length} prior review(s))`,
      };
    }
  } catch (e) {
    console.error(
      `[tick] formal-approve check failed (continuing): ${(e as Error).message}`
    );
  }

  // C. Approve-then-stop (issue-comment branch — pre-66c51528 verdicts):
  // when the prior :approve was an issue comment instead of a formal
  // review, find it via findPriorVerdict.
  if (prior?.marker === "approve") {
    const approveSha = extractShaFromVerdictHeader(prior.comment.body);
    if (approveSha && headSha.startsWith(approveSha)) {
      return {
        skipped: true,
        reason: `already approved at SHA ${shortSha} — no further reevals on same SHA`,
      };
    }
  }

  // Same-SHA skip — only re-review if there are new substantive author
  // comments. (B) "Substantive" means: references a finding ID, contains
  // fix/disagree keywords, or @-mentions the bot. Pure thanks/acks don't
  // trigger expensive reevals.
  if (prior && prior.shaInMarker && headSha.startsWith(prior.shaInMarker)) {
    const newAuthor = newAuthorCommentsSincePrior(
      comments,
      pull.user.login,
      prior.comment
    );
    if (newAuthor.length === 0) {
      return {
        skipped: true,
        reason: `head SHA ${shortSha} unchanged since last review and no new author comments`,
      };
    }
    const substantive = newAuthor.filter((c) => isSubstantiveAuthorComment(c.body));
    if (substantive.length === 0) {
      return {
        skipped: true,
        reason: `head SHA ${shortSha} unchanged; ${newAuthor.length} new author comment(s) but none substantive (no finding ref / fix keyword / @-mention)`,
      };
    }
  }

  // ---- Diff fetch + cheap content filter ----

  let rawDiff: string;
  try {
    rawDiff = getPullDiff(opts.repo, opts.num);
  } catch (e) {
    if (isPullDiffTooLargeError(e)) {
      return {
        skipped: true,
        reason:
          "diff exceeds GitHub Enterprise's 20,000-line API limit - skipping automated review instead of failing poll",
      };
    }
    throw e;
  }

  // A. Skip docs/lockfile-only diffs — no architectural review value.
  if (isDocsOnlyDiff(rawDiff)) {
    return {
      skipped: true,
      reason: `docs/lockfile-only diff (${changedFilePaths(rawDiff).length} files) — no architectural review needed`,
    };
  }

  // F. Cap diff size to control max LLM input cost.
  const { diff, truncated: diffTruncated } = capDiff(rawDiff);

  // ---- Lock acquisition (only after we've decided to actually review) ----
  const connStrEarly = process.env["STORAGE_CONNECTION_STRING"];
  const containerEarly = process.env["STORAGE_CONTAINER"] ?? "verdicts";
  const lastAuthorCommentId = comments
    .filter((c) => c.user.login === pull.user.login)
    .map((c) => c.id)
    .reduce((max, id) => (id > max ? id : max), 0);
  const contextSuffix =
    prior && lastAuthorCommentId > 0 ? `c${lastAuthorCommentId}` : undefined;

  let lockAcquired = false;
  if (connStrEarly) {
    lockAcquired = await tryAcquirePrLock(
      opts.repo,
      opts.num,
      headSha,
      connStrEarly,
      containerEarly,
      contextSuffix
    );
    if (!lockAcquired) {
      return {
        skipped: true,
        reason: `lock held for ${opts.repo}#${opts.num}@${shortSha}${contextSuffix ? `@${contextSuffix}` : ""} — another execution already reviewing or completed`,
      };
    }
  }

  // ---- Build prompt + call LLM ----

  const systemPrompt = loadVoice("reviewer");

  const userPromptParts = [
    `## PR\n\nrepo: ${opts.repo}\nnumber: ${opts.num}\ntitle: ${pull.title}\nhead SHA: ${headSha}\nbase: ${pull.base.ref}\nauthor: @${pull.user.login}\ndraft: ${pull.draft}`,
    prior
      ? `## Prior verdict (in-band ledger)\n\n${prior.comment.body}`
      : `## Prior verdict\n\n(none — this is the initial review)`,
    `## Diff${diffTruncated ? " (truncated)" : ""}\n\n\`\`\`diff\n${diff}\n\`\`\``,
    `## Author comments since prior verdict\n\n${newAuthorCommentsSincePrior(
      comments,
      pull.user.login,
      prior?.comment
    )
      .map((c) => `@${c.user.login} ${c.created_at}:\n${c.body}`)
      .join("\n\n---\n\n") || "(none)"}`,
    `## Instructions\n\nFollow R0-R5 protocol per voice.md. Output the verdict comment body only — start with the marker line, end with the footer per grammar.md. No commentary outside the comment body.`,
  ];

  // D. Two-tier model: use a cheaper deployment for reevals (delta-only
  // analysis is well within mini's capability). Initial reviews keep the
  // full-tier model where the heavy lifting happens.
  const reevalDeployment = process.env["AOAI_DEPLOYMENT_REEVAL"];
  const useReevalTier = !!prior && !!reevalDeployment;

  let verdictBody: string;
  try {
    verdictBody = await invokeClaude({
      systemPrompt,
      userPrompt: userPromptParts.join("\n\n"),
      // G. Prompt caching: stable key per voice configuration so the static
      // system prompt portion hits cache across calls. Reduces input cost
      // by ~90% on the cached prefix.
      promptCacheKey: "claws-lobster-architect-reviewer-v1",
      ...(useReevalTier ? { aoaiDeployment: reevalDeployment } : {}),
    });
  } catch (e) {
    if (lockAcquired && connStrEarly) {
      await releasePrLock(
        opts.repo,
        opts.num,
        headSha,
        connStrEarly,
        containerEarly,
        contextSuffix
      ).catch(() => {});
    }
    throw e;
  }

  // Always archive to Storage if STORAGE_CONNECTION_STRING is set —
  // independent of whether we post. The blob is the audit trail.
  let blobUrl: string | undefined;
  const connStr = process.env["STORAGE_CONNECTION_STRING"];
  if (connStr) {
    try {
      blobUrl = await writeVerdictBlob(
        {
          repo: opts.repo,
          prNumber: opts.num,
          headSha,
          marker: extractMarker(verdictBody),
          body: verdictBody,
        },
        connStr,
        process.env["STORAGE_CONTAINER"] ?? "verdicts"
      );
    } catch (e) {
      console.error(
        `[tick] storage write failed (continuing): ${(e as Error).message}`
      );
    }
  }

  if (opts.dryRun) {
    return { skipped: false, verdictBody, ...(blobUrl ? { blobUrl } : {}) };
  }

  if (!opts.postComment) {
    return { skipped: false, verdictBody, ...(blobUrl ? { blobUrl } : {}) };
  }

  // Approve verdicts → submit a formal PR review with event=APPROVE so
  // it counts toward branch-protection approvals (the merge gate).
  // Non-approve verdicts → issue comment (visible in conversation, not
  // gating). The bot intentionally does NOT use REQUEST_CHANGES — that
  // would block merges, and the bot is wrong often enough that hard
  // gating on its findings is too aggressive.
  const verdictMarker = extractMarker(verdictBody);
  if (isApproveVerdict(verdictBody, verdictMarker)) {
    let review;
    try {
      review = submitPrReview(
        opts.repo,
        opts.num,
        verdictBody,
        "APPROVE"
      );
    } catch (e) {
      console.error(
        `[tick] formal review submit failed after verdict generation (continuing): ${(e as Error).message}`
      );
      return {
        skipped: false,
        verdictBody,
        ...(blobUrl ? { blobUrl } : {}),
      };
    }
    return {
      skipped: false,
      verdictBody,
      approveReviewId: review.id,
      ...(blobUrl ? { blobUrl } : {}),
    };
  }

  let posted;
  try {
    posted = postIssueComment(opts.repo, opts.num, verdictBody);
  } catch (e) {
    console.error(
      `[tick] comment post failed after verdict generation (continuing): ${(e as Error).message}`
    );
    return {
      skipped: false,
      verdictBody,
      ...(blobUrl ? { blobUrl } : {}),
    };
  }
  return {
    skipped: false,
    verdictBody,
    postedCommentId: posted.id,
    ...(blobUrl ? { blobUrl } : {}),
  };
}
