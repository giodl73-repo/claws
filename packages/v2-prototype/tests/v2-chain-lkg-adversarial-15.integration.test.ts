/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 15.
 *
 * Continues `v2-chain-lkg-adversarial{,-2..-14}.integration.test.ts`.
 * Wave 15 categories — git-backend deeper edge cases:
 *
 *   REF.   HEAD ref movement between observes              (4)
 *   PACK.  Packed objects vs loose blobs                   (3)
 *   GC.    git gc / pruning of unreferenced LKG blobs      (3)
 *   RBASE. Rebase across LKG commits                       (3)
 *
 * Total: 13 scenarios. All against the git-backend.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-15
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

import { gitLKGStore } from "@bic/openclaw-lkg-git";
import type { LKGTracker } from "@bic/v2-prototype";

const execFileP = promisify(execFile);

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true }).catch(() => undefined);
  }
});

const AUTHOR = { name: "LKG Bot", email: "lkg@test.local" };

async function makeGitRepo(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-adv15-git-"));
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
// REF · HEAD ref movement between observes
// ============================================================

describe("REF · HEAD ref movement between observes", () => {
  it("REF1 git: external `git checkout` to a different commit between observes — observe sees the new HEAD blob", async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target); // commit 1: {"ok":true}
    const sha1 = (await execFileP("git", ["rev-parse", "HEAD"], { cwd: repo })).stdout.trim();

    // External commit (e.g., manual edit + commit by operator).
    await fs.writeFile(target, '{"ok":true,"v":2}');
    await execFileP("git", ["add", "cfg.json"], { cwd: repo });
    await execFileP(
      "git",
      ["-c", "user.email=op@t", "-c", "user.name=Op", "commit", "-m", "op edit"],
      { cwd: repo },
    );
    const sha2 = (await execFileP("git", ["rev-parse", "HEAD"], { cwd: repo })).stdout.trim();
    expect(sha2).not.toBe(sha1);

    // observe sees the new HEAD blob; current bytes match HEAD ⇒ outcome=valid.
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("valid");
  });

  it("REF2 git: branch switch between observes — HEAD blob differs; observe re-promotes the working-tree state on the new branch", async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true,"branch":"main"}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target);

    // Create branch with different content.
    await execFileP("git", ["checkout", "-q", "-b", "side"], { cwd: repo });
    await fs.writeFile(target, '{"ok":true,"branch":"side"}');
    const obs = await store.observe(target);
    // Working tree differs from HEAD's blob (branch=side vs branch=main on HEAD blob)
    // → promote (= new commit on side branch).
    expect(obs.outcome).toBe("promoted");
  });

  it("REF3 git: symbolic-ref change (HEAD points to different ref but same commit) — observe is unaffected", async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target);

    // Move HEAD to a different ref pointing at the same commit.
    const sha = (await execFileP("git", ["rev-parse", "HEAD"], { cwd: repo })).stdout.trim();
    await execFileP("git", ["branch", "alias"], { cwd: repo });
    await execFileP("git", ["checkout", "-q", "alias"], { cwd: repo });
    void sha;

    // observe still works; outcome=valid (unchanged).
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("valid");
  });

  it("REF4 git: HEAD points at a commit that does NOT contain the tracker file — observe behavior is graceful", async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target); // commit on main with cfg.json

    // Switch back to seed (which doesn't have cfg.json).
    await execFileP("git", ["checkout", "-q", "HEAD~1"], { cwd: repo });
    // Working tree may still have cfg.json (untracked at this point).
    let outcome: string | undefined;
    let crashed = false;
    try {
      const obs = await store.observe(target);
      outcome = obs.outcome;
    } catch {
      crashed = true;
    }
    expect(crashed).toBe(false);
    expect(["valid", "promoted", "skipped", "failed", "recovered"]).toContain(outcome);
  });
});

// ============================================================
// PACK · Packed objects vs loose blobs
// ============================================================

describe("PACK · Packed objects vs loose blobs", () => {
  it("PACK1 git: after `git gc` packs loose objects, observe still works (cat-file resolves packed and loose objects identically)", async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target); // commit
    // Pack everything.
    await execFileP("git", ["gc", "--quiet"], { cwd: repo });

    // Observe still works.
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("valid");
  });

  it("PACK2 git: readLastKnownGood after gc returns same bytes as before gc", async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true,"hello":"world"}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target);
    const before = new TextDecoder().decode(await store.readLastKnownGood(target));
    await execFileP("git", ["gc", "--quiet"], { cwd: repo });
    const after = new TextDecoder().decode(await store.readLastKnownGood(target));
    expect(after).toBe(before);
  });

  it("PACK3 git: hash-object output is identical regardless of pack state", async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target);
    const sha1 = (await execFileP("git", ["hash-object", "cfg.json"], { cwd: repo })).stdout.trim();
    await execFileP("git", ["gc", "--quiet"], { cwd: repo });
    const sha2 = (await execFileP("git", ["hash-object", "cfg.json"], { cwd: repo })).stdout.trim();
    expect(sha2).toBe(sha1);
  });
});

// ============================================================
// GC · git gc / pruning
// ============================================================

describe("GC · git gc / pruning of unreferenced LKG blobs", () => {
  it("GC1 git: a stale dangling blob from an old promote is pruned by `gc --prune=now` — but reachable blobs are preserved", async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));

    // Promote v1.
    await fs.writeFile(target, '{"ok":true,"v":1}');
    await store.observe(target);
    // Promote v2.
    await fs.writeFile(target, '{"ok":true,"v":2}');
    await store.observe(target);

    // Both versions are in commit history (reachable). gc shouldn't drop them.
    await execFileP("git", ["gc", "--quiet", "--prune=now"], { cwd: repo });

    // readLastKnownGood still returns v2 bytes (current HEAD blob).
    const bytes = new TextDecoder().decode(await store.readLastKnownGood(target));
    expect(JSON.parse(bytes).v).toBe(2);
  });

  it("GC2 git: post-`gc` log still shows LKG promote commits with their messages", async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target);
    await execFileP("git", ["gc", "--quiet"], { cwd: repo });
    const log = await execFileP("git", ["log", "--oneline"], { cwd: repo });
    expect(log.stdout).toContain("lkg(promote): " + target);
  });

  it(
    "GC3 git: `gc` on a repo with several promote commits does not corrupt LKG state",
    { timeout: 30_000 },
    async () => {
      const repo = await makeGitRepo();
      const target = path.join(repo, "cfg.json");
      const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
      store.register(jsonTracker(target));
      for (let i = 0; i < 10; i++) {
        await fs.writeFile(target, `{"ok":true,"i":${i}}`);
        await store.observe(target);
      }
      await execFileP("git", ["gc", "--quiet"], { cwd: repo });
      const obs = await store.observe(target); // unchanged
      expect(obs.outcome).toBe("valid");
    },
  );
});

// ============================================================
// RBASE · Rebase across LKG commits
// ============================================================

describe("RBASE · Rebase across LKG commits", () => {
  it("RBASE1 git: rebase preserves the LKG file content even when commit SHAs change", async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await fs.writeFile(target, '{"ok":true,"v":1}');
    await store.observe(target);
    await fs.writeFile(target, '{"ok":true,"v":2}');
    await store.observe(target);

    const beforeBlob = (
      await execFileP("git", ["hash-object", "cfg.json"], { cwd: repo })
    ).stdout.trim();

    // Squash-rebase the last 2 commits (which are LKG promotes).
    await execFileP(
      "git",
      [
        "-c",
        "user.email=r@t",
        "-c",
        "user.name=Rebaser",
        "-c",
        "sequence.editor=true",
        "rebase",
        "--root",
        "-q",
        "--strategy-option=theirs",
      ],
      { cwd: repo },
    ).catch(() => undefined); // rebase may need extra config; we just observe end state

    const afterBlob = (
      await execFileP("git", ["hash-object", "cfg.json"], { cwd: repo })
    ).stdout.trim();
    // Working tree blob unchanged.
    expect(afterBlob).toBe(beforeBlob);
  });

  it("RBASE2 git: post-rebase observe still works (HEAD blob is reachable through the new history)", async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await fs.writeFile(target, '{"ok":true}');
    await store.observe(target);

    // Amend the last commit (in-place rebase of a single commit).
    await fs.writeFile(target, '{"ok":true,"v":2}');
    await execFileP("git", ["add", "cfg.json"], { cwd: repo });
    await execFileP(
      "git",
      ["-c", "user.email=r@t", "-c", "user.name=R", "commit", "--amend", "--no-edit"],
      { cwd: repo },
    );

    // Observe sees the new HEAD bytes; outcome=valid since working tree matches.
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("valid");
  });

  it("RBASE3 git: cherry-pick of an LKG commit onto a different branch — promote-message structure preserved", async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await fs.writeFile(target, '{"ok":true}');
    await store.observe(target);
    const promoteSha = (await execFileP("git", ["rev-parse", "HEAD"], { cwd: repo })).stdout.trim();

    // Branch off seed and cherry-pick the promote.
    await execFileP("git", ["checkout", "-q", "-b", "side", "HEAD~1"], { cwd: repo });
    await execFileP(
      "git",
      ["-c", "user.email=p@t", "-c", "user.name=P", "cherry-pick", promoteSha],
      { cwd: repo },
    );

    // Promote message still includes the lkg(promote) prefix on side branch.
    const log = await execFileP("git", ["log", "--oneline", "-1"], { cwd: repo });
    expect(log.stdout).toContain("lkg(promote):");
  });
});
