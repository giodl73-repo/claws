import { BlobServiceClient } from "@azure/storage-blob";

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
