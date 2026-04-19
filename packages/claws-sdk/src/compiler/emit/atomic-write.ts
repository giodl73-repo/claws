/**
 * Atomic-write plumbing for emit (CL-04 §IS.7).
 *
 * Write-then-rename so a partial write left by SIGINT is never observable
 * at the target path. `sweepStaleTempfiles` clears orphaned `.tmp-*` files
 * from prior interrupted emits at the start of a new emit so the emit
 * directory never accumulates cruft. Shared infrastructure for pulses 80
 * (per-stage emit), 81 (watch), and 82 (fleet).
 *
 * @module claws-sdk/compiler/emit/atomic-write
 */
import { mkdir, rename, rm, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

/**
 * Tempfile suffix marker used by `atomicWrite`.
 *
 * Exported so consumers (tests, sweepers) can identify orphans reliably.
 * Format: `.tmp-<pid>-<hex>`.
 */
export const TEMPFILE_MARKER = '.tmp-';

/**
 * Anchored pattern matching the full `<target>.tmp-<pid>-<nonce>` suffix.
 * PID is a decimal integer; nonce is 16 lowercase hex chars from
 * `randomBytes(8).toString('hex')`. Anchoring with `$` + strict `\d+` +
 * `[0-9a-f]+` prevents false positives on user-named files like
 * `config.tmp-backup.yaml` or `draft.tmp-sav.md`.
 */
const TEMPFILE_SUFFIX_RE = /\.tmp-\d+-[0-9a-f]+$/;

/**
 * Write `contents` to `path` atomically.
 *
 * Writes to `<path>.tmp-<pid>-<nonce>`, then renames. Parent directory is
 * created as needed. On rename failure the tempfile is swept so interrupted
 * writes do not accumulate. Concurrent `atomicWrite` calls on the same path
 * are safe — each uses a unique nonce; the rename is the only commit point.
 */
export async function atomicWrite(path: string, contents: string): Promise<void> {
  const parent = dirname(path);
  await mkdir(parent, { recursive: true });

  const nonce = randomBytes(8).toString('hex');
  const tempPath = `${path}${TEMPFILE_MARKER}${process.pid}-${nonce}`;

  try {
    await writeFile(tempPath, contents, 'utf-8');
    await rename(tempPath, path);
  } catch (err) {
    // Best-effort cleanup of a half-written tempfile. `rm` with `force`
    // swallows ENOENT so a rename-failure after successful write still
    // propagates; a tempfile that never existed is a no-op.
    try {
      await rm(tempPath, { force: true });
    } /* c8 ignore start -- tempfile cleanup failure is swallowed so the original write error still propagates. */ catch {
      // Cleanup failure is strictly less important than surfacing the
      // original write error — swallow and let the original throw.
    }
    /* c8 ignore stop */
    throw err;
  }
}

/**
 * Remove every `<anything>.tmp-<pid>-<nonce>` file under `emitDir`.
 *
 * Called at emit start to clear orphans from a prior interrupted compile.
 * Missing directory is a no-op. The sweep is non-recursive by design — emit
 * writes all tempfiles in one known location (the target's dirname), and
 * per-stage emitters call this per-directory.
 */
export async function sweepStaleTempfiles(emitDir: string): Promise<number> {
  let entries: readonly string[];
  try {
    entries = await readdir(emitDir);
  } catch (err) {
    if (isENOENT(err)) return 0;
    /* c8 ignore next -- readdir non-ENOENT failures are defensive rethrow. */
    throw err;
  }
  let swept = 0;
  for (const name of entries) {
    if (!TEMPFILE_SUFFIX_RE.test(name)) continue;
    try {
      await rm(join(emitDir, name), { force: true });
      swept += 1;
    } /* c8 ignore start -- race-unlink catch; benign when a concurrent sweeper removes the same tempfile first. */ catch {
      // Another emitter may have raced us to the unlink — benign.
    }
    /* c8 ignore stop */
  }
  return swept;
}

function isENOENT(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ENOENT';
}
