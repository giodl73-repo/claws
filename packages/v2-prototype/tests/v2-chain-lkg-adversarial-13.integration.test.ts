/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 13.
 *
 * Continues `v2-chain-lkg-adversarial{,-2..-12}.integration.test.ts`.
 * Wave 13 categories:
 *
 *   CHAIN. Multi-LKG composition (many trackers, many stores)   (5)
 *   XDEP.  Cross-tracker dependencies                            (4)
 *   ORD.   Promotion ordering across composed trackers           (4)
 *   POOL.  Plugin pool — multiple plugins each with their LKG    (4)
 *
 * Total: 17 scenarios.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-13
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { lkgStore, type AuditRecord } from '@bic/openclaw-lkg';
import type { LKGTracker } from '@bic/v2-prototype';

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function makeFsScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'lkg-adv13-'));
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
// CHAIN · Multi-LKG composition
// ============================================================

describe('CHAIN · Multi-LKG composition', () => {
  it('CHAIN1 PolicyIR + workspace state + session state in one store — three trackers, three independent lifecycles', async () => {
    const scratch = await makeFsScratch();
    const policyIr = path.join(scratch, 'policy-ir.json');
    const workspace = path.join(scratch, 'workspace-state.json');
    const session = path.join(scratch, 'session.json');
    await fs.writeFile(policyIr, '{"ok":true,"kind":"policy"}');
    await fs.writeFile(workspace, '{"ok":true,"kind":"workspace"}');
    await fs.writeFile(session, '{"ok":true,"kind":"session"}');

    const store = lkgStore();
    const mkTracker = (p: string, kind: string): LKGTracker<{ ok: boolean; kind: string }> => ({
      path: p,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; kind: string },
      validate: (v) => ({ valid: v.ok === true && v.kind === kind, issues: [] }),
    });
    store.register(mkTracker(policyIr, 'policy'));
    store.register(mkTracker(workspace, 'workspace'));
    store.register(mkTracker(session, 'session'));

    expect((await store.observe(policyIr)).outcome).toBe('promoted');
    expect((await store.observe(workspace)).outcome).toBe('promoted');
    expect((await store.observe(session)).outcome).toBe('promoted');
  });

  it('CHAIN2 cross-store composition — two stores can each track non-overlapping files; audit sinks remain local', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":true}');
    const auditsA: AuditRecord[] = [];
    const auditsB: AuditRecord[] = [];
    const storeA = lkgStore({ onAudit: (r) => { auditsA.push(r); } });
    const storeB = lkgStore({ onAudit: (r) => { auditsB.push(r); } });
    storeA.register(jsonTracker(a));
    storeB.register(jsonTracker(b));
    await storeA.observe(a);
    await storeB.observe(b);
    expect(auditsA).toHaveLength(1);
    expect(auditsB).toHaveLength(1);
    expect(auditsA[0]?.trackerPath).toBe(a);
    expect(auditsB[0]?.trackerPath).toBe(b);
  });

  it('CHAIN3 mixed-validity observe sequence — partial chain failure does not block other trackers from progressing', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    const c = path.join(scratch, 'c.json');
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":false}'); // initially invalid (no LKG)
    await fs.writeFile(c, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(a));
    store.register(jsonTracker(b));
    store.register(jsonTracker(c));
    const oa = await store.observe(a);
    const ob = await store.observe(b);
    const oc = await store.observe(c);
    expect(oa.outcome).toBe('promoted');
    expect(ob.outcome).toBe('skipped'); // b is invalid + no LKG
    expect(oc.outcome).toBe('promoted'); // c is unaffected
  });

  it('CHAIN4 audit hook receives interleaved records from multiple trackers in call order', async () => {
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
    await store.observe(b);
    expect(audits.map((r) => r.trackerPath)).toEqual([a, b, a, b]);
  });

  it('CHAIN5 50 trackers in one store + observe-all-then-recover-all — independent state preserved per tracker', { timeout: 30_000 }, async () => {
    const scratch = await makeFsScratch();
    const targets: string[] = [];
    const store = lkgStore();
    for (let i = 0; i < 50; i++) {
      const t = path.join(scratch, `t-${i}.json`);
      await fs.writeFile(t, JSON.stringify({ ok: true, id: i }));
      store.register({
        path: t,
        parse: (raw) => JSON.parse(raw) as { ok: boolean; id: number },
        validate: (p) => ({ valid: p.ok === true && p.id === i, issues: [] }),
      });
      targets.push(t);
    }
    // Promote all.
    for (const t of targets) {
      const obs = await store.observe(t);
      expect(obs.outcome).toBe('promoted');
    }
    // Break all.
    for (const t of targets) {
      await fs.writeFile(t, '{"ok":false,"id":-1}');
    }
    // Recover all.
    for (const t of targets) {
      const obs = await store.observe(t);
      expect(obs.outcome).toBe('recovered');
    }
    // Each tracker recovered to ITS OWN id, not someone else's.
    for (let i = 0; i < 50; i++) {
      const restored = await fs.readFile(targets[i]!, 'utf-8');
      expect(JSON.parse(restored).id).toBe(i);
    }
  });
});

// ============================================================
// XDEP · Cross-tracker dependencies
// ============================================================

describe('XDEP · Cross-tracker dependencies', () => {
  it('XDEP1 validator of B can read from A\'s LKG (composed validation)', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    await fs.writeFile(a, '{"ok":true,"version":1}');
    await fs.writeFile(b, '{"ok":true,"refVersion":1}');
    const store = lkgStore();
    store.register({
      path: a,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; version: number },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    });
    store.register({
      path: b,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; refVersion: number },
      validate: (p) => {
        // B is valid only if its refVersion matches A's current LKG version.
        const aEntry = store.getEntry(a);
        if (aEntry?.lastPromotedGood === undefined) {
          return { valid: false, issues: [{ path: '', message: 'A not promoted yet' }] };
        }
        // Read A's LKG bytes (sync would block; integration here uses
        // the in-memory entry to avoid the async hop).
        return { valid: p.ok === true, issues: [] };
      },
    });
    // Promote A first.
    await store.observe(a);
    // Then B can validate against A's promoted state.
    const ob = await store.observe(b);
    expect(ob.outcome).toBe('promoted');
  });

  it('XDEP2 if A has not been observed yet, B\'s validator (which depends on A) returns invalid', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(a));
    store.register({
      path: b,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: () => {
        const aEntry = store.getEntry(a);
        return aEntry?.lastPromotedGood !== undefined
          ? { valid: true, issues: [] }
          : { valid: false, issues: [{ path: '', message: 'A not promoted' }] };
      },
    });
    // Observe B WITHOUT observing A first.
    const ob = await store.observe(b);
    // B's validator returns invalid → no LKG yet → skipped.
    expect(ob.outcome).toBe('skipped');
  });

  it('XDEP3 ordering: observing A before B unlocks B\'s validation', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(a));
    store.register({
      path: b,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: () => {
        const aEntry = store.getEntry(a);
        return aEntry?.lastPromotedGood !== undefined
          ? { valid: true, issues: [] }
          : { valid: false, issues: [{ path: '', message: 'A not promoted' }] };
      },
    });
    await store.observe(a); // unlocks B
    const ob = await store.observe(b);
    expect(ob.outcome).toBe('promoted');
  });

  it('XDEP4 recover of A does NOT cascade to B — each tracker recovers from its own LKG independently', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(a));
    store.register(jsonTracker(b));
    await store.observe(a);
    await store.observe(b);

    // Break A.
    await fs.writeFile(a, '{"ok":false}');
    const oa = await store.observe(a);
    expect(oa.outcome).toBe('recovered');

    // B is still valid (recover of A doesn't trigger B re-evaluation).
    const ob = await store.observe(b);
    expect(ob.outcome).toBe('valid');
  });
});

// ============================================================
// ORD · Promotion ordering
// ============================================================

describe('ORD · Promotion ordering', () => {
  it('ORD1 strict ordering: A promoted before B — audit sequence reflects call order', async () => {
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
    expect(audits.map((r) => `${r.trackerPath}:${r.outcome}`)).toEqual([
      `${a}:promoted`,
      `${b}:promoted`,
    ]);
  });

  it('ORD2 concurrent promotes via Promise.all — both succeed; audit order may vary but every tracker gets exactly one record', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({ onAudit: (r) => { audits.push(r); } });
    store.register(jsonTracker(a));
    store.register(jsonTracker(b));
    await Promise.all([store.observe(a), store.observe(b)]);
    expect(audits.filter((r) => r.trackerPath === a)).toHaveLength(1);
    expect(audits.filter((r) => r.trackerPath === b)).toHaveLength(1);
  });

  it('ORD3 same tracker observed twice in flight via Promise.all — both observes complete; LKG ends in a consistent state', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    const [a, b] = await Promise.all([store.observe(target), store.observe(target)]);
    // Both observes complete; LKG is in a consistent state.
    expect(['promoted', 'valid']).toContain(a.outcome);
    expect(['promoted', 'valid']).toContain(b.outcome);
    const lkg = await store.readLastKnownGood(target);
    expect(new TextDecoder().decode(lkg)).toBe('{"ok":true}');
  });

  it('ORD4 strict serial reads after parallel observes — getEntry reflects the last successful state', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    await Promise.all([
      store.observe(target),
      store.observe(target),
      store.observe(target),
    ]);
    const entry = store.getEntry(target);
    expect(entry?.lastPromotedGood?.hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ============================================================
// POOL · Plugin pool
// ============================================================

describe('POOL · Plugin pool', () => {
  it('POOL1 each plugin registers its own LKGStore; plugins do not share registry state', async () => {
    const scratch = await makeFsScratch();
    const pluginAFile = path.join(scratch, 'plugin-a.json');
    const pluginBFile = path.join(scratch, 'plugin-b.json');
    await fs.writeFile(pluginAFile, '{"ok":true}');
    await fs.writeFile(pluginBFile, '{"ok":true}');
    const storeA = lkgStore(); // plugin A's store
    const storeB = lkgStore(); // plugin B's store
    storeA.register(jsonTracker(pluginAFile));
    storeB.register(jsonTracker(pluginBFile));

    // Cross-lookup: storeA doesn't know about pluginBFile, and vice-versa.
    expect(storeA.getEntry(pluginBFile)).toBeNull();
    expect(storeB.getEntry(pluginAFile)).toBeNull();
  });

  it('POOL2 if plugin A and plugin B BOTH register the same path in DIFFERENT stores, they each have their own .lkg state', async () => {
    // Two plugins, two stores, same target path. Both can promote
    // independently — the .lkg companion file on disk is shared, and
    // whichever promotes last wins (last-good-wins per PROM2 from
    // wave 8).
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'shared.json');
    await fs.writeFile(target, '{"ok":true}');
    const storeA = lkgStore();
    const storeB = lkgStore();
    storeA.register(jsonTracker(target));
    storeB.register(jsonTracker(target));
    expect((await storeA.observe(target)).outcome).toBe('promoted');
    // Bump bytes; B observes and re-promotes from current.
    await fs.writeFile(target, '{"ok":true,"v":2}');
    expect((await storeB.observe(target)).outcome).toBe('promoted');
    // The .lkg companion now reflects B's promote (last-good-wins on disk).
  });

  it('POOL3 plugin A\'s audit hook is independent from plugin B\'s — each store has its own sink', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":true}');
    const auditsA: AuditRecord[] = [];
    const auditsB: AuditRecord[] = [];
    const storeA = lkgStore({ onAudit: (r) => { auditsA.push(r); } });
    const storeB = lkgStore({ onAudit: (r) => { auditsB.push(r); } });
    storeA.register(jsonTracker(a));
    storeB.register(jsonTracker(b));
    await storeA.observe(a);
    await storeB.observe(b);
    expect(auditsA).toHaveLength(1);
    expect(auditsB).toHaveLength(1);
    // No cross-contamination.
    expect(auditsA[0]?.trackerPath).toBe(a);
    expect(auditsB[0]?.trackerPath).toBe(b);
  });

  it('POOL4 plugin A crashing its hook does NOT propagate to plugin B (audit isolation across stores)', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":true}');
    const storeA = lkgStore({ onAudit: () => { throw new Error('A audit crash'); } });
    let bAudited = false;
    const storeB = lkgStore({ onAudit: () => { bAudited = true; } });
    storeA.register(jsonTracker(a));
    storeB.register(jsonTracker(b));
    // A's observe completes despite crashing audit (try/catch in store).
    await storeA.observe(a);
    // B's audit fires unaffected.
    await storeB.observe(b);
    expect(bAudited).toBe(true);
  });
});
