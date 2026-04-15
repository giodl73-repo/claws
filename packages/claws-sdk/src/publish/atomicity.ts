/**
 * Two-phase atomic transactions for publish pipeline.
 *
 * Phase 1 (stage): Stage artifacts locally under .claws/staging/
 * Phase 2 (commit): Submit to remote registry, commit on 200, rollback on failure
 *
 * @module claws-sdk/publish/atomicity
 */

import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { CLAWS_SIDECAR_LAYOUT } from '../types/sidecar.js';

/**
 * A staged artifact ready for publish.
 */
export interface StagedArtifact {
  /** Artifact name (e.g. "skill.yaml", "handler.ts"). */
  readonly name: string;
  /** Artifact content. */
  readonly content: string;
}

/**
 * Transaction state for tracking the two-phase commit.
 */
export type TransactionState = 'pending' | 'staged' | 'committed' | 'rolled-back' | 'failed';

/**
 * Result of the two-phase publish transaction.
 */
export interface TransactionResult {
  /** Transaction ID. */
  readonly txId: string;
  /** Final transaction state. */
  readonly state: TransactionState;
  /** Staging directory path (for diagnostics). */
  readonly stagingDir: string;
  /** Number of artifacts staged. */
  readonly artifactCount: number;
  /** Remote registry response status (null if not submitted). */
  readonly remoteStatus: number | null;
  /** Human-readable summary. */
  readonly summary: string;
}

/**
 * Interface for registry submission.
 * Consumers provide their own implementation (HTTP, mock, etc).
 */
export interface RegistryClient {
  /**
   * Submit staged artifacts to the registry.
   * @returns HTTP status code (200 = success)
   */
  submit(txId: string, artifacts: readonly StagedArtifact[]): Promise<number>;
}

/**
 * Extract message from an unknown error value.
 */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Generate a unique transaction ID.
 */
export function generateTxId(): string {
  return `tx-${Date.now()}-${randomBytes(4).toString('hex')}`;
}

/**
 * Resolve the staging directory for a transaction.
 */
function stagingDir(workspaceRoot: string, txId: string): string {
  return join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.staging, txId);
}

/**
 * Phase 1: Stage artifacts locally.
 *
 * Creates a transaction-specific directory under .claws/staging/{txId}/
 * and writes all artifacts to it.
 *
 * @param workspaceRoot - Workspace root
 * @param txId - Transaction identifier
 * @param artifacts - Artifacts to stage
 * @returns Path to the staging directory
 */
export async function stageLocally(
  workspaceRoot: string,
  txId: string,
  artifacts: readonly StagedArtifact[],
): Promise<string> {
  const dir = stagingDir(workspaceRoot, txId);
  await mkdir(dir, { recursive: true });

  for (const artifact of artifacts) {
    await writeFile(join(dir, artifact.name), artifact.content, 'utf-8');
  }

  // Write transaction metadata
  const meta = {
    txId,
    state: 'staged' as TransactionState,
    artifactCount: artifacts.length,
    stagedAt: new Date().toISOString(),
  };
  await writeFile(join(dir, '_tx.json'), JSON.stringify(meta, null, 2) + '\n', 'utf-8');

  return dir;
}

/**
 * Read staged artifacts back from the staging directory.
 */
export async function readStagedArtifacts(
  dir: string,
  names: readonly string[],
): Promise<StagedArtifact[]> {
  const artifacts: StagedArtifact[] = [];
  for (const name of names) {
    const content = await readFile(join(dir, name), 'utf-8');
    artifacts.push({ name, content });
  }
  return artifacts;
}

/**
 * Rollback: clean up the staging directory after a failed commit.
 */
export async function rollbackStaging(
  workspaceRoot: string,
  txId: string,
): Promise<void> {
  const dir = stagingDir(workspaceRoot, txId);
  await rm(dir, { recursive: true, force: true });
}

/**
 * Execute a full two-phase publish transaction.
 *
 * 1. Stage artifacts locally under .claws/staging/{txId}/
 * 2. Submit to remote registry via RegistryClient
 * 3. On 200: commit (staging dir remains as receipt)
 * 4. On failure: rollback (staging dir removed)
 *
 * @param workspaceRoot - Workspace root
 * @param artifacts - Artifacts to publish
 * @param registry - Registry client for remote submission
 * @returns Transaction result
 */
export async function executeTransaction(
  workspaceRoot: string,
  artifacts: readonly StagedArtifact[],
  registry: RegistryClient,
): Promise<TransactionResult> {
  const txId = generateTxId();
  let dir: string;

  // Phase 1: Stage locally
  try {
    dir = await stageLocally(workspaceRoot, txId, artifacts);
  } catch (err) {
    return {
      txId,
      state: 'failed',
      stagingDir: stagingDir(workspaceRoot, txId),
      artifactCount: artifacts.length,
      remoteStatus: null,
      summary: `Staging failed: ${errorMessage(err)}`,
    };
  }

  // Phase 2: Submit to remote
  let remoteStatus: number;
  try {
    remoteStatus = await registry.submit(txId, artifacts);
  } catch (err) {
    // Remote failure — rollback staging
    await rollbackStaging(workspaceRoot, txId);
    return {
      txId,
      state: 'rolled-back',
      stagingDir: dir,
      artifactCount: artifacts.length,
      remoteStatus: null,
      summary: `Remote submission failed, staging rolled back: ${errorMessage(err)}`,
    };
  }

  if (remoteStatus === 200) {
    // Commit — staging remains as receipt
    return {
      txId,
      state: 'committed',
      stagingDir: dir,
      artifactCount: artifacts.length,
      remoteStatus,
      summary: `Published ${artifacts.length} artifact(s) — transaction committed`,
    };
  }

  // Non-200 response — rollback
  await rollbackStaging(workspaceRoot, txId);
  return {
    txId,
    state: 'rolled-back',
    stagingDir: dir,
    artifactCount: artifacts.length,
    remoteStatus,
    summary: `Remote returned ${remoteStatus}, staging rolled back`,
  };
}
