/**
 * path-guard — canonicalize a candidate path and reject escapes from a root.
 *
 * Rejects:
 * - absolute candidates
 * - `..` traversal that resolves outside `root`
 * - Windows 8.3 short-name segments (e.g. `PROGRA~1`)
 * - symlinks whose realpath escapes `root`
 *
 * The root itself is resolved via `fs.realpathSync.native` so comparisons work
 * when the caller passed a tmp-dir with a different case or a junction.
 */

import { realpathSync } from 'node:fs';
import { isAbsolute, resolve, sep } from 'node:path';

export class PathGuardError extends Error {
  constructor(
    message: string,
    public readonly reason:
      | 'absolute'
      | 'traversal'
      | 'short-name'
      | 'symlink-escape',
    public readonly candidate: string,
  ) {
    super(message);
    this.name = 'PathGuardError';
  }
}

const SHORT_NAME_SEGMENT = /(^|[\\/])[^\\/]{1,8}~\d+([^\\/]*)([\\/]|$)/;

/**
 * Canonicalize `candidate` relative to `root` and assert it stays inside.
 * Returns the real, canonical path (symlinks resolved).
 *
 * `candidate` MUST be a path relative to `root`. Absolute candidates are
 * always rejected — if you need to join from an absolute input, strip the
 * root prefix before calling.
 */
export function guardPath(root: string, candidate: string): string {
  if (isAbsolute(candidate)) {
    throw new PathGuardError(
      `absolute paths are not permitted: ${candidate}`,
      'absolute',
      candidate,
    );
  }

  if (SHORT_NAME_SEGMENT.test(candidate)) {
    throw new PathGuardError(
      `Windows 8.3 short-name segment detected: ${candidate}`,
      'short-name',
      candidate,
    );
  }

  // Resolve `root` through realpath so tmp dirs with `/tmp -> /private/tmp`
  // aliases (macOS) and short-name aliases (Windows) compare cleanly below.
  const rootReal = realpathSync.native(resolve(root));
  const joined = resolve(rootReal, candidate);

  // Logical containment check defeats a textual `..` escape even when
  // the target does not exist yet.
  if (!isInside(joined, rootReal)) {
    throw new PathGuardError(
      `path traversal outside root: ${candidate}`,
      'traversal',
      candidate,
    );
  }

  // If the joined target exists, resolve symlinks on it and re-check. For
  // paths that do not yet exist (e.g. a destination we are about to
  // create), the logical-containment check above is sufficient.
  let real = joined;
  try {
    real = realpathSync.native(joined);
  } catch {
    return joined;
  }
  if (!isInside(real, rootReal)) {
    throw new PathGuardError(
      `symlink escapes root: ${candidate} -> ${real}`,
      'symlink-escape',
      candidate,
    );
  }

  return real;
}

function isInside(child: string, parent: string): boolean {
  // Paths come from `resolve()`, which never returns a trailing separator.
  // Appending `sep` to both sides defeats the classic `/foo` vs `/foo-bar`
  // prefix-overlap bug without needing the existence check.
  return (child + sep).startsWith(parent + sep);
}
