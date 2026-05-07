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
}

const GH_RETRIES = 5;
const GH_BACKOFF_BASE_MS = 1000;

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
    ["api", "--hostname", hostname, "--paginate", path],
    `gh api ${path}`
  );
  return JSON.parse(stdout) as T;
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
  return ghApi<GhPullSummary[]>(
    `repos/${repo}/pulls?state=open&sort=updated&direction=desc&per_page=100`
  );
}

export function getPull(repo: string, num: number): GhPullSummary {
  return ghApi<GhPullSummary>(`repos/${repo}/pulls/${num}`);
}

export function getPullDiff(repo: string, num: number): string {
  return ghApiRaw(
    `repos/${repo}/pulls/${num}`,
    "application/vnd.github.v3.diff"
  );
}

export function getIssueComments(repo: string, num: number): GhComment[] {
  return ghApi<GhComment[]>(`repos/${repo}/issues/${num}/comments`);
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
