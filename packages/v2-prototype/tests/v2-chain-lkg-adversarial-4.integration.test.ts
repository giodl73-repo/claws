/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 4.
 *
 * Continues the wave 1-3 mapping. Wave 4 categories:
 *
 *   EI. Error injection                          (4)
 *   CR. Crash recovery / partial state           (4)
 *   GD. Git-backend dedup & semantic parity      (4)
 *   GW. Git worktree edges                       (3)
 *
 * Total: 15 scenarios. Probes the parts of the contract that get
 * exercised when a process dies mid-promote, when audit hooks fail
 * asynchronously, and when the git backend has to behave parity-wise
 * with the FS backend on suspicious / shouldRecover / validator-throw
 * paths.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-4
 */

import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

import { lkgStore, lkgPathFor, clobberedPathFor, type AuditRecord } from '@bic/openclaw-lkg';
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
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'lkg-adv4-'));
  live.push({ scratch });
  return scratch;
}

async function makeGitRepo(opts?: { seed?: boolean }): Promise<string> {
  const seed = opts?.seed ?? true;
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'lkg-adv4-git-'));
  live.push({ scratch });
  await execFileP('git', ['init', '-q', '-b', 'main'], { cwd: scratch });
  await execFileP('git', ['config', 'user.email', 'init@t'], { cwd: scratch });
  await execFileP('git', ['config', 'user.name', 'Init'], { cwd: scratch });
  if (seed) {
    await execFileP('git', ['commit', '--allow-empty', '-m', 'seed'], { cwd: scratch });
  }
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
// EI · Error injection
// ============================================================

describe('EI · Error injection', () => {
  it('EI1 FS: pre-existing tmp file from crashed prior promote — observe still completes (rename overwrites)', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    // Plant a stale tmp-* file as if a prior promote crashed mid-write.
    const planted = `${lkgPathFor(target)}.tmp-stale-junk`;
    await fs.writeFile(planted, 'leftover bytes');

    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('promoted');
    // The new tmp uses a fresh random suffix, so the planted one
    // remains until pruned externally — this is by-design (orphan
    // recovery is operator-territory, not LKG-territory).
    const planted_still = await fs.readFile(planted, 'utf-8').catch(() => null);
    expect(planted_still).toBe('leftover bytes');
  });

  it('EI2 FS: target path is a directory — observe emits failed (no crash)', async () => {
    const scratch = await makeFsScratch();
    // Tracker target is actually a directory — read will fail with EISDIR.
    const target = path.join(scratch, 'cfg.json');
    await fs.mkdir(target);
    const audits: AuditRecord[] = [];
    const store = lkgStore({ onAudit: (r) => { audits.push(r); } });
    store.register(jsonTracker(target));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('failed');
    expect(audits.at(-1)?.outcome).toBe('failed');
  });

  it('EI3 FS: audit hook returns a rejected promise — observe completes (async reject swallowed)', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore({
      onAudit: () => Promise.reject(new Error('log sink down')),
    });
    store.register(jsonTracker(target));
    const obs = await store.observe(target);
    // observe must succeed even though audit's promise rejected.
    expect(obs.outcome).toBe('promoted');
  });

  it('EI4 FS: recovery-notice hook returns a rejected promise — recover still completes', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore({
      onRecoveryNotice: () => Promise.reject(new Error('queue down')),
    });
    store.register(jsonTracker(target));
    await store.observe(target); // promote
    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('recovered');
  });
});

// ============================================================
// CR · Crash recovery / partial state
// ============================================================

describe('CR · Crash recovery / partial state', () => {
  it('CR1 FS: orphaned <path>.lkg from prior process is NOT trusted by a fresh store (hash check refuses)', async () => {
    // After a crash, .lkg file is on disk but the new process has
    // no `lastPromotedGood` entry. Recovery refuses (returns null →
    // skipped). The first valid observe re-promotes from current
    // bytes. This is the cross-process safety property.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    // Plant an .lkg file with bytes that don't match anything we'd promote.
    await fs.writeFile(lkgPathFor(target), '{"ok":true,"different":"bytes"}');

    const store = lkgStore();
    store.register(jsonTracker(target));
    // Active bytes are valid → promote (overwriting the orphan .lkg).
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('promoted');
    const newLkg = await fs.readFile(lkgPathFor(target), 'utf-8');
    expect(newLkg).toBe('{"ok":true}');
  });

  it('CR2 FS: pre-existing <path>.clobbered.<ts> from prior recovery — next recovery creates a new one (no overwrite)', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    // Plant an old clobbered file with a fixed-name pattern that
    // would never collide with a real ISO timestamp.
    const planted = clobberedPathFor(target, '2020-01-01T00-00-00-000Z');
    await fs.writeFile(planted, 'pre-existing clobbered bytes');

    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target); // promote
    await fs.writeFile(target, '{"ok":false}'); // bad
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('recovered');

    // Planted clobbered must be untouched.
    expect(await fs.readFile(planted, 'utf-8')).toBe('pre-existing clobbered bytes');
    if (obs.outcome === 'recovered') {
      // New clobbered uses observe-time timestamp; different path.
      expect(obs.clobberedPath).not.toBe(planted);
    }
  });

  it('CR3 FS: multi-tracker store — one tracker\'s file is missing, others observe normally', async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, 'a.json');
    const b = path.join(scratch, 'b.json');
    await fs.writeFile(a, '{"ok":true}');
    // b never written
    const store = lkgStore();
    store.register(jsonTracker(a));
    store.register(jsonTracker(b));
    const [oa, ob] = await Promise.all([store.observe(a), store.observe(b)]);
    expect(oa.outcome).toBe('promoted');
    expect(ob.outcome).toBe('failed');
  });

  it('CR4 [GAP] FS: out-of-band <path>.lkg edit only surfaces on a recover attempt, not on the next valid observe', async () => {
    // Tamper detection happens in `recover()` via the hash check at
    // `lkg-store.ts:189`. The validate-and-promote happy path uses
    // the in-memory `lastPromotedGood.hash` as the cache key — if
    // current bytes hash equals that key, observe returns valid and
    // the (tampered) on-disk LKG is never re-read or re-written.
    //
    // So: an attacker who can hand-edit `<path>.lkg` while the
    // working tree stays valid is invisible until something forces
    // a recover (working tree breaks). At that point the hash check
    // catches it (skipped, no recover). Tamper is detect-on-recover,
    // not detect-on-observe. Mitigations live at deployment level
    // (chmod 0600, gateway-owned dir).
    //
    // Locks the current contract so we notice if a future change
    // adds proactive LKG-file integrity checks on every observe.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target); // promote

    // Out-of-band: hand-mutate the LKG file.
    await fs.writeFile(lkgPathFor(target), '{"ok":true,"injected":true}');

    // Bad working tree → recover called → hash mismatch → skipped.
    await fs.writeFile(target, '{"ok":false}');
    const obs1 = await store.observe(target);
    expect(obs1.outcome).toBe('skipped');

    // Restore good bytes; observe sees current.hash == lastPromotedGood.hash
    // ⇒ outcome=valid, no work, no re-write of the LKG companion.
    await fs.writeFile(target, '{"ok":true}');
    const obs2 = await store.observe(target);
    expect(obs2.outcome).toBe('valid');

    // [GAP]: LKG file remains tampered until a force-promote or a
    // recover-then-re-promote cycle overwrites it.
    const lkgBytes = await fs.readFile(lkgPathFor(target), 'utf-8');
    expect(lkgBytes).toBe('{"ok":true,"injected":true}');
  });
});

// ============================================================
// GD · Git-backend dedup & semantic parity
// ============================================================

describe('GD · Git-backend dedup & semantic parity', () => {
  it('GD1 git: shouldRecover=false on git store also surfaces plugin-local-invalidity (parity with FS R2)', async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const tracker: LKGTracker<{ ok: boolean }> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: (p) => ({
        valid: p.ok,
        issues: p.ok ? [] : [{ path: 'ok', message: 'bad' }],
      }),
      shouldRecover: () => false,
    };
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(tracker);
    await store.observe(target); // promote
    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('skipped');
    if (obs.outcome === 'skipped') expect(obs.reason).toBe('plugin-local-invalidity');
    // Working tree still has bad bytes (no recover called).
    expect(await fs.readFile(target, 'utf-8')).toBe('{"ok":false}');
  });

  it('GD2 git: validator throws → observe propagates the error (parity with FS V1, validators must be exception-safe)', async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const tracker: LKGTracker<{ ok: boolean }> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: () => { throw new Error('validator exploded'); },
    };
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(tracker);
    let caught: unknown = null;
    try {
      await store.observe(target);
    } catch (err) {
      caught = err;
    }
    expect(caught).not.toBeNull();
  });

  it('GD3 git: unparseable file recovers via `git checkout HEAD --` (parity with FS R3)', async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target); // promote
    await fs.writeFile(target, 'not json at all');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe('recovered');
    if (obs.outcome === 'recovered') expect(obs.reason).toBe('unparseable');
    // Working tree was restored from HEAD.
    expect(await fs.readFile(target, 'utf-8')).toBe('{"ok":true}');
  });

  it('GD4 git: getEntry().lastPromotedGood.hash refreshes across promote+recover cycles', async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target); // promote 1
    const h1 = store.getEntry(target)?.lastPromotedGood?.hash;
    expect(h1).toMatch(/^[0-9a-f]{40}$/);

    // Promote a different value.
    await fs.writeFile(target, '{"ok":true,"v":2}');
    await store.observe(target); // promote 2
    const h2 = store.getEntry(target)?.lastPromotedGood?.hash;
    expect(h2).toMatch(/^[0-9a-f]{40}$/);
    expect(h2).not.toBe(h1);

    // Break, recover — getEntry should reflect the LKG hash (= h2).
    await fs.writeFile(target, '{ broken');
    await store.observe(target); // recovered
    const h3 = store.getEntry(target)?.lastPromotedGood?.hash;
    expect(h3).toBe(h2);
  });
});

// ============================================================
// GW · Git worktree edges
// ============================================================

describe('GW · Git worktree edges', () => {
  it('GW1 git: empty repo (no seed commit) — first observe must handle no-HEAD gracefully', async () => {
    // Without a seed commit there's no HEAD ref. `ls-tree HEAD` will
    // fail. Behavior should be: surface a failed/skipped outcome,
    // never crash. Document the actual behavior.
    const repo = await makeGitRepo({ seed: false });
    const target = path.join(repo, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    let outcome: string | undefined;
    let crashed = false;
    try {
      const obs = await store.observe(target);
      outcome = obs.outcome;
    } catch {
      crashed = true;
    }
    // Either: promote succeeds (commit creates the first HEAD), or
    // a controlled failed/skipped — what we MUST avoid is a crash.
    expect(crashed).toBe(false);
    expect(['promoted', 'valid', 'skipped', 'failed']).toContain(outcome);
  });

  it('GW2 git: tracker file in a nested subdir — relPath uses forward slashes; promote + recover both work', async () => {
    const repo = await makeGitRepo();
    const subdir = path.join(repo, 'cfg', 'nested');
    await fs.mkdir(subdir, { recursive: true });
    const target = path.join(subdir, 'policy.json');
    await fs.writeFile(target, '{"ok":true}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    const obs1 = await store.observe(target);
    expect(obs1.outcome).toBe('promoted');
    // Verify the commit references the file with forward-slash relPath.
    const log = await execFileP('git', ['log', '--name-only', '--format='], { cwd: repo });
    expect(log.stdout.trim()).toContain('cfg/nested/policy.json');

    await fs.writeFile(target, '{"ok":false}');
    const obs2 = await store.observe(target);
    expect(obs2.outcome).toBe('recovered');
  });

  it('GW3 git: tracker promote does NOT include staged unrelated paths in the LKG commit', async () => {
    // Stage an unrelated file before observe; the LKG commit should
    // only include the tracked path. Otherwise an LKG commit would
    // sweep up arbitrary staged work, which is unsafe.
    const repo = await makeGitRepo();
    const target = path.join(repo, 'cfg.json');
    await fs.writeFile(target, '{"ok":true}');
    await fs.writeFile(path.join(repo, 'unrelated.txt'), 'something staged');
    await execFileP('git', ['add', 'unrelated.txt'], { cwd: repo });

    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target); // promote

    // The latest commit's tree should NOT contain unrelated.txt.
    const lastFiles = await execFileP(
      'git',
      ['show', '--name-only', '--format=', 'HEAD'],
      { cwd: repo },
    );
    expect(lastFiles.stdout).toContain('cfg.json');
    expect(lastFiles.stdout).not.toContain('unrelated.txt');
  });
});
