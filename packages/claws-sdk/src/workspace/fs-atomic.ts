/**
 * Atomic workspace file writer (CP-7 R1 C4).
 *
 * Shared `atomicWriteFile(absPath, contents, encoding?)` helper used by the
 * HTTP route layer when mutating OC workspace files (HEARTBEAT.md,
 * AGENTS.md, MEMORY.md, SOUL.md). The write pattern is the canonical
 * tmp + rename already proven in {@link trust-manager.writeEnvelopeAtomic}
 * and {@link compiler/emit/atomic-write.atomicWrite}: write to a unique
 * tempfile in the same directory, then `rename()` it onto the target so
 * either the old bytes or the complete new bytes are observable — never a
 * truncated mid-write state.
 *
 * Contract:
 *   1. Target parent directory is created if missing.
 *   2. `fs.writeFile` opens `<target>.tmp-<pid>-<nonce>` fresh — never the
 *      target — so a crash between open and fsync cannot truncate the OC
 *      file on disk.
 *   3. On `rename()` success the tempfile becomes the target atomically
 *      (same-filesystem requirement met because the tempfile sits next to
 *      the target).
 *   4. On any failure the best-effort tempfile sweep removes the partial
 *      so the workspace directory does not accumulate orphans, then the
 *      original error propagates.
 *
 * OC fidelity: this helper is the *write* half of the lossless contract
 * (the *read* half is the parser's byte-for-byte posture). A crash
 * between `writeFile` and `rename` leaves the target untouched — the
 * operator's HEARTBEAT.md / AGENTS.md / MEMORY.md is never truncated by
 * an interrupted PATCH.
 *
 * @module claws-sdk/workspace/fs-atomic
 */

import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

/**
 * Tempfile suffix marker used by {@link atomicWriteFile}. Exported so
 * consumers can identify orphans reliably. Format:
 * `.tmp-<pid>-<hex>` where `<hex>` is 8 random bytes hex-encoded.
 */
export const WORKSPACE_TEMPFILE_MARKER = '.tmp-';

/**
 * Supported text encodings for workspace file writes. OC files are text by
 * contract (MEMORY.md, SOUL.md, HEARTBEAT.md, AGENTS.md, TOOLS.md, etc.)
 * so the default is `utf-8`. Binary writes are out of scope.
 */
export type WorkspaceFileEncoding = 'utf-8' | 'utf8';

/**
 * Write `contents` to `absPath` atomically via tmp + rename.
 *
 * The parent directory is created if needed. On any failure after the
 * tempfile is opened, the tempfile is swept (best-effort) and the
 * original error is re-thrown. Concurrent `atomicWriteFile` calls on the
 * same target are safe — each call uses a unique nonce so the tempfiles
 * do not collide; `rename()` is the only commit point.
 *
 * @param absPath  absolute path to the target file
 * @param contents UTF-8 text to write
 * @param encoding optional text encoding (default `'utf-8'`); OC files
 *                 are always text so callers normally omit this.
 */
export async function atomicWriteFile(
  absPath: string,
  contents: string,
  encoding: WorkspaceFileEncoding = 'utf-8',
): Promise<void> {
  await mkdir(dirname(absPath), { recursive: true });

  const nonce = randomBytes(8).toString('hex');
  const tmpPath = `${absPath}${WORKSPACE_TEMPFILE_MARKER}${process.pid}-${nonce}`;

  try {
    await writeFile(tmpPath, contents, encoding);
    await rename(tmpPath, absPath);
  } catch (err) {
    // Best-effort tempfile sweep. `rm` with `force` swallows ENOENT so a
    // rename-failure after a successful tempfile write still propagates
    // the original error; a tempfile that never existed is a no-op.
    try {
      await rm(tmpPath, { force: true });
    } /* c8 ignore start -- tempfile cleanup failure is swallowed so the original write error still surfaces. */ catch {
      // Cleanup failure is strictly less important than the original
      // write error — swallow and let the original throw below.
    }
    /* c8 ignore stop */
    throw err;
  }
}
