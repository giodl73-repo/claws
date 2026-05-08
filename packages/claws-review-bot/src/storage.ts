import { BlobServiceClient, RestError } from "@azure/storage-blob";

export interface VerdictBlob {
  repo: string;
  prNumber: number;
  headSha: string;
  marker: string;
  body: string;
}

/**
 * Write a verdict to Azure Storage Blob for archive + dry-run inspection.
 * Path convention: <repo>/<pr>/<sha>/<marker>-<timestamp>.md.
 *
 * Auth: connection string from STORAGE_CONNECTION_STRING env var.
 * Container: defaults to "verdicts"; override via STORAGE_CONTAINER.
 *
 * Returns the blob URL on success. Throws on any failure — the harness
 * decides whether to surface the error or continue.
 */
export async function writeVerdictBlob(
  verdict: VerdictBlob,
  connectionString: string,
  containerName = "verdicts"
): Promise<string> {
  const service = BlobServiceClient.fromConnectionString(connectionString);
  const container = service.getContainerClient(containerName);
  await container.createIfNotExists();

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `${verdict.repo}/${verdict.prNumber}/${verdict.headSha.slice(0, 9)}/${verdict.marker}-${ts}.md`;
  const blob = container.getBlockBlobClient(path);

  await blob.upload(verdict.body, Buffer.byteLength(verdict.body, "utf8"), {
    blobHTTPHeaders: { blobContentType: "text/markdown; charset=utf-8" },
    metadata: {
      repo: verdict.repo,
      pr: String(verdict.prNumber),
      sha: verdict.headSha,
      marker: verdict.marker,
    },
  });

  return blob.url;
}

/**
 * Parse the marker from a verdict body. The marker is the first
 * `<!-- claws-lobster-architect:<kind>[:sha] -->` HTML comment.
 *
 * Returns the marker portion (e.g. "initial", "reeval:abc123def", "approve")
 * or "unknown" if parsing fails. Used to name the blob path.
 */
export function extractMarker(body: string): string {
  const match = body.match(/<!--\s*claws-lobster-architect:([\w:-]+)\s*-->/);
  return match && match[1] ? match[1] : "unknown";
}

/**
 * Acquire a per-(repo, PR, SHA) review lock via blob-create-if-not-exists.
 *
 * Two parallel executions race on the same path with `If-None-Match: *`.
 * Storage atomically grants exactly one. The loser gets HTTP 409 and skips
 * the LLM call entirely. Without this, every cron-overlap (which happens
 * naturally when reviews run longer than the cron interval) duplicates
 * AOAI cost.
 *
 * The lock blob stays in place after a successful review — that's the
 * point: same (repo, PR, SHA) is never reviewed twice, even by future
 * executions. When the PR's head SHA moves, the lock path changes and
 * a fresh review is allowed.
 *
 * On review failure, the caller should delete the lock to allow retry —
 * see `releasePrLock`.
 */
export async function tryAcquirePrLock(
  repo: string,
  prNumber: number,
  headSha: string,
  connectionString: string,
  containerName = "verdicts",
  /** Suffix for re-reviews on the same SHA — typically the most recent
   *  author-comment id, so a fresh comment unlocks a fresh review. */
  contextSuffix?: string
): Promise<boolean> {
  const service = BlobServiceClient.fromConnectionString(connectionString);
  const container = service.getContainerClient(containerName);
  await container.createIfNotExists();

  const blob = container.getBlockBlobClient(
    lockPath(repo, prNumber, headSha, contextSuffix)
  );
  const body = `locked at ${new Date().toISOString()}`;

  try {
    await blob.upload(body, Buffer.byteLength(body, "utf8"), {
      conditions: { ifNoneMatch: "*" },
      metadata: {
        acquired_at: new Date().toISOString(),
        execution_id:
          process.env["CONTAINER_APP_REVISION"] ??
          process.env["HOSTNAME"] ??
          "unknown",
      },
    });
    return true;
  } catch (e) {
    if (e instanceof RestError && (e.statusCode === 409 || e.statusCode === 412)) {
      return false;
    }
    throw e;
  }
}

/**
 * Delete a previously-acquired lock so a future execution can retry. Call
 * on review failure (LLM error, network error, etc.) — never on success.
 */
export async function releasePrLock(
  repo: string,
  prNumber: number,
  headSha: string,
  connectionString: string,
  containerName = "verdicts",
  contextSuffix?: string
): Promise<void> {
  const service = BlobServiceClient.fromConnectionString(connectionString);
  const container = service.getContainerClient(containerName);
  const blob = container.getBlockBlobClient(
    lockPath(repo, prNumber, headSha, contextSuffix)
  );
  await blob.deleteIfExists();
}

function lockPath(repo: string, prNumber: number, headSha: string, suffix?: string): string {
  const base = `_locks/${repo}/${prNumber}-${headSha.slice(0, 9)}`;
  return suffix ? `${base}-${suffix}.lock` : `${base}.lock`;
}
