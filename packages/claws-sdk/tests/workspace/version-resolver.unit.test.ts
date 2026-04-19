/**
 * L0 unit tests for the `?at=` version resolver.
 *
 * Covers the eight cases the pulse specifies:
 * 1. version lookup
 * 2. date lookup (nearest ≤)
 * 3. snapshot lookup
 * 4. out-of-range version → structured error with available range
 * 5. date between versions → nearest earlier snapshot
 * 6. snapshot not found → structured error
 * 7. eviction → VERSION_EVICTED after capacity overflow
 * 8. restart persistence — store starts empty on a fresh instance; a
 *    snapshot that exists on disk is still resolvable by name.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GovernanceIR } from '../../src/index.js';
import {
  VersionStore,
  parseAt,
  resolveAt,
  type ResolverContext,
} from '../../src/workspace/index.js';

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

function record(
  store: VersionStore,
  version: number,
  compiledAt: string,
  tag: string,
): GovernanceIR {
  const governanceIR = buildIR(tag);
  store.record({
    version,
    compiledAt,
    fileHashes: { 'SOUL.md': `hash-${tag}` },
    governanceIR,
  });
  return governanceIR;
}

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'version-resolver-'));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('parseAt + resolveAt (L0 unit)', () => {
  it('1. resolves ?at=v<n> to the matching VersionStore snapshot', async () => {
    const store = new VersionStore();
    const ir38 = record(store, 38, '2026-04-14T10:00:00.000Z', 'v38');
    record(store, 39, '2026-04-14T11:00:00.000Z', 'v39');

    const ctx: ResolverContext = { store, workspaceRoot: workspace };
    const parsed = parseAt('v38');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await resolveAt(parsed.parsed, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.resolved.mode).toBe('version');
    expect(result.resolved.version).toBe(38);
    expect(result.resolved.governanceIR).toBe(ir38);
    expect(result.resolved.compiledAt).toBe('2026-04-14T10:00:00.000Z');
  });

  it('2. resolves ?at=<ISO date> to the nearest version at or before that instant', async () => {
    const store = new VersionStore();
    record(store, 1, '2026-04-10T00:00:00.000Z', 'v1');
    const ir2 = record(store, 2, '2026-04-12T00:00:00.000Z', 'v2');
    record(store, 3, '2026-04-15T00:00:00.000Z', 'v3');

    const ctx: ResolverContext = { store, workspaceRoot: workspace };
    const parsed = parseAt('2026-04-14');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await resolveAt(parsed.parsed, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // 2026-04-14 is between v2 (4-12) and v3 (4-15) — resolver picks v2
    // because v3 is in the future relative to the requested instant.
    expect(result.resolved.mode).toBe('time');
    expect(result.resolved.governanceIR).toBe(ir2);
    expect(result.resolved.version).toBe(2);
  });

  it('3. resolves ?at=snap:<name> by reading the snapshot IR from disk', async () => {
    const store = new VersionStore();
    const snapshotIR = buildIR('snap');
    const snapDir = join(workspace, '.claws', 'snapshots', 'pre-upgrade', 'files', '.claws', 'compiled');
    await mkdir(snapDir, { recursive: true });
    await writeFile(join(snapDir, 'governance-ir.json'), JSON.stringify(snapshotIR), 'utf-8');

    const ctx: ResolverContext = { store, workspaceRoot: workspace };
    const parsed = parseAt('snap:pre-upgrade');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await resolveAt(parsed.parsed, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.resolved.mode).toBe('snapshot');
    // JSON round-trip, so identity won't match — assert by content.
    expect(result.resolved.governanceIR.compiler.compilerVersion).toBe('0.0.0-snap');
    expect(result.resolved.version).toBeNull();
  });

  it('4. out-of-range version surfaces VERSION_OUT_OF_RANGE with the available window', async () => {
    const store = new VersionStore();
    record(store, 10, '2026-04-14T10:00:00.000Z', 'v10');
    record(store, 11, '2026-04-14T11:00:00.000Z', 'v11');

    const ctx: ResolverContext = { store, workspaceRoot: workspace };
    const parsed = parseAt('v999');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await resolveAt(parsed.parsed, ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('VERSION_OUT_OF_RANGE');
    if (result.error.code !== 'VERSION_OUT_OF_RANGE') return;
    expect(result.error.available.min).toBe(10);
    expect(result.error.available.max).toBe(11);
    expect(result.error.available.count).toBe(2);
  });

  it('5. date between versions resolves to the earlier (nearest ≤) snapshot', async () => {
    const store = new VersionStore();
    const ir1 = record(store, 1, '2026-04-01T00:00:00.000Z', 'v1');
    record(store, 2, '2026-05-01T00:00:00.000Z', 'v2');

    const ctx: ResolverContext = { store, workspaceRoot: workspace };
    const parsed = parseAt('2026-04-15T00:00:00Z');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await resolveAt(parsed.parsed, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resolved.governanceIR).toBe(ir1);
    expect(result.resolved.version).toBe(1);
  });

  it('6. snapshot name that does not exist on disk surfaces SNAPSHOT_NOT_FOUND', async () => {
    const store = new VersionStore();
    const ctx: ResolverContext = { store, workspaceRoot: workspace };
    const parsed = parseAt('snap:does-not-exist');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await resolveAt(parsed.parsed, ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('SNAPSHOT_NOT_FOUND');
    if (result.error.code !== 'SNAPSHOT_NOT_FOUND') return;
    expect(result.error.name).toBe('does-not-exist');
  });

  it('7. version evicted past capacity surfaces VERSION_EVICTED, not OUT_OF_RANGE', async () => {
    const store = new VersionStore({ maxVersions: 2 });
    record(store, 1, '2026-04-14T00:00:00.000Z', 'v1');
    record(store, 2, '2026-04-14T01:00:00.000Z', 'v2');
    record(store, 3, '2026-04-14T02:00:00.000Z', 'v3');

    expect(store.isEvicted(1)).toBe(true);

    const ctx: ResolverContext = { store, workspaceRoot: workspace };
    const parsed = parseAt('v1');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await resolveAt(parsed.parsed, ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('VERSION_EVICTED');
    if (result.error.code !== 'VERSION_EVICTED') return;
    expect(result.error.version).toBe(1);
  });

  it('parseAt rejects empty, blank, malformed, and dangerous values', () => {
    // Structural emptiness — AT_MALFORMED (safe to echo raw).
    const empty = parseAt('');
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error.code).toBe('AT_MALFORMED');

    const nullRaw = parseAt(null);
    expect(nullRaw.ok).toBe(false);
    if (!nullRaw.ok) expect(nullRaw.error.code).toBe('AT_MALFORMED');

    const undef = parseAt(undefined);
    expect(undef.ok).toBe(false);
    if (!undef.ok) expect(undef.error.code).toBe('AT_MALFORMED');

    const blank = parseAt('   ');
    expect(blank.ok).toBe(false);
    if (!blank.ok) expect(blank.error.code).toBe('AT_MALFORMED');

    // Allow-list denials — INVALID_AT_PARAM, no raw echo.
    for (const bad of [
      'snap:',
      'snap:foo/bar',
      'snap:foo\\bar',
      'snap:..',
      'snap:.',
      'snap:foo.bar', // dots now disallowed in snapshot names
      'not-a-thing',
    ]) {
      const r = parseAt(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe('INVALID_AT_PARAM');
        // No raw echo for allow-list denials.
        expect(r.error.raw).toBe('');
        expect(r.error.message).toBe('invalid snapshot or version identifier');
      }
    }
  });

  it('parseAt (K1) rejects null bytes, control chars, and Unicode in snapshot names', () => {
    // W-4 escalated to K1: ?at= accepted null bytes and Unicode (RTL
    // markers) as snapshot names because the substring guard only
    // looked for `/`, `\`, and `..`. The allow-list regex closes this.
    const attacks = [
      'snap:foo\u0000bar', // null byte
      'snap:\u202e', // RTL override
      'snap:café', // non-ASCII letter
      'snap:foo\x01bar', // control char
      'snap:foo bar', // embedded space
      'snap:foo;rm', // shell metachar
      'snap:' + 'a'.repeat(65), // exceeds 64-char limit
      '\u0000', // null byte as top-level value
      'v1\u0000', // null byte trailing a version
    ];
    for (const attack of attacks) {
      const r = parseAt(attack);
      expect(r.ok, `expected rejection for ${JSON.stringify(attack)}`).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe('INVALID_AT_PARAM');
        // Stable safe message; raw never echoed.
        expect(r.error.raw).toBe('');
        expect(r.error.message).toBe('invalid snapshot or version identifier');
      }
    }
  });

  it('parseAt (K1) caps version digits at 10 to block overflow probes', () => {
    // Max-safe-ish: 10 digits is well under Number.MAX_SAFE_INTEGER
    // (9,007,199,254,740,992 is 16 digits) and more than enough for
    // realistic version counters (billions of compiles). An 11-digit
    // or longer value is an attack probe (overflow, ReDoS on parseInt).
    const okLong = parseAt('v' + '9'.repeat(10));
    expect(okLong.ok).toBe(true);

    const tooLong = parseAt('v' + '9'.repeat(11));
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) expect(tooLong.error.code).toBe('INVALID_AT_PARAM');

    const bareTooLong = parseAt('9'.repeat(20));
    expect(bareTooLong.ok).toBe(false);
    if (!bareTooLong.ok) expect(bareTooLong.error.code).toBe('INVALID_AT_PARAM');
  });

  it('parseAt (K1) accepts snapshot names matching the ASCII allow-list', () => {
    // Allow-list: [a-zA-Z0-9_-]{1,64}. Verify representative accepted
    // cases so we don't regress the happy path while tightening the
    // rejection branch.
    const ok = ['snap:pre-upgrade', 'snap:anchor', 'snap:v1_2', 'snap:A', 'snap:' + 'z'.repeat(64)];
    for (const good of ok) {
      const r = parseAt(good);
      expect(r.ok, `expected accept for ${JSON.stringify(good)}`).toBe(true);
      if (r.ok && r.parsed.mode === 'snapshot') {
        expect(r.parsed.name).toBe(good.slice('snap:'.length));
      }
    }
  });

  it('parseAt accepts bare integers, ISO dates, and canonicalises time mode', () => {
    const bare = parseAt('42');
    expect(bare.ok).toBe(true);
    if (bare.ok) expect(bare.parsed.mode).toBe('version');

    const iso = parseAt('2026-04-14T12:34:56Z');
    expect(iso.ok).toBe(true);
    if (iso.ok && iso.parsed.mode === 'time') {
      // Resolver canonicalises to ISO 8601 at UTC.
      expect(iso.parsed.timestamp).toBe('2026-04-14T12:34:56.000Z');
    }
  });

  it('resolveAt surfaces TIME_OUT_OF_RANGE when every cached version is newer', async () => {
    const store = new VersionStore();
    record(store, 5, '2026-06-01T00:00:00.000Z', 'v5');

    const ctx: ResolverContext = { store, workspaceRoot: workspace };
    const parsed = parseAt('2026-04-01');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await resolveAt(parsed.parsed, ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TIME_OUT_OF_RANGE');
    if (result.error.code !== 'TIME_OUT_OF_RANGE') return;
    expect(result.error.available.min).toBe(5);
  });

  it('resolveAt honours an injected SnapshotIRReader override', async () => {
    const store = new VersionStore();
    const injectedIR = buildIR('injected');
    const ctx: ResolverContext = {
      store,
      workspaceRoot: workspace,
      readSnapshotIR: async (_root, name) =>
        name === 'custom' ? injectedIR : null,
    };
    const parsed = parseAt('snap:custom');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = await resolveAt(parsed.parsed, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resolved.governanceIR).toBe(injectedIR);
  });

  it('VersionStore constructor rejects non-positive or non-integer maxVersions', () => {
    expect(() => new VersionStore({ maxVersions: 0 })).toThrow();
    expect(() => new VersionStore({ maxVersions: -1 })).toThrow();
    expect(() => new VersionStore({ maxVersions: 1.5 })).toThrow();
  });

  it('VersionStore.record rejects negative or non-integer versions', () => {
    const store = new VersionStore();
    expect(() =>
      store.record({
        version: -1,
        compiledAt: '2026-04-14T00:00:00.000Z',
        fileHashes: {},
        governanceIR: buildIR('bad'),
      }),
    ).toThrow();
    expect(() =>
      store.record({
        version: 1.5,
        compiledAt: '2026-04-14T00:00:00.000Z',
        fileHashes: {},
        governanceIR: buildIR('bad'),
      }),
    ).toThrow();
  });

  it('VersionStore.clear drops snapshots and eviction markers', () => {
    const store = new VersionStore({ maxVersions: 1 });
    record(store, 1, '2026-04-14T00:00:00.000Z', 'v1');
    record(store, 2, '2026-04-14T01:00:00.000Z', 'v2');
    expect(store.isEvicted(1)).toBe(true);
    expect(store.size()).toBe(1);
    store.clear();
    expect(store.size()).toBe(0);
    expect(store.isEvicted(1)).toBe(false);
    expect(store.available().count).toBe(0);
  });

  it('VersionStore.findNearestByTimestamp returns null for malformed input or empty store', () => {
    const store = new VersionStore();
    expect(store.findNearestByTimestamp('not-a-date')).toBeNull();
    record(store, 1, 'not-a-date', 'bad-compiled');
    expect(store.findNearestByTimestamp('2026-04-14')).toBeNull();
  });

  it('VersionStore evicts by lowest version, not insertion order (B3)', () => {
    // The retained window must be a contiguous suffix of the version
    // counter. Re-recording a previously-evicted low version is allowed
    // (idempotent rehydrate), but the subsequent eviction still drops
    // the lowest-numbered snapshot — which, with a full store, is the
    // same re-recorded entry. This is the contract time-travel UIs
    // rely on: `available().min` always names the true floor of the
    // retained range, never a re-inserted outlier.
    const store = new VersionStore({ maxVersions: 2 });
    record(store, 1, '2026-04-14T00:00:00.000Z', 'v1');
    record(store, 2, '2026-04-14T01:00:00.000Z', 'v2');
    record(store, 3, '2026-04-14T02:00:00.000Z', 'v3');
    expect(store.isEvicted(1)).toBe(true);
    // Re-record version 1 — rehydrate is allowed (not rejected as
    // non-monotonic because v1 is a previously-seen version). But
    // immediately after the size overflows, eviction picks the lowest
    // version — v1 again — so v2 and v3 remain the retained window.
    record(store, 1, '2026-04-14T03:00:00.000Z', 'v1-rehydrated');
    expect(store.isEvicted(1)).toBe(true);
    expect(store.get(2).kind).toBe('found');
    expect(store.get(3).kind).toBe('found');
    const range = store.available();
    expect(range.min).toBe(2);
    expect(range.max).toBe(3);
    expect(range.count).toBe(2);
  });

  it('8. restart: a fresh store starts empty, but snapshots on disk remain resolvable', async () => {
    // Simulate server restart: the in-memory store knows nothing but
    // the named snapshot persists on disk from before the restart.
    const snapshotIR = buildIR('persisted');
    const snapDir = join(workspace, '.claws', 'snapshots', 'anchor', 'files', '.claws', 'compiled');
    await mkdir(snapDir, { recursive: true });
    await writeFile(join(snapDir, 'governance-ir.json'), JSON.stringify(snapshotIR), 'utf-8');

    const freshStore = new VersionStore();
    expect(freshStore.size()).toBe(0);

    const ctx: ResolverContext = { store: freshStore, workspaceRoot: workspace };

    const versionParse = parseAt('v1');
    expect(versionParse.ok).toBe(true);
    if (versionParse.ok) {
      const versionLookup = await resolveAt(versionParse.parsed, ctx);
      expect(versionLookup.ok).toBe(false);
      if (!versionLookup.ok) {
        // An empty store returns OUT_OF_RANGE, not EVICTED — nothing
        // was ever recorded to evict.
        expect(versionLookup.error.code).toBe('VERSION_OUT_OF_RANGE');
      }
    }

    const snapParse = parseAt('snap:anchor');
    expect(snapParse.ok).toBe(true);
    if (snapParse.ok) {
      const snapLookup = await resolveAt(snapParse.parsed, ctx);
      expect(snapLookup.ok).toBe(true);
      if (snapLookup.ok) {
        expect(snapLookup.resolved.governanceIR.compiler.compilerVersion).toBe('0.0.0-persisted');
      }
    }
  });
});
