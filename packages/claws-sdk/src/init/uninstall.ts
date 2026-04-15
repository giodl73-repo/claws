/**
 * Uninstall — clean removal of .claws/ sidecar with backup.
 *
 * Creates a timestamped backup in ~/.claws-backups/{workspace-hash}/{timestamp}/,
 * archives the audit chain separately, removes the .claws/ directory, and reverts
 * any .gitignore additions made by init.
 *
 * Idempotent: running uninstall when .claws/ doesn't exist is a no-op.
 *
 * @module claws-sdk/init/uninstall
 */

import { createHash } from 'node:crypto';
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { CLAWS_CONFIG_FILE, CLAWS_GITIGNORE_DIRS } from '../types/sidecar.js';
import { appendAuditEvent, readPolicyVersion, resolveActor } from '../compliance/audit-chain.js';

/**
 * Gitignore entries that init adds and uninstall must remove.
 * Derived from the authoritative CLAWS_GITIGNORE_DIRS constant.
 */
const CLAWS_GITIGNORE_ENTRIES: readonly string[] = CLAWS_GITIGNORE_DIRS.map(
  /* istanbul ignore next -- CLAWS_GITIGNORE_DIRS entries never end with '/' */
  (dir) => (dir.endsWith('/') ? dir : `${dir}/`),
);

/**
 * The header comment that init adds above the gitignore entries.
 */
const CLAWS_GITIGNORE_HEADER = '# claws governance (sensitive)';

/**
 * Result of an uninstall operation.
 */
export interface UninstallResult {
  /** Exit code: 0 = success, 0 = no-op (idempotent). */
  readonly exitCode: 0;
  /** Status description. */
  readonly status: 'uninstalled' | 'no-op';
  /** Path to the backup directory (only present if uninstalled). */
  readonly backupPath?: string | undefined;
  /** Path to the archived audit chain (only present if audit dir existed). */
  readonly auditArchivePath?: string | undefined;
  /** Gitignore entries removed (only present if any were removed). */
  readonly gitignoreRemoved?: readonly string[] | undefined;
}

/**
 * Compute a short hash of the workspace root path for backup directory naming.
 */
export function workspaceHash(workspaceRoot: string): string {
  return createHash('sha256').update(workspaceRoot).digest('hex').slice(0, 12);
}

/**
 * Generate ISO-like timestamp safe for directory names (no colons).
 */
function backupTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * Uninstall claws from a workspace.
 *
 * 1. Check if .claws/ exists — if not, return no-op
 * 2. Create backup at ~/.claws-backups/{workspace-hash}/{timestamp}/
 * 3. Archive audit chain separately within the backup
 * 4. Remove .claws/ directory
 * 5. Revert .gitignore additions made by init
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param backupsRoot - Override for backup root (default: ~/.claws-backups)
 * @returns UninstallResult with exit code and details
 */
export async function uninstallWorkspace(
  workspaceRoot: string,
  backupsRoot?: string,
): Promise<UninstallResult> {
  const sidecarPath = join(workspaceRoot, '.claws');

  // Step 1: Check if .claws/ exists
  if (!await exists(sidecarPath)) {
    return { exitCode: 0, status: 'no-op' };
  }

  // Step 2: Create backup directory
  const root = backupsRoot ?? join(homedir(), '.claws-backups');
  const hash = workspaceHash(workspaceRoot);
  const timestamp = backupTimestamp();
  const backupDir = join(root, hash, timestamp);
  await mkdir(backupDir, { recursive: true });

  // Step 2b: Record GOVERNANCE_REMOVED event BEFORE archiving
  // This ensures the archived chain includes the uninstall as its final entry.
  const policyVersion = await readPolicyVersion(workspaceRoot);
  await appendAuditEvent(workspaceRoot, {
    eventType: 'GOVERNANCE_REMOVED',
    actor: resolveActor(),
    target: workspaceRoot,
    action: 'uninstall',
    outcome: 'allow',
    ruleId: 'UNINSTALL-001',
    severity: 5,
    policyVersion,
  });

  // Step 3: Archive audit chain separately (before full backup)
  let auditArchivePath: string | undefined;
  const auditSrc = join(sidecarPath, 'audit');
  if (await exists(auditSrc)) {
    auditArchivePath = join(backupDir, 'audit-archive');
    await cp(auditSrc, auditArchivePath, { recursive: true, force: true });
  }

  // Step 4: Back up entire .claws/ then remove it
  await cp(sidecarPath, join(backupDir, 'sidecar'), { recursive: true, force: true });
  await rm(sidecarPath, { recursive: true, force: true });

  // Step 4b: Back up and remove claws.json
  const configPath = join(workspaceRoot, CLAWS_CONFIG_FILE);
  if (await exists(configPath)) {
    await cp(configPath, join(backupDir, CLAWS_CONFIG_FILE));
    await rm(configPath);
  }

  // Step 5: Revert .gitignore additions
  const gitignoreRemoved = await revertGitignore(workspaceRoot);

  return {
    exitCode: 0,
    status: 'uninstalled',
    backupPath: backupDir,
    auditArchivePath,
    ...(gitignoreRemoved.length > 0 ? { gitignoreRemoved } : {}),
  };
}

/**
 * Remove claws-added entries from .gitignore.
 *
 * Removes the header comment and any matching entry lines.
 * If .gitignore doesn't exist or has no claws entries, returns empty array.
 */
async function revertGitignore(workspaceRoot: string): Promise<readonly string[]> {
  const gitignorePath = join(workspaceRoot, '.gitignore');

  let content: string;
  try {
    content = await readFile(gitignorePath, 'utf-8');
  } catch {
    return [];
  }

  const lines = content.split('\n');
  const removed: string[] = [];
  const kept: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === CLAWS_GITIGNORE_HEADER) {
      // Remove the header comment
      continue;
    }
    if (CLAWS_GITIGNORE_ENTRIES.includes(trimmed)) {
      removed.push(trimmed);
      continue;
    }
    kept.push(line);
  }

  if (removed.length === 0) {
    return [];
  }

  // Clean up trailing blank lines that may result from removal
  let last = kept[kept.length - 1];
  while (kept.length > 0 && last !== undefined && last.trim() === '') {
    kept.pop();
    last = kept[kept.length - 1];
  }

  const newContent = kept.length > 0 ? kept.join('\n') + '\n' : '';
  await writeFile(gitignorePath, newContent, 'utf-8');

  return removed;
}

/**
 * Check if a path exists on disk.
 */
async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
