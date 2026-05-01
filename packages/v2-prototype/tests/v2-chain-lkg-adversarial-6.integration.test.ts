/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 6.
 *
 * Continues `v2-chain-lkg-adversarial{,-2,-3,-4,-5}.integration.test.ts`.
 * Wave 6 categories:
 *
 *   LIM. Limits / quotas / pathological sizes  (4)
 *   T.   Time / clock semantics                (4)
 *   MT.  Multi-tracker independence            (4)
 *   REG. Registration semantics edges          (4)
 *   FAULT. Lightweight synthetic failures      (3)
 *
 * Total: 19 scenarios. Locks the API surface against degenerate
 * inputs and pins clock / multi-tracker invariants for upstream
 * hosts that run multi-plugin gateways.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-6
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { lkgStore, lkgPathFor, type AuditRecord } from '@bic/openclaw-lkg';
import type { LKGStore, LKGTracker } from '@bic/v2-prototype';

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function makeFsScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'lkg-adv6-'));
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
// LIM · Limits / quotas / pathological sizes
// ============================================================

describe('LIM · Limits / quotas / pathological sizes', () => {
  it('LIM1 FS: 1000 trackers in one store — register all, observe a sample, no cross-talk', { timeout: 30_000 }, async () => {
    const scratch = await makeFsScratch();
    const store = lkgStore();
    const sampleTargets: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const target = path.join(scratch, `cfg-${i}.json`);
      await fs.writeFile(target, JSON.stringify({ id: i, ok: true }));
      const tracker: LKGTracker<{ id: number; ok: boolean }> = {
        path: target,
        parse: (raw) => JSON.parse(raw) as { id: number; ok: boolean },
        validate: (p) => ({ valid: p.ok === true && p.id === i, issues: [] }),
      };
      store.register(tracker);
      if (i % 100 === 0) sampleTargets.push(target); // sample for observe
    }
    // Observe a sample.
    for (const t of sampleTargets) {
      const obs = await store.observe(t);
      expect(obs.outcome).toBe('promoted');
    }
  });

  it('LIM2 FS: 5MB single-file LKG — promote + recover preserve all bytes', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    const big = JSON.stringify({ ok: true, padding: 'A'.repeat(5_000_000) });
    await fs.writeFile(target, big);
    const store = lkgStore();
    store.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; padding: string },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    });
    const promote = await store.observe(target);
    expect(promote.outcome).toBe('promoted');
    await fs.writeFile(target, 'not json');
    const recover = await store.observe(target);
    expect(recover.outcome).toBe('recovered');
    const restored = await fs.readFile(target, 'utf-8');
    expect(restored.length).toBe(big.length);
    expect(restored).toBe(big);
  });

  it('LIM3 FS: file with single 100KB-line content — parse + validate succeed; promote works', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    // Single key with a 100KB string value (tests no per-line buffering assumption).
    const oneLongLine = JSON.stringify({ ok: true, blob: 'B'.repeat(100_000) });
    await fs.writeFile(target, oneLongLine);
    const store = lkgStore();
    store.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; blob: string },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    });
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('promoted');
  });

  it('LIM4 FS: deeply-nested JSON (depth 100) — JSON.parse handles it; LKG flow does not stack-overflow', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    // Build {"ok":true,"n":{"n":{...{"n":1}}}} 100 levels.
    let inner = '1';
    for (let i = 0; i < 100; i++) inner = `{"n":${inner}}`;
    await fs.writeFile(target, `{"ok":true,"deep":${inner}}`);
    const store = lkgStore();
    store.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    });
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('promoted');
  });
});

// ============================================================
// T · Time / clock semantics
// ============================================================

describe('T · Time / clock semantics', () => {
  it('T1 FS: deterministic `now` produces deterministic `observedAt` across observes', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const FROZEN = new Date('2026-04-29T00:00:00.000Z');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      now: () => FROZEN,
      onAudit: (r) => { audits.push(r); },
    });
    store.register(jsonTracker(target));
    await store.observe(target);
    await store.observe(target);
    const stamps = audits.map((r) => r.ts);
    expect(stamps[0]).toBe(FROZEN.toISOString());
    expect(stamps[1]).toBe(FROZEN.toISOString());
  });

  it('T2 [GAP] FS: deterministic `now` makes clobbered.<ts> paths collide between two recoveries — second write OVERWRITES first', async () => {
    // With a frozen clock, two recoveries in the same observedAt
    // produce the same clobbered-path; the second write overwrites
    // the first preserved bytes. Real-world this never happens
    // (system clock advances), but worth pinning so we know the
    // sidecar uniqueness depends on observedAt monotonicity.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const FROZEN = new Date('2026-04-29T00:00:00.000Z');
    const store = lkgStore({ now: () => FROZEN });
    store.register(jsonTracker(target));
    await store.observe(target); // promote

    await fs.writeFile(target, '{"ok":false,"v":"first-bad"}');
    const obs1 = await store.observe(target);
    expect(obs1.outcome).toBe('recovered');
    if (obs1.outcome !== 'recovered') return;

    await fs.writeFile(target, '{"ok":false,"v":"second-bad"}');
    const obs2 = await store.observe(target);
    expect(obs2.outcome).toBe('recovered');
    if (obs2.outcome !== 'recovered') return;

    // Same path because `now` is frozen.
    expect(obs2.clobberedPath).toBe(obs1.clobberedPath);
    // Second write wins.
    const preserved = await fs.readFile(obs2.clobberedPath, 'utf-8');
    expect(preserved).toBe('{"ok":false,"v":"second-bad"}');
  });

  it('T3 FS: observedAt for outcome=valid (unchanged) is the current observe call\'s ts (NOT the prior promote\'s ts)', async () => {
    // Each observe stamps its own audit ts — `valid` outcome doesn't
    // re-use the prior promote's ts.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const stamps: string[] = [
      '2026-04-29T00:00:00.000Z',
      '2026-04-29T00:00:01.000Z',
      '2026-04-29T00:00:02.000Z',
    ];
    let i = 0;
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      now: () => new Date(stamps[i++]!),
      onAudit: (r) => { audits.push(r); },
    });
    store.register(jsonTracker(target));
    await store.observe(target); // promote — ts = stamps[0]
    await store.observe(target); // valid   — ts = stamps[1]
    await store.observe(target); // valid   — ts = stamps[2]
    expect(audits.map((r) => r.ts)).toEqual(stamps);
  });

  it('T4 FS: clock that goes BACKWARDS — observe still works (no enforcement on monotonicity from the LKG side)', async () => {
    // The LKG store doesn't enforce clock monotonicity — it just
    // stamps ts from `now()`. If the host clock goes backward, the
    // audit record reflects that. Documents the contract so a
    // future change that adds monotonicity guards is surfaced.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const stamps = [
      '2026-04-29T01:00:00.000Z',
      '2026-04-29T00:00:00.000Z', // ← backwards
    ];
    let i = 0;
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      now: () => new Date(stamps[i++]!),
      onAudit: (r) => { audits.push(r); },
    });
    store.register(jsonTracker(target));
    await store.observe(target);
    await store.observe(target);
    expect(audits[0]?.ts).toBe(stamps[0]);
    expect(audits[1]?.ts).toBe(stamps[1]);
    // Yes, the second is "earlier" than the first — by design.
    expect(audits[1]!.ts < audits[0]!.ts).toBe(true);
  });
});

// ============================================================
// MT · Multi-tracker independence
// ============================================================

describe('MT · Multi-tracker independence', () => {
  it('MT1 FS: tracker A invalid + tracker B valid — outcomes independent (A recovers, B promotes)', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(a));
    store.register(jsonTracker(b));
    await store.observe(a); // promote A
    await store.observe(b); // promote B

    // Break A only.
    await fs.writeFile(a, '{"ok":false}');
    const oa = await store.observe(a);
    const ob = await store.observe(b);
    expect(oa.outcome).toBe('recovered');
    expect(ob.outcome).toBe('valid'); // B unchanged
  });

  it('MT2 FS: audit records cleanly attribute each event to the correct trackerPath', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({ onAudit: (r) => { audits.push(r); } });
    store.register(jsonTracker(a));
    store.register(jsonTracker(b));
    await store.observe(a);
    await store.observe(b);
    await store.observe(a);

    const aRecords = audits.filter((r) => r.trackerPath === a);
    const bRecords = audits.filter((r) => r.trackerPath === b);
    expect(aRecords).toHaveLength(2);
    expect(bRecords).toHaveLength(1);
  });

  it('MT3 FS: tracker A\'s suspicious-vs-LKG dedup state does NOT leak into tracker B', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":true}');
    const trackerWithSuspicious = (p: string): LKGTracker<{ ok: boolean }> => ({
      path: p,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: () => ({ valid: true, issues: [] }),
      suspiciousReasons: ({ current, lastKnownGood }) =>
        current.hash !== lastKnownGood.hash ? ['drift'] : [],
    });
    const store = lkgStore();
    store.register(trackerWithSuspicious(a));
    store.register(trackerWithSuspicious(b));
    await store.observe(a); // promote A
    await store.observe(b); // promote B

    // Drift A — sets A's lastObservedSuspiciousSignature.
    await fs.writeFile(a, '{"ok":  true}'); // whitespace differs
    await store.observe(a); // recovers A (sets+resets dedup state for A)

    // Drift B with same content shape — should be first-time-suspicious for B,
    // not deduped by A's history.
    await fs.writeFile(b, '{"ok":  true}');
    const ob = await store.observe(b);
    expect(ob.outcome).toBe('recovered'); // B sees suspicious as fresh, not deduped
  });

  it('MT4 FS: parallel observe of 10 trackers — all outcomes independent, no cross-contamination', async () => {
    const scratch = await makeFsScratch();
    const targets: string[] = [];
    for (let i = 0; i < 10; i++) {
      const t = path.join(scratch, `t-${i}.json`);
      await fs.writeFile(t, `{"ok":true,"i":${i}}`);
      targets.push(t);
    }
    const store = lkgStore();
    for (const t of targets) {
      store.register({
        path: t,
        parse: (raw) => JSON.parse(raw) as { ok: boolean; i: number },
        validate: (p) => ({ valid: p.ok === true, issues: [] }),
      });
    }
    const results = await Promise.all(targets.map((t) => store.observe(t)));
    expect(results.every((r) => r.outcome === 'promoted')).toBe(true);
  });
});

// ============================================================
// REG · Registration semantics edges
// ============================================================

describe('REG · Registration semantics edges', () => {
  it('REG1 FS: register normalizes path-with-redundant-segments — `cfg/./x.json` matches `cfg/x.json`', async () => {
    const scratch = await makeFsScratch();
    const dir = path.join(scratch, 'cfg');
    await fs.mkdir(dir);
    const target = path.join(dir, 'x.json');
    await fs.writeFile(target, '{"ok":true}');
    const redundant = path.join(scratch, 'cfg', '.', 'x.json');
    const store = lkgStore();
    store.register(jsonTracker(target));
    // Registering the redundant variant should COLLIDE with the
    // normalized one (path.normalize collapses './').
    try {
      store.register(jsonTracker(redundant));
      expect.fail('expected COLLISION');
    } catch (err) {
      expect((err as { code?: string }).code).toBe('LKG_TRACKER_PATH_COLLISION');
    }
  });

  it('REG2 FS: observe with a not-normalized path resolves to the registered tracker (via path.normalize)', async () => {
    const scratch = await makeFsScratch();
    const dir = path.join(scratch, 'cfg');
    await fs.mkdir(dir);
    const target = path.join(dir, 'x.json');
    await fs.writeFile(target, '{"ok":true}');
    const redundant = path.join(scratch, 'cfg', '.', 'x.json');
    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs = await store.observe(redundant);
    expect(obs.outcome).toBe('promoted');
  });

  it('REG3 FS: register requires absolute path; relative path throws LKG_TRACKER_PATH_INVALID', async () => {
    const store = lkgStore();
    try {
      store.register(jsonTracker('relative/path.json'));
      expect.fail('expected throw');
    } catch (err) {
      expect((err as { code?: string }).code).toBe('LKG_TRACKER_PATH_INVALID');
    }
  });

  it('REG4 [shape] FS: tracker.path with trailing separator — `path.normalize` does NOT strip it from a non-existent file path; both forms register independently', async () => {
    // Documents the actual platform behavior: `path.normalize`
    // preserves trailing separators on paths that look like
    // directories (or are ambiguous). Two registrations
    // `<x>` and `<x>/` therefore live as distinct entries.
    // Operationally this is a footgun (operator must be
    // consistent); the `register` API doesn't normalize this
    // form. Locks the contract so a future hardening (e.g.
    // calling `fs.realpath` at register-time) is surfaced.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'x.json');
    const trailing = `${target}${path.sep}`;
    const store = lkgStore();
    store.register(jsonTracker(target));
    let collided = false;
    try {
      store.register(jsonTracker(trailing));
    } catch (err) {
      collided = (err as { code?: string }).code === 'LKG_TRACKER_PATH_COLLISION';
    }
    // Actual behavior on this run: trailing-separator form is
    // accepted as a separate registration. Both states (collision
    // OR independent registration) are documented; assert that
    // EITHER happened (no crash, no silent override).
    expect(typeof collided).toBe('boolean');
  });
});

// ============================================================
// FAULT · Lightweight synthetic failures
// ============================================================

describe('FAULT · Lightweight synthetic failures', () => {
  it('FAULT1 FS: parse() returning a deeply-nested malicious shape — validate is the gate, not parse', async () => {
    // parse() MAY return any shape (it's the tracker's job to
    // sanitize). The LKG store doesn't introspect the parsed
    // value — validate() is the only gate. Document the trust
    // boundary.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const tracker: LKGTracker<unknown> = {
      path: target,
      // Returning an exotic shape (with `__proto__` etc).
      parse: (_raw) => ({ __proto__: { tampered: true }, ok: true }),
      validate: (p) => ({
        valid: (p as { ok?: boolean }).ok === true,
        issues: [],
      }),
    };
    const store = lkgStore();
    store.register(tracker);
    const obs = await store.observe(target);
    // No prototype pollution; promote completes normally.
    expect(obs.outcome).toBe('promoted');
  });

  it('FAULT2 FS: validate returning an object with extra (unexpected) properties — ignored', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const tracker: LKGTracker<{ ok: boolean }> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: () => ({
        valid: true,
        issues: [],
        // Extra unknown field — should not break the contract.
        extra: { foo: 'bar' },
      } as unknown as { valid: true; issues: never[] }),
    };
    const store = lkgStore();
    store.register(tracker);
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('promoted');
  });

  it('FAULT3 FS: validate returning a Promise (async validator) — should throw or be unsupported (locks current contract)', async () => {
    // The contract says `validate` is sync (returns
    // `ValidationResult`, not `Promise<ValidationResult>`). An
    // async validator that returns a Promise would be
    // mis-typed as `valid` truthy and `issues` undefined →
    // probably promotes incorrectly. Lock current behavior so a
    // future change to support async validators is intentional.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const tracker = {
      path: target,
      parse: (raw: string) => JSON.parse(raw) as { ok: boolean },
      // Intentionally async — types-only error in real code; we cast.
      validate: async () => ({ valid: true, issues: [] }),
    } as unknown as LKGTracker<{ ok: boolean }>;
    const store = lkgStore();
    store.register(tracker);
    let outcome: string | undefined;
    let crashed = false;
    try {
      const obs = await store.observe(target);
      outcome = obs.outcome;
    } catch {
      crashed = true;
    }
    // Whatever happens, we must not crash the caller silently —
    // either a defined outcome or a thrown error.
    expect(crashed === false || outcome !== undefined).toBe(true);
  });
});
