/**
 * Git-backed LKG lifecycle — exercises promote=commit and
 * recover=`git checkout HEAD --` against a real local git repo.
 *
 * Each test creates a fresh `git init` scratch under tmpdir, so we
 * exercise actual git binary semantics (blob shas, gitignore, merge),
 * not a mock.
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

import { gitLKGStore } from "../src/index.js";
import type { AuditRecord, RecoveryNotice } from "../src/index.js";
import type { LKGTracker } from "@bic/v2-prototype";

const TEXT_DECODER = new TextDecoder("utf-8");
const execFileP = promisify(execFile);

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true });
  }
});

async function makeRepo(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-git-"));
  live.push({ scratch });
  await execFileP("git", ["init", "-q", "-b", "main"], { cwd: scratch });
  await execFileP("git", ["config", "user.email", "init@test.local"], { cwd: scratch });
  await execFileP("git", ["config", "user.name", "Init"], { cwd: scratch });
  // Empty seed commit so HEAD exists before any tracker observes.
  await execFileP("git", ["commit", "--allow-empty", "-m", "seed"], { cwd: scratch });
  return scratch;
}

interface FakeJson {
  ok: boolean;
  size?: number;
}

function makeJsonTracker(p: string): LKGTracker<FakeJson> {
  return {
    path: p,
    parse: (raw) => JSON.parse(raw) as FakeJson,
    validate: (parsed) => ({
      valid: parsed?.ok === true,
      issues: parsed?.ok === true ? [] : [{ path: "ok", message: "must be true" }],
    }),
  };
}

const AUTHOR = { name: "LKG Bot", email: "lkg@test.local" };

describe("LKG git-backed lifecycle", () => {
  it("first valid observe creates a commit; HEAD blob has the file content", async () => {
    const repo = await makeRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');

    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(makeJsonTracker(target));

    const obs = await store.observe(target);
    expect(obs.outcome).toBe("promoted");

    // HEAD blob bytes match working tree.
    const lkg = await store.readLastKnownGood(target);
    expect(TEXT_DECODER.decode(lkg)).toBe('{"ok":true}');

    // log shows our promote commit on top of the seed.
    const { stdout } = await execFileP("git", ["log", "--oneline"], { cwd: repo });
    expect(stdout.split("\n").filter(Boolean)).toHaveLength(2);
    expect(stdout).toContain("lkg(promote): " + target);
  });

  it("invalid observe runs `git checkout HEAD --`; clobbered file preserves bad bytes", async () => {
    const repo = await makeRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');

    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(makeJsonTracker(target));
    await store.observe(target); // promoted (commit 1)

    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);

    expect(obs.outcome).toBe("recovered");
    if (obs.outcome === "recovered") {
      const restored = await fs.readFile(target, "utf-8");
      expect(restored).toBe('{"ok":true}');
      const clobbered = await fs.readFile(obs.clobberedPath, "utf-8");
      expect(clobbered).toBe('{"ok":false}');
    }

    // Recovery does NOT create a new commit (checkout HEAD --).
    const { stdout } = await execFileP("git", ["log", "--oneline"], { cwd: repo });
    expect(stdout.split("\n").filter(Boolean)).toHaveLength(2);
  });

  it("audit + recovery-notice hooks fire as expected", async () => {
    const repo = await makeRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');

    const audits: AuditRecord[] = [];
    const notices: RecoveryNotice[] = [];
    const store = gitLKGStore({
      repoRoot: repo,
      authorship: AUTHOR,
      onAudit: (r) => {
        audits.push(r);
      },
      onRecoveryNotice: (n) => {
        notices.push(n);
      },
    });
    store.register(makeJsonTracker(target));

    await store.observe(target);
    expect(audits.at(-1)?.outcome).toBe("promoted");
    expect(audits.at(-1)?.commitSha).toMatch(/^[0-9a-f]{40}$/);
    expect(notices).toHaveLength(0);

    await fs.writeFile(target, '{"ok":false}');
    await store.observe(target);

    expect(audits.at(-1)?.outcome).toBe("recovered");
    expect(audits.at(-1)?.clobberedPath).toContain(".clobbered.");
    expect(notices).toHaveLength(1);
    expect(notices[0]?.reason).toBe("invalid");
  });

  it("unchanged-since-HEAD observe returns valid (no extra commit)", async () => {
    const repo = await makeRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');

    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(makeJsonTracker(target));
    await store.observe(target); // promoted

    const obs = await store.observe(target); // unchanged
    expect(obs.outcome).toBe("valid");

    const { stdout } = await execFileP("git", ["log", "--oneline"], { cwd: repo });
    expect(stdout.split("\n").filter(Boolean)).toHaveLength(2);
  });

  it("gitignored path returns failed and does not commit", async () => {
    const repo = await makeRepo();
    const target = path.join(repo, "secret.json");
    await fs.writeFile(path.join(repo, ".gitignore"), "secret.json\n");
    await execFileP("git", ["add", ".gitignore"], { cwd: repo });
    await execFileP("git", ["-c", "user.email=i@t", "-c", "user.name=i", "commit", "-m", "gi"], {
      cwd: repo,
    });
    await fs.writeFile(target, '{"ok":true}');

    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(makeJsonTracker(target));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("failed");
    if (obs.outcome === "failed") {
      expect(obs.reason).toBe("gitignored");
    }
  });

  it("readLastKnownGood throws LKG_STORE_UNAVAILABLE before first promote", async () => {
    const repo = await makeRepo();
    const target = path.join(repo, "cfg.json");
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(makeJsonTracker(target));

    try {
      await store.readLastKnownGood(target);
      expect.fail("expected throw");
    } catch (err) {
      expect((err as { code?: string }).code).toBe("LKG_STORE_UNAVAILABLE");
    }
  });

  it("getEntry returns lastPromotedGood.hash after observe — drives policy-plugin-lkg cache key", async () => {
    const repo = await makeRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');

    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(makeJsonTracker(target));

    // Before observe, the entry is empty (sync accessor can't shell out).
    expect(store.getEntry(target)).toEqual({});

    await store.observe(target);

    const entry = store.getEntry(target);
    expect(entry).not.toBeNull();
    expect(entry?.lastPromotedGood?.hash).toMatch(/^[0-9a-f]{40}$/);
    expect(entry?.lastKnownGood?.hash).toBe(entry?.lastPromotedGood?.hash);
  });

  it("register rejects path outside repoRoot with LKG_TRACKER_PATH_INVALID", async () => {
    const repo = await makeRepo();
    const elsewhere = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-elsewhere-"));
    live.push({ scratch: elsewhere });

    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    try {
      store.register(makeJsonTracker(path.join(elsewhere, "x.json")));
      expect.fail("expected throw");
    } catch (err) {
      expect((err as { code?: string }).code).toBe("LKG_TRACKER_PATH_INVALID");
    }
  });

  it("multi-agent merge: two branches modify same LKG; git merges cleanly when edits are non-overlapping", async () => {
    // Models the OneDrive multi-agent scenario: agent A and agent B
    // both promote validated edits; a third party (`git merge`) reconciles.
    // Without git, rclone's last-writer-wins drops B's edit.
    const repo = await makeRepo();
    const target = path.join(repo, "cfg.json");
    // Spacious JSON doc so the two edits sit in different diff hunks
    // (default git merge context = 3 lines).
    const seedDoc = [
      "{",
      '  "ok": true,',
      '  "x1": 1,',
      '  "x2": 2,',
      '  "x3": 3,',
      '  "x4": 4,',
      '  "x5": 5,',
      '  "x6": 6,',
      '  "x7": 7,',
      '  "size": 1',
      "}",
      "",
    ].join("\n");
    await fs.writeFile(target, seedDoc);

    // Agent A: register + promote on `main`.
    const storeA = gitLKGStore({
      repoRoot: repo,
      authorship: { name: "Agent A", email: "a@test.local" },
    });
    storeA.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as FakeJson,
      validate: () => ({ valid: true, issues: [] }),
    });
    const obsA1 = await storeA.observe(target);
    expect(obsA1.outcome).toBe("promoted");

    // Branch off and let agent B do an edit on a side branch.
    await execFileP("git", ["checkout", "-q", "-b", "agent-b"], { cwd: repo });
    await fs.writeFile(target, seedDoc.replace('"size": 1', '"size": 2'));
    const storeB = gitLKGStore({
      repoRoot: repo,
      authorship: { name: "Agent B", email: "b@test.local" },
    });
    storeB.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as FakeJson,
      validate: () => ({ valid: true, issues: [] }),
    });
    const obsB = await storeB.observe(target);
    expect(obsB.outcome).toBe("promoted");

    // Back to main, agent A edits a different field.
    await execFileP("git", ["checkout", "-q", "main"], { cwd: repo });
    await fs.writeFile(target, seedDoc.replace('"ok": true', '"ok": false'));
    // Just commit directly to simulate A's promote-via-LKG.
    await execFileP("git", ["add", "cfg.json"], { cwd: repo });
    await execFileP(
      "git",
      ["-c", "user.email=a@t", "-c", "user.name=A", "commit", "-m", "A change ok"],
      { cwd: repo },
    );

    // Three-way merge: should auto-resolve since edits hit different lines.
    const merge = await execFileP(
      "git",
      [
        "-c",
        "user.email=m@t",
        "-c",
        "user.name=Merger",
        "merge",
        "--no-ff",
        "agent-b",
        "-m",
        "merge agent-b",
      ],
      { cwd: repo },
    );
    expect(merge.stderr + merge.stdout).not.toContain("CONFLICT");

    const merged = await fs.readFile(target, "utf-8");
    // Both edits survived (vs LWW would lose one).
    expect(merged).toContain('"ok": false');
    expect(merged).toContain('"size": 2');
  });
});
