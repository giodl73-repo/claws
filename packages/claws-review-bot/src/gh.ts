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

function ghApi<T>(path: string, hostname = "microsoft.ghe.com"): T {
  const result = spawnSync(
    "gh",
    ["api", "--hostname", hostname, "--paginate", path],
    { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
  );

  if (result.status !== 0) {
    throw new Error(
      `gh api ${path} failed (status ${result.status}): ${result.stderr}`
    );
  }

  return JSON.parse(result.stdout) as T;
}

function ghApiRaw(
  path: string,
  acceptHeader: string,
  hostname = "microsoft.ghe.com"
): string {
  const result = spawnSync(
    "gh",
    ["api", "--hostname", hostname, "-H", `Accept: ${acceptHeader}`, path],
    { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
  );

  if (result.status !== 0) {
    throw new Error(
      `gh api ${path} failed (status ${result.status}): ${result.stderr}`
    );
  }

  return result.stdout;
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
