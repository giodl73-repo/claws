/**
 * Snapshot restore — restore governance state from a named snapshot.
 *
 * Reads manifest.json, recomputes SHA-256 for every file in the snapshot,
 * aborts with TamperError on mismatch, then restores files to their
 * original locations in the workspace.
 *
 * @module claws-sdk/snapshot/restore
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { TamperError, verifyManifest } from './integrity.js';
import { readManifest, snapshotDir } from './storage.js';

/**
 * Result of a restore operation.
 */
export interface RestoreResult {
  /** Snapshot name that was restored. */
  readonly name: string;
  /** Number of files restored. */
  readonly fileCount: number;
}

/**
 * Restore a snapshot to the workspace.
 *
 * 1. Read manifest.json from the snapshot directory
 * 2. Verify integrity of all files (recompute SHA-256)
 * 3. If any file fails verification, throw TamperError
 * 4. Copy all files from snapshot to workspace (byte-identical)
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param name - Snapshot name to restore
 * @returns RestoreResult with file count
 * @throws {TamperError} if any file fails integrity verification
 */
export async function restore(workspaceRoot: string, name: string): Promise<RestoreResult> {
  const snapDir = snapshotDir(workspaceRoot, name);
  const manifest = await readManifest(workspaceRoot, name);

  // Verify integrity before restoring
  const verification = await verifyManifest(manifest, snapDir);
  if (!verification.valid) {
    throw new TamperError(verification);
  }

  // Restore files to workspace
  const filesDir = join(snapDir, 'files');
  for (const entry of manifest.files) {
    const sourcePath = join(filesDir, entry.relativePath);
    const destPath = join(workspaceRoot, entry.relativePath);
    const data = await readFile(sourcePath);
    await mkdir(dirname(destPath), { recursive: true });
    await writeFile(destPath, data);
  }

  return { name, fileCount: manifest.files.length };
}
