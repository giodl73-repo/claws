import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isCanonicalClawHubPackageName, isExactSemVer } from "@claws/reference-private";
import { extractArchive } from "@openclaw/fs-safe/archive";
import { CliError } from "./errors.js";
import { inspectLocalPackage } from "./source.js";
import type { LocalClawPackage } from "./types.js";

const CLAWHUB_FEED_PATH = "/api/v1/feeds/claws";
const CLAWHUB_FEED_ID = "clawhub-official-claws";
const MAX_FEED_BYTES = 2 * 1024 * 1024;
const MAX_METADATA_BYTES = 256 * 1024;
const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 50 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 10_000;
const REQUEST_TIMEOUT_MS = 30_000;
const EXTRACT_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 3;
const MAX_FEED_CLOCK_SKEW_MS = 5 * 60 * 1000;

type Fetch = typeof fetch;

type ExactClawHubCoordinate = {
  ref: string;
  packageName: string;
  version: string;
};

type FeedCandidate = ExactClawHubCoordinate & {
  integrity: string;
};

type ArtifactMetadata = {
  packageName: string;
  version: string;
  kind: "legacy-zip" | "npm-pack";
  downloadUrl: URL;
  sha256?: string;
  size?: number;
};

export type RemoteSourceOptions = {
  env?: NodeJS.ProcessEnv;
  fetch?: Fetch;
  now?: () => number;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function fail(code: string, message: string, path?: string): never {
  throw new CliError({ code, phase: "source", message, ...(path ? { path } : {}) });
}

export function parseExactClawHubCoordinate(input: string): ExactClawHubCoordinate | undefined {
  if (!input.startsWith("clawhub:")) {
    return undefined;
  }
  const requested = input.slice("clawhub:".length);
  const separator = requested.lastIndexOf("@");
  const scopedSlash = requested.startsWith("@") ? requested.indexOf("/") : -1;
  if (separator <= 0 || separator <= scopedSlash) {
    fail(
      "invalid_clawhub_coordinate",
      "ClawHub sources must include a canonical package name and exact version.",
      input,
    );
  }
  const packageName = requested.slice(0, separator);
  const version = requested.slice(separator + 1);
  if (!isCanonicalClawHubPackageName(packageName) || !isExactSemVer(version)) {
    fail(
      "invalid_clawhub_coordinate",
      "ClawHub sources must use clawhub:<package>@<exact-semver>.",
      input,
    );
  }
  return { ref: input, packageName, version };
}

function resolveRegistry(env: NodeJS.ProcessEnv): URL {
  const raw = env.CLAWHUB_REGISTRY_URL?.trim();
  if (!raw) {
    fail(
      "clawhub_registry_required",
      "CLAWHUB_REGISTRY_URL is required until the experimental ClawHub feed is deployed.",
    );
  }
  let registry: URL;
  try {
    registry = new URL(raw);
  } catch {
    fail("invalid_clawhub_registry", "CLAWHUB_REGISTRY_URL must be an absolute HTTP URL.", raw);
  }
  const localHttp =
    registry.protocol === "http:" &&
    (registry.hostname === "localhost" ||
      registry.hostname === "127.0.0.1" ||
      registry.hostname === "[::1]");
  if (
    (registry.protocol !== "https:" && !localHttp) ||
    registry.username ||
    registry.password ||
    registry.search ||
    registry.hash
  ) {
    fail(
      "invalid_clawhub_registry",
      "The ClawHub registry must use HTTPS, except for an explicit loopback development URL.",
      raw,
    );
  }
  registry.pathname = registry.pathname.replace(/\/$/, "");
  return registry;
}

function registryUrl(registry: URL, path: string): URL {
  const prefix = registry.pathname === "/" ? "" : registry.pathname.replace(/\/$/, "");
  return new URL(`${prefix}${path}`, registry.origin);
}

function registryRelativeUrl(registry: URL, value: string): URL {
  const base = new URL(registry);
  base.pathname = `${base.pathname.replace(/\/$/, "")}/`;
  return new URL(value, base);
}

async function fetchSameOrigin(
  fetchImpl: Fetch,
  registry: URL,
  initialUrl: URL,
  accept: string,
): Promise<Response> {
  let url = initialUrl;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    if (url.origin !== registry.origin) {
      fail(
        "untrusted_clawhub_url",
        "ClawHub responses may not redirect off registry origin.",
        url.href,
      );
    }
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: { accept },
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      fail(
        "clawhub_request_failed",
        `ClawHub request failed: ${error instanceof Error ? error.message : String(error)}`,
        url.href,
      );
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) {
        fail("invalid_clawhub_redirect", "ClawHub returned an invalid redirect.", url.href);
      }
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) {
      fail("clawhub_request_failed", `ClawHub returned HTTP ${response.status}.`, url.href);
    }
    return response;
  }
  fail("invalid_clawhub_redirect", "ClawHub exceeded the redirect limit.", initialUrl.href);
}

async function readBounded(response: Response, maxBytes: number, label: string): Promise<Buffer> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    fail("clawhub_response_too_large", `${label} exceeds ${maxBytes} bytes.`);
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
        "clawhub_request_failed",
        `${label} response failed while streaming: ${error instanceof Error ? error.message : String(error)}`,
        response.url || undefined,
      );
    }
    if (result.done) {
      break;
    }
    bytes += result.value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      fail("clawhub_response_too_large", `${label} exceeds ${maxBytes} bytes.`);
    }
    chunks.push(Buffer.from(result.value));
  }
  return Buffer.concat(chunks, bytes);
}

async function fetchJson(
  fetchImpl: Fetch,
  registry: URL,
  url: URL,
  maxBytes: number,
  label: string,
): Promise<unknown> {
  const response = await fetchSameOrigin(fetchImpl, registry, url, "application/json");
  const bytes = await readBounded(response, maxBytes, label);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail("invalid_clawhub_response", `${label} is not valid UTF-8 JSON.`, url.href);
  }
}

function resolveFeedCandidate(
  value: unknown,
  coordinate: ExactClawHubCoordinate,
  now: number,
): FeedCandidate {
  const feed = asRecord(value);
  if (
    feed?.schemaVersion !== 1 ||
    feed.id !== CLAWHUB_FEED_ID ||
    !Array.isArray(feed.entries) ||
    typeof feed.generatedAt !== "string" ||
    typeof feed.expiresAt !== "string" ||
    typeof feed.sequence !== "number" ||
    !Number.isSafeInteger(feed.sequence) ||
    feed.sequence < 0 ||
    !Number.isFinite(Date.parse(feed.generatedAt)) ||
    !Number.isFinite(Date.parse(feed.expiresAt))
  ) {
    fail("invalid_clawhub_feed", "ClawHub returned an invalid experimental Claws feed.");
  }
  if (Date.parse(feed.expiresAt) <= Date.parse(feed.generatedAt)) {
    fail("invalid_clawhub_feed", "The ClawHub feed validity window is invalid.");
  }
  if (Date.parse(feed.generatedAt) > now + MAX_FEED_CLOCK_SKEW_MS) {
    fail("future_clawhub_feed", "The experimental Claws feed is not active yet.");
  }
  if (Date.parse(feed.expiresAt) <= now) {
    fail("expired_clawhub_feed", "The experimental Claws feed has expired.");
  }
  const entry = feed.entries
    .map(asRecord)
    .find(
      (candidate) =>
        candidate?.id === coordinate.packageName && candidate.version === coordinate.version,
    );
  const publisher = asRecord(entry?.publisher);
  const install = asRecord(entry?.install);
  const candidates = Array.isArray(install?.candidates) ? install.candidates : [];
  if (
    !entry ||
    entry.type !== "claw" ||
    publisher?.trust !== "official" ||
    candidates.length !== 1
  ) {
    fail(
      "clawhub_package_not_found",
      "The exact Claw is not present as one official feed candidate.",
      coordinate.ref,
    );
  }
  if (entry.state !== "available" && entry.state !== "recommended") {
    fail(
      "clawhub_package_unavailable",
      `The exact Claw is ${String(entry.state)}.`,
      coordinate.ref,
    );
  }
  const candidate = asRecord(candidates[0]);
  const integrity = candidate?.integrity;
  if (
    candidate?.sourceRef !== "public-clawhub" ||
    candidate.package !== coordinate.packageName ||
    candidate.version !== coordinate.version ||
    typeof integrity !== "string" ||
    !/^sha256:[0-9a-f]{64}$/.test(integrity)
  ) {
    fail("invalid_clawhub_feed", "The Claw feed candidate is not exactly integrity-bound.");
  }
  return { ...coordinate, integrity };
}

function parseArtifactMetadata(
  value: unknown,
  candidate: FeedCandidate,
  registry: URL,
): ArtifactMetadata {
  const response = asRecord(value);
  const packageValue = asRecord(response?.package);
  const artifact = asRecord(response?.artifact);
  const kind = artifact?.kind;
  if (
    packageValue?.name !== candidate.packageName ||
    packageValue.family !== "claw" ||
    response?.version !== candidate.version ||
    !artifact ||
    (kind !== "legacy-zip" && kind !== "npm-pack") ||
    typeof artifact.downloadUrl !== "string"
  ) {
    fail("invalid_clawhub_artifact", "ClawHub returned mismatched artifact metadata.");
  }
  const downloadUrl = registryRelativeUrl(registry, artifact.downloadUrl);
  if (downloadUrl.origin !== registry.origin) {
    fail(
      "untrusted_clawhub_url",
      "The Claw artifact URL must remain on registry origin.",
      downloadUrl.href,
    );
  }
  const sha256 = artifact.sha256;
  const size = artifact.size;
  if (sha256 !== undefined && (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/.test(sha256))) {
    fail("invalid_clawhub_artifact", "Artifact metadata contains an invalid SHA-256 digest.");
  }
  if (size !== undefined && (typeof size !== "number" || !Number.isSafeInteger(size) || size < 0)) {
    fail("invalid_clawhub_artifact", "Artifact metadata contains an invalid size.");
  }
  return {
    packageName: candidate.packageName,
    version: candidate.version,
    kind,
    downloadUrl,
    ...(sha256 ? { sha256 } : {}),
    ...(typeof size === "number" ? { size } : {}),
  };
}

async function findExtractedPackageRoot(extractDir: string): Promise<string> {
  try {
    if ((await stat(join(extractDir, "package.json"))).isFile()) {
      return extractDir;
    }
  } catch {}
  // ClawHub's install-ready ZIP convention uses package/ as the package root.
  // Safe top-level compatibility files are not part of the installed package.
  const conventionalRoot = join(extractDir, "package");
  try {
    if ((await stat(join(conventionalRoot, "package.json"))).isFile()) {
      return conventionalRoot;
    }
  } catch {}
  const entries = await readdir(extractDir, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory());
  if (directories.length === 1 && entries.length === 1) {
    const nested = join(extractDir, directories[0]!.name);
    try {
      if ((await stat(join(nested, "package.json"))).isFile()) {
        return nested;
      }
    } catch {}
  }
  fail(
    "invalid_clawhub_archive_root",
    "The ClawHub artifact must contain one package root with package.json.",
  );
}

async function resolveRemotePackage(
  coordinate: ExactClawHubCoordinate,
  options: RemoteSourceOptions,
): Promise<LocalClawPackage> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetch ?? fetch;
  const registry = resolveRegistry(env);
  const feedUrl = registryUrl(registry, CLAWHUB_FEED_PATH);
  const feed = await fetchJson(fetchImpl, registry, feedUrl, MAX_FEED_BYTES, "ClawHub feed");
  const candidate = resolveFeedCandidate(feed, coordinate, (options.now ?? Date.now)());
  const artifactUrl = registryUrl(
    registry,
    `/api/v1/packages/${encodeURIComponent(candidate.packageName)}/versions/${encodeURIComponent(candidate.version)}/artifact`,
  );
  const metadata = parseArtifactMetadata(
    await fetchJson(fetchImpl, registry, artifactUrl, MAX_METADATA_BYTES, "artifact metadata"),
    candidate,
    registry,
  );
  const archiveResponse = await fetchSameOrigin(
    fetchImpl,
    registry,
    metadata.downloadUrl,
    "application/octet-stream",
  );
  const archiveBytes = await readBounded(archiveResponse, MAX_ARCHIVE_BYTES, "Claw artifact");
  const artifactIntegrity = `sha256:${createHash("sha256").update(archiveBytes).digest("hex")}`;
  if (artifactIntegrity !== candidate.integrity) {
    fail("clawhub_integrity_mismatch", "Downloaded Claw bytes do not match the feed digest.");
  }
  if (
    metadata.kind === "npm-pack" &&
    metadata.sha256 &&
    `sha256:${metadata.sha256}` !== artifactIntegrity
  ) {
    fail("clawhub_integrity_mismatch", "Downloaded Claw bytes do not match artifact metadata.");
  }
  if (
    metadata.kind === "npm-pack" &&
    metadata.size !== undefined &&
    metadata.size !== archiveBytes.byteLength
  ) {
    fail("clawhub_integrity_mismatch", "Downloaded Claw size does not match artifact metadata.");
  }

  const tempRoot = await mkdtemp(join(tmpdir(), "claws-clawhub-"));
  try {
    const archivePath = join(
      tempRoot,
      metadata.kind === "npm-pack" ? "package.tgz" : "package.zip",
    );
    const extractDir = join(tempRoot, "extracted");
    await mkdir(extractDir);
    await writeFile(archivePath, archiveBytes, { flag: "wx" });
    try {
      await extractArchive({
        archivePath,
        destDir: extractDir,
        kind: metadata.kind === "npm-pack" ? "tar" : "zip",
        tarGzip: metadata.kind === "npm-pack",
        stripComponents: metadata.kind === "npm-pack" ? 1 : 0,
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
        "unsafe_clawhub_archive",
        `ClawHub artifact extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const inspected = await inspectLocalPackage(await findExtractedPackageRoot(extractDir));
    if (
      inspected.source.packageName !== candidate.packageName ||
      inspected.source.packageVersion !== candidate.version
    ) {
      fail(
        "clawhub_identity_mismatch",
        "Extracted package identity does not match the feed candidate.",
      );
    }
    return {
      ...inspected,
      source: {
        kind: "clawhub-package",
        ref: candidate.ref,
        registry: registry.origin + (registry.pathname === "/" ? "" : registry.pathname),
        packageName: candidate.packageName,
        packageVersion: candidate.version,
        integrity: inspected.source.integrity,
        artifactIntegrity,
        artifactKind: metadata.kind,
        byteLength: inspected.source.byteLength,
        fileCount: inspected.source.fileCount,
      },
    };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export async function inspectClawSource(
  input: string,
  options: RemoteSourceOptions = {},
): Promise<LocalClawPackage> {
  const coordinate = parseExactClawHubCoordinate(input);
  return coordinate ? resolveRemotePackage(coordinate, options) : inspectLocalPackage(input);
}
