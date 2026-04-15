/**
 * Snapshot storage — directory management under `.claws/snapshots/`.
 *
 * Each snapshot is stored as `.claws/snapshots/{name}/` with:
 * - manifest.json — the SnapshotManifest
 * - files/ — copied governance files preserving relative paths
 *
 * @module claws-sdk/snapshot/storage
 */

import { readFile, writeFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { SnapshotManifest } from './manifest.js';

/** Base directory for snapshots within the sidecar. */
const SNAPSHOTS_DIR = '.claws/snapshots';

/**
 * Resolve the absolute path to a named snapshot directory.
 */
export function snapshotDir(workspaceRoot: string, name: string): string {
  return join(workspaceRoot, SNAPSHOTS_DIR, name);
}

/**
 * Check whether a named snapshot exists.
 */
export async function exists(workspaceRoot: string, name: string): Promise<boolean> {
  try {
    const s = await stat(snapshotDir(workspaceRoot, name));
    return s.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Write a manifest to a snapshot directory, creating dirs as needed.
 */
export async function writeManifest(
  workspaceRoot: string,
  name: string,
  manifest: SnapshotManifest,
): Promise<void> {
  const dir = snapshotDir(workspaceRoot, name);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );
}

/**
 * Read a manifest from a snapshot directory.
 *
 * @throws {Error} if manifest.json does not exist or is invalid JSON
 */
export async function readManifest(
  workspaceRoot: string,
  name: string,
): Promise<SnapshotManifest> {
  const manifestPath = join(snapshotDir(workspaceRoot, name), 'manifest.json');
  const content = await readFile(manifestPath, 'utf-8');
  return JSON.parse(content) as SnapshotManifest;
}

/**
 * Info about a stored snapshot returned by list().
 */
export interface SnapshotInfo {
  /** Snapshot name (directory name). */
  readonly name: string;
  /** ISO 8601 timestamp from manifest. */
  readonly timestamp: string;
  /** Number of files in the snapshot. */
  readonly fileCount: number;
}

/**
 * List all snapshots, sorted by timestamp (newest first).
 */
export async function list(workspaceRoot: string): Promise<readonly SnapshotInfo[]> {
  const baseDir = join(workspaceRoot, SNAPSHOTS_DIR);
  let entries: string[];
  try {
    entries = await readdir(baseDir);
  } catch {
    return [];
  }

  const infos: SnapshotInfo[] = [];
  for (const entry of entries) {
    try {
      const manifest = await readManifest(workspaceRoot, entry);
      infos.push({
        name: entry,
        timestamp: manifest.timestamp,
        fileCount: manifest.files.length,
      });
    } catch {
      // Skip directories without valid manifest
    }
  }

  infos.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return infos;
}

/**
 * Delete a named snapshot directory.
 *
 * @throws {Error} if the snapshot does not exist
 */
export async function remove(workspaceRoot: string, name: string): Promise<void> {
  const dir = snapshotDir(workspaceRoot, name);
  await rm(dir, { recursive: true, force: true });
}

/**
 * Ensure the files/ subdirectory exists for a snapshot.
 */
export async function ensureFilesDir(workspaceRoot: string, name: string): Promise<string> {
  const filesDir = join(snapshotDir(workspaceRoot, name), 'files');
  await mkdir(filesDir, { recursive: true });
  return filesDir;
}
