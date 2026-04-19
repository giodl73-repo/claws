/**
 * Write-ahead log for audit chain crash recovery.
 *
 * Entries are buffered in a WAL file before being committed to the main
 * chain file. On startup, uncommitted WAL entries are replayed.
 *
 * WAL format: one JSON line per entry, same as chain storage (NDJSON).
 * A sentinel line "COMMIT\n" marks the boundary between flushed batches.
 *
 * @module claws-sdk/compiler/audit/wal
 */

import { readFile, writeFile, appendFile, mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AuditEntry } from './types.js';
import { validateAuditEntry } from './types.js';

const COMMIT_SENTINEL = 'COMMIT';

/** Write-ahead log for audit entries. */
export class AuditWal {
  private readonly walPath: string;
  private buffer: AuditEntry[] = [];

  constructor(walPath: string) {
    this.walPath = walPath;
  }

  /** Add an entry to the WAL buffer and persist to the WAL file. */
  async write(entry: AuditEntry): Promise<void> {
    this.buffer.push(entry);
    await mkdir(dirname(this.walPath), { recursive: true });
    await appendFile(this.walPath, JSON.stringify(entry) + '\n', 'utf-8');
  }

  /**
   * Flush: mark all buffered entries as committed.
   * Writes a COMMIT sentinel and clears the buffer.
   */
  async flush(): Promise<readonly AuditEntry[]> {
    const flushed = [...this.buffer];
    if (flushed.length > 0) {
      await appendFile(this.walPath, COMMIT_SENTINEL + '\n', 'utf-8');
    }
    this.buffer = [];
    return flushed;
  }

  /** Current buffered (unflushed) entries. */
  get pending(): readonly AuditEntry[] {
    return [...this.buffer];
  }

  /**
   * Recover uncommitted entries from the WAL file.
   *
   * Reads the WAL file and returns entries that appear after the last
   * COMMIT sentinel (i.e. entries that were written but never committed).
   * Returns an empty array if the WAL file does not exist or all entries
   * are committed.
   */
  async recover(): Promise<readonly AuditEntry[]> {
    let content: string;
    try {
      content = (await readFile(this.walPath, 'utf-8')).trim();
    } catch {
      return [];
    }

    if (content === '') return [];

    const lines = content.split('\n');
    const uncommitted: AuditEntry[] = [];

    // Walk lines, resetting uncommitted on each COMMIT sentinel
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') continue;
      if (trimmed === COMMIT_SENTINEL) {
        uncommitted.length = 0;
        continue;
      }
      uncommitted.push(validateAuditEntry(JSON.parse(trimmed)));
    }

    return uncommitted;
  }

  /** Clear the WAL file (used after successful recovery). */
  async clear(): Promise<void> {
    try {
      await writeFile(this.walPath, '', 'utf-8');
    } catch {
      // File doesn't exist -- safe to ignore
    }
  }
}
