/**
 * Fleet governance drift detection — compute governance hash per workspace.
 *
 * Hashes files in lexicographic sort order, normalizes line endings to LF
 * before hashing. SHA-256 of concatenated hashes of claws.json + policies/
 * files + governance-ir.json. Compares against baseline hash and returns
 * DriftResult with workspace path, expected hash, actual hash, and drift
 * detected boolean.
 *
 * Drift baselines are generated per-platform.
 *
 * @module claws-sdk/fleet/drift
 */

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { DriftResult, DriftSeverity, FleetException, FleetBaseline } from './drift-types.js';
import { classifySeverity } from './severity.js';
import { matchException } from './exception.js';

/**
 * Compute the SHA-256 governance hash for a workspace.
 *
 * Hashing order (lexicographic within each group):
 * 1. claws.json
 * 2. .claws/policies/* (all files, sorted)
 * 3. .claws/compiled/governance-ir.json (if present)
 *
 * Line endings are normalized to LF before hashing.
 */
export async function computeGovernanceHash(workspacePath: string): Promise<string> {
  const hashes: string[] = [];

  // 1. claws.json
  const configHash = await hashFile(join(workspacePath, 'claws.json'));
  if (configHash !== null) {
    hashes.push(configHash);
  }

  // 2. .claws/policies/* — sorted lexicographically
  const policiesDir = join(workspacePath, '.claws', 'policies');
  const policyFiles = await listFilesSorted(policiesDir);
  for (const file of policyFiles) {
    const h = await hashFile(join(policiesDir, file));
    if (h !== null) {
      hashes.push(h);
    }
  }

  // 3. .claws/compiled/governance-ir.json
  const irHash = await hashFile(join(workspacePath, '.claws', 'compiled', 'governance-ir.json'));
  if (irHash !== null) {
    hashes.push(irHash);
  }

  // Final hash: SHA-256 of concatenated file hashes
  const combined = createHash('sha256');
  for (const h of hashes) {
    combined.update(h);
  }
  return combined.digest('hex');
}

/**
 * Hash a single file. Returns null if the file does not exist.
 * Normalizes line endings to LF before hashing.
 */
async function hashFile(filePath: string): Promise<string | null> {
  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }

  // Normalize CRLF → LF for cross-platform determinism
  const normalized = content.replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf-8').digest('hex');
}

/**
 * List files in a directory, sorted lexicographically.
 * Returns empty array if the directory does not exist.
 */
async function listFilesSorted(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath);
    return entries.sort();
  } catch {
    return [];
  }
}

/**
 * Detect drift across a set of workspaces by comparing their
 * governance hashes against a fleet baseline.
 *
 * @param workspacePaths - Absolute paths to workspaces to check
 * @param baseline - Fleet baseline containing expected hash
 * @param exceptions - Exception registry for approved deviations
 * @returns Array of DriftResult, one per workspace
 */
export async function detectDrift(
  workspacePaths: readonly string[],
  baseline: FleetBaseline | null,
  exceptions: readonly FleetException[] = [],
): Promise<DriftResult[]> {
  const results: DriftResult[] = [];

  for (const wsPath of workspacePaths) {
    const actualHash = await computeGovernanceHash(wsPath);

    if (baseline === null) {
      results.push({
        workspacePath: wsPath,
        expectedHash: null,
        actualHash,
        driftDetected: false,
        severity: null,
        suppressed: false,
        suppressionReason: null,
        status: 'no-baseline',
      });
      continue;
    }

    const driftDetected = actualHash !== baseline.hash;

    if (!driftDetected) {
      results.push({
        workspacePath: wsPath,
        expectedHash: baseline.hash,
        actualHash,
        driftDetected: false,
        severity: null,
        suppressed: false,
        suppressionReason: null,
        status: 'clean',
      });
      continue;
    }

    // Drift detected — classify severity
    const severity = await classifySeverity(wsPath, baseline.referenceWorkspacePath);

    // Check exception registry
    const exception = matchException(wsPath, exceptions);
    const suppressed = exception !== null;

    results.push({
      workspacePath: wsPath,
      expectedHash: baseline.hash,
      actualHash,
      driftDetected: true,
      severity,
      suppressed,
      suppressionReason: suppressed ? exception!.reason : null,
      status: suppressed ? 'suppressed' : 'drifted',
    });
  }

  return results;
}
