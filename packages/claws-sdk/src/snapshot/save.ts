/**
 * Snapshot save — capture governance state into a named snapshot.
 *
 * Captures:
 * - claws.json
 * - .claws/policies/** (all files recursively)
 * - .claws/compiled/governance-ir.json
 * - .claws/cache/hashes.json
 *
 * Each file is hashed with SHA-256 and recorded in manifest.json.
 *
 * @module claws-sdk/snapshot/save
 */

import { readFile, writeFile, mkdir, readdir, stat, rm } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import type { ManifestFileEntry, SnapshotManifest } from './manifest.js';
import { MANIFEST_SCHEMA_VERSION } from './manifest.js';
import { hashBuffer, computeWorkspaceHash } from './integrity.js';
import { snapshotDir, writeManifest, ensureFilesDir, exists } from './storage.js';

import { CLAWS_SDK_VERSION } from '../version.js';

/**
 * Governance files to capture (relative to workspace root).
 *
 * Directories are expanded recursively; files are captured directly.
 */
const GOVERNANCE_SOURCES = [
  'claws.json',
  '.claws/policies',
  '.claws/compiled/governance-ir.json',
  '.claws/cache/hashes.json',
] as const;

/**
 * Result of a save operation.
 */
export interface SaveResult {
  /** Snapshot name. */
  readonly name: string;
  /** Number of files captured. */
  readonly fileCount: number;
  /** The snapshot manifest. */
  readonly manifest: SnapshotManifest;
}

/**
 * Recursively collect all file paths under a directory.
 */
async function collectFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const s = await stat(fullPath);
    if (s.isDirectory()) {
      results.push(...await collectFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Resolve governance sources to a list of absolute file paths.
 */
async function resolveGovernanceFiles(workspaceRoot: string): Promise<string[]> {
  const files: string[] = [];

  for (const source of GOVERNANCE_SOURCES) {
    const fullPath = join(workspaceRoot, source);
    try {
      const s = await stat(fullPath);
      if (s.isDirectory()) {
        files.push(...await collectFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    } catch {
      // Source doesn't exist — skip
    }
  }

  return files;
}

/**
 * Save a snapshot of the current governance state.
 *
 * If a snapshot with the same name already exists, it is overwritten
 * (idempotent save — removes residual files first).
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param name - Snapshot name
 * @returns SaveResult with manifest and file count
 */
export async function save(workspaceRoot: string, name: string): Promise<SaveResult> {
  // Idempotent: remove existing snapshot if present
  if (await exists(workspaceRoot, name)) {
    await rm(snapshotDir(workspaceRoot, name), { recursive: true, force: true });
  }

  const filesDir = await ensureFilesDir(workspaceRoot, name);
  const sourcePaths = await resolveGovernanceFiles(workspaceRoot);
  const manifestFiles: ManifestFileEntry[] = [];

  for (const sourcePath of sourcePaths) {
    const data = await readFile(sourcePath);
    const relativePath = relative(workspaceRoot, sourcePath).replace(/\\/g, '/');
    const sha256 = hashBuffer(data);

    // Copy file to snapshot
    const destPath = join(filesDir, relativePath);
    await mkdir(dirname(destPath), { recursive: true });
    await writeFile(destPath, data);

    manifestFiles.push({
      relativePath,
      sha256,
      size: data.length,
    });
  }

  const workspaceHash = computeWorkspaceHash(manifestFiles);

  const manifest: SnapshotManifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    clawsVersion: CLAWS_SDK_VERSION,
    timestamp: new Date().toISOString(),
    workspaceHash,
    files: manifestFiles,
  };

  await writeManifest(workspaceRoot, name, manifest);

  return { name, fileCount: manifestFiles.length, manifest };
}
