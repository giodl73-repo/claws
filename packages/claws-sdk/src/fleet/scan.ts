/**
 * Fleet workspace discovery — scan directory trees for OC marker files.
 *
 * Traverses a directory tree looking for marker files (SOUL.md, CLAUDE.md,
 * .cursorrules, etc.) that identify OC workspaces. Respects exclusion
 * patterns (node_modules, .git) and depth limits.
 *
 * @module claws-sdk/fleet/scan
 */

import { readdir, stat } from 'node:fs/promises';
import { type Dirent } from 'node:fs';
import { join } from 'node:path';

import type { FleetConfig, ScanError, ScanResult, ProgressCallback, WorkspaceInfo } from './types.js';
import { OC_MARKER_FILES, defaultFleetConfig } from './types.js';
import { classifyWorkspace } from './classify.js';
import { runParallel } from './runner.js';

/**
 * Check whether a directory contains any OC marker files.
 * Returns the list of found marker file names.
 */
export async function findMarkers(dirPath: string): Promise<readonly string[]> {
  const found: string[] = [];

  let entries: string[];
  try {
    entries = await readdir(dirPath);
  } catch {
    return found;
  }

  const entrySet = new Set(entries);

  for (const marker of OC_MARKER_FILES) {
    // Handle nested markers like '.cursor/rules'
    if (marker.includes('/')) {
      const parts = marker.split('/');
      const parentDir = parts[0]!;
      const childName = parts[1]!;
      if (entrySet.has(parentDir)) {
        try {
          const childEntries = await readdir(join(dirPath, parentDir));
          if (childEntries.includes(childName)) {
            found.push(marker);
          }
        } catch {
          // directory not readable
        }
      }
    } else {
      if (entrySet.has(marker)) {
        found.push(marker);
      }
    }
  }

  return found;
}

/**
 * Recursively discover directories that contain OC marker files.
 *
 * Returns an array of { path, markers } for each directory that
 * contains at least one marker.
 */
export async function discoverWorkspacePaths(
  rootDir: string,
  config: FleetConfig,
  depth = 0,
): Promise<{ candidates: Array<{ path: string; markers: readonly string[] }>; dirCount: number }> {
  const candidates: Array<{ path: string; markers: readonly string[] }> = [];
  let dirCount = 1; // count the root itself

  // Check current directory for markers
  const markers = await findMarkers(rootDir);
  if (markers.length > 0) {
    candidates.push({ path: rootDir, markers });
  }

  // Stop recursion at max depth
  if (depth >= config.maxDepth) {
    return { candidates, dirCount };
  }

  // Read subdirectories
  let entries: Dirent[];
  try {
    entries = await readdir(rootDir, { withFileTypes: true }) as Dirent[];
  } catch {
    return { candidates, dirCount };
  }

  const excludeSet = new Set(config.excludeDirs);

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = String(entry.name);
    if (excludeSet.has(name)) continue;

    const childPath = join(rootDir, name);
    const result = await discoverWorkspacePaths(childPath, config, depth + 1);
    candidates.push(...result.candidates);
    dirCount += result.dirCount;
  }

  return { candidates, dirCount };
}

/**
 * Scan a directory tree for OC workspaces, classify each, and return
 * a ScanResult with all discovered workspaces, stats, and errors.
 *
 * @param rootDir - Absolute path to the root directory to scan
 * @param options - Partial fleet config overrides
 * @param onProgress - Optional callback for progress events
 */
export async function scanFleet(
  rootDir: string,
  options?: Partial<FleetConfig>,
  onProgress?: ProgressCallback,
): Promise<ScanResult> {
  const config: FleetConfig = { ...defaultFleetConfig(), ...options };
  const startTime = Date.now();

  // Verify root directory exists
  try {
    const rootStat = await stat(rootDir);
    if (!rootStat.isDirectory()) {
      return {
        workspaces: [],
        stats: {
          total: 0,
          governed: 0,
          ungoverned: 0,
          misconfigured: 0,
          directoriesScanned: 0,
          durationMs: Date.now() - startTime,
        },
        errors: [{ path: rootDir, message: 'Path is not a directory' }],
      };
    }
  } catch {
    return {
      workspaces: [],
      stats: {
        total: 0,
        governed: 0,
        ungoverned: 0,
        misconfigured: 0,
        directoriesScanned: 0,
        durationMs: Date.now() - startTime,
      },
      errors: [{ path: rootDir, message: 'Directory does not exist or is not accessible' }],
    };
  }

  // Phase 1: discover workspace candidates
  const { candidates, dirCount } = await discoverWorkspacePaths(rootDir, config);

  // Phase 2: classify each candidate in parallel
  const { results, errors } = await runParallel(
    candidates,
    classifyCandidate(onProgress),
    config.concurrency,
  );

  const durationMs = Date.now() - startTime;

  return {
    workspaces: results,
    stats: {
      total: results.length,
      ...countClassifications(results),
      directoriesScanned: dirCount,
      durationMs,
    },
    errors: toScanErrors(errors),
  };
}

/**
 * Create the classify callback for runParallel.
 */
function classifyCandidate(
  onProgress: ProgressCallback | undefined,
) {
  return async (candidate: { path: string; markers: readonly string[] }) => {
    onProgress?.({ type: 'started', path: candidate.path });
    const workspace = await classifyWorkspace(candidate.path, candidate.markers);
    onProgress?.({ type: 'completed', path: candidate.path, workspace });
    return workspace;
  };
}

/**
 * Count workspaces per classification state.
 */
function countClassifications(
  workspaces: readonly WorkspaceInfo[],
): { governed: number; ungoverned: number; misconfigured: number } {
  let governed = 0;
  let ungoverned = 0;
  let misconfigured = 0;
  for (const ws of workspaces) {
    switch (ws.classification) {
      case 'GOVERNED': governed++; break;
      case 'UNGOVERNED': ungoverned++; break;
      case 'MISCONFIGURED': misconfigured++; break;
    }
  }
  return { governed, ungoverned, misconfigured };
}

/**
 * Convert parallel runner errors to ScanError format.
 */
function toScanErrors(
  errors: readonly { path: string; error: string }[],
): ScanError[] {
  const result: ScanError[] = [];
  for (const e of errors) {
    result.push({ path: e.path, message: e.error });
  }
  return result;
}
