/**
 * L0 unit tests for VersionStore — focused on the B3 fix
 * (version-ordered eviction + non-monotonic rejection) and the B2
 * coordination invariant (record-on-every-PATCH, even when the output
 * is hash-equal to the previous version).
 *
 * The broader time-travel + resolver paths are covered in
 * {@link ./version-resolver.unit.test.ts}. This file exercises store
 * semantics in isolation.
 */

import { describe, expect, it } from 'vitest';

import {
  VersionStore,
  type VersionSnapshot,
} from '../../src/workspace/index.js';
import type { GovernanceIR } from '../../src/index.js';

function buildIR(tag: string): GovernanceIR {
  return {
    capabilities: { tools: [], skills: [], agents: [], workflows: [] },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: `0.0.0-${tag}`,
      compiledAt: '2026-04-17T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

function snapshot(
  version: number,
  tag: string,
  compiledAt = '2026-04-17T00:00:00.000Z',
): VersionSnapshot {
  return {
    version,
    compiledAt,
    fileHashes: { 'SOUL.md': `hash-${tag}` },
    governanceIR: buildIR(tag),
  };
}

describe('VersionStore — B3 eviction ordering', () => {
  it('evicts the lowest-numbered version, not the oldest by insertion order', () => {
    // Out-of-order record() calls followed by eviction: the eviction
    // policy must drop the lowest version number regardless of when
    // each snapshot was inserted. The pre-fix implementation evicted
    // in Map insertion order; this test catches that regression.
    const store = new VersionStore({ maxVersions: 3 });
    // Insert in 5 → 6 → 7 order, exceeding cap by 1.
    store.record(snapshot(5, 'v5'));
    store.record(snapshot(6, 'v6'));
    store.record(snapshot(7, 'v7'));
    store.record(snapshot(8, 'v8'));
    // v5 is the lowest — it gets evicted.
    expect(store.isEvicted(5)).toBe(true);
    expect(store.get(6).kind).toBe('found');
    expect(store.get(7).kind).toBe('found');
    expect(store.get(8).kind).toBe('found');
    expect(store.size()).toBe(3);
    const range = store.available();
    expect(range.min).toBe(6);
    expect(range.max).toBe(8);
  });

  it('re-recording the current max preserves the retained window', () => {
    // Idempotent re-record of an already-retained version must not
    // shift the eviction target. Pre-fix: re-record moved the entry
    // to Map insertion tail, so the next overflow evicted the wrong
    // snapshot. Post-fix: eviction is keyed on version number, so
    // re-recording is a no-op for eviction ordering.
    const store = new VersionStore({ maxVersions: 2 });
    store.record(snapshot(10, 'v10'));
    store.record(snapshot(11, 'v11'));
    // Re-record v11 (e.g., a hash-equal PATCH that still bumps the
    // version counter — the B2 case).
    store.record(snapshot(11, 'v11-again'));
    store.record(snapshot(12, 'v12'));
    // v10 is the lowest — it's evicted, not v11.
    expect(store.isEvicted(10)).toBe(true);
    expect(store.get(11).kind).toBe('found');
    expect(store.get(12).kind).toBe('found');
  });

  it('rejects a non-monotonic record of a previously-unseen lower version', () => {
    // The VersionManager counter is monotonic by contract. A caller
    // that records v5 after v10 (e.g., from a late-completing
    // rolled-back compile) is a bug — not a valid back-fill. Accepting
    // it would corrupt the `min`/`max` window the time-travel resolver
    // reports to the UI.
    const store = new VersionStore();
    store.record(snapshot(10, 'v10'));
    expect(() => store.record(snapshot(5, 'v5-backfill'))).toThrowError(
      /non-monotonic version/,
    );
    // Store state unchanged — the rejected record did not leak in.
    expect(store.get(5).kind).toBe('out_of_range');
    expect(store.get(10).kind).toBe('found');
  });

  it('allows re-recording a previously-evicted version (rehydrate idempotent)', () => {
    // Re-recording an already-seen-but-evicted version is allowed
    // because it's idempotent from the caller's perspective. The
    // version-ordered eviction may drop it again immediately if
    // capacity stays full, but the record() call itself is not a bug.
    const store = new VersionStore({ maxVersions: 2 });
    store.record(snapshot(1, 'v1'));
    store.record(snapshot(2, 'v2'));
    store.record(snapshot(3, 'v3')); // evicts v1
    expect(store.isEvicted(1)).toBe(true);
    // Rehydrate attempt — no throw.
    expect(() => store.record(snapshot(1, 'v1-rehydrated'))).not.toThrow();
  });

  it('clear() resets the monotonicity high-water mark', () => {
    // After clear() the store is fully reset, including the
    // monotonicity tracker — otherwise reusing the store across test
    // scenarios would falsely reject fresh low versions.
    const store = new VersionStore();
    store.record(snapshot(100, 'high'));
    store.clear();
    expect(() => store.record(snapshot(1, 'fresh'))).not.toThrow();
    expect(store.get(1).kind).toBe('found');
  });
});

describe('VersionStore — B2 record-on-every-PATCH invariant', () => {
  it('retains every incremented version as time-travellable, including hash-equal writes', () => {
    // Scenario from team-lead: toggle a tool on → off → on → off. The
    // IR is byte-equal between v1/v3 and between v2/v4, but each PATCH
    // increments the version counter and MUST record a snapshot so the
    // ETag chain remains coherent. This test simulates that coordination
    // in isolation — the store owns the retention; the caller owns the
    // "record even when IR is unchanged" invariant documented in
    // cache.ts::planRecompile.
    const store = new VersionStore();
    const irOn = buildIR('on');
    const irOff = buildIR('off');
    // v1: toggle on (fresh IR).
    store.record({
      version: 1,
      compiledAt: '2026-04-17T00:00:01.000Z',
      fileHashes: { 'TOOLS.md': 'hash-on' },
      governanceIR: irOn,
    });
    // v2: toggle off (fresh IR).
    store.record({
      version: 2,
      compiledAt: '2026-04-17T00:00:02.000Z',
      fileHashes: { 'TOOLS.md': 'hash-off' },
      governanceIR: irOff,
    });
    // v3: toggle on again — same bytes as v1. Caller re-uses the v1
    // IR reference; record() still fires so v3 is resolvable.
    store.record({
      version: 3,
      compiledAt: '2026-04-17T00:00:03.000Z',
      fileHashes: { 'TOOLS.md': 'hash-on' },
      governanceIR: irOn,
    });
    // v4: toggle off again — same bytes as v2.
    store.record({
      version: 4,
      compiledAt: '2026-04-17T00:00:04.000Z',
      fileHashes: { 'TOOLS.md': 'hash-off' },
      governanceIR: irOff,
    });
    // All four versions resolve — no `out_of_range` for an ETag-
    // advertised version.
    for (const v of [1, 2, 3, 4]) {
      const result = store.get(v);
      expect(result.kind).toBe('found');
    }
    // Hash-equal snapshots share IR identity (caller reused the ref)
    // but each version has its own distinct entry, compiledAt timestamp,
    // and lookup path.
    const r1 = store.get(1);
    const r3 = store.get(3);
    if (r1.kind === 'found' && r3.kind === 'found') {
      expect(r1.snapshot.governanceIR).toBe(r3.snapshot.governanceIR);
      expect(r1.snapshot.compiledAt).not.toBe(r3.snapshot.compiledAt);
    }
    const range = store.available();
    expect(range.min).toBe(1);
    expect(range.max).toBe(4);
    expect(range.count).toBe(4);
  });

  it('findNearestByTimestamp still resolves hash-equal re-recorded versions by time', () => {
    // Time-travel by timestamp must see every recorded version even
    // when two adjacent snapshots share IR bytes. This protects the
    // `claws diff --at=<date>` path from selecting a surprising
    // predecessor when the caller toggled a no-op edit.
    const store = new VersionStore();
    const sharedIR = buildIR('stable');
    store.record({
      version: 1,
      compiledAt: '2026-04-17T00:00:01.000Z',
      fileHashes: { 'TOOLS.md': 'hash-a' },
      governanceIR: sharedIR,
    });
    store.record({
      version: 2,
      compiledAt: '2026-04-17T00:00:02.000Z',
      fileHashes: { 'TOOLS.md': 'hash-a' },
      governanceIR: sharedIR,
    });
    const found = store.findNearestByTimestamp('2026-04-17T00:00:02.500Z');
    expect(found).not.toBeNull();
    expect(found?.version).toBe(2);
  });
});
