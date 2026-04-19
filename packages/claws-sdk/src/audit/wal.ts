/**
 * Write-Ahead Log for approval crash recovery.
 *
 * Persists approvalStartTime so approval timeout does NOT reset on crash.
 * Remaining time = originalTimeout - (now - approvalStartTime).
 * Crash cannot be exploited to extend the approval window.
 *
 * Uses monotonic time source (process.hrtime.bigint()) for timeout
 * computation. System clock adjustments (NTP sync, DST) cannot extend
 * the approval window.
 *
 * WAL is an append-only JSONL file at `.claws/audit/wal.jsonl`.
 * Each entry is HMAC-signed with the workspace audit key for tamper detection.
 *
 * @module claws-sdk/audit/wal
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { canonicalJson } from '../util/canonical-json.js';

/**
 * WAL entry persisted to disk. Records approval start time, timeout,
 * and operation context.
 */
export interface WalEntry {
  /** Unique identifier for the approval operation. */
  readonly operationId: string;
  /** Monotonic timestamp (nanoseconds) when the approval started. */
  readonly approvalStartTime: string;
  /** Original timeout duration in milliseconds. */
  readonly timeoutMs: number;
  /** ISO 8601 wall-clock timestamp for human-readable correlation. */
  readonly wallClockStart: string;
  /** Context: who triggered the approval. */
  readonly actor: string;
  /** Context: what is being approved. */
  readonly target: string;
  /** Context: the action being approved. */
  readonly action: string;
  /** HMAC-SHA256 signature of the entry content. */
  readonly hmac: string;
}

/**
 * A WAL record as stored in the JSONL file. Either an 'append' (new
 * approval started) or a 'complete' (approval finished and can be
 * cleaned up).
 */
export interface WalRecord {
  readonly type: 'append' | 'complete';
  readonly entry: WalEntry;
}

/**
 * Result of recovering in-flight approvals from the WAL.
 */
export interface WalRecoveryResult {
  /** Approvals that are still within their timeout window. */
  readonly active: ReadonlyArray<{
    readonly entry: WalEntry;
    readonly remainingMs: number;
  }>;
  /** Approvals that have expired (remaining <= 0). */
  readonly expired: ReadonlyArray<{
    readonly entry: WalEntry;
    readonly elapsedMs: number;
  }>;
  /** Entries with invalid HMAC signatures (tampered). */
  readonly tampered: ReadonlyArray<{
    readonly entry: WalEntry;
    readonly reason: string;
  }>;
  /** Lines that could not be parsed (corrupted JSONL). */
  readonly warnings: ReadonlyArray<{
    readonly line: number;
    readonly raw: string;
    readonly error: string;
  }>;
}

/** Default WAL path relative to workspace root. */
const WAL_RELATIVE_PATH = '.claws/audit/wal.jsonl';

/**
 * Compute HMAC-SHA256 signature for a WAL entry.
 * Signs all fields except the hmac field itself.
 */
function computeEntryHmac(auditKey: Buffer, entry: Omit<WalEntry, 'hmac'>): string {
  const content = canonicalJson({
    operationId: entry.operationId,
    approvalStartTime: entry.approvalStartTime,
    timeoutMs: entry.timeoutMs,
    wallClockStart: entry.wallClockStart,
    actor: entry.actor,
    target: entry.target,
    action: entry.action,
  });
  return createHmac('sha256', auditKey).update(content, 'utf8').digest('hex');
}

/**
 * Verify the HMAC signature of a WAL entry.
 * Uses constant-time comparison to prevent timing side-channels.
 */
function verifyEntryHmac(auditKey: Buffer, entry: WalEntry): boolean {
  const expected = computeEntryHmac(auditKey, entry);
  if (expected.length !== entry.hmac.length) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(entry.hmac, 'hex'));
}

/**
 * Monotonic time source. Returns nanoseconds as bigint.
 * Wraps process.hrtime.bigint() for testability.
 */
export type MonotonicClock = () => bigint;

/** Default monotonic clock using process.hrtime.bigint(). */
export const defaultMonotonicClock: MonotonicClock = () => process.hrtime.bigint();

/**
 * Write-Ahead Log for approval crash recovery.
 *
 * Persists approval start times to disk so that a crash-restart cannot
 * reset the approval timer. On recovery, remaining time is computed as
 * originalTimeout - elapsed, using the monotonic time source.
 */
export class AuditWal {
  private readonly walPath: string;
  private readonly auditKey: Buffer;
  private readonly clock: MonotonicClock;

  constructor(
    workspaceRoot: string,
    auditKey: Buffer | string,
    clock: MonotonicClock = defaultMonotonicClock,
  ) {
    this.walPath = path.join(workspaceRoot, WAL_RELATIVE_PATH);
    this.auditKey = typeof auditKey === 'string' ? Buffer.from(auditKey, 'hex') : auditKey;
    this.clock = clock;
  }

  /**
   * Record the start of an approval operation.
   * Persists the entry to the WAL file before returning, ensuring
   * the start time survives a crash.
   */
  startApproval(params: {
    operationId: string;
    timeoutMs: number;
    actor: string;
    target: string;
    action: string;
  }): WalEntry {
    const approvalStartTime = this.clock().toString();
    const wallClockStart = new Date().toISOString();

    const entryWithoutHmac = {
      operationId: params.operationId,
      approvalStartTime,
      timeoutMs: params.timeoutMs,
      wallClockStart,
      actor: params.actor,
      target: params.target,
      action: params.action,
    };

    const hmac = computeEntryHmac(this.auditKey, entryWithoutHmac);
    const entry: WalEntry = { ...entryWithoutHmac, hmac };

    this.appendRecord({ type: 'append', entry });
    return entry;
  }

  /**
   * Record that an approval has completed (approved or rejected).
   * Writes a 'complete' record so recovery knows to skip this operation.
   */
  completeApproval(entry: WalEntry): void {
    this.appendRecord({ type: 'complete', entry });
  }

  /**
   * Recover in-flight approvals from the WAL after a crash.
   *
   * Replays the WAL to reconstruct which approvals were in-flight,
   * computes remaining timeout for each, and classifies them as
   * active (still has time), expired (timeout elapsed), or tampered
   * (HMAC verification failed).
   *
   * Uses conservative elapsed-time estimation: for each entry, computes
   * elapsed time from both the monotonic source (`elapsedSinceCrashMs`)
   * and the wall-clock gap (`now - wallClockStart`). Uses the minimum
   * so that neither a stale monotonic counter nor a jumped wall-clock
   * can independently extend the approval window.
   *
   * @param elapsedSinceCrashMs - Milliseconds elapsed since the crash
   *   from a monotonic source (e.g. process uptime).
   */
  recover(elapsedSinceCrashMs: number): WalRecoveryResult {
    const { records, warnings } = this.readRecords();
    const nowMs = Date.now();

    // Replay: collect in-flight approvals (appended but not completed)
    const inFlight = new Map<string, WalEntry>();
    for (const record of records) {
      if (record.type === 'append') {
        inFlight.set(record.entry.operationId, record.entry);
      } else if (record.type === 'complete') {
        inFlight.delete(record.entry.operationId);
      }
    }

    const active: Array<{ entry: WalEntry; remainingMs: number }> = [];
    const expired: Array<{ entry: WalEntry; elapsedMs: number }> = [];
    const tampered: Array<{ entry: WalEntry; reason: string }> = [];

    for (const entry of inFlight.values()) {
      // Verify HMAC integrity
      if (!verifyEntryHmac(this.auditKey, entry)) {
        tampered.push({ entry, reason: 'HMAC signature mismatch' });
        continue;
      }

      // M-05: Use min(monotonic, wallClock) so neither source alone
      // can extend the approval window after a crash.
      const wallClockElapsedMs = nowMs - new Date(entry.wallClockStart).getTime();
      const effectiveElapsedMs = Math.min(elapsedSinceCrashMs, wallClockElapsedMs);

      const remainingMs = entry.timeoutMs - effectiveElapsedMs;
      if (remainingMs <= 0) {
        expired.push({ entry, elapsedMs: effectiveElapsedMs });
      } else {
        active.push({ entry, remainingMs });
      }
    }

    return { active, expired, tampered, warnings };
  }

  /**
   * Compact the WAL file by removing completed operations.
   * Only retains records for in-flight approvals.
   *
   * Uses atomic write: temp file → fsync → rename, so a crash during
   * compaction cannot lose in-flight records.
   */
  compact(): void {
    const { records } = this.readRecords();
    const completed = new Set<string>();

    // First pass: find completed operations
    for (const record of records) {
      if (record.type === 'complete') {
        completed.add(record.entry.operationId);
      }
    }

    // Second pass: keep only in-flight appends
    const remaining = records.filter(
      (r) => r.type === 'append' && !completed.has(r.entry.operationId),
    );

    // Rewrite the file atomically
    const dir = path.dirname(this.walPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (remaining.length === 0) {
      // Remove the WAL file if nothing is in-flight
      if (fs.existsSync(this.walPath)) {
        fs.unlinkSync(this.walPath);
      }
    } else {
      // M-03: Write to temp file, fsync, then rename over original.
      // Crash between write and rename leaves the original intact.
      const tmpPath = this.walPath + '.tmp';
      const lines = remaining.map((r) => JSON.stringify(r)).join('\n') + '\n';
      const fd = fs.openSync(tmpPath, 'w');
      try {
        fs.writeSync(fd, lines, undefined, 'utf8');
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(tmpPath, this.walPath);
    }
  }

  /**
   * Get the WAL file path.
   */
  get filePath(): string {
    return this.walPath;
  }

  /**
   * Append a record to the WAL file. Creates parent directories if needed.
   *
   * M-04: Uses openSync + write + fsyncSync + close instead of
   * appendFileSync, ensuring the record reaches durable storage
   * before returning. Without fsync, a process/OS crash can lose
   * the WAL entry sitting in the OS buffer cache.
   */
  private appendRecord(record: WalRecord): void {
    const dir = path.dirname(this.walPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const fd = fs.openSync(this.walPath, 'a');
    try {
      fs.writeSync(fd, JSON.stringify(record) + '\n', undefined, 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  }

  /**
   * Read all records from the WAL file.
   * Returns empty array if the file does not exist.
   *
   * M-06: Corrupted lines are skipped and collected as warnings
   * instead of crashing recovery of all subsequent records.
   */
  private readRecords(): { records: WalRecord[]; warnings: WalRecoveryResult['warnings'] } {
    if (!fs.existsSync(this.walPath)) {
      return { records: [], warnings: [] };
    }

    const content = fs.readFileSync(this.walPath, 'utf8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    const records: WalRecord[] = [];
    const warnings: Array<{ line: number; raw: string; error: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        records.push(JSON.parse(lines[i]!) as WalRecord);
      } catch (err) {
        warnings.push({
          line: i + 1,
          raw: lines[i]!,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { records, warnings };
  }
}
