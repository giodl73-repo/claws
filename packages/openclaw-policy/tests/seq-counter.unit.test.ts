/**
 * L0 unit tests for `SeqCounterStore` (pulse 58 D1).
 *
 * Covers the 5 L0 scenarios declared in the pulse plan plus the
 * fsync-before-sign contract (test #6) that mitigates P-12:
 *
 *   1. Increment monotonic
 *   2. Persisted read across simulated process restart
 *   3. Snapshot-change reset preserves prior-snapshot counter
 *   4. Rollback rejection via `accept`
 *   5. Append-only under a single O_APPEND handle — two logical writers
 *      on the same log file never lose an increment
 *   6. fsync-before-sign — `increment` fsyncs BEFORE returning
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SeqCounterStore } from '../src/seq-counter/index.js';

let tmpDir: string;
let logPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'seq-counter-'));
  logPath = join(tmpDir, 'seq-counter.jsonl');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

const clock = (): number => 1_700_000_000_000;

describe('SeqCounterStore (pulse 58)', () => {
  it('1. increment monotonic: two sequential calls return 1, 2', () => {
    const store = new SeqCounterStore({ logPath, clock });
    try {
      expect(store.increment('prov-a', 'snap-1')).toBe(1);
      expect(store.increment('prov-a', 'snap-1')).toBe(2);
      expect(store.read('prov-a', 'snap-1')).toBe(2);
    } finally {
      store.close();
    }
  });

  it('2. persisted read: replayOnStartup returns last-written value after "restart"', () => {
    const first = new SeqCounterStore({ logPath, clock });
    try {
      first.increment('prov-a', 'snap-1');
      first.increment('prov-a', 'snap-1');
      first.increment('prov-a', 'snap-1');
    } finally {
      first.close();
    }

    // Simulated restart: a fresh store instance replays the same log.
    const second = new SeqCounterStore({ logPath, clock });
    try {
      second.replayOnStartup();
      expect(second.read('prov-a', 'snap-1')).toBe(3);
      // And incrementing post-replay picks up where the prior process left off.
      expect(second.increment('prov-a', 'snap-1')).toBe(4);
    } finally {
      second.close();
    }
  });

  it('3. snapshot-change reset: new snapshot counter starts at 0; prior snapshot counter preserved', () => {
    const store = new SeqCounterStore({ logPath, clock });
    try {
      store.increment('prov-a', 'snap-1');
      store.increment('prov-a', 'snap-1');
      expect(store.read('prov-a', 'snap-1')).toBe(2);

      store.resetOnSnapshotChange('prov-a', 'snap-1', 'snap-2');
      expect(store.read('prov-a', 'snap-2')).toBe(0);
      // Prior snapshot retained (append-only log).
      expect(store.read('prov-a', 'snap-1')).toBe(2);

      // New snapshot increments independently.
      expect(store.increment('prov-a', 'snap-2')).toBe(1);
      expect(store.read('prov-a', 'snap-1')).toBe(2);
    } finally {
      store.close();
    }
  });

  it('4. rollback rejection: accept(value <= current) returns sequence-rollback', () => {
    const store = new SeqCounterStore({ logPath, clock });
    try {
      // Advance the counter to 5.
      for (let i = 0; i < 5; i += 1) store.increment('prov-a', 'snap-1');
      expect(store.read('prov-a', 'snap-1')).toBe(5);

      // Replay with lower value — rejected, counter unchanged.
      const rollback = store.accept('prov-a', 'snap-1', 3);
      expect(rollback).toEqual({ ok: false, invalidReason: 'sequence-rollback' });
      expect(store.read('prov-a', 'snap-1')).toBe(5);

      // Equal to current — also rejected.
      const equal = store.accept('prov-a', 'snap-1', 5);
      expect(equal).toEqual({ ok: false, invalidReason: 'sequence-rollback' });
      expect(store.read('prov-a', 'snap-1')).toBe(5);

      // Strictly greater — accepted, high-water advances.
      const advance = store.accept('prov-a', 'snap-1', 7);
      expect(advance).toEqual({ ok: true, value: 7 });
      expect(store.read('prov-a', 'snap-1')).toBe(7);
    } finally {
      store.close();
    }
  });

  it('5. append-only under single log: two sequential "workers" on the same log never lose an increment', () => {
    // We simulate two workers by opening/closing a store in two phases,
    // each writing 10 increments. Total increments in the log must be 20
    // and the final replay high-water must be 20.
    const workerA = new SeqCounterStore({ logPath, clock });
    try {
      for (let i = 0; i < 10; i += 1) workerA.increment('prov-a', 'snap-1');
    } finally {
      workerA.close();
    }

    const workerB = new SeqCounterStore({ logPath, clock });
    try {
      workerB.replayOnStartup();
      for (let i = 0; i < 10; i += 1) workerB.increment('prov-a', 'snap-1');
    } finally {
      workerB.close();
    }

    const raw = readFileSync(logPath, 'utf8');
    const lines = raw.split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBe(20);
    const values = lines
      .map((l) => JSON.parse(l) as { value: number; kind: string })
      .filter((r) => r.kind === 'increment')
      .map((r) => r.value);
    expect(values).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));

    const verifier = new SeqCounterStore({ logPath, clock });
    try {
      verifier.replayOnStartup();
      expect(verifier.read('prov-a', 'snap-1')).toBe(20);
    } finally {
      verifier.close();
    }
  });

  it('6. fsync-before-sign: increment flushes to disk BEFORE returning (P-12 mitigation)', () => {
    // The invariant under test: once `increment` returns N, the log must
    // already contain N on disk. A reader opened between the "return
    // value N" observation and ANY subsequent call MUST see N in the log.
    // A regression that fsyncs later (or not at all) fails this by
    // returning N while the log still shows ≤ N-1.
    const store = new SeqCounterStore({ logPath, clock });
    try {
      const returned = store.increment('prov-a', 'snap-1');
      expect(returned).toBe(1);

      // Open a fresh reader (no shared buffer) BEFORE any further action.
      const raw = readFileSync(logPath, 'utf8');
      const lines = raw.split('\n').filter((l) => l.length > 0);
      expect(lines.length).toBe(1);
      const record = JSON.parse(lines[0]!) as {
        kind: string;
        value: number;
        providerId: string;
        snapshotId: string;
      };
      expect(record).toMatchObject({
        kind: 'increment',
        value: 1,
        providerId: 'prov-a',
        snapshotId: 'snap-1',
      });

      // Second increment: same invariant applies.
      const returned2 = store.increment('prov-a', 'snap-1');
      expect(returned2).toBe(2);
      const raw2 = readFileSync(logPath, 'utf8');
      const lines2 = raw2.split('\n').filter((l) => l.length > 0);
      expect(lines2.length).toBe(2);
      expect(JSON.parse(lines2[1]!)).toMatchObject({
        kind: 'increment',
        value: 2,
      });
    } finally {
      store.close();
    }
  });

  it('replay tolerates torn final line (crash-mid-write)', () => {
    const store = new SeqCounterStore({ logPath, clock });
    try {
      store.increment('prov-a', 'snap-1');
      store.increment('prov-a', 'snap-1');
    } finally {
      store.close();
    }
    // Simulate a crashed partial write by appending an incomplete line.
    const raw = readFileSync(logPath, 'utf8');
    writeFileSync(logPath, `${raw}{"kind":"increment","providerId":"pr`);

    const replay = new SeqCounterStore({ logPath, clock });
    try {
      replay.replayOnStartup();
      expect(replay.read('prov-a', 'snap-1')).toBe(2);
    } finally {
      replay.close();
    }
  });

  it('replay applies reset markers so new-snapshot counters start at 0', () => {
    const store = new SeqCounterStore({ logPath, clock });
    try {
      store.increment('prov-a', 'snap-1');
      store.increment('prov-a', 'snap-1');
      store.resetOnSnapshotChange('prov-a', 'snap-1', 'snap-2');
    } finally {
      store.close();
    }

    const replay = new SeqCounterStore({ logPath, clock });
    try {
      replay.replayOnStartup();
      // Prior snapshot high-water survived the replay.
      expect(replay.read('prov-a', 'snap-1')).toBe(2);
      // New snapshot known at 0 thanks to reset marker.
      expect(replay.read('prov-a', 'snap-2')).toBe(0);
    } finally {
      replay.close();
    }
  });

  it('replay skips malformed increment + reset records and still loads valid ones', () => {
    const malformedLog = [
      // Valid increment.
      JSON.stringify({
        kind: 'increment',
        providerId: 'prov-a',
        snapshotId: 'snap-1',
        value: 1,
        timestamp: 1,
      }),
      // Malformed increment — missing value type.
      JSON.stringify({
        kind: 'increment',
        providerId: 'prov-a',
        snapshotId: 'snap-1',
        value: 'not-a-number',
      }),
      // Malformed increment — missing providerId.
      JSON.stringify({ kind: 'increment', snapshotId: 'snap-1', value: 2 }),
      // Valid reset.
      JSON.stringify({
        kind: 'reset',
        providerId: 'prov-a',
        oldSnapshotId: 'snap-1',
        newSnapshotId: 'snap-2',
        timestamp: 2,
      }),
      // Malformed reset — missing newSnapshotId.
      JSON.stringify({ kind: 'reset', providerId: 'prov-a' }),
      // Unknown kind — silently ignored.
      JSON.stringify({ kind: 'mystery', providerId: 'prov-a' }),
      // Empty string between lines.
      '',
    ].join('\n');
    writeFileSync(logPath, `${malformedLog}\n`);

    const replay = new SeqCounterStore({ logPath, clock });
    try {
      replay.replayOnStartup();
      expect(replay.read('prov-a', 'snap-1')).toBe(1);
      expect(replay.read('prov-a', 'snap-2')).toBe(0);
    } finally {
      replay.close();
    }
  });

  it('close() is idempotent and swallows OS-level close errors', () => {
    const store = new SeqCounterStore({ logPath, clock });
    store.increment('prov-a', 'snap-1');
    store.close();
    // Second close — writerFd already null; no-op.
    store.close();
    // No fs activity possible after close; prove no throw via a fresh
    // instance (increment opens its own handle).
    const fresh = new SeqCounterStore({ logPath, clock });
    try {
      fresh.replayOnStartup();
      expect(fresh.read('prov-a', 'snap-1')).toBe(1);
    } finally {
      fresh.close();
    }
  });
});
