/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 12.
 *
 * Continues `v2-chain-lkg-adversarial{,-2..-11}.integration.test.ts`.
 * Wave 12 categories:
 *
 *   WIRE. Upstream config-LKG byte-format parity      (4)
 *   MIG.  Migration story (config-LKG → @bic/lkg)     (4)
 *   REPL. Audit log replay                            (4)
 *   DIAG. Diagnostics / introspection                 (5)
 *
 * Total: 17 scenarios.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-12
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  lkgStore,
  lkgPathFor,
  clobberedPathFor,
  hashRaw,
  type AuditRecord,
} from '@bic/openclaw-lkg';
import type { LKGTracker } from '@bic/v2-prototype';

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function makeFsScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'lkg-adv12-'));
  live.push({ scratch });
  return scratch;
}

interface FakeJson { ok: boolean }

function jsonTracker(p: string): LKGTracker<FakeJson> {
  return {
    path: p,
    parse: (raw) => JSON.parse(raw) as FakeJson,
    validate: (parsed) => ({
      valid: parsed?.ok === true,
      issues: parsed?.ok === true ? [] : [{ path: 'ok', message: 'must be true' }],
    }),
  };
}

// ============================================================
// WIRE · Upstream config-LKG byte-format parity
// ============================================================
//
// The pre-RFC's load-bearing claim is "factor out the existing
// pattern" — these tests pin the wire shape to the upstream
// `recoverConfigFromLastKnownGood` (`io.observe-recovery.ts`)
// conventions so the reference impl can be byte-for-byte
// validated against the existing config-LKG.
// ============================================================

describe('WIRE · Upstream config-LKG byte-format parity', () => {
  it('WIRE1 `<path>.lkg` companion uses `.lkg` suffix concatenated to the FULL target path (no prefix transform)', () => {
    const cases = [
      ['/abs/path/cfg.json', '/abs/path/cfg.json.lkg'],
      ['/abs/path/has.lkg.in.name.json', '/abs/path/has.lkg.in.name.json.lkg'],
      ['C:\\Users\\g\\cfg.json', 'C:\\Users\\g\\cfg.json.lkg'],
    ] as const;
    for (const [target, expected] of cases) {
      expect(lkgPathFor(target)).toBe(expected);
    }
  });

  it('WIRE2 `clobbered.<ts>` ISO timestamp format strips colons and dots to `-` (filename-safe)', () => {
    const target = '/abs/path/cfg.json';
    const ts = '2026-04-29T01:23:45.678Z';
    const result = clobberedPathFor(target, ts);
    // Format is `<target>.clobbered.<safe-ts>` with `:` → `-` and `.` → `-`.
    expect(result).toBe('/abs/path/cfg.json.clobbered.2026-04-29T01-23-45-678Z');
  });

  it('WIRE3 hash is sha256 lower-hex (64 chars) over raw bytes — deterministic across platforms', () => {
    const a = hashRaw('hello world');
    expect(a).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('WIRE4 audit record `source` field is the literal `"lkg"` (not configurable, so a wire-parity contract)', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({ onAudit: (r) => { audits.push(r); } });
    store.register(jsonTracker(target));
    await store.observe(target);
    expect(audits.at(-1)?.source).toBe('lkg');
    expect(audits.at(-1)?.event).toBe('observe');
  });
});

// ============================================================
// MIG · Migration story (config-LKG → @bic/openclaw-lkg)
// ============================================================

describe('MIG · Migration story', () => {
  it('MIG1 orphan `<path>.lkg` from a hypothetical prior process is rejected by hash check; first observe re-promotes from current bytes', async () => {
    // Models: a deployment migrating from upstream's config-LKG to
    // `@bic/openclaw-lkg`. The .lkg file is on disk but in-memory
    // state is fresh.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    // Plant an "old" .lkg that doesn't match what the new store would record.
    await fs.writeFile(lkgPathFor(target), '{"ok":true,"old":1}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs = await store.observe(target);
    // Active bytes are valid → re-promotes from current bytes,
    // overwriting the orphan .lkg (no hash check fires on the
    // promote path; only on the recover path).
    expect(obs.outcome).toBe('promoted');
    const lkg = await fs.readFile(lkgPathFor(target), 'utf-8');
    expect(lkg).toBe('{"ok":true}'); // current bytes won
  });

  it('MIG2 1:N tracker mapping — one store can register many config files under different tracker definitions (matches "factor out per-file" framing)', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'config-a.json');
    const b = path.join(scratch, 'config-b.json');
    const c = path.join(scratch, 'policy-ir.json'); // non-config file
    await fs.writeFile(a, '{"ok":true,"kind":"a"}');
    await fs.writeFile(b, '{"ok":true,"kind":"b"}');
    await fs.writeFile(c, '{"ok":true,"kind":"policy-ir"}');
    const store = lkgStore();
    store.register({
      path: a,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; kind: string },
      validate: (p) => ({ valid: p.ok && p.kind === 'a', issues: [] }),
    });
    store.register({
      path: b,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; kind: string },
      validate: (p) => ({ valid: p.ok && p.kind === 'b', issues: [] }),
    });
    store.register({
      path: c,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; kind: string },
      validate: (p) => ({ valid: p.ok && p.kind === 'policy-ir', issues: [] }),
    });
    expect((await store.observe(a)).outcome).toBe('promoted');
    expect((await store.observe(b)).outcome).toBe('promoted');
    expect((await store.observe(c)).outcome).toBe('promoted');
  });

  it('MIG3 LKG works for non-config files (PolicyIR, hook output) — validator is the only thing that knows the schema', async () => {
    // Demonstrates the generalization: nothing in the LKG store
    // knows about config-specific schemas. The tracker definition
    // is the entire contract.
    const scratch = await makeFsScratch();
    const hookOut = path.join(scratch, 'hook-output.txt');
    await fs.writeFile(hookOut, 'OK\n');
    const store = lkgStore();
    store.register({
      path: hookOut,
      parse: (raw) => raw, // identity parse — non-JSON data
      validate: (raw) => ({ valid: raw.startsWith('OK'), issues: [] }),
    });
    expect((await store.observe(hookOut)).outcome).toBe('promoted');
    await fs.writeFile(hookOut, 'FAIL\n');
    expect((await store.observe(hookOut)).outcome).toBe('recovered');
  });

  it('MIG4 LKG store has no config-specific lifecycle hooks (no `onConfigReload`, etc.) — generic primitive', async () => {
    // The contract surface is `register / observe / readLastKnownGood / getEntry`.
    // No lifecycle hooks beyond `onAudit` and `onRecoveryNotice`.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore({
      onAudit: () => {},
      onRecoveryNotice: () => {},
    });
    store.register(jsonTracker(target));
    expect(typeof (store as Record<string, unknown>).onConfigReload).toBe('undefined');
    expect(typeof (store as Record<string, unknown>).flushConfig).toBe('undefined');
  });
});

// ============================================================
// REPL · Audit log replay
// ============================================================

describe('REPL · Audit log replay', () => {
  it('REPL1 audit log can be replayed to reconstruct the final fingerprint', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({ onAudit: (r) => { audits.push(r); } });
    store.register(jsonTracker(target));
    await store.observe(target); // promote v1
    await fs.writeFile(target, '{"ok":true,"v":2}');
    await store.observe(target); // promote v2 (different fingerprint)
    await fs.writeFile(target, '{"ok":false}');
    await store.observe(target); // recover (back to v2 LKG)

    // Reconstruct: the most-recent `current` hash from a `promoted`
    // outcome is the LKG fingerprint at the end.
    const lastPromoted = [...audits].reverse().find((r) => r.outcome === 'promoted');
    const entry = store.getEntry(target);
    expect(entry?.lastPromotedGood?.hash).toBe(lastPromoted?.current?.hash);
  });

  it('REPL2 audit `ts` ordering is preserved across many observes — replay can detect gaps via timestamp monotonicity', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({ onAudit: (r) => { audits.push(r); } });
    store.register(jsonTracker(target));
    for (let i = 0; i < 20; i++) {
      await store.observe(target);
    }
    // Each ts should be ≥ the previous (monotonic non-decreasing).
    for (let i = 1; i < audits.length; i++) {
      expect(audits[i]!.ts >= audits[i - 1]!.ts).toBe(true);
    }
  });

  it('REPL3 same observe-sequence on a fresh store produces same audit-record sequence (hash equality)', async () => {
    const trial = async (): Promise<string[]> => {
      const scratch = await makeFsScratch();
      const target = path.join(scratch, 'cfg.json');
      await fs.writeFile(target, '{"ok":true}');
      const audits: AuditRecord[] = [];
      const store = lkgStore({ onAudit: (r) => { audits.push(r); } });
      store.register(jsonTracker(target));
      await store.observe(target);
      await fs.writeFile(target, '{"ok":false}');
      await store.observe(target);
      return audits.map((r) => `${r.outcome}:${r.current?.hash}:${r.lastKnownGood?.hash}`);
    };
    const a = await trial();
    const b = await trial();
    expect(a).toEqual(b);
  });

  it('REPL4 audit `outcome` sequence matches expected lifecycle for a promote→recover→valid script', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({ onAudit: (r) => { audits.push(r); } });
    store.register(jsonTracker(target));
    await store.observe(target);
    await fs.writeFile(target, '{"ok":false}');
    await store.observe(target);
    await store.observe(target);
    expect(audits.map((r) => r.outcome)).toEqual(['promoted', 'recovered', 'valid']);
  });
});

// ============================================================
// DIAG · Diagnostics / introspection
// ============================================================

describe('DIAG · Diagnostics / introspection', () => {
  it('DIAG1 getEntry returns a shallow copy — caller can mutate result without affecting registry state', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target);
    const e1 = store.getEntry(target);
    // Attempt to mutate the returned entry (lastPromotedGood is a typed
    // readonly field but JS allows runtime mutation).
    if (e1 !== null) {
      (e1 as Record<string, unknown>).injectedField = 'mutated';
    }
    const e2 = store.getEntry(target);
    expect((e2 as Record<string, unknown>)?.injectedField).toBeUndefined();
  });

  it('DIAG2 getEntry on registered-but-never-observed tracker returns empty `{}` (not null)', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    const store = lkgStore();
    store.register(jsonTracker(target));
    const e = store.getEntry(target);
    expect(e).toEqual({});
  });

  it('DIAG3 getEntry on unregistered path returns null (not empty object) — distinct signal from DIAG2', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'never-registered.json');
    const store = lkgStore();
    expect(store.getEntry(target)).toBeNull();
  });

  it('DIAG4 store has no `listTrackers()` / `unregister()` / `clear()` API — registry is intentionally append-only and opaque', async () => {
    const store = lkgStore();
    expect(typeof (store as Record<string, unknown>).listTrackers).toBe('undefined');
    expect(typeof (store as Record<string, unknown>).unregister).toBe('undefined');
    expect(typeof (store as Record<string, unknown>).clear).toBe('undefined');
    expect(typeof (store as Record<string, unknown>).reset).toBe('undefined');
  });

  it('DIAG5 store.register registers idempotently per call — calling register twice on different paths each succeeds', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    const store = lkgStore();
    expect(() => store.register(jsonTracker(a))).not.toThrow();
    expect(() => store.register(jsonTracker(b))).not.toThrow();
    // Both have entries (even though never observed).
    expect(store.getEntry(a)).toEqual({});
    expect(store.getEntry(b)).toEqual({});
  });
});
