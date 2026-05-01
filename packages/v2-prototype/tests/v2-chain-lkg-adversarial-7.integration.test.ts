/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 7.
 *
 * Continues `v2-chain-lkg-adversarial{,-2,-3,-4,-5,-6}.integration.test.ts`.
 * Wave 7 categories:
 *
 *   WK.   Workspace-shape (multiple LKGs in same dir, siblings)   (4)
 *   MULT. Multi-process simulation (hand-off, sequential races)   (4)
 *   DET.  Determinism / replay                                    (3)
 *   CIR.  Non-serializable / circular parse shapes                (3)
 *   EXT.  SDK extension boundary (custom suspicious / shouldRec)  (4)
 *   DEG.  Degenerate validator outputs                            (3)
 *
 * Total: 21 scenarios.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-7
 */

import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

import { lkgStore, lkgPathFor, type AuditRecord } from '@bic/openclaw-lkg';
import { gitLKGStore } from '@bic/openclaw-lkg-git';
import type { LKGStore, LKGTracker } from '@bic/v2-prototype';

const execFileP = promisify(execFile);

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true }).catch(() => undefined);
  }
});

const AUTHOR = { name: 'LKG Bot', email: 'lkg@test.local' };

async function makeFsScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'lkg-adv7-'));
  live.push({ scratch });
  return scratch;
}

async function makeGitRepo(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'lkg-adv7-git-'));
  live.push({ scratch });
  await execFileP('git', ['init', '-q', '-b', 'main'], { cwd: scratch });
  await execFileP('git', ['config', 'user.email', 'init@t'], { cwd: scratch });
  await execFileP('git', ['config', 'user.name', 'Init'], { cwd: scratch });
  await execFileP('git', ['commit', '--allow-empty', '-m', 'seed'], { cwd: scratch });
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
// WK · Workspace-shape
// ============================================================

describe('WK · Workspace-shape (multiple LKGs in same dir)', () => {
  it('WK1 FS: two trackers in the same dir — promote+recover are independent on disk (separate `.lkg` and `.clobbered.<ts>` files)', async () => {
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

    expect(await fs.stat(lkgPathFor(a)).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.stat(lkgPathFor(b)).then(() => true).catch(() => false)).toBe(true);

    await fs.writeFile(a, '{"ok":false}');
    const obs = await store.observe(a);
    expect(obs.outcome).toBe('recovered');
    if (obs.outcome === 'recovered') {
      // a's clobbered sidecar lives next to a, NOT b.
      expect(path.dirname(obs.clobberedPath)).toBe(scratch);
      expect(obs.clobberedPath.startsWith(`${a}.clobbered.`)).toBe(true);
    }
  });

  it('WK2 FS: tracker file with `.lkg` literal in its name (not as suffix) — register+observe still work without confusion', async () => {
    // The companion-file naming is `<target>.lkg`, but the target
    // itself can contain `.lkg` as part of its filename. Register
    // and observe must not get confused by substring matches.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'has.lkg.in.name.json');
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('promoted');
    // The companion is at <target>.lkg = has.lkg.in.name.json.lkg
    const companionExists = await fs.stat(lkgPathFor(target)).then(() => true).catch(() => false);
    expect(companionExists).toBe(true);
  });

  it('WK3 FS: deleting a sibling tracker\'s files between observes does NOT affect this tracker', async () => {
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

    // Wipe B and its companion.
    await fs.unlink(b);
    await fs.unlink(lkgPathFor(b));

    // A should still observe normally.
    const oa = await store.observe(a);
    expect(oa.outcome).toBe('valid');
  });

  it('WK4 FS: two trackers with the same basename in different subdirs — independent companions, no name collision', async () => {
    const scratch = await makeFsScratch();
    const dirA = path.join(scratch, 'a');
    const dirB = path.join(scratch, 'b');
    await fs.mkdir(dirA);
    await fs.mkdir(dirB);
    const a = path.join(dirA, 'cfg.json');
    const b = path.join(dirB, 'cfg.json');
    await fs.writeFile(a, '{"ok":true,"who":"a"}');
    await fs.writeFile(b, '{"ok":true,"who":"b"}');
    const store = lkgStore();
    store.register(jsonTracker(a));
    store.register(jsonTracker(b));
    await store.observe(a);
    await store.observe(b);
    const lkgA = await fs.readFile(lkgPathFor(a), 'utf-8');
    const lkgB = await fs.readFile(lkgPathFor(b), 'utf-8');
    expect(lkgA).toContain('"who":"a"');
    expect(lkgB).toContain('"who":"b"');
  });
});

// ============================================================
// MULT · Multi-process simulation
// ============================================================

describe('MULT · Multi-process simulation (two stores, hand-off)', () => {
  it('MULT1 [GAP] FS: process B (fresh store) `readLastKnownGood` returns on-disk .lkg bytes WITHOUT hash check — safety gate is at plugin shell, not at this API', async () => {
    // The FS `readLastKnownGood` reads `<path>.lkg` directly and
    // returns the bytes if the file exists. There is NO check
    // against any recorded `lastPromotedGood.hash` (the in-memory
    // entry is empty in a fresh process). So a hand-edited `.lkg`
    // file that's been on disk since a prior process can be served
    // back through this API.
    //
    // This is BY-DESIGN: the safety gate against orphan/tampered
    // LKG files lives at the plugin shell (`policy-plugin-lkg.ts`
    // uses `getEntry().lastPromotedGood.hash` as the cache key —
    // empty entry → fail-closed). Direct `readLastKnownGood`
    // callers without that gate are responsible for their own
    // verification, OR for calling `observe` first to populate
    // the in-memory entry (which then enables the hash check on
    // any recovery flow).
    //
    // Locks the contract so a future hardening that adds a hash
    // check to `readLastKnownGood` is intentional.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const storeA = lkgStore();
    storeA.register(jsonTracker(target));
    await storeA.observe(target); // process A: .lkg on disk

    const storeB = lkgStore();
    storeB.register(jsonTracker(target));
    // Process B: no observe yet. readLastKnownGood returns on-disk bytes.
    const bytes = await storeB.readLastKnownGood(target);
    expect(new TextDecoder().decode(bytes)).toBe('{"ok":true}');

    // Confirm getEntry() reports an EMPTY entry (so the plugin
    // shell's gate would fail-closed).
    const entry = storeB.getEntry(target);
    expect(entry).toEqual({});
  });

  it('MULT2 FS: process A promotes; process B observes valid → re-promotes (overwriting orphan .lkg with same bytes)', async () => {
    // Cross-process hand-off: A leaves .lkg behind; B's first observe
    // sees current bytes match its (empty) entry, so it promotes.
    // The new .lkg is byte-identical to A's because content is the
    // same. No bugs here, just a parity check.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const storeA = lkgStore();
    storeA.register(jsonTracker(target));
    await storeA.observe(target);
    const lkgBefore = await fs.readFile(lkgPathFor(target), 'utf-8');

    const storeB = lkgStore();
    storeB.register(jsonTracker(target));
    const obs = await storeB.observe(target);
    expect(obs.outcome).toBe('promoted');
    const lkgAfter = await fs.readFile(lkgPathFor(target), 'utf-8');
    expect(lkgAfter).toBe(lkgBefore); // byte-identical
  });

  it('MULT3 git: process A commits; process B (fresh store) gets the same HEAD blob hash via observe', async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const storeA = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    storeA.register(jsonTracker(target));
    await storeA.observe(target); // commit
    const hA = storeA.getEntry(target)?.lastPromotedGood?.hash;

    const storeB = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    storeB.register(jsonTracker(target));
    await storeB.observe(target); // unchanged → outcome=valid
    const hB = storeB.getEntry(target)?.lastPromotedGood?.hash;

    expect(hA).toMatch(/^[0-9a-f]{40}$/);
    expect(hB).toBe(hA); // same git HEAD blob
  });

  it('MULT4 FS: parallel observes across two stores on different files — both promote without contention', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":true}');
    const storeA = lkgStore();
    const storeB = lkgStore();
    storeA.register(jsonTracker(a));
    storeB.register(jsonTracker(b));
    const [oa, ob] = await Promise.all([storeA.observe(a), storeB.observe(b)]);
    expect(oa.outcome).toBe('promoted');
    expect(ob.outcome).toBe('promoted');
  });
});

// ============================================================
// DET · Determinism / replay
// ============================================================

describe('DET · Determinism / replay', () => {
  it('DET1 FS: same input bytes + same `now()` → same audit record (deterministic replay)', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const FROZEN = new Date('2026-04-29T00:00:00.000Z');
    const audits1: AuditRecord[] = [];
    const audits2: AuditRecord[] = [];
    const store1 = lkgStore({ now: () => FROZEN, onAudit: (r) => { audits1.push(r); } });
    const store2 = lkgStore({ now: () => FROZEN, onAudit: (r) => { audits2.push(r); } });
    store1.register(jsonTracker(target));
    store2.register(jsonTracker(target));
    await store1.observe(target);
    await store2.observe(target);
    // Audit records are deeply equal (same bytes, same clock).
    const omit = (r: AuditRecord): Omit<AuditRecord, 'current' | 'lastKnownGood'> & {
      currentHash: string | undefined;
      lastKnownGoodHash: string | undefined;
    } => ({
      ...r,
      currentHash: r.current?.hash,
      lastKnownGoodHash: r.lastKnownGood?.hash,
    });
    expect(omit(audits2.at(-1)!).outcome).toBe(omit(audits1.at(-1)!).outcome);
    expect(omit(audits2.at(-1)!).currentHash).toBe(omit(audits1.at(-1)!).currentHash);
    expect(audits2.at(-1)!.ts).toBe(audits1.at(-1)!.ts);
  });

  it('DET2 FS: same recover sequence with same `now()` → same clobbered path', async () => {
    const scratch = await makeFsScratch();
    const FROZEN = new Date('2026-04-29T00:00:00.000Z');
    const trial = async (): Promise<string> => {
      const target = path.join(await makeFsScratch(), 'cfg.json');
      await fs.writeFile(target, '{"ok":true}');
      const store = lkgStore({ now: () => FROZEN });
      store.register(jsonTracker(target));
      await store.observe(target);
      await fs.writeFile(target, '{"ok":false}');
      const obs = await store.observe(target);
      if (obs.outcome === 'recovered') {
        // Strip scratch prefix; only the suffix is determined by clock.
        return path.basename(obs.clobberedPath);
      }
      return '';
    };
    const a = await trial();
    const b = await trial();
    expect(a).toBe(b); // basename equal under frozen clock
  });

  it('DET3 FS: replaying observe events on a fresh store with the same starting bytes produces the same final on-disk state', async () => {
    const scratch1 = await makeFsScratch();
    const scratch2 = await makeFsScratch();
    const a1 = path.join(scratch1, 'cfg.json');
    const a2 = path.join(scratch2, 'cfg.json');

    // Identical script: write good → observe → write bad → observe → write good → observe.
    const script = async (target: string): Promise<void> => {
      await fs.writeFile(target, '{"ok":true}');
      const store = lkgStore();
      store.register(jsonTracker(target));
      await store.observe(target);
      await fs.writeFile(target, '{"ok":false}');
      await store.observe(target);
      await fs.writeFile(target, '{"ok":true}');
      await store.observe(target);
    };
    await script(a1);
    await script(a2);

    // Final on-disk state for the LKG companion is byte-identical.
    const lkg1 = await fs.readFile(lkgPathFor(a1), 'utf-8');
    const lkg2 = await fs.readFile(lkgPathFor(a2), 'utf-8');
    expect(lkg1).toBe(lkg2);
    // Active files byte-identical too.
    expect(await fs.readFile(a1, 'utf-8')).toBe(await fs.readFile(a2, 'utf-8'));
  });
});

// ============================================================
// CIR · Non-serializable / circular parse shapes
// ============================================================

describe('CIR · Non-serializable / circular parse shapes', () => {
  it('CIR1 FS: parse() returns a circular object — validate runs on it without crashing (LKG never JSON.stringifies the parsed value)', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    type Cyclic = { ok: boolean; self?: unknown };
    const tracker: LKGTracker<Cyclic> = {
      path: target,
      parse: (raw) => {
        const o: Cyclic = JSON.parse(raw) as Cyclic;
        o.self = o; // circular
        return o;
      },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    };
    const store = lkgStore();
    store.register(tracker);
    const obs = await store.observe(target);
    // Promote completes — LKG stores raw bytes, not the parsed value.
    expect(obs.outcome).toBe('promoted');
  });

  it('CIR2 FS: parse() returns a Map — validate sees Map; LKG flow is shape-agnostic', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const tracker: LKGTracker<Map<string, unknown>> = {
      path: target,
      parse: (raw) => {
        const m = new Map<string, unknown>();
        const o = JSON.parse(raw) as Record<string, unknown>;
        for (const [k, v] of Object.entries(o)) m.set(k, v);
        return m;
      },
      validate: (m) => ({ valid: m.get('ok') === true, issues: [] }),
    };
    const store = lkgStore();
    store.register(tracker);
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('promoted');
  });

  it('CIR3 FS: parse() returns Date — validate sees Date; LKG flow does not touch the parsed value beyond passing it to validate', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '"2026-04-29T00:00:00.000Z"');
    const tracker: LKGTracker<Date> = {
      path: target,
      parse: (raw) => new Date(JSON.parse(raw) as string),
      validate: (d) => ({ valid: !Number.isNaN(d.getTime()), issues: [] }),
    };
    const store = lkgStore();
    store.register(tracker);
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('promoted');
  });
});

// ============================================================
// EXT · SDK extension boundary
// ============================================================

describe('EXT · SDK extension boundary', () => {
  it('EXT1 FS: custom suspiciousReasons fired with `parsed` — has access to the typed tracker output', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true,"size":100}');
    const tracker: LKGTracker<{ ok: boolean; size: number }> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; size: number },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
      // suspiciousReasons takes the typed parsed value.
      suspiciousReasons: ({ parsed }) => (parsed.size > 1000 ? ['too-large'] : []),
    };
    const store = lkgStore();
    store.register(tracker);
    await store.observe(target); // promote (size=100, OK)
    await fs.writeFile(target, '{"ok":true,"size":99999}'); // valid but suspicious
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('recovered');
  });

  it('EXT2 FS: shouldRecover gets validation snapshot — can branch on issue codes', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true,"variant":"a"}');
    type Cfg = { ok: boolean; variant: string };
    const tracker: LKGTracker<Cfg> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as Cfg,
      validate: (p) => ({
        valid: p.ok === true,
        issues: p.ok
          ? []
          : [{ path: 'ok', message: 'must be true', code: 'BAD_OK' }],
      }),
      // Recover on BAD_OK; skip on other issue codes.
      shouldRecover: ({ issues }) => issues.some((i) => i.code === 'BAD_OK'),
    };
    const store = lkgStore();
    store.register(tracker);
    await store.observe(target); // promote
    await fs.writeFile(target, '{"ok":false,"variant":"b"}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('recovered');
  });

  it('EXT3 FS: tracker without suspiciousReasons — never flags suspicious (default behavior)', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target)); // no suspiciousReasons
    await store.observe(target); // promote
    await fs.writeFile(target, '{"ok":true,"v":2}'); // changed but valid
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('promoted'); // re-promote, no suspicious gating
  });

  it('EXT4 FS: tracker without shouldRecover — defaults to "always recover when invalid"', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target)); // no shouldRecover
    await store.observe(target); // promote
    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('recovered'); // default = recover
  });
});

// ============================================================
// DEG · Degenerate validator outputs
// ============================================================

describe('DEG · Degenerate validator outputs', () => {
  it('DEG1 [shape] FS: validator returns empty issues array when invalid — recover still fires (valid is the gate, not issues.length)', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const tracker: LKGTracker<{ ok: boolean }> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    };
    const store = lkgStore();
    store.register(tracker);
    await store.observe(target);
    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('recovered');
    if (obs.outcome === 'recovered') {
      // Even with empty issues, recover fired because validation.valid was false.
      expect(obs.reason).toBe('invalid');
    }
  });

  it('DEG2 FS: validator returns multiple issues — all surface in the audit record', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const tracker: LKGTracker<{ ok: boolean }> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: (p) => ({
        valid: p.ok === true,
        issues: p.ok
          ? []
          : [
              { path: 'ok', message: 'first issue' },
              { path: 'ok', message: 'second issue' },
              { path: 'ok', message: 'third issue' },
            ],
      }),
    };
    const store = lkgStore({ onAudit: (r) => { audits.push(r); } });
    store.register(tracker);
    await store.observe(target);
    await fs.writeFile(target, '{"ok":false}');
    await store.observe(target);
    const recoveredAudit = audits.find((a) => a.outcome === 'recovered');
    expect(recoveredAudit?.issues).toHaveLength(3);
    expect(recoveredAudit?.issues.map((i) => i.message)).toContain('first issue');
    expect(recoveredAudit?.issues.map((i) => i.message)).toContain('third issue');
  });

  it('DEG3 [shape] FS: validator with optional `code` on issues — code propagates through audit', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const tracker: LKGTracker<{ ok: boolean }> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: (p) => ({
        valid: p.ok === true,
        issues: p.ok ? [] : [{ path: 'ok', message: 'bad', code: 'CUSTOM_CODE' }],
      }),
    };
    const store = lkgStore({ onAudit: (r) => { audits.push(r); } });
    store.register(tracker);
    await store.observe(target);
    await fs.writeFile(target, '{"ok":false}');
    await store.observe(target);
    const recoveredAudit = audits.find((a) => a.outcome === 'recovered');
    expect(recoveredAudit?.issues[0]?.code).toBe('CUSTOM_CODE');
  });
});
