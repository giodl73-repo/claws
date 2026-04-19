/**
 * VersionManager — monotonic workspace version counter for ETag-based
 * optimistic concurrency.
 *
 * Every successful PATCH advances the counter; GET responses surface the
 * current value in an `ETag` header. PATCH requests carry the expected
 * value in `If-Match`; a mismatch is a VERSION_CONFLICT (409 on the wire).
 *
 * The counter persists to `.claws/cache/version.json` so the version
 * survives server restarts and reconnecting SSE clients can reconcile
 * against a stable anchor.
 *
 * Business logic lives here; the Express middleware in claws-serve is a
 * thin HTTP adapter.
 *
 * @module claws-sdk/workspace-edit/versioning
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const VERSION_DIR = '.claws/cache';
const VERSION_FILE = 'version.json';

/** Persisted shape of `.claws/cache/version.json`. */
export interface WorkspaceVersion {
  /** Monotonically increasing counter; starts at 0, never resets at runtime. */
  readonly version: number;
  /** ISO 8601 timestamp of the last increment. */
  readonly updatedAt: string;
}

/**
 * Result of {@link VersionManager.checkVersion}. Either the expected ETag
 * matches the current version, or it does not — in which case the
 * structured error carries both sides so the HTTP adapter can render a
 * 409 body without re-reading the counter.
 */
export type VersionCheckResult =
  | { readonly match: true; readonly current: number }
  | { readonly match: false; readonly error: VersionConflictError };

/**
 * VERSION_CONFLICT error surface. Not part of the {@link PatchError} union
 * because it is raised by the transport layer (If-Match check) before any
 * validation runs.
 */
export interface VersionConflictError {
  readonly code: 'VERSION_CONFLICT';
  readonly message: string;
  /** Server-side version at the time of the check. */
  readonly current: number;
  /** Client-supplied value parsed from `If-Match`. */
  readonly expected: number;
}

/** Parse an `If-Match` header value into a number; returns null when malformed. */
export function parseETag(header: string | undefined): number | null {
  if (header === undefined) return null;
  const trimmed = header.trim();
  if (trimmed.length === 0) return null;
  // Strip surrounding double quotes per RFC 7232 — partners may send
  // either `"7"` or `7`; accept both so UI code stays simple.
  const unquoted = trimmed.startsWith('"') && trimmed.endsWith('"')
    ? trimmed.slice(1, -1)
    : trimmed;
  if (!/^\d+$/.test(unquoted)) return null;
  const parsed = parseInt(unquoted, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

/** Format a version number as a strong ETag value per RFC 7232. */
export function formatETag(version: number): string {
  return `"${String(version)}"`;
}

export interface VersionManagerOptions {
  readonly workspaceRoot: string;
  /** Starting version when no persisted file exists. Defaults to 0. */
  readonly initial?: number;
}

/**
 * Monotonic version counter backed by `.claws/cache/version.json`.
 *
 * Call {@link load} at server startup to hydrate the in-memory counter
 * from disk. Each successful PATCH calls {@link increment} (which
 * persists the new value). Validation middleware calls
 * {@link checkVersion} with the parsed `If-Match` value before delegating
 * to the write handler.
 */
export class VersionManager {
  private readonly workspaceRoot: string;
  private current: number;
  /**
   * Serialises {@link incrementVersion} + {@link persistVersion} into a
   * single chained promise. Without this chain, two concurrent PATCH
   * handlers can each read `current`, each bump in memory, and each
   * race their `persistVersion()` writes — leaving the disk value
   * non-deterministic and the in-memory counter advanced by +2 while
   * the file may carry only one of the two writes. The chain ensures
   * persist completes for increment N before increment N+1 starts.
   */
  private mutexTail: Promise<unknown> = Promise.resolve();

  constructor(options: VersionManagerOptions) {
    this.workspaceRoot = options.workspaceRoot;
    this.current = options.initial ?? 0;
  }

  /** Current version. Read-only accessor; never mutates state. */
  getVersion(): number {
    return this.current;
  }

  /**
   * Advance the counter and persist. Returns the new version so callers
   * can emit it in the response ETag or SSE payload without a follow-up
   * read.
   *
   * Concurrent callers observe strict monotonicity: each caller gets a
   * unique version, persists sequentially, and no increment's persist
   * runs interleaved with another's. Implemented via a chained-promise
   * mutex — the bump and the persist happen inside the same task so no
   * other caller can see the new `current` until the file write lands.
   */
  async incrementVersion(): Promise<number> {
    // Chain onto whatever is already pending. Each caller awaits its
    // predecessor's persist before bumping — this is the invariant
    // B1 relies on. Errors in one task do not poison the chain: the
    // IIFE swallows predecessor rejections with an empty catch so our
    // own bump still runs, and the tail is replaced with a sentinel
    // that cannot reject.
    const prev = this.mutexTail;
    const next = (async (): Promise<number> => {
      try {
        await prev;
      } catch {
        /* predecessor failed; we still proceed with our own bump */
      }
      this.current += 1;
      const assigned = this.current;
      await this.persistVersion();
      return assigned;
    })();
    // Tail handle is reject-tolerant: a rejected `next` becomes a
    // resolved `undefined` so subsequent callers' `await prev` paths
    // take the happy branch.
    this.mutexTail = next.then(
      (): undefined => undefined,
      (): undefined => undefined,
    );
    return next;
  }

  /**
   * Compare `expected` (from `If-Match`) against the in-memory counter.
   * Returns a discriminated union so callers do not have to branch on
   * null to form the error body.
   */
  checkVersion(expected: number): VersionCheckResult {
    if (expected === this.current) {
      return { match: true, current: this.current };
    }
    return {
      match: false,
      error: {
        code: 'VERSION_CONFLICT',
        message: `version mismatch: expected ${String(expected)}, current ${String(this.current)}`,
        current: this.current,
        expected,
      },
    };
  }

  /**
   * Write the current value to `.claws/cache/version.json`. Creates the
   * cache directory if it does not yet exist. Callers rarely invoke this
   * directly — {@link incrementVersion} already persists.
   */
  async persistVersion(): Promise<void> {
    const payload: WorkspaceVersion = {
      version: this.current,
      updatedAt: new Date().toISOString(),
    };
    const dir = join(this.workspaceRoot, VERSION_DIR);
    await mkdir(dir, { recursive: true });
    const path = join(dir, VERSION_FILE);
    await writeFile(path, JSON.stringify(payload, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });
  }

  /**
   * Read the persisted counter. Missing, empty, or malformed files fall
   * back to the constructor's `initial` value so a fresh workspace starts
   * cleanly and a corrupted file does not crash startup.
   */
  async loadVersion(): Promise<number> {
    const path = join(this.workspaceRoot, VERSION_DIR, VERSION_FILE);
    try {
      const raw = await readFile(path, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<WorkspaceVersion>;
      if (typeof parsed.version !== 'number' || parsed.version < 0 || !Number.isFinite(parsed.version)) {
        return this.current;
      }
      // Monotonicity: never regress to a lower value than what is already
      // in memory. If disk disagrees (e.g., manual tampering), the greater
      // of the two wins so in-flight PATCH ETags keep lining up.
      if (parsed.version > this.current) {
        this.current = parsed.version;
      }
      return this.current;
    } catch {
      return this.current;
    }
  }
}
