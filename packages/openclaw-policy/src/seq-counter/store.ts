/**
 * @bic/openclaw-policy/seq-counter — SeqCounterStore (CL-11 §3a, P-12 mitigation).
 *
 * Pulse 58 D1. Per-`(providerId, snapshotId)` monotonic sequence counter.
 * Backed by an append-only JSONL log so a crash never loses an accepted
 * sequence number: each `increment` writes one record and fsyncs BEFORE
 * returning to the caller. The `issueHandle` call path is therefore
 *
 *   appendSeq(n) → fsync → sign(handle with n) → return
 *
 * with no handle ever reaching the caller before the log entry is durable.
 * P-12 mitigation: a crash between accept and fsync would let the plugin
 * re-issue seq=N on restart and enable handle replay. fsync-before-sign
 * closes that window. The contract is enforced by the L0 test
 * "fsync-before-sign".
 *
 * Append-only (never overwrite) serves two purposes:
 *   1. Avoids Windows file-locking contention — a single O_APPEND handle
 *      per process is cross-worker safe (POSIX + Node's `fs.openSync(path,
 *      'a')` on all platforms).
 *   2. Preserves prior-snapshot counters when the plugin promotes to a new
 *      snapshotId — `resetOnSnapshotChange(old, new)` emits a reset marker
 *      for the new snapshot; the old snapshot's counter is untouched in the
 *      log and can be replayed.
 *
 * The scope key is serialized `${providerId}::${snapshotId}`.
 *
 * @module @bic/openclaw-policy/seq-counter/store
 */

import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  writeSync,
} from 'node:fs';

/** Record kinds serialized to the log. */
type LogRecord =
  | {
      readonly kind: 'increment';
      readonly providerId: string;
      readonly snapshotId: string;
      readonly value: number;
      readonly timestamp: number;
    }
  | {
      readonly kind: 'reset';
      readonly providerId: string;
      readonly oldSnapshotId: string;
      readonly newSnapshotId: string;
      readonly timestamp: number;
    };

/** Result of `increment` — returns `ok: false` when a rollback is attempted. */
export type IncrementResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly invalidReason: 'sequence-rollback' };

/** Construction options for the store. */
export interface SeqCounterStoreOptions {
  /** Absolute path to the shared `seq-counter.jsonl`. Parent must exist. */
  readonly logPath: string;
  /** Wall-clock source (epoch millis). Tests inject a deterministic clock. */
  readonly clock: () => number;
}

function scopeKey(providerId: string, snapshotId: string): string {
  return `${providerId}::${snapshotId}`;
}

/**
 * Append-only per-`(providerId, snapshotId)` sequence counter. See module
 * docstring for the fsync-before-sign contract. Not safe against concurrent
 * `increment` calls from the SAME process — callers must serialize
 * per-scope. Cross-process / cross-worker safety is provided by O_APPEND
 * atomicity plus `replayOnStartup`: a second worker observes the first
 * worker's writes on next construction.
 */
export class SeqCounterStore {
  private readonly logPath: string;
  private readonly clock: () => number;
  /** `scope → current high-water mark`. */
  private readonly counters = new Map<string, number>();
  private writerFd: number | null = null;

  constructor(options: SeqCounterStoreOptions) {
    this.logPath = options.logPath;
    this.clock = options.clock;
  }

  /**
   * Rehydrate in-memory counters from an existing JSONL log. Missing file =
   * empty. Malformed lines are skipped (torn final line on crash); durable
   * records above load correctly. Reset records apply the new-snapshot
   * reset; prior-snapshot counters are preserved.
   */
  replayOnStartup(): void {
    if (!existsSync(this.logPath)) return;
    const raw = readFileSync(this.logPath, 'utf8');
    if (raw.length === 0) return;
    const lines = raw.split('\n');
    for (const line of lines) {
      if (line.length === 0) continue;
      let record: LogRecord;
      try {
        record = JSON.parse(line) as LogRecord;
      } catch {
        continue;
      }
      if (record.kind === 'increment') {
        if (
          typeof record.providerId !== 'string' ||
          typeof record.snapshotId !== 'string' ||
          typeof record.value !== 'number'
        ) {
          continue;
        }
        const key = scopeKey(record.providerId, record.snapshotId);
        const prev = this.counters.get(key) ?? 0;
        if (record.value > prev) this.counters.set(key, record.value);
      } else if (record.kind === 'reset') {
        if (
          typeof record.providerId !== 'string' ||
          typeof record.newSnapshotId !== 'string'
        ) {
          continue;
        }
        const key = scopeKey(record.providerId, record.newSnapshotId);
        if (!this.counters.has(key)) this.counters.set(key, 0);
      }
    }
  }

  /**
   * Increment the counter for `(providerId, snapshotId)`. Returns the new
   * high-water value AFTER the log entry is durable on disk. A process
   * crash between the assignment and the fsync leaves the log in its
   * pre-increment state; the caller's retry yields the same sequence
   * number.
   */
  increment(providerId: string, snapshotId: string): number {
    const key = scopeKey(providerId, snapshotId);
    const next = (this.counters.get(key) ?? 0) + 1;
    this.persistIncrement(providerId, snapshotId, next);
    this.counters.set(key, next);
    return next;
  }

  /** Read the current high-water value for `(providerId, snapshotId)`. */
  read(providerId: string, snapshotId: string): number {
    return this.counters.get(scopeKey(providerId, snapshotId)) ?? 0;
  }

  /**
   * Accept a replayed handle's sequence number. Returns `{ ok: true }` and
   * advances the high-water mark iff `value > current`. Otherwise returns
   * `{ ok: false, invalidReason: 'sequence-rollback' }` — the validator
   * surfaces the reason unchanged.
   */
  accept(
    providerId: string,
    snapshotId: string,
    value: number,
  ): IncrementResult {
    const key = scopeKey(providerId, snapshotId);
    const current = this.counters.get(key) ?? 0;
    if (value <= current) {
      return { ok: false, invalidReason: 'sequence-rollback' };
    }
    this.persistIncrement(providerId, snapshotId, value);
    this.counters.set(key, value);
    return { ok: true, value };
  }

  /**
   * Emit a reset marker when the plugin promotes to a new snapshotId. The
   * new snapshot's counter starts at 0; the old snapshot's counter is
   * NOT touched — append-only means the prior record is retained on disk
   * and survives replay.
   */
  resetOnSnapshotChange(
    providerId: string,
    oldSnapshotId: string,
    newSnapshotId: string,
  ): void {
    this.persistReset(providerId, oldSnapshotId, newSnapshotId);
    const key = scopeKey(providerId, newSnapshotId);
    if (!this.counters.has(key)) this.counters.set(key, 0);
  }

  /** Close the append handle. Idempotent. */
  close(): void {
    if (this.writerFd !== null) {
      try {
        closeSync(this.writerFd);
      } catch {
        // best-effort — OS reclaims on exit.
      }
      this.writerFd = null;
    }
  }

  private openWriter(): number {
    if (this.writerFd === null) {
      this.writerFd = openSync(this.logPath, 'a');
    }
    return this.writerFd;
  }

  private persistIncrement(
    providerId: string,
    snapshotId: string,
    value: number,
  ): void {
    const fd = this.openWriter();
    const record: LogRecord = {
      kind: 'increment',
      providerId,
      snapshotId,
      value,
      timestamp: this.clock(),
    };
    writeSync(fd, `${JSON.stringify(record)}\n`);
    fsyncSync(fd);
  }

  private persistReset(
    providerId: string,
    oldSnapshotId: string,
    newSnapshotId: string,
  ): void {
    const fd = this.openWriter();
    const record: LogRecord = {
      kind: 'reset',
      providerId,
      oldSnapshotId,
      newSnapshotId,
      timestamp: this.clock(),
    };
    writeSync(fd, `${JSON.stringify(record)}\n`);
    fsyncSync(fd);
  }
}
