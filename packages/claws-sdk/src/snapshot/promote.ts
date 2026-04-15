/**
 * Snapshot promotion — elevate a local snapshot to fleet-level distribution.
 *
 * Promotion is the trust boundary between local experimentation and
 * fleet-wide deployment. A promoted snapshot carries cryptographic
 * provenance that attests to its governance validity at promotion time.
 *
 * The promotion pipeline:
 * 1. Verify snapshot integrity (tamper check)
 * 2. Run pinch gate — all governance checks must pass (zero violations)
 * 3. Compute bundle hash of the snapshot directory
 * 4. Attach provenance metadata
 * 5. Copy to fleet registry
 *
 * @module claws-sdk/snapshot/promote
 */

import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { GovernanceIR } from '../ir/governance-ir.js';
import type { GovViolation } from '../ir/gov-analysis.js';
import type { SnapshotManifest } from './manifest.js';
import type { PromoteProvenance } from './provenance.js';
import { readManifest, snapshotDir } from './storage.js';
import { verifyManifest, TamperError } from './integrity.js';
import { storePromoted } from './fleet-registry.js';

import { CLAWS_SDK_VERSION } from '../version.js';

/**
 * Error thrown when promotion is blocked by failing pinch gate checks.
 */
export class PromotionError extends Error {
  /** The governance violations that caused the promotion to be blocked. */
  readonly violations: readonly GovViolation[];

  constructor(violations: readonly GovViolation[]) {
    const count = violations.length;
    const ruleIds = violations.map((v) => v.ruleId).join(', ');
    super(
      `Promotion blocked: pinch gate failed with ${count} violation(s) [${ruleIds}]`,
    );
    this.name = 'PromotionError';
    this.violations = violations;
  }
}

/**
 * Result of a successful promotion.
 */
export interface PromoteResult {
  /** Snapshot name that was promoted. */
  readonly name: string;
  /** Fleet registry version number assigned. */
  readonly version: number;
  /** The provenance metadata attached to the promoted snapshot. */
  readonly provenance: PromoteProvenance;
}

/**
 * Options for the promotion pipeline.
 */
export interface PromoteOptions {
  /** Override the signer identifier. Default: 'local'. */
  readonly signer?: string;
}

/**
 * Load the pre-compiled GovernanceIR from a snapshot.
 *
 * Returns null if the snapshot does not contain a governance-ir.json.
 */
async function loadGovernanceIR(
  workspaceRoot: string,
  name: string,
): Promise<GovernanceIR | null> {
  const irPath = join(
    snapshotDir(workspaceRoot, name),
    'files',
    '.claws/compiled/governance-ir.json',
  );
  try {
    const content = await readFile(irPath, 'utf-8');
    return JSON.parse(content) as GovernanceIR;
  } catch {
    return null;
  }
}

/**
 * Run the pinch gate on a snapshot's GovernanceIR.
 *
 * The pinch gate passes when there are zero violations.
 * Returns the list of violations (empty on pass).
 */
export function runPinchGate(ir: GovernanceIR): readonly GovViolation[] {
  return ir.analysis.violations;
}

/**
 * Recursively collect all file paths under a directory.
 */
async function collectAllFiles(dir: string): Promise<string[]> {
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
      results.push(...(await collectAllFiles(fullPath)));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Compute a SHA-256 bundle hash of an entire snapshot directory.
 *
 * Hashes every file under the directory (sorted by relative path),
 * concatenates their hex digests, then hashes the concatenation.
 * This is the attestation that the snapshot content is intact.
 */
export async function computeBundleHash(snapshotDirectory: string): Promise<string> {
  const files = await collectAllFiles(snapshotDirectory);
  const relativePaths = files.map((f) => ({
    relativePath: relative(snapshotDirectory, f).replace(/\\/g, '/'),
    absolutePath: f,
  }));

  // Sort by relative path for deterministic hash
  // localeCompare with 'en' ensures consistent byte-order across platforms
  relativePaths.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const hashes: string[] = [];
  for (const { absolutePath } of relativePaths) {
    const data = await readFile(absolutePath);
    const hash = createHash('sha256').update(data).digest('hex');
    hashes.push(hash);
  }

  return createHash('sha256').update(hashes.join(''), 'utf8').digest('hex');
}

/**
 * Promote a local snapshot to the fleet registry.
 *
 * Steps:
 * 1. Verify snapshot integrity (recompute SHA-256 hashes)
 * 2. Load GovernanceIR and run pinch gate (zero violations required)
 * 3. Compute bundle hash for provenance attestation
 * 4. Create provenance metadata
 * 5. Store in fleet registry with versioning
 *
 * @param workspaceRoot - Absolute path to the workspace containing the snapshot
 * @param name - Snapshot name to promote
 * @param fleetRoot - Absolute path to the fleet root (where the registry lives)
 * @param options - Optional promotion configuration
 * @returns PromoteResult with version and provenance
 * @throws {TamperError} if snapshot integrity verification fails
 * @throws {PromotionError} if pinch gate fails (governance violations present)
 * @throws {Error} if snapshot does not exist or lacks governance-ir.json
 */
export async function promote(
  workspaceRoot: string,
  name: string,
  fleetRoot: string,
  options?: PromoteOptions,
): Promise<PromoteResult> {
  const snapDir = snapshotDir(workspaceRoot, name);

  // Step 1: Verify snapshot integrity
  const manifest: SnapshotManifest = await readManifest(workspaceRoot, name);
  const verification = await verifyManifest(manifest, snapDir);
  if (!verification.valid) {
    throw new TamperError(verification);
  }

  // Step 2: Load GovernanceIR and run pinch gate
  const ir = await loadGovernanceIR(workspaceRoot, name);
  if (!ir) {
    throw new Error(`Snapshot "${name}" does not contain governance-ir.json`);
  }

  const violations = runPinchGate(ir);
  if (violations.length > 0) {
    throw new PromotionError(violations);
  }

  // Step 3: Compute bundle hash of the snapshot's files/ subdirectory
  const bundleHash = await computeBundleHash(join(snapDir, 'files'));

  // Step 4: Create provenance
  const provenance: PromoteProvenance = {
    clawsVersion: CLAWS_SDK_VERSION,
    workspaceHash: manifest.workspaceHash,
    timestamp: new Date().toISOString(),
    signer: options?.signer ?? 'local',
    bundleHash,
  };

  // Step 5: Store in fleet registry
  const version = await storePromoted(fleetRoot, name, snapDir, manifest, provenance);

  return { name, version, provenance };
}
