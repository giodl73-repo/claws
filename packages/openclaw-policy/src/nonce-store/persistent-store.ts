/**
 * @bic/openclaw-policy/nonce-store — PersistentNonceStore (P-05 mitigation).
 *
 * Pulse 59 D1. Persists accepted nonces to a JSONL log, fsyncs BEFORE returning
 * `{ ok: true }`, and replays the log on startup so a process restart cannot
 * silently let the same nonce through a second time. Cross-worker isolation is
 * provided by appending to a single shared file with `fs.writeSync` on a
 * handle opened `'a'` — POSIX guarantees O_APPEND writes are atomic per `man
 * write(2)`, and Node's `fs.openSync(path, 'a')` sets that flag on all
 * platforms.
 *
 * Scope is `(keyId, snapshotId)` — the same nonce is accepted in a different
 * `snapshotId` because the canonical-invocation-hash (P-02) already binds a
 * handle to its snapshot; a cross-snapshot replay would fail the content-hash
 * check. The scope key is serialized `${keyId}::${snapshotId}`.
 *
 * LRU bound is 10,000 nonces per scope. When the bound is exceeded we evict
 * the oldest nonce, emit a `NonceEvictionEntry` to the audit sink, and then
 * accept the new nonce. Eviction is a security-relevant event because after
 * eviction a bounded replay window exists (the evicted nonce could in
 * principle be re-used). Callers treat it as a signal to rotate the scope.
 *
 * The store DOES NOT remove entries from the on-disk log on eviction. The log
 * grows monotonically; rotation / compaction is a separate concern (out of
 * scope for pulse 59 — a `nonce-log` compactor is filed for a later wave).
 *
 * @module @bic/openclaw-policy/nonce-store/persistent-store
 */

import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  writeSync,
} from 'node:fs';
import type {
  NonceEvictionSink,
  NonceScope,
} from '@bic/openclaw-guardrails/audit';

/** Maximum nonces retained in-memory per scope before LRU eviction kicks in. */
export const DEFAULT_MAX_NONCES_PER_SCOPE = 10_000;

/**
 * Accept result returned from `PersistentNonceStore.accept`. Mirrors the
 * `InvalidReason` contract used by the handle-binding validator — a reuse is
 * reported as `'nonce-reuse'` so the validator can return the reason
 * unchanged.
 */
export type AcceptResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly invalidReason: 'nonce-reuse' };

/** Construction options for the persistent store. */
export interface PersistentNonceStoreOptions {
  /** Absolute path to the shared `nonce-log.jsonl`. Parent directory must exist. */
  readonly logPath: string;
  /** Audit sink for LRU eviction events. Synchronous by contract. */
  readonly auditSink: NonceEvictionSink;
  /** Wall-clock source (epoch millis). Tests inject a deterministic clock. */
  readonly clock: () => number;
  /** Per-scope LRU bound. Defaults to {@link DEFAULT_MAX_NONCES_PER_SCOPE}. */
  readonly maxNoncesPerScope?: number;
}

/** On-disk log record. One line of JSONL per accepted nonce. */
interface LogRecord {
  readonly nonce: string;
  readonly keyId: string;
  readonly snapshotId: string;
  readonly timestamp: number;
}

function scopeKey(scope: NonceScope): string {
  return `${scope.keyId}::${scope.snapshotId}`;
}

/**
 * Persistent nonce store with fsync-before-validate durability.
 *
 * Thread safety note: the store is not safe against concurrent calls from the
 * SAME process (callers must serialize). Cross-process / cross-worker safety
 * is provided by the underlying filesystem's O_APPEND atomicity plus the
 * startup replay — a second worker picks up the first worker's accepts on
 * next construction. Within a process the in-memory set is the source of
 * truth after construction, so a single caller chain observes its own writes.
 */
export class PersistentNonceStore {
  private readonly logPath: string;
  private readonly auditSink: NonceEvictionSink;
  private readonly clock: () => number;
  private readonly maxPerScope: number;
  /**
   * `scope → ordered nonces`. `Set<string>` iteration order is insertion
   * order per ECMA-262, which gives us LRU-by-insertion for free.
   */
  private readonly scopes = new Map<string, Set<string>>();
  private readonly scopeById = new Map<string, NonceScope>();
  private writerFd: number | null = null;

  constructor(options: PersistentNonceStoreOptions) {
    this.logPath = options.logPath;
    this.auditSink = options.auditSink;
    this.clock = options.clock;
    this.maxPerScope = options.maxNoncesPerScope ?? DEFAULT_MAX_NONCES_PER_SCOPE;
  }

  /**
   * Rehydrate in-memory sets from an existing JSONL log. Missing files are
   * treated as empty — first-ever construction is not an error. Malformed
   * lines are skipped silently because a crash-mid-write can leave a torn
   * final line; the preceding records are the durable history.
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
        // Torn final line on crash — drop it. Durable records above are
        // already loaded.
        continue;
      }
      if (
        typeof record.nonce !== 'string' ||
        typeof record.keyId !== 'string' ||
        typeof record.snapshotId !== 'string'
      ) {
        continue;
      }
      const scope: NonceScope = {
        keyId: record.keyId,
        snapshotId: record.snapshotId,
      };
      this.addInMemory(scope, record.nonce);
    }
  }

  /**
   * Validate novelty and persist. Returns `{ ok: true }` only AFTER the log
   * entry is fsynced — a process crash between validate and fsync leaves the
   * log in its pre-accept state and the caller's retry succeeds.
   *
   * Returns `{ ok: false, invalidReason: 'nonce-reuse' }` without writing when
   * the nonce is already known in the given scope.
   */
  accept(nonce: string, scope: NonceScope): AcceptResult {
    const key = scopeKey(scope);
    const existing = this.scopes.get(key);
    if (existing !== undefined && existing.has(nonce)) {
      return { ok: false, invalidReason: 'nonce-reuse' };
    }

    this.persist(nonce, scope);
    this.addInMemory(scope, nonce);
    return { ok: true };
  }

  /**
   * Close the append file handle. Idempotent. Safe to call even when the
   * store has never written a record (the handle is opened lazily).
   */
  close(): void {
    if (this.writerFd !== null) {
      try {
        closeSync(this.writerFd);
      } catch {
        // best-effort close — the OS will reclaim on process exit.
      }
      this.writerFd = null;
    }
  }

  /**
   * Test hook — returns the count of in-memory nonces for a scope. Only used
   * by the unit + integration suites. Kept deliberately small-surface.
   */
  sizeForScope(scope: NonceScope): number {
    return this.scopes.get(scopeKey(scope))?.size ?? 0;
  }

  private openWriter(): number {
    if (this.writerFd === null) {
      this.writerFd = openSync(this.logPath, 'a');
    }
    return this.writerFd;
  }

  private persist(nonce: string, scope: NonceScope): void {
    const fd = this.openWriter();
    const record: LogRecord = {
      nonce,
      keyId: scope.keyId,
      snapshotId: scope.snapshotId,
      timestamp: this.clock(),
    };
    const line = `${JSON.stringify(record)}\n`;
    writeSync(fd, line);
    fsyncSync(fd);
  }

  private addInMemory(scope: NonceScope, nonce: string): void {
    const key = scopeKey(scope);
    let set = this.scopes.get(key);
    if (set === undefined) {
      set = new Set<string>();
      this.scopes.set(key, set);
      this.scopeById.set(key, scope);
    }
    if (set.has(nonce)) return;
    if (set.size >= this.maxPerScope) {
      this.evictOldest(key, set);
    }
    set.add(nonce);
  }

  private evictOldest(key: string, set: Set<string>): void {
    const iterator = set.values();
    const first = iterator.next();
    if (first.done === true) return;
    set.delete(first.value);
    const scope = this.scopeById.get(key);
    if (scope === undefined) return;
    this.auditSink({
      type: 'nonce-eviction',
      scope,
      evictedCount: 1,
      reason: 'lru-bound-exceeded',
      timestamp: this.clock(),
    });
  }
}
