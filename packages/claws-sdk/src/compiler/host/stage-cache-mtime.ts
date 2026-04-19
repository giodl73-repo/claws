/**
 * mtime fast-path for per-stage caches (CL-04 §IS.1, S01-F04).
 *
 * Before re-hashing a reader's input content, stat it and compare against
 * the stored mtime. When unchanged, the caller can skip content hashing
 * and short-circuit directly from the stored cache entry. Content hash
 * remains the authoritative correctness check — mtime is a hint only, so
 * a touch-without-edit never produces a wrong cache hit (the downstream
 * hash comparison still catches it).
 *
 * @module claws-sdk/compiler/host/stage-cache-mtime
 */
import { stat } from 'node:fs/promises';

/**
 * Outcome of the mtime fast-path check.
 *
 * `unchanged` — stored mtime matches current; caller may skip re-hash.
 * `changed`   — mtime differs; caller must re-hash and re-enter cache.
 * `missing`   — input file no longer exists; caller should treat as miss.
 */
export type MtimeStatus = 'unchanged' | 'changed' | 'missing';

/**
 * Compare the on-disk mtime of `filePath` against a stored `storedMtimeMs`.
 *
 * Returns `'missing'` when the file has been deleted since the cache was
 * populated (ENOENT). On any other I/O error the function rethrows so the
 * caller surfaces a real problem rather than silently forcing a miss.
 */
export async function mtimeFastPath(
  filePath: string,
  storedMtimeMs: number | undefined,
): Promise<MtimeStatus> {
  if (storedMtimeMs === undefined) return 'changed';
  let currentMs: number;
  try {
    const s = await stat(filePath);
    currentMs = s.mtimeMs;
  } catch (err) {
    if (isENOENT(err)) return 'missing';
    /* c8 ignore next -- stat non-ENOENT failures are defensive rethrow. */
    throw err;
  }
  return currentMs === storedMtimeMs ? 'unchanged' : 'changed';
}

function isENOENT(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ENOENT';
}
