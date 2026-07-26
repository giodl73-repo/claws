import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isSafeClawRelativePath } from "@claws/reference-private";
import { extractArchive } from "@openclaw/fs-safe/archive";
import { CliError } from "./errors.js";
import { inspectLocalPackage } from "./source.js";
import type { LocalClawPackage } from "./types.js";
import type { RemoteSourceOptions } from "./remote-source.js";

const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 50 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 10_000;
const REQUEST_TIMEOUT_MS = 30_000;
const EXTRACT_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 3;

export type ExactGitHubCoordinate = {
  ref: string;
  owner: string;
  repository: string;
  commit: string;
  packagePath: string;
};

function fail(code: string, message: string, path?: string): never {
  throw new CliError({ code, phase: "source", message, ...(path ? { path } : {}) });
}

export function parseExactGitHubCoordinate(input: string): ExactGitHubCoordinate | undefined {
  if (!input.startsWith("github:")) {
    return undefined;
  }
  const match = /^github:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)@([0-9a-fA-F]{40})(?:#(.+))?$/.exec(
    input,
  );
  if (!match) {
    fail(
      "invalid_github_coordinate",
      "GitHub sources must use github:<owner>/<repo>@<40-character-commit>[#package/path].",
      input,
    );
  }
  const packagePath = match[4] ?? "";
  if (packagePath.includes("\\") || (packagePath !== "" && !isSafeClawRelativePath(packagePath))) {
    fail(
      "invalid_github_coordinate",
      "The GitHub package path must be portable and repository-relative.",
      input,
    );
  }
  return {
    ref: input,
    owner: match[1]!,
    repository: match[2]!,
    commit: match[3]!.toLowerCase(),
    packagePath,
  };
}

async function readBounded(response: Response): Promise<Buffer> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_ARCHIVE_BYTES) {
    fail("github_archive_too_large", `GitHub archive exceeds ${MAX_ARCHIVE_BYTES} bytes.`);
  }
  if (!response.body) {
    return Buffer.alloc(0);
  }
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let bytes = 0;
  while (true) {
    let result: ReadableStreamReadResult<Uint8Array>;
    try {
      result = await reader.read();
    } catch (error) {
      fail(
        "github_request_failed",
        `GitHub archive failed while streaming: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (result.done) {
      break;
    }
    bytes += result.value.byteLength;
    if (bytes > MAX_ARCHIVE_BYTES) {
      await reader.cancel().catch(() => undefined);
      fail("github_archive_too_large", `GitHub archive exceeds ${MAX_ARCHIVE_BYTES} bytes.`);
    }
    chunks.push(Buffer.from(result.value));
  }
  return Buffer.concat(chunks, bytes);
}

async function fetchArchive(
  coordinate: ExactGitHubCoordinate,
  options: RemoteSourceOptions,
): Promise<Buffer> {
  const fetchImpl = options.fetch ?? fetch;
  const env = options.env ?? process.env;
  let url = new URL(
    `https://api.github.com/repos/${encodeURIComponent(coordinate.owner)}/${encodeURIComponent(coordinate.repository)}/tarball/${coordinate.commit}`,
  );
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const apiRequest = url.origin === "https://api.github.com";
    if (!apiRequest && url.origin !== "https://codeload.github.com") {
      fail(
        "untrusted_github_url",
        "GitHub archives may redirect only to codeload.github.com.",
        url.href,
      );
    }
    const headers: Record<string, string> = {
      accept: "application/octet-stream",
      "user-agent": "claws-cli",
      "x-github-api-version": "2022-11-28",
    };
    const token = env.GITHUB_TOKEN?.trim();
    if (apiRequest && token) {
      headers.authorization = `Bearer ${token}`;
    }
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      fail(
        "github_request_failed",
        `GitHub request failed: ${error instanceof Error ? error.message : String(error)}`,
        url.href,
      );
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) {
        fail("invalid_github_redirect", "GitHub returned an invalid archive redirect.", url.href);
      }
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) {
      fail("github_request_failed", `GitHub returned HTTP ${response.status}.`, url.href);
    }
    return readBounded(response);
  }
  fail("invalid_github_redirect", "GitHub exceeded the archive redirect limit.");
}

export async function resolveGitHubSource(
  coordinate: ExactGitHubCoordinate,
  options: RemoteSourceOptions = {},
): Promise<LocalClawPackage> {
  const archiveBytes = await fetchArchive(coordinate, options);
  const artifactIntegrity = `sha256:${createHash("sha256").update(archiveBytes).digest("hex")}`;
  const tempRoot = await mkdtemp(join(tmpdir(), "claws-github-"));
  try {
    const archivePath = join(tempRoot, "repository.tgz");
    const extractDir = join(tempRoot, "repository");
    await mkdir(extractDir);
    await writeFile(archivePath, archiveBytes, { flag: "wx" });
    try {
      await extractArchive({
        archivePath,
        destDir: extractDir,
        kind: "tar",
        tarGzip: true,
        stripComponents: 1,
        timeoutMs: EXTRACT_TIMEOUT_MS,
        limits: {
          maxArchiveBytes: MAX_ARCHIVE_BYTES,
          maxEntries: MAX_ARCHIVE_ENTRIES,
          maxExtractedBytes: MAX_EXTRACTED_BYTES,
          maxEntryBytes: MAX_EXTRACTED_BYTES,
        },
      });
    } catch (error) {
      fail(
        "unsafe_github_archive",
        `GitHub archive extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const packageRoot = coordinate.packagePath
      ? resolve(extractDir, ...coordinate.packagePath.split("/"))
      : extractDir;
    const inspected = await inspectLocalPackage(packageRoot);
    return {
      ...inspected,
      source: {
        kind: "github-package",
        ref: coordinate.ref,
        repository: `${coordinate.owner}/${coordinate.repository}`,
        commit: coordinate.commit,
        packagePath: coordinate.packagePath,
        packageName: inspected.source.packageName,
        packageVersion: inspected.source.packageVersion,
        integrity: inspected.source.integrity,
        artifactIntegrity,
        artifactKind: "github-tarball",
        byteLength: inspected.source.byteLength,
        fileCount: inspected.source.fileCount,
      },
    };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
