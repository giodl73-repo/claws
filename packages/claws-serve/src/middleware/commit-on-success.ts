/**
 * Commit-on-success middleware — advances the workspace version counter
 * and records a compilation snapshot whenever a write handler completes
 * successfully (HTTP 2xx).
 *
 * The middleware is mounted in front of PATCH and POST write routes so
 * it can intercept the response before it is flushed. On a successful
 * write it:
 *
 *   1. Advances the {@link VersionManager} counter and sets the
 *      response `ETag` header to the new value — this is the value the
 *      client must round-trip on its next PATCH.
 *   2. Records a {@link VersionSnapshot} in the {@link VersionStore} so
 *      the time-travel API can serve `?at=v<N>` for the version that
 *      just landed.
 *
 * Both operations are skipped on non-2xx responses; failed writes must
 * not advance the counter, and a stale snapshot would mislead
 * time-travel queries.
 *
 * The middleware exists so the wiring lives outside patch-chunks.ts and
 * batch.ts — those files own their business logic and the HTTP version-
 * tracking concern was added after they were written. Coupling them to
 * VersionManager directly would violate the thin-adapter rule.
 *
 * @module claws-serve/middleware/commit-on-success
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Request, RequestHandler, Response } from 'express';
import type { VersionManager } from '../../../claws-sdk/src/workspace-edit/index.js';
import type { VersionStore } from '../../../claws-sdk/src/workspace/index.js';
import type { CompilationHost } from '../compilation-host.js';
import { commitVersion } from './etag.js';
import { isDryRunRequest } from './dry-run.js';

/** Known OC files whose per-file hashes we capture in the snapshot. */
const CAPTURED_OC_FILES: readonly string[] = [
  'SOUL.md',
  'BODY.md',
  'MIND.md',
  'IDENTITY.md',
  'SETTINGS.md',
  'TOOLS.md',
];

/**
 * Response-locals key for post-edit hashes plumbed from the route handler.
 *
 * Write routes (patch-chunks, batch, allow-all) populate
 * `res.locals[POST_EDIT_HASHES_KEY]` with a `{ [file]: sha256hex }` map
 * for every file the request mutated. The middleware inherits the
 * previous snapshot's hashes for untouched files and only falls back to
 * reading from disk when neither source supplies a hash — eliminating
 * the 6 reads per 2xx write the hot path used to pay (CP-6 R2 M8-R2 /
 * G2).
 *
 * Using a symbol-compatible string key (`__postEditHashes`) keeps the
 * bag typed via the `PostEditHashMap` alias without forcing callers to
 * import a symbol from this module.
 */
export const POST_EDIT_HASHES_KEY = '__postEditHashes' as const;

/** Shape of the post-edit hashes bag route handlers plumb to the middleware. */
export type PostEditHashMap = Readonly<Record<string, string>>;

/**
 * Populate `res.locals[POST_EDIT_HASHES_KEY]` from a write route handler.
 *
 * `hashes` keys are file basenames (e.g. `'TOOLS.md'`) and values are
 * hex-encoded sha256 digests of the post-edit content. Unknown keys are
 * ignored by {@link recordSnapshot}. Calling this more than once on the
 * same response merges into any previously-stamped map — routes that
 * touch multiple files across helper calls can accumulate without
 * clobbering earlier entries.
 */
export function stampPostEditHashes(
  res: Response,
  hashes: PostEditHashMap,
): void {
  const existing = res.locals[POST_EDIT_HASHES_KEY] as PostEditHashMap | undefined;
  res.locals[POST_EDIT_HASHES_KEY] = { ...existing, ...hashes };
}

/** Options for {@link commitOnSuccess}. */
export interface CommitOnSuccessOptions {
  readonly manager: VersionManager;
  readonly store: VersionStore;
  readonly host: CompilationHost;
  readonly workspaceRoot: string;
  /**
   * Optional clock override for deterministic `compiledAt` in tests.
   * Defaults to `() => new Date()`.
   */
  readonly now?: () => Date;
}

/**
 * Build the commit-on-success middleware. Must be mounted AFTER
 * {@link requireIfMatch} so stale-ETag PATCHes are rejected before the
 * counter ever advances.
 */
export function commitOnSuccess(
  options: CommitOnSuccessOptions,
): RequestHandler {
  return (req, res, next): void => {
    if (req.method !== 'PATCH' && req.method !== 'POST') {
      next();
      return;
    }

    // Dry-run PATCH/POST must have ZERO state mutation: no counter
    // advance, no VersionStore snapshot (CP-6 R2 finding H2). The
    // `dryRunMiddleware` stamps `req.isDryRun` upstream; here we bypass
    // the wrapper entirely so `res.json`/`res.send` behave normally.
    //
    // Note: on the main write path, `commitOnSuccess` is mounted BEFORE
    // the per-prefix `dryRunMiddleware` runs, so `req.isDryRun` is not
    // yet populated at middleware-entry time. We therefore read the
    // flag lazily inside `commitIfSuccess` (by which point the handler
    // has already run and the flag is set) as well as checking here as
    // a fast path for tests that mount dry-run before commit-on-success.
    if (isDryRunRequest(req as Request)) {
      next();
      return;
    }

    // We have to intercept before `res.end` flushes headers. Wrap `json`
    // and `send` so we can inspect the status code and advance the
    // version ahead of the body going out.
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    let committed = false;

    const commitIfSuccess = async (): Promise<void> => {
      if (committed) return;
      committed = true;
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      // Re-check the dry-run flag now that the upstream middleware has
      // had a chance to stamp it. `commit-on-success` is mounted at
      // `app.patch('/api/chunks/*', ...)` BEFORE the
      // `prefixes.chunks.patch('*', dryRunMiddleware())` mount, so the
      // flag is populated AFTER this middleware's `next()` returned but
      // BEFORE the handler calls `res.json` / `res.send`.
      if (isDryRunRequest(req as Request)) return;
      try {
        const version = await commitVersion(options.manager, res);
        await recordSnapshot(options, version, res);
      } catch (err) {
        // Commit failures must not corrupt the response. Log + surface a
        // header so operators can see the counter skipped ahead.
        // eslint-disable-next-line no-console
        console.error('commit-on-success failed:', err);
        res.set('X-Version-Commit-Error', '1');
      }
    };

    // Wrap json/send so commitIfSuccess runs synchronously-ish before
    // the response is serialised. Express's json() calls send() under
    // the hood, so we only need to intercept send — but we wrap both
    // for safety across Express versions.
    //
    // Ordering (CP-6 R2 finding H4): body serialisation runs BEFORE the
    // counter advances. We pre-flight `JSON.stringify(body)` so a
    // non-serialisable payload (circular reference, BigInt, throwing
    // `toJSON`) throws synchronously back to the handler WITHOUT
    // advancing the version counter or recording a snapshot. If the
    // pre-flight succeeds we still run `commitIfSuccess` ahead of the
    // real flush so the `ETag` header lands on the response.
    const wrappedJson = function (this: Response, body?: unknown): Response {
      // Pre-flight: throw before any state mutation if the body cannot
      // be serialised. Express's `res.json` will call `JSON.stringify`
      // again once the commit resolves; the double-serialise cost is a
      // ms at most and the ordering guarantee is worth it.
      JSON.stringify(body);
      void commitIfSuccess().then(() => {
        originalJson(body);
      });
      return res;
    };

    const wrappedSend = function (this: Response, body?: unknown): Response {
      // `res.send` stringifies objects through `res.json` and streams
      // primitives directly. Pre-flight the object case; primitives
      // (string, Buffer) serialise unconditionally.
      if (
        body !== null &&
        body !== undefined &&
        typeof body === 'object' &&
        !Buffer.isBuffer(body)
      ) {
        JSON.stringify(body);
      }
      void commitIfSuccess().then(() => {
        originalSend(body);
      });
      return res;
    };

    // Types are compatible but express's overloads fight us; cast once.
    (res as unknown as { json: typeof wrappedJson }).json = wrappedJson;
    (res as unknown as { send: typeof wrappedSend }).send = wrappedSend;

    next();
  };
}

async function recordSnapshot(
  options: CommitOnSuccessOptions,
  version: number,
  res: Response,
): Promise<void> {
  // Pull the current IR. The write handler triggered a recompile, so the
  // CompilationHost cache is already populated with post-edit state.
  const cached = options.host.getCachedIR();
  if (cached === undefined) {
    // No IR means the write landed but the recompile failed — skip the
    // snapshot rather than record a stale IR against the new version.
    return;
  }

  // CP-6 R2 M8-R2 / G2: the previous snapshot (if any) already carries
  // SHA-256 hashes for every CAPTURED_OC_FILE in the workspace. The
  // route handler supplies post-edit hashes for the files the current
  // request mutated via `res.locals[POST_EDIT_HASHES_KEY]`. Inheriting
  // from the prior snapshot for untouched files and overlaying the
  // post-edit hashes for touched files yields a complete `fileHashes`
  // map with zero disk reads in steady state — the BatchExecutor /
  // StructuredEditor already paid the disk-read cost during the write
  // and surfaced the hashes to the route handler, so re-reading here
  // would double the Windows antivirus scan latency on the response
  // hot path.
  //
  // Fallback to disk-read happens only for files that neither the prior
  // snapshot nor the current request supplies — typically the very
  // first write after server startup, before any snapshot exists.
  const inherited = inheritPreviousHashes(options.store, version);
  const postEdit = (res.locals[POST_EDIT_HASHES_KEY] as PostEditHashMap | undefined) ?? {};

  const fileHashes: Record<string, string> = {};
  for (const name of CAPTURED_OC_FILES) {
    const fromEdit = postEdit[name];
    if (typeof fromEdit === 'string' && fromEdit.length > 0) {
      fileHashes[name] = fromEdit;
      continue;
    }
    const fromPrevious = inherited[name];
    if (typeof fromPrevious === 'string' && fromPrevious.length > 0) {
      fileHashes[name] = fromPrevious;
      continue;
    }
    // Cold path: no prior snapshot and route handler didn't publish a
    // hash for this file. Fall back to a disk read so the snapshot is
    // still complete (drift detection depends on it).
    try {
      const content = await readFile(join(options.workspaceRoot, name), 'utf-8');
      fileHashes[name] = sha256(content);
    } catch {
      // Missing file is fine — OC files are optional per workspace.
    }
  }
  const clock = options.now ?? ((): Date => new Date());
  options.store.record({
    version,
    compiledAt: clock().toISOString(),
    fileHashes,
    governanceIR: cached,
  });
}

/**
 * Return the `fileHashes` map from the highest-versioned snapshot that is
 * strictly lower than `newVersion`. Falls back to an empty map when no
 * such snapshot is retained — e.g. the first write on a fresh server, or
 * after the prior snapshot was evicted by `DEFAULT_MAX_VERSIONS`.
 *
 * This is the cheap, deterministic counterpart to the old `fs.readFile`
 * loop: the previous snapshot's hashes are already in memory, so walking
 * backwards is O(retained window) and never blocks on I/O.
 */
function inheritPreviousHashes(
  store: CommitOnSuccessOptions['store'],
  newVersion: number,
): Readonly<Record<string, string>> {
  // Walk from newVersion-1 down; the store's `available()` range bounds
  // the loop. Evicted entries return `kind: 'evicted'` without a
  // snapshot — skip them. `out_of_range` means we've walked past the
  // retained window and can stop.
  const range = store.available();
  if (range.min === null || range.max === null) return {};
  const start = Math.min(newVersion - 1, range.max);
  for (let v = start; v >= range.min; v -= 1) {
    const lookup = store.get(v);
    if (lookup.kind === 'found') {
      return lookup.snapshot.fileHashes;
    }
    if (lookup.kind === 'out_of_range') {
      return {};
    }
    // 'evicted' — keep walking; an earlier-still version may still exist.
  }
  return {};
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}
