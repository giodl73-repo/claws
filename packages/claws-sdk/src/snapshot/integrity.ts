/**
 * Snapshot integrity — SHA-256 hash computation and manifest verification.
 *
 * Recomputes all hashes and compares against manifest entries.
 * Reports per-file pass/fail for tamper detection.
 *
 * @module claws-sdk/snapshot/integrity
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { SnapshotManifest, ManifestFileEntry } from './manifest.js';

/**
 * Per-file verification result.
 */
export interface FileVerification {
  /** Relative path of the file. */
  readonly relativePath: string;
  /** Whether the file passed verification. */
  readonly pass: boolean;
  /** Expected SHA-256 hash from manifest. */
  readonly expected: string;
  /** Actual SHA-256 hash computed from file (null if file missing). */
  readonly actual: string | null;
  /** Failure reason (null on pass). */
  readonly reason: string | null;
}

/**
 * Overall manifest verification result.
 */
export interface VerificationResult {
  /** Whether all files passed verification. */
  readonly valid: boolean;
  /** Per-file verification results. */
  readonly files: readonly FileVerification[];
  /** Count of files that failed verification. */
  readonly failCount: number;
}

/**
 * TamperError — thrown when snapshot integrity verification fails.
 */
export class TamperError extends Error {
  readonly failedFiles: readonly FileVerification[];

  constructor(result: VerificationResult) {
    const failed = result.files.filter((f) => !f.pass);
    const paths = failed.map((f) => f.relativePath).join(', ');
    super(`Snapshot integrity check failed: ${result.failCount} file(s) tampered [${paths}]`);
    this.name = 'TamperError';
    this.failedFiles = failed;
  }
}

/**
 * Compute SHA-256 hex digest of a Buffer.
 */
export function hashBuffer(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Compute the composite workspaceHash from an array of file entries.
 *
 * Sorts entries by relativePath, concatenates all sha256 hashes,
 * then hashes the result. This gives a single root hash that
 * changes if any file changes.
 */
export function computeWorkspaceHash(files: readonly ManifestFileEntry[]): string {
  const sorted = [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const combined = sorted.map((f) => f.sha256).join('');
  return createHash('sha256').update(combined, 'utf8').digest('hex');
}

/**
 * Verify a snapshot manifest against files on disk.
 *
 * Reads each file listed in the manifest from `snapshotDir`,
 * recomputes its SHA-256, and compares against the stored hash.
 *
 * @param manifest - The manifest to verify
 * @param snapshotDir - Absolute path to the snapshot directory
 * @returns VerificationResult with per-file pass/fail
 */
export async function verifyManifest(
  manifest: SnapshotManifest,
  snapshotDir: string,
): Promise<VerificationResult> {
  const { join } = await import('node:path');
  const results: FileVerification[] = [];

  for (const entry of manifest.files) {
    const filePath = join(snapshotDir, 'files', entry.relativePath);
    try {
      const data = await readFile(filePath);
      const actual = hashBuffer(data);
      if (actual === entry.sha256) {
        results.push({
          relativePath: entry.relativePath,
          pass: true,
          expected: entry.sha256,
          actual,
          reason: null,
        });
      } else {
        results.push({
          relativePath: entry.relativePath,
          pass: false,
          expected: entry.sha256,
          actual,
          reason: 'hash mismatch',
        });
      }
    } catch {
      results.push({
        relativePath: entry.relativePath,
        pass: false,
        expected: entry.sha256,
        actual: null,
        reason: 'file missing',
      });
    }
  }

  const failCount = results.filter((r) => !r.pass).length;
  return { valid: failCount === 0, files: results, failCount };
}
