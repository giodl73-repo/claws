/**
 * Companion file path conventions for the FS-backed LKG impl.
 *
 *   <path>      = the active file the tracker protects
 *   <path>.lkg  = companion holding the most-recent promoted-good bytes
 *   <path>.clobbered.<ts> = preserved bad bytes after a recovery event
 *
 * Mirrors the existing config-LKG shape so callers familiar with
 * `recoverConfigFromLastKnownGood` find the same on-disk layout.
 *
 * @module @openclaw/lkg-fs/paths
 */

const COMPANION_SUFFIX = '.lkg';
const CLOBBERED_PREFIX = '.clobbered.';

/** `<path>.lkg` — companion holding most-recent promoted-good bytes. */
export function lkgPathFor(activePath: string): string {
  return activePath + COMPANION_SUFFIX;
}

/**
 * `<path>.clobbered.<ts>` — preserved bad bytes after a recovery
 * event. `ts` is an ISO-8601 timestamp with `:` and `.` replaced
 * (filesystem-safe).
 */
export function clobberedPathFor(activePath: string, observedAt: string): string {
  const fsSafeTs = observedAt.replace(/[:.]/g, '-');
  return `${activePath}${CLOBBERED_PREFIX}${fsSafeTs}`;
}

/** True iff `path` is one of the LKG-managed companion files. */
export function isCompanionPath(path: string): boolean {
  return path.endsWith(COMPANION_SUFFIX) || path.includes(CLOBBERED_PREFIX);
}
