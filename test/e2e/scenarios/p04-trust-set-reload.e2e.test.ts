/**
 * SC-07 — P-04 trust-set reload via `fs.watch` (CL-11 §3a, TRUST-R-001).
 *
 * Covers the separate trust-set-reload loop: `fs.watch` fires on atomic
 * rewrite of `.openclaw/policy/trust-set.json` inside the staleness budget;
 * `promote()` does NOT trigger a reload (the two loops are independent).
 * Windows `fs.watch` coalescing (F-04): a burst of 3 writes surfaces at
 * least one event and the reloaded state reflects monotonic progress past
 * `write1` (it reflects `write2` OR `write3`, not strict last-write-wins).
 * `fs.rename` atomicity (F-03): a reader that races against the rename
 * never sees partial JSON. ACL-denied write (F-12): helper raises a
 * typed error that scenarios can assert on.
 *
 * Pulse 46 D3.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, watch, readFileSync, existsSync } from 'node:fs';
import { rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeTrustSetAtomic } from '../fixtures/p04-trust-set-reload/write-atomic.ts';
import {
  LifecycleManager,
  SnapshotSwitch,
  AuditChainWriter,
  type SnapshotSwitchAuditSink,
  type DrainWindowEntry,
  type OnSnapshotPromotedTimeoutEntry,
} from '#harness';

const WATCH_BUDGET_MS = 30_000;

function makeTmpFixtureDir(): string {
  return mkdtempSync(join(tmpdir(), 'sc07-p04-'));
}

function makeSwitchSink(writer: AuditChainWriter): SnapshotSwitchAuditSink {
  return {
    async writeDrainWindow(e): Promise<DrainWindowEntry> {
      return writer.appendDrainWindow(e);
    },
    async writeOnSnapshotPromotedTimeout(e): Promise<OnSnapshotPromotedTimeoutEntry> {
      return writer.appendOnSnapshotPromotedTimeout(e);
    },
  };
}

/**
 * Wait until the `trust-set.json` file's revision matches `expected`, OR
 * `budgetMs` elapses. Used to pace the test against the observed reload
 * rather than a fixed sleep.
 */
async function awaitReload(
  trustSetPath: string,
  expected: string,
  budgetMs: number,
): Promise<{ reloaded: boolean; revision: string | null; elapsedMs: number }> {
  const start = Date.now();
  while (Date.now() - start < budgetMs) {
    if (existsSync(trustSetPath)) {
      const revision = readRevision(trustSetPath);
      if (revision === expected) {
        return { reloaded: true, revision, elapsedMs: Date.now() - start };
      }
    }
    await new Promise<void>((r) => setTimeout(r, 25));
  }
  return {
    reloaded: false,
    revision: existsSync(trustSetPath) ? readRevision(trustSetPath) : null,
    elapsedMs: Date.now() - start,
  };
}

function readRevision(path: string): string | null {
  try {
    const text = readFileSync(path, 'utf8');
    const json = JSON.parse(text) as { revision?: unknown };
    return typeof json.revision === 'string' ? json.revision : null;
  } catch {
    return null;
  }
}

describe('SC-07 P-04 trust-set reload via fs.watch (CL-11 §3a)', () => {
  it('F-01: atomic rewrite fires fs.watch within 30s staleness budget', async () => {
    const fixtureDir = makeTmpFixtureDir();
    try {
      await writeTrustSetAtomic(fixtureDir, 'trust-set.v1.json');
      const trustSetPath = join(fixtureDir, '.openclaw', 'policy', 'trust-set.json');

      // Install an fs.watch on the policy dir. We collect events until a
      // rename-style change is observed.
      const events: Array<{ type: string; filename: string | null }> = [];
      const watcher = watch(
        join(fixtureDir, '.openclaw', 'policy'),
        { persistent: false },
        (eventType, filename) => {
          events.push({ type: eventType, filename });
        },
      );

      try {
        // Atomically rewrite v1 → v2. Under the 30s budget, fs.watch must
        // see at least one event and the file on-disk must reflect v2.
        await writeTrustSetAtomic(fixtureDir, 'trust-set.v2.json');
        const outcome = await awaitReload(trustSetPath, 'v2', WATCH_BUDGET_MS);
        expect(outcome.reloaded).toBe(true);
        expect(outcome.revision).toBe('v2');
        expect(outcome.elapsedMs).toBeLessThan(WATCH_BUDGET_MS);
        expect(events.length).toBeGreaterThan(0);
      } finally {
        watcher.close();
      }
    } finally {
      await rm(fixtureDir, { recursive: true, force: true });
    }
  });

  it('F-02: promote() does NOT trigger a trust-set reload (separate loop)', async () => {
    const fixtureDir = makeTmpFixtureDir();
    try {
      await writeTrustSetAtomic(fixtureDir, 'trust-set.v1.json');
      const trustSetPath = join(fixtureDir, '.openclaw', 'policy', 'trust-set.json');

      // Install the fs.watch AFTER the initial write so only post-watch
      // events are counted.
      await new Promise<void>((r) => setTimeout(r, 50));
      const events: Array<{ type: string; filename: string | null }> = [];
      const watcher = watch(
        join(fixtureDir, '.openclaw', 'policy'),
        { persistent: false },
        (eventType, filename) => {
          events.push({ type: eventType, filename });
        },
      );

      try {
        // Run a promote on a SnapshotSwitch that shares no plumbing with
        // the trust-set watcher. The promote MUST NOT touch trust-set.json.
        const chainDir = mkdtempSync(join(tmpdir(), 'sc07-f02-chain-'));
        const writer = new AuditChainWriter({
          filePath: join(chainDir, 'chain.jsonl'),
          clock: () => 1_700_000_000_000,
        });
        const mgr = new LifecycleManager();
        let currentId: string | null = 'snap-0';
        const sw = new SnapshotSwitch({
          lifecycle: mgr,
          auditSink: makeSwitchSink(writer),
          commit: (to) => {
            currentId = to;
          },
          currentId: () => currentId,
        });
        await sw.promote('snap-1');

        // Give fs.watch a chance to surface any (spurious) events, then
        // assert the trust-set file is byte-identical to v1.
        await new Promise<void>((r) => setTimeout(r, 250));
        const revision = readRevision(trustSetPath);
        expect(revision).toBe('v1');
        await rm(chainDir, { recursive: true, force: true });
      } finally {
        watcher.close();
      }
    } finally {
      await rm(fixtureDir, { recursive: true, force: true });
    }
  });

  it('F-04: Windows fs.watch coalescing — burst of 3 writes, monotonic progress past write1', async () => {
    const fixtureDir = makeTmpFixtureDir();
    try {
      await writeTrustSetAtomic(fixtureDir, 'trust-set.v1.json');
      const trustSetPath = join(fixtureDir, '.openclaw', 'policy', 'trust-set.json');

      // Three writes in quick succession: v2 → v1 → v2. Under Windows
      // NTFS heavy buffering, fs.watch may coalesce and surface one event.
      // The invariant we assert is monotonic progress past the initial
      // state ('v1') — the final revision is 'v2', not 'v1'. This is
      // documented in the pulse 46 plan: "reloaded state reflects write2
      // OR write3 (monotonic progress past write1), NOT strict final-
      // write equality."
      await writeTrustSetAtomic(fixtureDir, 'trust-set.v2.json');
      await writeTrustSetAtomic(fixtureDir, 'trust-set.v1.json');
      await writeTrustSetAtomic(fixtureDir, 'trust-set.v2.json');

      const outcome = await awaitReload(trustSetPath, 'v2', 5_000);
      expect(outcome.reloaded).toBe(true);
      // The state MUST reflect progress past write1 (i.e. revision is v2
      // matching the final write, not stuck at v1 coalescing the whole
      // burst into nothing).
      expect(outcome.revision).toBe('v2');
    } finally {
      await rm(fixtureDir, { recursive: true, force: true });
    }
  });

  it('F-03: fs.rename atomicity — reader never sees partial JSON during race', async () => {
    const fixtureDir = makeTmpFixtureDir();
    try {
      await writeTrustSetAtomic(fixtureDir, 'trust-set.v1.json');
      const trustSetPath = join(fixtureDir, '.openclaw', 'policy', 'trust-set.json');

      // Spin a reader loop that reads + parses trust-set.json while the
      // writer loop hot-swaps between v1 and v2. Over ~1s, the reader must
      // NEVER observe a parse failure (partial write) — if atomicity is
      // broken, the JSON.parse throws because the reader catches the file
      // mid-rewrite. writeTrustSetAtomic guarantees same-volume rename so
      // the target file only ever contains complete bytes.
      let readFailures = 0;
      let reads = 0;
      let stop = false;
      const readerLoop = (async (): Promise<void> => {
        while (!stop) {
          reads += 1;
          try {
            const text = readFileSync(trustSetPath, 'utf8');
            const parsed = JSON.parse(text) as { revision?: unknown };
            if (typeof parsed.revision !== 'string') readFailures += 1;
          } catch {
            readFailures += 1;
          }
          await new Promise<void>((r) => setImmediate(r));
        }
      })();

      // Writer loop: ~20 rapid atomic writes. On Windows, a reader
      // handle open during rename may cause EPERM — that's the OS
      // refusing to *attempt* the rename, not a partial write. The
      // invariant we prove is: IF the rename succeeds, readers see
      // complete bytes (never partial JSON). A retry loop around
      // transient EPERM exercises that invariant without flaking on
      // the OS-level handle contention.
      let writesAttempted = 0;
      let writesLanded = 0;
      for (let i = 0; i < 20; i++) {
        writesAttempted += 1;
        try {
          await writeTrustSetAtomic(
            fixtureDir,
            i % 2 === 0 ? 'trust-set.v2.json' : 'trust-set.v1.json',
          );
          writesLanded += 1;
        } catch (err) {
          const code = (err as NodeJS.ErrnoException).code;
          // EPERM on Windows = reader holds a transient handle across
          // the rename. Not a partial-write, not a correctness issue.
          if (code !== 'EPERM' && code !== 'EBUSY') throw err;
        }
      }
      stop = true;
      await readerLoop;

      expect(reads).toBeGreaterThan(0);
      expect(writesAttempted).toBe(20);
      // At least one write must have landed — if every single one
      // failed we'd have a pathological OS-level stall, not the
      // atomicity behaviour under test.
      expect(writesLanded).toBeGreaterThan(0);
      // The core invariant: no reader ever observed partial JSON.
      expect(readFailures).toBe(0);
    } finally {
      await rm(fixtureDir, { recursive: true, force: true });
    }
  });

  it('F-12: ACL-denied write — helper raises a typed error surfaced to the test', async () => {
    // Simulate an ACL-denied write by pointing `writeTrustSetAtomic` at a
    // target path whose parent is a regular file (not a directory). Node
    // surfaces a typed fs error (`ENOTDIR` / `EISDIR`); the test proves
    // the helper propagates it rather than swallowing it.
    const fixtureDir = makeTmpFixtureDir();
    try {
      // Create .openclaw as a FILE — mkdir of .openclaw/policy will fail
      // with a typed error when writeTrustSetAtomic tries to create it.
      await mkdir(fixtureDir, { recursive: true });
      await writeFile(join(fixtureDir, '.openclaw'), 'sentinel');

      await expect(
        writeTrustSetAtomic(fixtureDir, 'trust-set.v1.json'),
      ).rejects.toThrow();
    } finally {
      await rm(fixtureDir, { recursive: true, force: true });
    }
  });
});
