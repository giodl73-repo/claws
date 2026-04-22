/**
 * L0 unit tests for the persistent nonce store (pulse 59 D1).
 *
 * Five cases per plan:
 *   1. accept a novel nonce
 *   2. reject reuse within scope
 *   3. accept cross-scope reuse (different snapshotId)
 *   4. LRU eviction at the configured bound emits an audit entry
 *   5. startup replay rehydrates a prior store
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NonceEvictionEntry } from '@bic/openclaw-guardrails/audit';
import { PersistentNonceStore } from '../src/nonce-store/persistent-store.js';

describe('PersistentNonceStore (pulse 59 D1)', () => {
  let tmpDir: string;
  let logPath: string;
  let nowMs: number;
  let evictions: NonceEvictionEntry[];

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'nonce-store-unit-'));
    logPath = join(tmpDir, 'nonce-log.jsonl');
    nowMs = 1_700_000_000_000;
    evictions = [];
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeStore(maxPerScope?: number): PersistentNonceStore {
    const base = {
      logPath,
      auditSink: (entry: NonceEvictionEntry) => evictions.push(entry),
      clock: () => nowMs,
    } as const;
    return new PersistentNonceStore(
      maxPerScope === undefined ? base : { ...base, maxNoncesPerScope: maxPerScope },
    );
  }

  it('accepts a novel nonce and persists it to the log', () => {
    const store = makeStore();
    const result = store.accept('nonce-a', { keyId: 'k1', snapshotId: 's1' });
    expect(result).toEqual({ ok: true });
    store.close();

    const lines = readFileSync(logPath, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(1);
    const record = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(record).toEqual({
      nonce: 'nonce-a',
      keyId: 'k1',
      snapshotId: 's1',
      timestamp: nowMs,
    });
  });

  it('rejects reuse within the same scope and does not re-write the log', () => {
    const store = makeStore();
    const scope = { keyId: 'k1', snapshotId: 's1' };
    const first = store.accept('nonce-a', scope);
    const second = store.accept('nonce-a', scope);
    store.close();

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: false, invalidReason: 'nonce-reuse' });
    const lines = readFileSync(logPath, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(1);
  });

  it('accepts the same nonce under a different snapshotId (cross-scope)', () => {
    const store = makeStore();
    const resultA = store.accept('shared-nonce', { keyId: 'k1', snapshotId: 's1' });
    const resultB = store.accept('shared-nonce', { keyId: 'k1', snapshotId: 's2' });
    store.close();

    expect(resultA).toEqual({ ok: true });
    expect(resultB).toEqual({ ok: true });
    expect(evictions).toHaveLength(0);
    const lines = readFileSync(logPath, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
  });

  it('evicts the oldest nonce and emits a NonceEvictionEntry at the LRU bound', () => {
    const store = makeStore(3);
    const scope = { keyId: 'k1', snapshotId: 's1' };
    expect(store.accept('n1', scope).ok).toBe(true);
    expect(store.accept('n2', scope).ok).toBe(true);
    expect(store.accept('n3', scope).ok).toBe(true);
    expect(evictions).toHaveLength(0);

    expect(store.accept('n4', scope).ok).toBe(true);
    expect(evictions).toHaveLength(1);
    expect(evictions[0]).toEqual({
      type: 'nonce-eviction',
      scope,
      evictedCount: 1,
      reason: 'lru-bound-exceeded',
      timestamp: nowMs,
    });

    // n1 was evicted from the in-memory set — re-using it will not be caught.
    // The persistent log still has it, but the current process's set does not.
    expect(store.sizeForScope(scope)).toBe(3);
    store.close();
  });

  it('replayOnStartup rehydrates nonces so a new store rejects reuse across restart', () => {
    const first = makeStore();
    const scope = { keyId: 'k1', snapshotId: 's1' };
    expect(first.accept('persisted-nonce', scope).ok).toBe(true);
    first.close();

    const second = makeStore();
    second.replayOnStartup();
    const replayResult = second.accept('persisted-nonce', scope);
    expect(replayResult).toEqual({ ok: false, invalidReason: 'nonce-reuse' });
    second.close();
  });

  it('replayOnStartup skips malformed JSON and records missing required fields', () => {
    // Hand-craft a log mixing good records, torn tails, and shape-violating records.
    const { writeFileSync } = require('node:fs') as typeof import('node:fs');
    const good = JSON.stringify({
      nonce: 'good-1',
      keyId: 'k1',
      snapshotId: 's1',
      timestamp: 1,
    });
    const badShape = JSON.stringify({ nonce: 42, keyId: 'k1', snapshotId: 's1' });
    const tornTail = '{"nonce":"torn-';
    writeFileSync(logPath, `${good}\n${badShape}\n${tornTail}`, 'utf8');

    const store = makeStore();
    store.replayOnStartup();
    // good-1 was replayed → reuse rejected; bad-shape record skipped; torn tail skipped
    const scope = { keyId: 'k1', snapshotId: 's1' };
    expect(store.accept('good-1', scope)).toEqual({
      ok: false,
      invalidReason: 'nonce-reuse',
    });
    // other nonces that appeared in malformed records are NOT replayed
    expect(store.accept('torn-anything', scope).ok).toBe(true);
    store.close();
  });

  it('close() is idempotent and safe to call without any writes', () => {
    const store = makeStore();
    // never wrote — fd is null
    expect(() => store.close()).not.toThrow();
    // double close is also safe
    expect(() => store.close()).not.toThrow();
  });

  it('sizeForScope returns 0 for an unknown scope', () => {
    const store = makeStore();
    expect(store.sizeForScope({ keyId: 'unknown', snapshotId: 'unseen' })).toBe(0);
    store.close();
  });
});
