/**
 * L1 integration test for `SeqCounterStore` cross-worker safety (pulse 58).
 *
 * The cross-worker invariant we prove: two independent store instances
 * operating on the SAME shared `seq-counter.jsonl` never drop an
 * increment. POSIX O_APPEND + `fs.openSync(path, 'a')` guarantees the
 * per-write atomicity that makes this safe without a lock file.
 *
 * We model two workers as two independent `SeqCounterStore` constructions
 * against the same log path. Between handoffs each store closes its
 * append handle and the next store opens a fresh one via
 * `replayOnStartup` — exactly the pattern two sidecars would follow on
 * failover. Final counter value from a third `verifier` instance equals
 * the total per-worker increment count.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SeqCounterStore } from '../src/seq-counter/index.js';

let tmpDir: string;
let logPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'seq-counter-xw-'));
  logPath = join(tmpDir, 'seq-counter.jsonl');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

const clock = (): number => 1_700_000_000_000;

describe('SeqCounterStore cross-worker (pulse 58 L1)', () => {
  it('two worker processes increment in handoff; final counter value equals total increment count (no drops)', () => {
    // Worker-A takes 25 increments, closes, hands off.
    // Worker-B replays, takes 25 more, closes, hands off.
    // Worker-C replays, takes 25 more, closes.
    // Verifier replays: expects 75 and a contiguous 1..75 sequence of
    // increment records.
    const providerId = 'prov-a';
    const snapshotId = 'snap-1';
    const iterations = 25;
    const workers = 3;

    for (let w = 0; w < workers; w += 1) {
      const store = new SeqCounterStore({ logPath, clock });
      try {
        store.replayOnStartup();
        for (let i = 0; i < iterations; i += 1) {
          store.increment(providerId, snapshotId);
        }
      } finally {
        store.close();
      }
    }

    const raw = readFileSync(logPath, 'utf8');
    const lines = raw.split('\n').filter((l) => l.length > 0);
    const incrementRecords = lines
      .map((l) => JSON.parse(l) as { kind: string; value: number; providerId: string; snapshotId: string })
      .filter((r) => r.kind === 'increment');
    expect(incrementRecords.length).toBe(iterations * workers);
    expect(incrementRecords.map((r) => r.value)).toEqual(
      Array.from({ length: iterations * workers }, (_, i) => i + 1),
    );

    const verifier = new SeqCounterStore({ logPath, clock });
    try {
      verifier.replayOnStartup();
      expect(verifier.read(providerId, snapshotId)).toBe(iterations * workers);
    } finally {
      verifier.close();
    }
  });

  it('two worker instances on disjoint snapshots do not interfere', () => {
    // Worker-A writes to snap-1; Worker-B writes to snap-2 on the SAME
    // log. Replay sees both streams and correctly apportions each to its
    // own scope.
    const a = new SeqCounterStore({ logPath, clock });
    try {
      for (let i = 0; i < 10; i += 1) a.increment('prov-a', 'snap-1');
    } finally {
      a.close();
    }
    const b = new SeqCounterStore({ logPath, clock });
    try {
      b.replayOnStartup();
      for (let i = 0; i < 15; i += 1) b.increment('prov-a', 'snap-2');
    } finally {
      b.close();
    }

    const v = new SeqCounterStore({ logPath, clock });
    try {
      v.replayOnStartup();
      expect(v.read('prov-a', 'snap-1')).toBe(10);
      expect(v.read('prov-a', 'snap-2')).toBe(15);
    } finally {
      v.close();
    }
  });
});
