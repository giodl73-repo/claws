/**
 * Fleet policy broadcast — push policy YAML to discovered governed workspaces.
 *
 * Implements atomic writes (staging directory + rename), retry for Windows-
 * specific transient failures (EBUSY, EPERM), monotonic trust enforcement,
 * confirm gate, and reason-based audit trail.
 *
 * @module claws-sdk/fleet/broadcast
 */

import { appendFile, copyFile, lstat, mkdir, readdir, readFile, rename, rmdir, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import type { WorkspaceInfo } from './types.js';
import { checkTrustCompat } from './trust-compat.js';
import type { TrustCompatResult } from './trust-compat.js';
import { recordBroadcastAuditEvent } from './broadcast-audit.js';
import { runParallel } from './runner.js';

/**
 * Transient error codes that warrant retry on Windows.
 */
const TRANSIENT_ERROR_CODES = new Set(['EBUSY', 'EPERM']);

/**
 * Permanent error codes that should be skipped immediately.
 */
const PERMANENT_ERROR_CODES = new Set(['EACCES', 'ENOENT']);

/**
 * Maximum retry attempts for transient failures.
 */
const MAX_RETRIES = 3;

/**
 * Base delay in ms for exponential backoff.
 */
const BASE_DELAY_MS = 100;

/**
 * Options for a broadcast operation.
 */
export interface BroadcastOptions {
  /** Require explicit confirmation before writing. Default: false. */
  readonly confirm: boolean;
  /** Audit reason recorded in broadcast manifest. */
  readonly reason: string;
  /** Fleet root directory for writing the central broadcast log. Optional. */
  readonly fleetRoot?: string;
}

/**
 * Result of broadcasting to a single workspace.
 */
export interface WorkspaceBroadcastResult {
  /** Workspace path. */
  readonly path: string;
  /** Whether the broadcast succeeded for this workspace. */
  readonly success: boolean;
  /** Whether the workspace was skipped (not GOVERNED). */
  readonly skipped: boolean;
  /** Reason for skip or failure. */
  readonly message: string;
}

/**
 * Broadcast manifest — recorded for audit trail.
 */
export interface BroadcastManifest {
  /** ISO timestamp of broadcast start. */
  readonly timestamp: string;
  /** Policy file name that was broadcast. */
  readonly policyFile: string;
  /** Reason for broadcast (from --reason flag). */
  readonly reason: string;
  /** C-W1: Policy version resolved from claws.json (no longer hardcoded 'unknown'). */
  readonly policyVersion: string;
  /** Number of workspaces targeted. */
  readonly targeted: number;
  /** Number of workspaces successfully updated. */
  readonly succeeded: number;
  /** Number of workspaces skipped. */
  readonly skippedCount: number;
  /** Number of workspaces that failed. */
  readonly failed: number;
  /** Per-workspace results. */
  readonly results: readonly WorkspaceBroadcastResult[];
}

/**
 * Full broadcast result returned to caller.
 */
export interface BroadcastResult {
  /** Whether the broadcast executed (false if --confirm not set). */
  readonly executed: boolean;
  /** Dry-run preview of what would happen (when confirm=false). */
  readonly preview?: readonly WorkspaceBroadcastPreview[];
  /** Broadcast manifest (only present when executed). */
  readonly manifest?: BroadcastManifest;
}

/**
 * Preview entry for dry-run mode.
 */
export interface WorkspaceBroadcastPreview {
  readonly path: string;
  readonly classification: string;
  readonly action: 'would_broadcast' | 'would_skip';
  readonly reason: string;
}

/**
 * Validate a policy file: must exist, be readable, have .yaml/.yml extension,
 * and contain valid YAML content.
 */
export async function validatePolicyFile(
  policyPath: string,
): Promise<{ valid: true; content: string } | { valid: false; error: string }> {
  // Check extension
  const name = basename(policyPath).toLowerCase();
  if (!name.endsWith('.yaml') && !name.endsWith('.yml')) {
    return { valid: false, error: `Policy file must have .yaml or .yml extension, got: ${name}` };
  }

  // Read file
  let content: string;
  try {
    content = await readFile(policyPath, 'utf-8');
  } catch {
    return { valid: false, error: `Cannot read policy file: ${policyPath}` };
  }

  // Validate YAML syntax — try dynamic import of yaml package
  try {
    const yaml = await import('yaml');
    yaml.parse(content);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Invalid YAML in policy file: ${msg}` };
  }

  return { valid: true, content };
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is a transient Windows filesystem error.
 */
export function isTransientError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err) {
    return TRANSIENT_ERROR_CODES.has((err as { code: string }).code);
  }
  return false;
}

/**
 * Check if an error is a permanent filesystem error.
 */
export function isPermanentError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err) {
    return PERMANENT_ERROR_CODES.has((err as { code: string }).code);
  }
  return false;
}

/**
 * Rename function signature — injectable for testing retry paths.
 */
export type RenameFn = (src: string, dest: string) => Promise<void>;

/**
 * Atomic write: write to staging directory, then rename to target.
 *
 * 1. Create `.claws/broadcast-staging/` if it doesn't exist
 * 2. Write policy file to staging dir
 * 3. Rename (atomic move) from staging to `.claws/policies/{filename}`
 * 4. Clean up staging dir
 *
 * Retries on EBUSY/EPERM up to MAX_RETRIES with exponential backoff.
 *
 * @param renameFn - Optional override for rename (testing only)
 */
export async function atomicWritePolicy(
  workspacePath: string,
  policyFileName: string,
  content: string,
  renameFn: RenameFn = rename,
): Promise<void> {
  const stagingDir = join(workspacePath, '.claws', 'broadcast-staging');
  const stagingFile = join(stagingDir, policyFileName);
  const targetDir = join(workspacePath, '.claws', 'policies');
  const targetFile = join(targetDir, policyFileName);

  await mkdir(stagingDir, { recursive: true });
  await mkdir(targetDir, { recursive: true });

  // Write to staging
  await writeFile(stagingFile, content, 'utf-8');

  // Atomic rename with retry
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await renameFn(stagingFile, targetFile);
      // Clean up staging dir (best-effort)
      await cleanStagingDir(stagingDir);
      return;
    } catch (err) {
      lastError = err;
      if (isPermanentError(err)) {
        throw err;
      }
      if (isTransientError(err) && attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      // On the last attempt for non-transient errors, also try copyFile + unlink fallback
      if (attempt === MAX_RETRIES) {
        try {
          await copyFile(stagingFile, targetFile);
          await cleanStagingDir(stagingDir);
          return;
        } catch {
          // fall through to throw lastError
        }
      }
    }
  }

  throw lastError;
}

/**
 * Clean up the broadcast staging directory (remove if empty).
 */
async function cleanStagingDir(stagingDir: string): Promise<void> {
  try {
    const entries = await readdir(stagingDir);
    if (entries.length === 0) {
      await rmdir(stagingDir);
    }
  } catch {
    // best-effort cleanup
  }
}

/**
 * Recover orphaned staging files — move any files left in broadcast-staging
 * to their target in policies/.
 */
export async function recoverOrphanedStaging(workspacePath: string): Promise<string[]> {
  const stagingDir = join(workspacePath, '.claws', 'broadcast-staging');
  const targetDir = join(workspacePath, '.claws', 'policies');
  const recovered: string[] = [];

  let entries: string[];
  try {
    entries = await readdir(stagingDir);
  } catch {
    return recovered;
  }

  if (entries.length === 0) return recovered;

  await mkdir(targetDir, { recursive: true });

  for (const entry of entries) {
    try {
      await rename(join(stagingDir, entry), join(targetDir, entry));
      recovered.push(entry);
    } catch {
      // skip files that can't be recovered
    }
  }

  await cleanStagingDir(stagingDir);
  return recovered;
}

/**
 * Broadcast a policy YAML file to all governed workspaces in a fleet.
 *
 * When `confirm` is false (default), prints what it would do and exits
 * without writing. When `confirm` is true, performs atomic writes and
 * records a broadcast manifest for audit.
 *
 * @param policyPath - Absolute path to the policy YAML file to broadcast
 * @param workspaces - Discovered workspaces from scanFleet
 * @param options - Broadcast options (confirm, reason)
 */
export async function broadcastPolicy(
  policyPath: string,
  workspaces: readonly WorkspaceInfo[],
  options: BroadcastOptions,
): Promise<BroadcastResult> {
  // Validate policy file
  const validation = await validatePolicyFile(policyPath);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const policyFileName = basename(policyPath);
  const content = validation.content;

  // If no --confirm, return dry-run preview
  if (!options.confirm) {
    const preview: WorkspaceBroadcastPreview[] = workspaces.map((ws) => {
      if (ws.classification === 'GOVERNED') {
        return {
          path: ws.path,
          classification: ws.classification,
          action: 'would_broadcast' as const,
          reason: `Would push ${policyFileName} to ${ws.path}`,
        };
      }
      return {
        path: ws.path,
        classification: ws.classification,
        action: 'would_skip' as const,
        reason: `Skipping ${ws.classification} workspace`,
      };
    });

    return { executed: false, preview };
  }

  // Confirm mode — actually broadcast using parallel execution
  const governedWorkspaces = workspaces.filter((ws) => ws.classification === 'GOVERNED');
  const skippedWorkspaces = workspaces.filter((ws) => ws.classification !== 'GOVERNED');

  // Build skipped results for non-GOVERNED workspaces
  const skippedResults: WorkspaceBroadcastResult[] = skippedWorkspaces.map((ws) => ({
    path: ws.path,
    success: false,
    skipped: true,
    message: `Skipped: workspace is ${ws.classification}`,
  }));

  // Process governed workspaces in parallel
  const parallelResult = await runParallel(
    governedWorkspaces,
    async (ws) => {
      // S-05: Reject symlinked workspace paths to prevent write redirection
      const wsStat = await lstat(ws.path);
      if (wsStat.isSymbolicLink()) {
        return {
          path: ws.path,
          success: false,
          skipped: true,
          message: 'Skipped: workspace path is a symlink (security: write redirection risk)',
        } as WorkspaceBroadcastResult;
      }

      // Trust compatibility check
      const trustResult = await checkTrustCompat(ws.path, policyPath);
      if (!trustResult.compatible) {
        return {
          path: ws.path,
          success: false,
          skipped: true,
          message: `Trust compat blocked: ${trustResult.reason}`,
        } as WorkspaceBroadcastResult;
      }

      // Atomic write with retry
      await atomicWritePolicy(ws.path, policyFileName, content);

      // CM2: Record broadcast audit event in workspace audit chain
      try {
        await recordBroadcastAuditEvent(ws.path, policyFileName, options.reason);
      } catch {
        // best-effort audit — don't fail the broadcast if audit write fails
      }

      return {
        path: ws.path,
        success: true,
        skipped: false,
        message: `Policy ${policyFileName} broadcast successfully`,
      } as WorkspaceBroadcastResult;
    },
    4, // concurrency limit
  );

  // Convert parallel errors to failed results
  const errorResults: WorkspaceBroadcastResult[] = parallelResult.errors.map((e) => ({
    path: e.path,
    success: false,
    skipped: false,
    message: `Failed: ${e.error}`,
  }));

  const results: WorkspaceBroadcastResult[] = [
    ...skippedResults,
    ...parallelResult.results,
    ...errorResults,
  ];

  // M-04: Resolve policyVersion from the source policy YAML content, not
  // from an arbitrary workspace (governedWorkspaces[0] is non-deterministic
  // because readdir order varies across platforms and runs).
  let policyVersion = 'unknown';
  try {
    const yaml = await import('yaml');
    const parsed = yaml.parse(content) as Record<string, unknown> | null;
    if (parsed && typeof parsed === 'object') {
      policyVersion = String(parsed['version'] ?? parsed['policyVersion'] ?? 'unknown');
    }
  } catch {
    // fall back to 'unknown' if YAML re-parse fails
  }

  const manifest: BroadcastManifest = {
    timestamp: new Date().toISOString(),
    policyFile: policyFileName,
    reason: options.reason,
    policyVersion,
    targeted: workspaces.length,
    succeeded: results.filter((r) => r.success).length,
    skippedCount: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => !r.success && !r.skipped).length,
    results,
  };

  // SM3: Write per-workspace manifest with only that workspace's record
  for (const r of results) {
    if (r.success) {
      try {
        const wsManifest: BroadcastManifest = {
          timestamp: manifest.timestamp,
          policyFile: manifest.policyFile,
          reason: manifest.reason,
          policyVersion: manifest.policyVersion,
          targeted: 1,
          succeeded: 1,
          skippedCount: 0,
          failed: 0,
          results: [r],
        };
        const manifestDir = join(r.path, '.claws', 'fleet');
        await mkdir(manifestDir, { recursive: true });
        await writeFile(
          join(manifestDir, 'broadcast-manifest.json'),
          JSON.stringify(wsManifest, null, 2),
          'utf-8',
        );
      } catch {
        // best-effort manifest write
      }
    }
  }

  // SM5: Write fleet-level central broadcast log
  if (options.fleetRoot) {
    try {
      const fleetLogDir = join(options.fleetRoot, '.claws');
      await mkdir(fleetLogDir, { recursive: true });
      const logPath = join(fleetLogDir, 'broadcast-log.jsonl');
      const logEntry = JSON.stringify({
        timestamp: manifest.timestamp,
        policyFile: manifest.policyFile,
        reason: manifest.reason,
        targeted: manifest.targeted,
        succeeded: manifest.succeeded,
        skippedCount: manifest.skippedCount,
        failed: manifest.failed,
      }) + '\n';
      await appendFile(logPath, logEntry, 'utf-8');
    } catch {
      // best-effort central log
    }
  }

  return { executed: true, manifest };
}
