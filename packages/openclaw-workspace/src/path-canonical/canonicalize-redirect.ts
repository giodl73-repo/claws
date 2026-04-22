/**
 * @bic/openclaw-workspace/path-canonical — filesystem-path canonicalizer for
 * `FileIngestProvider.modify.redirectPath` values.
 *
 * Distinct from `@bic/openclaw-workspace/canonicalize` (JCS / RFC 8785): this
 * module deals with Windows/Linux filesystem paths, not with arbitrary JSON.
 * The two canonicalizers MUST NOT be conflated — a consumer that says
 * "canonicalize" without a qualifier is ambiguous and should be corrected.
 *
 * Contract (CL-07 §1a): a raw `redirectPath` supplied by a provider must
 * either resolve to a normalized absolute path under
 * `<workspaceRoot>/.openclaw/.stage/`, or the function returns
 * `{ ok: false, invalidReason }` where `invalidReason` is one of the four
 * values enumerated by `DecisionInvalidReason` for P-03:
 *
 *   - `redirect-path-escape`         — resolves outside the stage dir
 *                                      (classic traversal, absolute paths,
 *                                      UNC, backslash-only separators)
 *   - `redirect-path-short-name`     — Windows 8.3 short-name segment
 *                                      (pattern `~\d+`, e.g. `STAGE~1`)
 *   - `redirect-path-ads`            — NTFS Alternate Data Stream indicator
 *                                      (`:` anywhere after the drive letter)
 *   - `redirect-path-symlink-escape` — after `fs.realpath`, the physical
 *                                      path lies outside the stage dir
 *
 * Steps 1-5 + 7 are pure (no I/O). Step 6 (`fs.realpath`) is the only
 * filesystem-touching step; callers that want a fully pure check pass
 * `{ skipRealpath: true }` and pair the pure result with an integration test
 * that exercises the symlink path on real NTFS.
 *
 * @module @bic/openclaw-workspace/path-canonical
 */

import { realpathSync } from 'node:fs';
import { isAbsolute, normalize, resolve, sep } from 'node:path';

export type RedirectInvalidReason =
  | 'redirect-path-escape'
  | 'redirect-path-short-name'
  | 'redirect-path-ads'
  | 'redirect-path-symlink-escape';

export interface CanonicalizeRedirectOk {
  readonly ok: true;
  /** Absolute, normalized path under `<workspaceRoot>/.openclaw/.stage/`. */
  readonly path: string;
}

export interface CanonicalizeRedirectErr {
  readonly ok: false;
  readonly invalidReason: RedirectInvalidReason;
}

export type CanonicalizeRedirectResult =
  | CanonicalizeRedirectOk
  | CanonicalizeRedirectErr;

export interface CanonicalizeRedirectOptions {
  /**
   * Skip the `fs.realpath` call (step 6). Unit tests that want a pure
   * function without a real filesystem set this true; the integration test
   * at `file-ingest-symlink-escape-prestaged.integration.test.ts` is where
   * the symlink-escape vector is exercised with real NTFS.
   */
  readonly skipRealpath?: boolean;
}

const SHORT_NAME_SEGMENT = /~\d+/;
const STAGE_REL = '.openclaw' + sep + '.stage' + sep;

/**
 * Canonicalize a raw `redirectPath` relative to `workspaceRoot`. See module
 * docstring for the rejection-mode contract.
 *
 * `workspaceRoot` MUST be an absolute path. If it is not, the function still
 * runs but `fs.realpath` step may produce surprising results; callers should
 * normalize upstream.
 */
export function canonicalizeRedirect(
  rawPath: string,
  workspaceRoot: string,
  options: CanonicalizeRedirectOptions = {},
): CanonicalizeRedirectResult {
  // Step 1: reject backslash separators before Node's resolve silently
  // converts them. This catches UNC paths (`\\server\share\...`) and plain
  // Windows-style inputs; providers must send forward-slash paths.
  if (rawPath.includes('\\')) {
    return { ok: false, invalidReason: 'redirect-path-escape' };
  }

  // Step 2: NTFS Alternate Data Stream — any `:` after the drive-letter
  // position. A Windows drive letter appears at index 1 (e.g. `C:/...`);
  // anywhere else, a colon signals ADS.
  if (hasAdsColon(rawPath)) {
    return { ok: false, invalidReason: 'redirect-path-ads' };
  }

  // Step 3: Windows 8.3 short-name segment. Uses `~\d+` (not just `~1`)
  // because Windows generates `~2..~9` on collisions and a regression that
  // matches only `~1` is a silent security gap.
  if (SHORT_NAME_SEGMENT.test(rawPath)) {
    return { ok: false, invalidReason: 'redirect-path-short-name' };
  }

  // Step 4: reject absolute paths — they never satisfy the stage-dir prefix.
  if (isAbsolute(rawPath)) {
    return { ok: false, invalidReason: 'redirect-path-escape' };
  }

  // Step 5: normalize + resolve under the workspace root. `normalize`
  // collapses `.` and `..` segments; `resolve` then anchors to the root so
  // the prefix check in step 7 is meaningful.
  const normalized = normalize(rawPath);
  const resolved = resolve(workspaceRoot, normalized);

  // Step 7 (pre-realpath): logical prefix check. Defeats textual `..`
  // escapes even when the target does not exist yet.
  const stagePrefix = resolve(workspaceRoot) + sep + STAGE_REL;
  if (!isInsideStage(resolved, stagePrefix)) {
    return { ok: false, invalidReason: 'redirect-path-escape' };
  }

  // Step 6: fs.realpath. Symlink escape catches cases where the logical
  // path sits under the stage dir but the physical target (after symlink
  // resolution) does not. Resolve the workspace root through realpath too,
  // so temp-dir aliases (Windows 8.3 / macOS `/tmp -> /private/tmp`)
  // compare cleanly against the realpath-resolved candidate.
  if (options.skipRealpath !== true) {
    try {
      const real = realpathSync.native(resolved);
      let realStagePrefix = stagePrefix;
      try {
        realStagePrefix = realpathSync.native(resolve(workspaceRoot)) + sep + STAGE_REL;
      } catch {
        // Workspace root may not exist on the filesystem; fall back to
        // the logical prefix (equivalent when no alias exists).
      }
      if (!isInsideStage(real, realStagePrefix)) {
        return { ok: false, invalidReason: 'redirect-path-symlink-escape' };
      }
      return { ok: true, path: real };
    } catch {
      // Path does not exist yet — accept the logical-containment result.
      return { ok: true, path: resolved };
    }
  }

  return { ok: true, path: resolved };
}

/**
 * True when `rawPath` carries an NTFS Alternate Data Stream indicator.
 * Windows drive letters occupy positions 0-1 (`C:`); anywhere else a colon
 * is ADS.
 */
function hasAdsColon(rawPath: string): boolean {
  let startIdx = 0;
  // Skip the drive letter prefix (e.g. `C:`) if present. We already
  // rejected absolute paths at step 4, but a provider could submit
  // `c:foo:bar` (drive-relative) — the first colon is drive-letter,
  // any subsequent colon is ADS.
  if (rawPath.length >= 2 && rawPath[1] === ':') {
    startIdx = 2;
  }
  for (let i = startIdx; i < rawPath.length; i++) {
    if (rawPath[i] === ':') return true;
  }
  return false;
}

/**
 * True when `child` is equal to or under `stagePrefix`. Both paths come from
 * `resolve()` (or `realpath`), so no trailing separator; appending `sep`
 * defeats the classic `/foo` vs `/foo-bar` prefix-overlap bug.
 */
function isInsideStage(child: string, stagePrefix: string): boolean {
  const normalizedChild = child + sep;
  return normalizedChild.startsWith(stagePrefix);
}
