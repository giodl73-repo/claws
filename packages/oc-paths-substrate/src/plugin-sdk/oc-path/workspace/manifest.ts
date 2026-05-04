/**
 * Workspace manifest builder — walks a workspace directory and
 * assigns every canonical openclaw artifact its `oc://...` URI.
 *
 * In-memory only: no on-disk manifest format, no canonical filename
 * to defend with maintainers. Built dynamically from the directory
 * + the role list from `./roles.js`. Consumers (oc-lint host walker,
 * oc-doctor host walker, lkg-recovery's `registerOpenClawWorkspace`,
 * gateway config loaders) all read the same manifest so a single
 * walk feeds the whole toolchain.
 *
 * @module @openclaw/oc-path/workspace/manifest
 */

import { promises as fs, type Dirent } from 'node:fs';
import { join, relative } from 'node:path';
import type { OcKind } from '../dispatch.js';
import type { OcPath } from '../oc-path.js';
import { OPENCLAW_WORKSPACE_ROLES, type OpenClawWorkspaceRole } from './roles.js';

/**
 * One entry in the workspace manifest — a canonical openclaw artifact
 * with its filesystem path, workspace-relative path, role, and the
 * derived `oc://...` URI for cross-substrate addressing.
 */
export interface WorkspaceManifestEntry {
  /** Absolute filesystem path. */
  readonly path: string;
  /** Workspace-relative path with forward slashes. */
  readonly relPath: string;
  /** Role this file plays in the openclaw toolchain. */
  readonly role: OpenClawWorkspaceRole;
  /** Structured oc:// path object — `{ file: relPath }`. */
  readonly ocPath: OcPath;
  /** String form of the oc:// URI — `oc://<relPath>`. */
  readonly ocPathString: string;
}

export interface WorkspaceManifest {
  /** Files matched to canonical openclaw roles, in walk order. */
  readonly entries: readonly WorkspaceManifestEntry[];
  /** Total files traversed before role matching (excludes companions + skipped dirs). */
  readonly walkedFiles: number;
  /** Count of registered files per kind. */
  readonly byKind: Readonly<Record<OcKind, number>>;
  /** Count of registered files per role id. */
  readonly byRole: Readonly<Record<string, number>>;
}

const DEFAULT_SKIP_DIR_NAMES: readonly string[] = [
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
];

export interface BuildWorkspaceManifestOptions {
  /**
   * Additional roles for files outside the canonical openclaw set.
   * Each role still needs a basename matcher and a kind.
   */
  readonly extraRoles?: readonly OpenClawWorkspaceRole[];
  /** Cancel a long-running walk via `AbortController.signal`. */
  readonly signal?: AbortSignal;
  /**
   * Directory basenames to skip during the walk. Defaults to common
   * VCS / build artifacts. Override completely (no merge); pass an
   * empty array to walk everything.
   */
  readonly skipDirNames?: readonly string[];
}

/**
 * Walk `workspaceDir` and return the in-memory manifest. Companion
 * files (`.lkg`, `.clobbered.<ts>`) are filtered out unconditionally;
 * non-canonical files (random README, package.json, etc.) are walked
 * but not entered into the manifest.
 *
 * Callers handle parsing themselves — the manifest is a metadata
 * layer (paths + roles + ocPaths). Consumers that need ASTs (lint,
 * doctor) read each entry's bytes and dispatch on `entry.role.kind`.
 * Consumers that don't (LKG, gateway loader) skip the parse step.
 */
export async function buildWorkspaceManifest(
  workspaceDir: string,
  opts: BuildWorkspaceManifestOptions = {},
): Promise<WorkspaceManifest> {
  const roles = [...OPENCLAW_WORKSPACE_ROLES, ...(opts.extraRoles ?? [])];
  const skipDirs = new Set(opts.skipDirNames ?? DEFAULT_SKIP_DIR_NAMES);

  const entries: WorkspaceManifestEntry[] = [];
  let walkedFiles = 0;

  await walkDirectory(workspaceDir, async (fullPath, dirent) => {
    if (opts.signal?.aborted) return;
    walkedFiles++;
    // Companion files are LKG-managed, never workspace-canonical.
    if (dirent.name.endsWith('.lkg') || dirent.name.includes('.clobbered.')) {
      return;
    }
    const role = roles.find((r) => r.matchesBasename(dirent.name));
    if (role === undefined) return;

    const relPath = relative(workspaceDir, fullPath).replace(/\\/g, '/');
    const ocPath: OcPath = { file: relPath };
    const ocPathString = `oc://${relPath}`;
    entries.push({ path: fullPath, relPath, role, ocPath, ocPathString });
  }, skipDirs, opts.signal);

  const byKind: Record<OcKind, number> = { md: 0, jsonc: 0, jsonl: 0, yaml: 0 };
  const byRole: Record<string, number> = {};
  for (const entry of entries) {
    byKind[entry.role.kind]++;
    byRole[entry.role.id] = (byRole[entry.role.id] ?? 0) + 1;
  }

  return { entries, walkedFiles, byKind, byRole };
}

async function walkDirectory(
  dir: string,
  onFile: (fullPath: string, dirent: Dirent) => Promise<void>,
  skipDirs: ReadonlySet<string>,
  signal: AbortSignal | undefined,
): Promise<void> {
  if (signal?.aborted) return;
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    // Permission denied / disappearing dir — silently skip. The
    // manifest's contract is "best-effort tour of the workspace,"
    // not "strict filesystem audit."
    return;
  }
  for (const dirent of entries) {
    if (signal?.aborted) return;
    const fullPath = join(dir, dirent.name);
    if (dirent.isDirectory()) {
      if (skipDirs.has(dirent.name)) continue;
      await walkDirectory(fullPath, onFile, skipDirs, signal);
      continue;
    }
    if (dirent.isFile()) {
      await onFile(fullPath, dirent);
    }
  }
}
