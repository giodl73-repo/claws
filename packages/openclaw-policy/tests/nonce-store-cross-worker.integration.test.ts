/**
 * L1 integration test for PersistentNonceStore cross-worker isolation (pulse
 * 59 D1, plan requirement: 1 case).
 *
 * Scenario: two independent store instances share a single `nonce-log.jsonl`.
 * Worker A accepts nonces n1..nN sequentially, then closes the writer. Worker
 * B constructs a fresh store against the same path, calls `replayOnStartup`,
 * and attempts to reuse any of n1..nN — every attempt rejects with
 * `nonce-reuse`, proving the log is the cross-worker source of truth. We also
 * simulate an abrupt termination by opening a new store on a log whose final
 * line is torn (written without a trailing newline) — the store discards the
 * torn record but keeps every fsynced record above it.
 *
 * The kill-mid-fsync path is modeled by manually truncating the log file
 * after a partial write; a real `kill -9` between `writeSync` and `fsyncSync`
 * would leave the file in the same pre-fsync state the OS page cache would
 * give us after reboot (worst case the append never lands at all, which is
 * the behavior we want for retry safety).
 */
import {
  appendFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NonceEvictionEntry } from '@bic/openclaw-guardrails/audit';
import { PersistentNonceStore } from '../src/nonce-store/persistent-store.js';

describe('PersistentNonceStore cross-worker isolation (pulse 59 D1 L1)', () => {
  let tmpDir: string;
  let logPath: string;
  let nowMs: number;
  let evictions: NonceEvictionEntry[];

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'nonce-store-int-'));
    logPath = join(tmpDir, 'nonce-log.jsonl');
    nowMs = 1_700_000_000_000;
    evictions = [];
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeStore(): PersistentNonceStore {
    return new PersistentNonceStore({
      logPath,
      auditSink: (entry) => evictions.push(entry),
      clock: () => nowMs++,
    });
  }

  it('two workers sharing the log monotonically grow it and reject cross-worker reuse', () => {
    const scope = { keyId: 'k1', snapshotId: 's1' };

    // Worker A — accept five novel nonces.
    const a = makeStore();
    for (let i = 0; i < 5; i++) {
      expect(a.accept(`worker-a-${String(i)}`, scope).ok).toBe(true);
    }
    a.close();
    const afterA = readFileSync(logPath, 'utf8').split('\n').filter((l) => l.length > 0);
    expect(afterA).toHaveLength(5);

    // Worker B — replay A's nonces, then refuse to re-accept any of them,
    // and append five more novel ones. Log grows monotonically.
    const b = makeStore();
    b.replayOnStartup();
    for (let i = 0; i < 5; i++) {
      const replay = b.accept(`worker-a-${String(i)}`, scope);
      expect(replay).toEqual({ ok: false, invalidReason: 'nonce-reuse' });
    }
    for (let i = 0; i < 5; i++) {
      expect(b.accept(`worker-b-${String(i)}`, scope).ok).toBe(true);
    }
    b.close();

    const afterB = readFileSync(logPath, 'utf8').split('\n').filter((l) => l.length > 0);
    expect(afterB).toHaveLength(10);
    // Log grew monotonically — the first five lines are byte-identical with
    // worker A's post-close log.
    for (let i = 0; i < 5; i++) {
      expect(afterB[i]).toBe(afterA[i]);
    }
  });

  it('tolerates a torn final line (simulated kill -9 between writeSync and fsyncSync)', () => {
    const scope = { keyId: 'k1', snapshotId: 's1' };

    // Populate the log with two durable entries.
    const first = makeStore();
    expect(first.accept('durable-1', scope).ok).toBe(true);
    expect(first.accept('durable-2', scope).ok).toBe(true);
    first.close();

    // Simulate a crash mid-write: append a malformed half-record without a
    // trailing newline. A real kill-9 between writeSync and fsyncSync would
    // leave the on-disk state in one of two forms — (a) no partial line at
    // all (the write landed in the page cache but not the inode), or (b)
    // a partial JSON-shaped line. (b) is the harder case; we prove we
    // tolerate it.
    appendFileSync(logPath, '{"nonce":"torn-', 'utf8');

    // Replay must drop the torn tail and still know about durable-1 and
    // durable-2. Accepting either re-use must fail closed.
    const recovered = makeStore();
    recovered.replayOnStartup();
    expect(recovered.accept('durable-1', scope)).toEqual({
      ok: false,
      invalidReason: 'nonce-reuse',
    });
    expect(recovered.accept('durable-2', scope)).toEqual({
      ok: false,
      invalidReason: 'nonce-reuse',
    });
    // A brand-new nonce still goes through — the store is not wedged.
    expect(recovered.accept('post-recovery', scope).ok).toBe(true);
    recovered.close();

    // The log now has three durable records plus the torn prefix; the
    // recovery is non-destructive from the store's point of view (the
    // torn prefix is still on disk but will be dropped on the next replay).
    const final = readFileSync(logPath, 'utf8');
    expect(final).toContain('durable-1');
    expect(final).toContain('durable-2');
    expect(final).toContain('post-recovery');
  });

  it('replayOnStartup is a no-op when the log file does not yet exist', () => {
    // logPath has not been written — construct a store against the missing
    // path and call replay. The store must not throw and must accept
    // subsequent nonces.
    const store = makeStore();
    store.replayOnStartup();
    expect(store.accept('first', { keyId: 'k1', snapshotId: 's1' }).ok).toBe(true);
    store.close();
  });

  it('replayOnStartup handles an empty log file', () => {
    writeFileSync(logPath, '', 'utf8');
    const store = makeStore();
    store.replayOnStartup();
    expect(store.accept('first', { keyId: 'k1', snapshotId: 's1' }).ok).toBe(true);
    store.close();
  });
});
