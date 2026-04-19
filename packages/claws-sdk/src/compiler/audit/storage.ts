/**
 * File-based audit chain storage.
 *
 * Storage format is NDJSON (one JSON line per entry) for human readability
 * and streaming. One chain file per workspace.
 *
 * Includes basic file locking via a .lock file for concurrent access
 * serialization.
 *
 * @module claws-sdk/compiler/audit/storage
 */

import { readFile, writeFile, appendFile, mkdir, unlink, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { AuditEntry, AuditChainMeta } from './types.js';
import { validateAuditEntry, validateChainFileHeader } from './types.js';
import type { ChainFileHeader } from './types.js';

/**
 * Acquire a simple file lock.
 *
 * Uses exclusive file creation (wx flag) to prevent concurrent access.
 * Throws if the lock is already held.
 */
async function acquireLock(chainPath: string): Promise<string> {
  const lockPath = chainPath + '.lock';
  try {
    await writeFile(lockPath, String(process.pid), { flag: 'wx' });
    return lockPath;
  } catch {
    throw new Error(`Audit chain file is locked: ${lockPath}`);
  }
}

/** Release a file lock. */
async function releaseLock(lockPath: string): Promise<void> {
  try {
    await unlink(lockPath);
  } catch {
    // Lock file already removed -- safe to ignore
  }
}

/**
 * Persist a chain to an NDJSON file.
 *
 * Writes a header line followed by one JSON line per entry.
 * Acquires a file lock during write.
 *
 * @param chainPath - Path to the chain NDJSON file
 * @param meta - Chain metadata
 * @param entries - Ordered chain entries
 */
export async function saveChain(
  chainPath: string,
  meta: AuditChainMeta,
  entries: readonly AuditEntry[],
): Promise<void> {
  await mkdir(dirname(chainPath), { recursive: true });
  const lockPath = await acquireLock(chainPath);
  try {
    const header: ChainFileHeader = { type: 'audit-chain', version: 1, meta };
    const lines = [JSON.stringify(header)];
    for (const entry of entries) {
      lines.push(JSON.stringify(entry));
    }
    await writeFile(chainPath, lines.join('\n') + '\n', 'utf-8');
  } finally {
    await releaseLock(lockPath);
  }
}

/**
 * Append a single entry to an existing chain file.
 *
 * Acquires a file lock during write.
 *
 * @param chainPath - Path to the chain NDJSON file
 * @param entry - Entry to append
 */
export async function appendEntry(chainPath: string, entry: AuditEntry): Promise<void> {
  const lockPath = await acquireLock(chainPath);
  try {
    await appendFile(chainPath, JSON.stringify(entry) + '\n', 'utf-8');
  } finally {
    await releaseLock(lockPath);
  }
}

/**
 * Load a chain from an NDJSON file.
 *
 * @param chainPath - Path to the chain NDJSON file
 * @returns Object with chain metadata and entries
 * @throws If the file does not exist or the header is invalid
 */
export async function loadChain(chainPath: string): Promise<{
  meta: AuditChainMeta;
  entries: AuditEntry[];
}> {
  let content: string;
  try {
    content = (await readFile(chainPath, 'utf-8')).trim();
  } catch {
    throw new Error(`Audit chain file not found: ${chainPath}`);
  }

  if (content === '') {
    throw new Error(`Audit chain file is empty: ${chainPath}`);
  }

  const lines = content.split('\n');
  const headerLine = lines[0]!;
  const header = validateChainFileHeader(JSON.parse(headerLine));

  const entries: AuditEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line === '') continue;
    entries.push(validateAuditEntry(JSON.parse(line)));
  }

  return { meta: header.meta, entries };
}

/**
 * Update the header metadata in a chain file.
 *
 * Re-reads the file, replaces the header line, and writes back.
 *
 * @param chainPath - Path to the chain NDJSON file
 * @param meta - Updated chain metadata
 */
export async function updateChainMeta(chainPath: string, meta: AuditChainMeta): Promise<void> {
  const lockPath = await acquireLock(chainPath);
  try {
    const content = await readFile(chainPath, 'utf-8');
    const lines = content.split('\n');
    const header: ChainFileHeader = { type: 'audit-chain', version: 1, meta };
    lines[0] = JSON.stringify(header);
    await writeFile(chainPath, lines.join('\n'), 'utf-8');
  } finally {
    await releaseLock(lockPath);
  }
}

/**
 * Generate the default chain file path for a workspace.
 *
 * @param workspaceDir - Root directory of the workspace
 * @returns Path to the audit chain file
 */
export function chainFilePath(workspaceDir: string): string {
  return join(workspaceDir, '.claws', 'audit-chain.ndjson');
}

/**
 * Generate the default WAL file path for a workspace.
 *
 * @param workspaceDir - Root directory of the workspace
 * @returns Path to the WAL file
 */
export function walFilePath(workspaceDir: string): string {
  return join(workspaceDir, '.claws', 'audit-chain.wal');
}
