/**
 * trust-set loader — unit tests (pulse 50, 9 cases per plan).
 *
 * Uses a synthetic watcher factory + fakeClock; never touches `node:fs.watch`
 * in the unit layer. Integration tests drive a real `fs.watch`.
 */

import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTrustSetLoader } from '../src/trust-set/loader.js';
import type {
  Clock,
  Disposable,
  TrustSetLoader,
} from '../src/trust-set/types.js';
import type { TrustSetReloadFailedEntry } from '@bic/openclaw-guardrails/audit';

interface FakeClock extends Clock {
  advance(ms: number): void;
  nowMs(): number;
}

interface PendingTimer {
  readonly fn: () => void;
  readonly fireAtMs: number;
}

function createFakeClock(startMs = 1_000_000): FakeClock {
  let currentMs = startMs;
  const pending = new Map<symbol, PendingTimer>();

  const drain = (): void => {
    // Fire any timers whose fireAtMs <= currentMs, in scheduled order.
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id, timer] of pending) {
        if (timer.fireAtMs <= currentMs) {
          pending.delete(id);
          timer.fn();
          changed = true;
          break;
        }
      }
    }
  };

  return {
    now(): number {
      return currentMs;
    },
    nowMs(): number {
      return currentMs;
    },
    setTimeout(fn, ms): Disposable {
      const id = Symbol('timer');
      pending.set(id, { fn, fireAtMs: currentMs + ms });
      return {
        dispose(): void {
          pending.delete(id);
        },
      };
    },
    advance(ms): void {
      currentMs += ms;
      drain();
    },
  };
}

interface SyntheticWatcher {
  emit(): void;
  closeCalls: number;
}

function createSyntheticWatcherFactory(): {
  factory: (
    path: string,
    listener: (eventType: string, filename: string | null) => void,
  ) => { close(): void };
  watcher: SyntheticWatcher;
} {
  let listener: ((eventType: string, filename: string | null) => void) | undefined;
  const watcher: SyntheticWatcher = {
    emit(): void {
      if (listener !== undefined) listener('change', 'trust-set.json');
    },
    closeCalls: 0,
  };
  return {
    factory(_path, l) {
      listener = l;
      return {
        close(): void {
          watcher.closeCalls += 1;
          listener = undefined;
        },
      };
    },
    watcher,
  };
}

describe('trust-set loader — unit', () => {
  let tmpDir: string;
  let path: string;
  let auditEntries: TrustSetReloadFailedEntry[];
  let loader: TrustSetLoader | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'trust-set-unit-'));
    path = join(tmpDir, 'trust-set.json');
    auditEntries = [];
    loader = undefined;
  });

  afterEach(() => {
    if (loader !== undefined) loader.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('1. initial load parses valid trust-set.json into entries array', () => {
    writeFileSync(
      path,
      JSON.stringify([
        { keyId: 'v1', hmacSecret: 'a'.repeat(64), notAfter: 9_999_999_999_999 },
      ]),
    );
    const { factory } = createSyntheticWatcherFactory();
    loader = createTrustSetLoader({
      path,
      clock: createFakeClock(),
      auditSink: (e) => auditEntries.push(e),
      watcherFactory: factory,
    });
    const snap = loader.get();
    expect(snap.entries).toHaveLength(1);
    expect(snap.entries[0]?.keyId).toBe('v1');
    expect(snap.entries[0]?.hmacSecret).toBe('a'.repeat(64));
    expect(snap.stale).toBe(false);
  });

  it('2. malformed JSON on initial load throws (construction failure, not silent)', () => {
    writeFileSync(path, '{ not valid json');
    const { factory } = createSyntheticWatcherFactory();
    expect(() =>
      createTrustSetLoader({
        path,
        clock: createFakeClock(),
        auditSink: (e) => auditEntries.push(e),
        watcherFactory: factory,
      }),
    ).toThrow();
  });

  it('3. missing keyId (and other required fields) on any entry → construction failure', () => {
    const { factory } = createSyntheticWatcherFactory();
    const mk = (entry: Record<string, unknown>): (() => void) => {
      writeFileSync(path, JSON.stringify([entry]));
      return () =>
        createTrustSetLoader({
          path,
          clock: createFakeClock(),
          auditSink: (e) => auditEntries.push(e),
          watcherFactory: factory,
        });
    };
    expect(mk({ hmacSecret: 'a'.repeat(64), notAfter: 9_999_999_999_999 })).toThrow(
      /missing keyId/,
    );
    expect(mk({ keyId: 'v1', notAfter: 9_999_999_999_999 })).toThrow(/missing hmacSecret/);
    expect(mk({ keyId: 'v1', hmacSecret: 'a'.repeat(64) })).toThrow(/missing numeric notAfter/);
    // Top-level non-array.
    writeFileSync(path, JSON.stringify({ keyId: 'v1' }));
    expect(() =>
      createTrustSetLoader({
        path,
        clock: createFakeClock(),
        auditSink: (e) => auditEntries.push(e),
        watcherFactory: factory,
      }),
    ).toThrow(/expected a JSON array/);
    // Non-object entry (primitive inside array).
    writeFileSync(path, JSON.stringify(['not-an-object']));
    expect(() =>
      createTrustSetLoader({
        path,
        clock: createFakeClock(),
        auditSink: (e) => auditEntries.push(e),
        watcherFactory: factory,
      }),
    ).toThrow(/is not an object/);
    // Null entry inside array.
    writeFileSync(path, JSON.stringify([null]));
    expect(() =>
      createTrustSetLoader({
        path,
        clock: createFakeClock(),
        auditSink: (e) => auditEntries.push(e),
        watcherFactory: factory,
      }),
    ).toThrow(/is not an object/);
  });

  it('4. notAfter in the past → entry loaded but marked expired=true', () => {
    const clock = createFakeClock(2_000);
    writeFileSync(
      path,
      JSON.stringify([
        { keyId: 'v1', hmacSecret: 'a'.repeat(64), notAfter: 1_000 },
      ]),
    );
    const { factory } = createSyntheticWatcherFactory();
    loader = createTrustSetLoader({
      path,
      clock,
      auditSink: (e) => auditEntries.push(e),
      watcherFactory: factory,
    });
    const snap = loader.get();
    expect(snap.entries).toHaveLength(1);
    expect(snap.entries[0]?.expired).toBe(true);
  });

  it('5. fs.watch event with valid new file → in-memory snapshot swaps atomically', () => {
    writeFileSync(
      path,
      JSON.stringify([
        { keyId: 'v1', hmacSecret: 'a'.repeat(64), notAfter: 9_999_999_999_999 },
      ]),
    );
    const clock = createFakeClock();
    const { factory, watcher } = createSyntheticWatcherFactory();
    loader = createTrustSetLoader({
      path,
      clock,
      auditSink: (e) => auditEntries.push(e),
      watcherFactory: factory,
    });
    writeFileSync(
      path,
      JSON.stringify([
        { keyId: 'v2', hmacSecret: 'b'.repeat(64), notAfter: 9_999_999_999_999 },
      ]),
    );
    watcher.emit();
    clock.advance(51);
    const snap = loader.get();
    expect(snap.entries).toHaveLength(1);
    expect(snap.entries[0]?.keyId).toBe('v2');
    expect(auditEntries).toHaveLength(0);
  });

  it('6. fs.watch event with malformed OR unreadable file → previous snapshot retained + audit emitted', () => {
    writeFileSync(
      path,
      JSON.stringify([
        { keyId: 'v1', hmacSecret: 'a'.repeat(64), notAfter: 9_999_999_999_999 },
      ]),
    );
    const clock = createFakeClock();
    const { factory, watcher } = createSyntheticWatcherFactory();
    loader = createTrustSetLoader({
      path,
      clock,
      auditSink: (e) => auditEntries.push(e),
      watcherFactory: factory,
    });
    // 6a. Parse failure path.
    writeFileSync(path, '{ not valid');
    watcher.emit();
    clock.advance(51);
    expect(loader.get().entries[0]?.keyId).toBe('v1');
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.type).toBe('trust-set-reload-failed');
    expect(auditEntries[0]?.path).toBe(path);
    expect(auditEntries[0]?.stale).toBe(false);

    // 6b. Read failure path — delete the file, emit a watch event, expect a
    // second failed-reload entry with a distinct error message from readFileSync.
    rmSync(path, { force: true });
    watcher.emit();
    clock.advance(51);
    expect(loader.get().entries[0]?.keyId).toBe('v1');
    expect(auditEntries).toHaveLength(2);
    expect(auditEntries[1]?.error).not.toBe(auditEntries[0]?.error);

    // 6c. Non-Error thrown path — restore a good file and monkey-patch JSON.parse
    // so the reload's parse step throws a primitive. The audit sink must
    // coerce the non-Error via String(err) rather than crash.
    writeFileSync(
      path,
      JSON.stringify([
        { keyId: 'v1', hmacSecret: 'a'.repeat(64), notAfter: 9_999_999_999_999 },
      ]),
    );
    const originalParse = JSON.parse;
    (JSON as unknown as { parse: (t: string) => unknown }).parse = (): unknown => {
      throw 'plain-string-error';
    };
    try {
      watcher.emit();
      clock.advance(51);
    } finally {
      (JSON as unknown as { parse: typeof originalParse }).parse = originalParse;
    }
    expect(auditEntries).toHaveLength(3);
    expect(auditEntries[2]?.error).toBe('plain-string-error');
  });

  it('7. debounce: two fs.watch events within 50ms trigger only one reload', () => {
    writeFileSync(
      path,
      JSON.stringify([
        { keyId: 'v1', hmacSecret: 'a'.repeat(64), notAfter: 9_999_999_999_999 },
      ]),
    );
    const clock = createFakeClock();
    const { factory, watcher } = createSyntheticWatcherFactory();
    loader = createTrustSetLoader({
      path,
      clock,
      auditSink: (e) => auditEntries.push(e),
      watcherFactory: factory,
    });
    let reads = 0;
    const originalFn = loader.get;
    // Count reloads indirectly via audit emissions on a malformed file.
    writeFileSync(path, '{ bad');
    watcher.emit();
    clock.advance(10);
    watcher.emit();
    clock.advance(10);
    watcher.emit();
    // Only 30ms passed — no reload yet.
    expect(auditEntries).toHaveLength(0);
    clock.advance(51);
    // Now the debounce fires exactly once.
    expect(auditEntries).toHaveLength(1);
    void reads;
    void originalFn;
  });

  it('8. staleness budget: after 30s of failed reload attempts, stale=true', () => {
    writeFileSync(
      path,
      JSON.stringify([
        { keyId: 'v1', hmacSecret: 'a'.repeat(64), notAfter: 9_999_999_999_999 },
      ]),
    );
    const clock = createFakeClock();
    const { factory, watcher } = createSyntheticWatcherFactory();
    loader = createTrustSetLoader({
      path,
      clock,
      auditSink: (e) => auditEntries.push(e),
      watcherFactory: factory,
    });
    writeFileSync(path, '{ bad');
    watcher.emit();
    clock.advance(51);
    // One failed reload logged, but still within the 30s budget.
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.stale).toBe(false);
    expect(loader.get().stale).toBe(false);
    clock.advance(30_001);
    // A second fs event after the budget expires tips us over.
    watcher.emit();
    clock.advance(51);
    expect(loader.get().stale).toBe(true);
    const last = auditEntries.at(-1);
    expect(last?.stale).toBe(true);
  });

  it('9. close() unregisters the watcher (listener never fires post-close)', () => {
    writeFileSync(
      path,
      JSON.stringify([
        { keyId: 'v1', hmacSecret: 'a'.repeat(64), notAfter: 9_999_999_999_999 },
      ]),
    );
    const clock = createFakeClock();
    const { factory, watcher } = createSyntheticWatcherFactory();
    const l = createTrustSetLoader({
      path,
      clock,
      auditSink: (e) => auditEntries.push(e),
      watcherFactory: factory,
    });
    l.close();
    expect(watcher.closeCalls).toBe(1);
    // Emitting after close via the standard synthetic factory is a no-op.
    writeFileSync(path, '{ bad');
    watcher.emit();
    clock.advance(100);
    expect(auditEntries).toHaveLength(0);
    // close() is idempotent.
    l.close();
    expect(watcher.closeCalls).toBe(1);

    // Additionally: a stubborn watcher that keeps firing post-close still
    // triggers the internal `closed` guard in onFsEvent — exercises that
    // defence in depth even when the factory's own close() does nothing.
    writeFileSync(
      path,
      JSON.stringify([
        { keyId: 'v1', hmacSecret: 'a'.repeat(64), notAfter: 9_999_999_999_999 },
      ]),
    );
    auditEntries.length = 0;
    let stubbornListener:
      | ((eventType: string, filename: string | null) => void)
      | undefined;
    const stubbornFactory = (
      _path: string,
      listener: (eventType: string, filename: string | null) => void,
    ): { close(): void } => {
      stubbornListener = listener;
      return { close() {} };
    };
    const l2 = createTrustSetLoader({
      path,
      clock,
      auditSink: (e) => auditEntries.push(e),
      watcherFactory: stubbornFactory,
    });
    l2.close();
    if (stubbornListener !== undefined) stubbornListener('change', 'trust-set.json');
    clock.advance(100);
    expect(auditEntries).toHaveLength(0);
  });
});
