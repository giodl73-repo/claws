import { spawnSync } from "node:child_process";

export interface GhPullSummary {
  number: number;
  title: string;
  user: { login: string };
  draft: boolean;
  updated_at: string;
  head: { sha: string };
  base: { ref: string };
}

export interface GhComment {
  id: number;
  user: { login: string };
  body: string;
  created_at: string;
  updated_at: string;
  author_association?: string;
}

const GH_RETRIES = 5;
const GH_BACKOFF_BASE_MS = 1000;
const GHE_DIFF_TOO_LARGE_RE =
  /diff exceeded the maximum number of lines\s*\(20000\)|HTTP 406/i;

export class PullDiffTooLargeError extends Error {
  readonly repo: string;
  readonly prNumber: number;

  constructor(repo: string, prNumber: number, cause: Error) {
    super(
      `PR diff for ${repo}#${prNumber} exceeds GitHub Enterprise's 20,000-line diff API limit`
    );
    this.name = "PullDiffTooLargeError";
    this.repo = repo;
    this.prNumber = prNumber;
    this.cause = cause;
  }
}

export function isPullDiffTooLargeError(error: unknown): error is PullDiffTooLargeError {
  return error instanceof PullDiffTooLargeError;
}

function isTransient(stderr: string): boolean {
  return /TLS handshake timeout|forcibly closed|connection refused|connection reset|i\/o timeout|ECONNRESET|EPIPE|503\s|502\s|504\s/i.test(
    stderr
  );
}

function sleepSync(ms: number): void {
  // Atomics.wait on a SAB is the standard sync sleep — doesn't peg CPU.
  const sab = new SharedArrayBuffer(4);
  const view = new Int32Array(sab);
  Atomics.wait(view, 0, 0, ms);
}

function ghSpawn(
  args: string[],
  description: string
): { stdout: string; stderr: string } {
  let lastStderr = "";
  for (let attempt = 0; attempt < GH_RETRIES; attempt++) {
    const result = spawnSync("gh", args, {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });

    if (result.status === 0) {
      return { stdout: result.stdout, stderr: result.stderr };
    }

    lastStderr = result.stderr;
    if (!isTransient(result.stderr) || attempt === GH_RETRIES - 1) {
      throw new Error(
        `${description} failed (status ${result.status}, attempt ${attempt + 1}/${GH_RETRIES}): ${result.stderr}`
      );
    }

    const backoff = GH_BACKOFF_BASE_MS * Math.pow(2, attempt);
    console.error(
      `[gh] transient error (attempt ${attempt + 1}/${GH_RETRIES}), retrying in ${backoff}ms: ${result.stderr.split("\n")[0]}`
    );
    sleepSync(backoff);
  }
  throw new Error(`${description} failed after ${GH_RETRIES} attempts: ${lastStderr}`);
}

function ghApi<T>(path: string, hostname = "microsoft.ghe.com"): T {
  const { stdout } = ghSpawn(
    ["api", "--hostname", hostname, path],
    `gh api ${path}`
  );
  return JSON.parse(stdout) as T;
}

function ghApiPaginated<T>(
  path: string,
  hostname = "microsoft.ghe.com"
): T[] {
  const items: T[] = [];
  const perPage = 100;

  for (let page = 1; ; page++) {
    const separator = path.includes("?") ? "&" : "?";
    const pagePath = `${path}${separator}per_page=${perPage}&page=${page}`;
    const batch = ghApi<T[]>(pagePath, hostname);
    items.push(...batch);
    if (batch.length < perPage) return items;
  }
}

function ghApiRaw(
  path: string,
  acceptHeader: string,
  hostname = "microsoft.ghe.com"
): string {
  const { stdout } = ghSpawn(
    ["api", "--hostname", hostname, "-H", `Accept: ${acceptHeader}`, path],
    `gh api ${path}`
  );
  return stdout;
}

export function listOpenPulls(repo: string): GhPullSummary[] {
  return ghApiPaginated<GhPullSummary>(
    `repos/${repo}/pulls?state=open&sort=updated&direction=desc`
  );
}

export function getPull(repo: string, num: number): GhPullSummary {
  return ghApi<GhPullSummary>(`repos/${repo}/pulls/${num}`);
}

export function getPullDiff(repo: string, num: number): string {
  try {
    return ghApiRaw(
      `repos/${repo}/pulls/${num}`,
      "application/vnd.github.v3.diff"
    );
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    if (GHE_DIFF_TOO_LARGE_RE.test(err.message)) {
      throw new PullDiffTooLargeError(repo, num, err);
    }
    throw e;
  }
}

export function getIssueComments(repo: string, num: number): GhComment[] {
  return ghApiPaginated<GhComment>(`repos/${repo}/issues/${num}/comments`);
}

export function postIssueComment(
  repo: string,
  num: number,
  body: string
): GhComment {
  const result = spawnSync(
    "gh",
    [
      "api",
      "--hostname",
      "microsoft.ghe.com",
      "-X",
      "POST",
      "-f",
      `body=${body}`,
      `repos/${repo}/issues/${num}/comments`,
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );

  if (result.status !== 0) {
    throw new Error(
      `gh comment post failed (status ${result.status}): ${result.stderr}`
    );
  }

  return JSON.parse(result.stdout) as GhComment;
}

export type ReviewEvent = "APPROVE" | "COMMENT" | "REQUEST_CHANGES";

export interface GhReview {
  id: number;
  state: string;
  body: string;
  submitted_at: string;
  commit_id?: string;
  user?: { login: string };
  author_association?: string;
}

/**
 * List formal PR reviews. Used to short-circuit when we already have an
 * APPROVE on the current head SHA (since formal reviews aren't issue
 * comments, findPriorVerdict won't find them).
 */
export function listPrReviews(repo: string, prNumber: number): GhReview[] {
  return ghApiPaginated<GhReview>(
    `repos/${repo}/pulls/${prNumber}/reviews`
  );
}

export function listPrReviewComments(
  repo: string,
  prNumber: number
): GhComment[] {
  return ghApiPaginated<GhComment>(
    `repos/${repo}/pulls/${prNumber}/comments`
  );
}

/**
 * Submit a formal PR review (Reviews tab, counts toward branch protection
 * approvals when event=APPROVE). Distinct from issue comments.
 *
 * The body MAY be empty for APPROVE; we always pass the verdict body so
 * the formal review carries the same audit content.
 */
export function submitPrReview(
  repo: string,
  prNumber: number,
  body: string,
  event: ReviewEvent
): GhReview {
  const result = spawnSync(
    "gh",
    [
      "api",
      "--hostname",
      "microsoft.ghe.com",
      "-X",
      "POST",
      "-f",
      `body=${body}`,
      "-f",
      `event=${event}`,
      `repos/${repo}/pulls/${prNumber}/reviews`,
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );

  if (result.status !== 0) {
    throw new Error(
      `gh review submit failed (status ${result.status}): ${result.stderr}`
    );
  }

  return JSON.parse(result.stdout) as GhReview;
}

const MARKER_RE = /<!--\s*claws-lobster-architect:([\w:-]+)\s*-->/;

export interface PriorVerdict {
  comment: GhComment;
  marker: string;
  shaInMarker: string | null;
}

export function findPriorVerdict(comments: GhComment[]): PriorVerdict | null {
  for (let i = comments.length - 1; i >= 0; i--) {
    const c = comments[i];
    if (!c) continue;
    const match = c.body.match(MARKER_RE);
    if (!match || !match[1]) continue;

    const marker = match[1];
    const reevalMatch = marker.match(/^reeval:(.+)$/);
    return {
      comment: c,
      marker,
      shaInMarker: reevalMatch ? reevalMatch[1] ?? null : null,
    };
  }

  return null;
}
