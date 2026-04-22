/**
 * @bic/openclaw-workspace/staging — atomic workspace writer used by
 * `snap checkout` to materialize a snapshot's `files` map onto disk.
 *
 * Pattern (same as claws-sdk pulse 44 `atomicWriteFile`): write to a
 * unique tempfile in the target's parent directory, then `rename()` it
 * onto the final path. A crash between `open` and `rename` leaves the
 * original file untouched, so a half-written canonical OC file is
 * impossible.
 *
 * @module @bic/openclaw-workspace/staging/writeAtomic
 */

import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

const TEMPFILE_MARKER = '.tmp-';

/**
 * Write `contents` to `absPath` atomically via tmp + rename.
 */
export async function writeAtomic(absPath: string, contents: string): Promise<void> {
  await mkdir(dirname(absPath), { recursive: true });
  const nonce = randomBytes(8).toString('hex');
  const tmpPath = `${absPath}${TEMPFILE_MARKER}${process.pid}-${nonce}`;
  try {
    await writeFile(tmpPath, contents, 'utf-8');
    await rename(tmpPath, absPath);
  } catch (err) {
    try {
      await rm(tmpPath, { force: true });
    } catch {
      /* swallow cleanup errors */
    }
    throw err;
  }
}

/**
 * Materialize a `Record<relativePath, utf-8 string>` map onto `<root>`
 * using atomic tmp+rename for each file.  Forward-slash paths in the map
 * are translated to the host path separator via `node:path.join`.
 */
export async function writeSnapshotFiles(
  root: string,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, ...rel.split('/'));
    await writeAtomic(abs, content);
  }
}

/**
 * Remove `<root>/.stage/` recursively. Returns silently when the
 * directory doesn't exist.
 */
export async function clearStage(root: string): Promise<void> {
  const stageRoot = join(root, '.stage');
  await rm(stageRoot, { recursive: true, force: true });
}
