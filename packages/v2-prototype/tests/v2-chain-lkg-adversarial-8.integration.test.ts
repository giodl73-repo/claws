/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 8.
 *
 * Continues `v2-chain-lkg-adversarial{,-2..-7}.integration.test.ts`.
 * Wave 8 categories:
 *
 *   HK.   Hook ordering semantics                          (4)
 *   REC.  Recovery edges (LKG/entry mismatch)              (4)
 *   PROM. Promote-time edge cases                          (4)
 *   NRM.  Path normalization (Windows/POSIX, drive case)   (4)
 *
 * Total: 16 scenarios.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-8
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

import { lkgStore, lkgPathFor, type AuditRecord, type RecoveryNotice } from "@bic/openclaw-lkg";
import { gitLKGStore } from "@bic/openclaw-lkg-git";
import type { LKGTracker } from "@bic/v2-prototype";

const execFileP = promisify(execFile);
const WIN = process.platform === "win32";

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true }).catch(() => undefined);
  }
});

const AUTHOR = { name: "LKG Bot", email: "lkg@test.local" };

async function makeFsScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-adv8-"));
  live.push({ scratch });
  return scratch;
}

async function makeGitRepo(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-adv8-git-"));
  live.push({ scratch });
  await execFileP("git", ["init", "-q", "-b", "main"], { cwd: scratch });
  await execFileP("git", ["config", "user.email", "init@t"], { cwd: scratch });
  await execFileP("git", ["config", "user.name", "Init"], { cwd: scratch });
  await execFileP("git", ["commit", "--allow-empty", "-m", "seed"], { cwd: scratch });
  return scratch;
}

interface FakeJson {
  ok: boolean;
}

function jsonTracker(p: string): LKGTracker<FakeJson> {
  return {
    path: p,
    parse: (raw) => JSON.parse(raw) as FakeJson,
    validate: (parsed) => ({
      valid: parsed?.ok === true,
      issues: parsed?.ok === true ? [] : [{ path: "ok", message: "must be true" }],
    }),
  };
}

// ============================================================
// HK · Hook ordering semantics
// ============================================================

describe("HK · Hook ordering semantics", () => {
  it("HK1 FS: audit fires exactly once per observe call (no double-firing on any outcome)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register(jsonTracker(target));

    await store.observe(target); // promoted
    await store.observe(target); // valid
    await fs.writeFile(target, '{"ok":false}');
    await store.observe(target); // recovered
    await store.observe(target); // valid (after recover)

    expect(audits).toHaveLength(4);
    expect(audits.map((r) => r.outcome)).toEqual(["promoted", "valid", "recovered", "valid"]);
  });

  it("HK2 FS: audit fires AFTER on-disk state has settled — clobberedPath in audit corresponds to a file that exists on disk", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: async (r) => {
        // Inside the audit hook, the clobbered file should already exist.
        if (r.clobberedPath !== null) {
          const exists = await fs
            .stat(r.clobberedPath)
            .then(() => true)
            .catch(() => false);
          expect(exists).toBe(true);
        }
        audits.push(r);
      },
    });
    store.register(jsonTracker(target));
    await store.observe(target); // promote
    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("recovered");
  });

  it("HK3 FS: recovery-notice fires exactly once per recovered outcome (not per observe)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const notices: RecoveryNotice[] = [];
    const store = lkgStore({
      onRecoveryNotice: (n) => {
        notices.push(n);
      },
    });
    store.register(jsonTracker(target));

    await store.observe(target); // promote — no notice
    expect(notices).toHaveLength(0);
    await fs.writeFile(target, '{"ok":false}');
    await store.observe(target); // recover — 1 notice
    expect(notices).toHaveLength(1);
    await store.observe(target); // valid (unchanged after recover) — no notice
    expect(notices).toHaveLength(1);
  });

  it("HK4 FS: across multi-tracker observe sequence, audit ordering reflects call order (FIFO)", async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, "a.json");
    const b = path.join(scratch, "b.json");
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register(jsonTracker(a));
    store.register(jsonTracker(b));

    await store.observe(a);
    await store.observe(b);
    await store.observe(a);

    expect(audits.map((r) => r.trackerPath)).toEqual([a, b, a]);
  });
});

// ============================================================
// REC · Recovery edges (LKG/entry mismatch)
// ============================================================

describe("REC · Recovery edges", () => {
  it("REC1 FS: entry has lastPromotedGood but .lkg file is missing — recover returns null → outcome=skipped", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target); // promote, entry now has lastPromotedGood

    // Wipe the .lkg companion (simulating disk loss / external delete).
    await fs.unlink(lkgPathFor(target));

    // Working tree breaks → recover called → readFile fails → null → skipped.
    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("skipped");
    if (obs.outcome === "skipped") expect(obs.reason).toBe("no-lkg-available");
  });

  it("REC2 FS: entry hash mismatches .lkg bytes (.lkg replaced out-of-band) — recover refuses → skipped", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target); // entry.lastPromotedGood.hash now points at the original

    // Hand-mutate the .lkg companion (entry hash unchanged).
    await fs.writeFile(lkgPathFor(target), '{"ok":true,"injected":1}');

    // Force recover — hash mismatch → null → skipped.
    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("skipped");
  });

  it("REC3 FS: recover preserves bytes byte-identical to LKG file (not to entry fingerprint)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    const seed = '{\n  "ok": true,\n  "padding": "longer-content-here-to-detect-truncation"\n}\n';
    await fs.writeFile(target, seed);
    const tracker: LKGTracker<{ ok: boolean }> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    };
    const store = lkgStore();
    store.register(tracker);
    await store.observe(target); // promote — .lkg is `seed`

    await fs.writeFile(target, "not json");
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("recovered");
    const restored = await fs.readFile(target, "utf-8");
    expect(restored).toBe(seed); // exactly the LKG bytes, no transformation
  });

  it("REC4 FS: when shouldRecover returns false AND validator is invalid, the .lkg file is untouched (no read)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const tracker: LKGTracker<{ ok: boolean }> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: (p) => ({ valid: p.ok, issues: p.ok ? [] : [{ path: "", message: "bad" }] }),
      shouldRecover: () => false,
    };
    const store = lkgStore();
    store.register(tracker);
    await store.observe(target);
    const lkgBefore = await fs.readFile(lkgPathFor(target), "utf-8");

    await fs.writeFile(target, '{"ok":false}');
    await store.observe(target); // skipped — plugin-local

    // .lkg untouched (no recover write).
    const lkgAfter = await fs.readFile(lkgPathFor(target), "utf-8");
    expect(lkgAfter).toBe(lkgBefore);
  });
});

// ============================================================
// PROM · Promote-time edge cases
// ============================================================

describe("PROM · Promote-time edge cases", () => {
  it("PROM1 FS: same valid bytes observed twice — second observe returns valid (no second promote, no extra .lkg write)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    const first = await store.observe(target);
    expect(first.outcome).toBe("promoted");
    const second = await store.observe(target);
    expect(second.outcome).toBe("valid"); // unchanged
  });

  it("PROM2 FS: distinct valid bytes promoted twice — second promote OVERWRITES the LKG companion (last-good wins)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true,"v":1}');
    const tracker: LKGTracker<{ ok: boolean; v: number }> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; v: number },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    };
    const store = lkgStore();
    store.register(tracker);
    await store.observe(target); // promote v1

    await fs.writeFile(target, '{"ok":true,"v":2}');
    await store.observe(target); // promote v2

    const lkg = await fs.readFile(lkgPathFor(target), "utf-8");
    expect(lkg).toBe('{"ok":true,"v":2}'); // v2 is now the LKG
  });

  it("PROM3 FS: observe produces no .lkg.tmp file leftover after successful promote", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target);
    const entries = await fs.readdir(scratch);
    const tmpLeftovers = entries.filter((e) => e.includes(".tmp-"));
    expect(tmpLeftovers).toHaveLength(0);
  });

  it("PROM4 git: promote produces a commit whose tree contains ONLY the registered path (not other staged paths)", async () => {
    // Mirrors GW3 with a different angle: pre-stage 2 unrelated paths,
    // then promote, then verify the commit tree.
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    await fs.writeFile(path.join(repo, "noise1.txt"), "a");
    await fs.writeFile(path.join(repo, "noise2.txt"), "b");
    await execFileP("git", ["add", "noise1.txt", "noise2.txt"], { cwd: repo });

    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target); // commit only cfg.json

    const lastTree = await execFileP("git", ["show", "--name-only", "--format=", "HEAD"], {
      cwd: repo,
    });
    expect(lastTree.stdout).toContain("cfg.json");
    expect(lastTree.stdout).not.toContain("noise1");
    expect(lastTree.stdout).not.toContain("noise2");
  });
});

// ============================================================
// NRM · Path normalization
// ============================================================

describe("NRM · Path normalization", () => {
  it("NRM1 FS: register then observe via the SAME path — match (baseline)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("promoted");
  });

  it("NRM2 FS: observe via path-with-redundant-segments (cfg/./../cfg/x.json) resolves to registered tracker", async () => {
    const scratch = await makeFsScratch();
    const dir = path.join(scratch, "cfg");
    await fs.mkdir(dir);
    const target = path.join(dir, "x.json");
    await fs.writeFile(target, '{"ok":true}');
    const messy = path.join(dir, ".", "..", "cfg", "x.json"); // resolves to target

    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs = await store.observe(messy);
    expect(obs.outcome).toBe("promoted");
  });

  it.skipIf(!WIN)(
    "NRM3 Windows: register with mixed slashes — normalization collapses them to platform separators",
    async () => {
      const scratch = await makeFsScratch();
      const dir = path.join(scratch, "cfg");
      await fs.mkdir(dir);
      const target = path.join(dir, "x.json");
      await fs.writeFile(target, '{"ok":true}');
      // Forward-slash variant on Windows.
      const fwd = `${scratch.replace(/\\/g, "/")}/cfg/x.json`;
      const store = lkgStore();
      store.register(jsonTracker(target));
      // Observing via forward-slash path on Windows: path.normalize will
      // produce a backslash form that matches the registered tracker.
      const obs = await store.observe(fwd);
      expect(obs.outcome).toBe("promoted");
    },
  );

  it("NRM4 git: tracker relPath always uses forward slashes regardless of platform separator", async () => {
    const repo = await makeGitRepo();
    const subdir = path.join(repo, "a", "b", "c");
    await fs.mkdir(subdir, { recursive: true });
    const target = path.join(subdir, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target);

    // Verify the commit references the file with forward slashes.
    const lastTree = await execFileP("git", ["show", "--name-only", "--format=", "HEAD"], {
      cwd: repo,
    });
    expect(lastTree.stdout).toContain("a/b/c/cfg.json");
    expect(lastTree.stdout).not.toContain("a\\b\\c"); // no Windows backslash leaked
  });
});
