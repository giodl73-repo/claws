import {
  getPull,
  getPullDiff,
  getIssueComments,
  findPriorVerdict,
  postIssueComment,
} from "./gh.js";
import { invokeClaude } from "./claude.js";
import { loadVoice } from "./voice.js";
import {
  writeVerdictBlob,
  extractMarker,
  tryAcquirePrLock,
  releasePrLock,
} from "./storage.js";

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
  blobUrl?: string;
}

export async function runTick(opts: TickOptions): Promise<TickResult> {
  const pull = getPull(opts.repo, opts.num);
  const headSha = pull.head.sha;
  const shortSha = headSha.slice(0, 9);

  const comments = getIssueComments(opts.repo, opts.num);
  const prior = findPriorVerdict(comments);

  if (prior && prior.shaInMarker && headSha.startsWith(prior.shaInMarker)) {
    const newAuthorComments = comments.filter(
      (c) =>
        c.user.login === pull.user.login &&
        new Date(c.created_at) > new Date(prior.comment.created_at)
    );
    if (newAuthorComments.length === 0) {
      return {
        skipped: true,
        reason: `head SHA ${shortSha} unchanged since last review and no new author comments`,
      };
    }
  }

  // Per-(repo, PR, SHA) dedup lock — see storage.tryAcquirePrLock.
  // When two cron executions race on the same PR+SHA (common when reviews
  // run longer than the cron interval), exactly one wins and the others
  // skip the LLM call entirely. Saves AOAI cost.
  const connStrEarly = process.env["STORAGE_CONNECTION_STRING"];
  const containerEarly = process.env["STORAGE_CONTAINER"] ?? "verdicts";
  let lockAcquired = false;
  if (connStrEarly) {
    lockAcquired = await tryAcquirePrLock(
      opts.repo,
      opts.num,
      headSha,
      connStrEarly,
      containerEarly
    );
    if (!lockAcquired) {
      return {
        skipped: true,
        reason: `lock held for ${opts.repo}#${opts.num}@${shortSha} — another execution already reviewing or completed`,
      };
    }
  }

  const diff = getPullDiff(opts.repo, opts.num);
  const systemPrompt = loadVoice("reviewer");

  const userPromptParts = [
    `## PR\n\nrepo: ${opts.repo}\nnumber: ${opts.num}\ntitle: ${pull.title}\nhead SHA: ${headSha}\nbase: ${pull.base.ref}\nauthor: @${pull.user.login}\ndraft: ${pull.draft}`,
    prior
      ? `## Prior verdict (in-band ledger)\n\n${prior.comment.body}`
      : `## Prior verdict\n\n(none — this is the initial review)`,
    `## Diff\n\n\`\`\`diff\n${diff}\n\`\`\``,
    `## Author comments since prior verdict\n\n${comments
      .filter(
        (c) =>
          c.user.login === pull.user.login &&
          (!prior || new Date(c.created_at) > new Date(prior.comment.created_at))
      )
      .map((c) => `@${c.user.login} ${c.created_at}:\n${c.body}`)
      .join("\n\n---\n\n") || "(none)"}`,
    `## Instructions\n\nFollow R0-R5 protocol per voice.md. Output the verdict comment body only — start with the marker line, end with the footer per grammar.md. No commentary outside the comment body.`,
  ];

  let verdictBody: string;
  try {
    verdictBody = await invokeClaude({
      systemPrompt,
      userPrompt: userPromptParts.join("\n\n"),
    });
  } catch (e) {
    // Release the lock on LLM failure so a future execution can retry.
    if (lockAcquired && connStrEarly) {
      await releasePrLock(
        opts.repo,
        opts.num,
        headSha,
        connStrEarly,
        containerEarly
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

  const posted = postIssueComment(opts.repo, opts.num, verdictBody);
  return {
    skipped: false,
    verdictBody,
    postedCommentId: posted.id,
    ...(blobUrl ? { blobUrl } : {}),
  };
}
