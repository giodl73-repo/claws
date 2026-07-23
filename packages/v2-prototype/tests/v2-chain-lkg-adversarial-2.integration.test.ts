/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 2.
 *
 * Continues the threat-surface mapping started in
 * `v2-chain-lkg-adversarial.integration.test.ts`. Wave 1 covered:
 * tamper, recovery semantics, validator misbehavior, plugin-shell,
 * git basics, path hygiene. This wave covers:
 *
 *   C. Concurrency & races (4)
 *   A. Audit observability (3)
 *   E. External I/O failures (3)
 *   B. Boundary inputs (4)
 *   M. Multi-agent merge edge cases (3)
 *   N. No-LKG initial state (2)
 *
 * Total: 19 scenarios. Some are "[shape]" tests that lock in current
 * behavior so we notice if it drifts; "[GAP]" marks known limits we
 * have NOT addressed and accept for v0.1.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-2
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

import { lkgStore, lkgPathFor, type AuditRecord, type RecoveryNotice } from "@bic/openclaw-lkg";
import { gitLKGStore } from "@bic/openclaw-lkg-git";
import type { LKGStore, LKGTracker } from "@bic/v2-prototype";

const execFileP = promisify(execFile);

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true }).catch(() => undefined);
  }
});

const AUTHOR = { name: "LKG Bot", email: "lkg@test.local" };

async function makeFsScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-adv2-"));
  live.push({ scratch });
  return scratch;
}

async function makeGitRepo(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-adv2-git-"));
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
// C. Concurrency & races
// ============================================================

describe("C · Concurrency & races", () => {
  it("C1 FS: two parallel observes() of the same valid bytes — both succeed without corrupting LKG", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));

    const [a, b] = await Promise.all([store.observe(target), store.observe(target)]);
    // First completed write promotes; the other races but writes the
    // same bytes (atomic via tmp+rename). Outcome may be promoted or
    // valid for either; LKG bytes must equal the target bytes.
    expect(["promoted", "valid"]).toContain(a.outcome);
    expect(["promoted", "valid"]).toContain(b.outcome);
    const lkg = await fs.readFile(lkgPathFor(target), "utf-8");
    expect(lkg).toBe('{"ok":true}');
  });

  it("C2 FS: parallel observe of valid + invalid — invalid recovers, valid promotes (order-independent)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target); // promote LKG

    // Two writers race. Whichever observes second sees whatever
    // bytes are on disk at that instant.
    const writerA = (async () => {
      await fs.writeFile(target, '{"ok":true}');
      return store.observe(target);
    })();
    const writerB = (async () => {
      await fs.writeFile(target, '{"ok":false}');
      return store.observe(target);
    })();
    const [a, b] = await Promise.all([writerA, writerB]);
    // Valid outcomes: each observe is one of valid|promoted|recovered.
    for (const o of [a, b]) {
      expect(["valid", "promoted", "recovered"]).toContain(o.outcome);
    }
    // LKG must still hash to the recorded promoted hash at the end
    // (entry can't drift to invalid bytes through races).
    const lkgBytes = await store.readLastKnownGood(target);
    const lkgText = new TextDecoder().decode(lkgBytes);
    expect(JSON.parse(lkgText).ok).toBe(true);
  });

  it("C3 FS: re-registering the same path is rejected with COLLISION (no silent shadow)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    const store = lkgStore();
    store.register(jsonTracker(target));
    try {
      store.register(jsonTracker(target));
      expect.fail("expected COLLISION");
    } catch (err) {
      expect((err as { code?: string }).code).toBe("LKG_TRACKER_PATH_COLLISION");
    }
  });

  it("C4 FS: two distinct stores observing the same file — each maintains independent dedup state (no cross-contamination)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const storeA = lkgStore();
    const storeB = lkgStore();
    storeA.register(jsonTracker(target));
    storeB.register(jsonTracker(target));
    // A promotes, then B observes the same valid file and re-promotes
    // (B has no prior fingerprint of its own).
    const a1 = await storeA.observe(target);
    const b1 = await storeB.observe(target);
    expect(a1.outcome).toBe("promoted");
    // B sees no LKG entry of its own → also promotes (overwrites .lkg
    // with the same bytes — idempotent because content-addressed).
    expect(["promoted", "valid"]).toContain(b1.outcome);
  });
});

// ============================================================
// A. Audit observability
// ============================================================

describe("A · Audit observability", () => {
  it("A1 FS: audit hook throwing does NOT crash observe (audit failures must not regress recovery)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore({
      onAudit: () => {
        throw new Error("audit storage down");
      },
    });
    store.register(jsonTracker(target));
    // observe must complete; audit-side failure is observability, not correctness.
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("promoted");
  });

  it("A2 FS: recovery-notice hook throwing does NOT crash observe", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore({
      onRecoveryNotice: () => {
        throw new Error("queue full");
      },
    });
    store.register(jsonTracker(target));
    await store.observe(target); // promote
    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("recovered"); // recovery still happens
  });

  it("A3 FS: audit fires once per observe with correctly-classified outcome (promoted then recovered then valid)", async () => {
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
    await fs.writeFile(target, '{"ok":false}');
    await store.observe(target); // recovered
    await store.observe(target); // unchanged → valid

    expect(audits.map((r) => r.outcome)).toEqual(["promoted", "recovered", "valid"]);
    expect(audits[1]?.clobberedPath).toContain(".clobbered.");
    expect(audits[2]?.clobberedPath).toBeNull();
  });
});

// ============================================================
// E. External I/O failures
// ============================================================

describe("E · External I/O failures", () => {
  it("E1 FS: target file deleted between observes — observe emits failed without crashing", async () => {
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
    await store.observe(target); // promote
    await fs.unlink(target);
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("failed");
    expect(audits.at(-1)?.outcome).toBe("failed");
  });

  it("E2 FS: target dir gone — observe emits failed (no recovery, no crash)", async () => {
    const scratch = await makeFsScratch();
    const subdir = path.join(scratch, "nested");
    await fs.mkdir(subdir);
    const target = path.join(subdir, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target); // promote
    // Remove the entire dir.
    await fs.rm(subdir, { recursive: true, force: true });
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("failed");
  });

  it("E3 FS: LKG file present but unreadable (deleted between hash check and recover) → recovery returns null → skipped", async () => {
    // The LKG impl reads the LKG file once and hash-checks. If a
    // racy delete after the read sneaks past the check, the next
    // observe simply sees no LKG. We simulate by deleting the LKG
    // directly between observes.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target); // promote
    await fs.unlink(lkgPathFor(target)); // LKG vanishes
    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("skipped");
    if (obs.outcome === "skipped") expect(obs.reason).toBe("no-lkg-available");
  });
});

// ============================================================
// B. Boundary inputs
// ============================================================

describe("B · Boundary inputs", () => {
  it("B1 FS: empty file → parse fails → unparseable → recover from LKG (after a prior valid promote)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target); // promote
    await fs.writeFile(target, "");
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("recovered");
    if (obs.outcome === "recovered") expect(obs.reason).toBe("unparseable");
  });

  it("B2 FS: BOM-prefixed file is parseable as JSON (modern parsers tolerate BOM) → promote", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    // JSON.parse treats BOM as whitespace; document this for the LKG layer.
    await fs.writeFile(target, '﻿{"ok":true}');
    const tracker: LKGTracker<FakeJson> = {
      path: target,
      // Strip BOM in our parse to mirror what real validators do.
      parse: (raw) => JSON.parse(raw.replace(/^﻿/, "")) as FakeJson,
      validate: (parsed) => ({
        valid: parsed.ok === true,
        issues: parsed.ok === true ? [] : [{ path: "ok", message: "must be true" }],
      }),
    };
    const store = lkgStore();
    store.register(tracker);
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("promoted");
  });

  it("B3 FS: large valid file (~1MB) — promote completes; LKG bytes match input", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    // Pad with a long string field to ~1MB.
    const big = JSON.stringify({ ok: true, padding: "x".repeat(1_000_000) });
    await fs.writeFile(target, big);
    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("promoted");
    const lkg = await fs.readFile(lkgPathFor(target), "utf-8");
    expect(lkg.length).toBe(big.length);
  });

  it("B4 FS: file with binary bytes that fail JSON.parse — recover from LKG", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target); // promote
    // Write raw binary bytes that cannot be valid UTF-8 JSON.
    await fs.writeFile(target, Buffer.from([0xff, 0xfe, 0x00, 0x01, 0x02]));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("recovered");
  });
});

// ============================================================
// M. Multi-agent merge edge cases (git backend)
// ============================================================

describe("M · Multi-agent merge edge cases", () => {
  it("M1 git: overlapping edits on the same line ⇒ git merge surfaces CONFLICT (no auto-resolve, operator handles)", async () => {
    // The unlock claim is "non-overlapping edits auto-merge" — when
    // edits DO overlap, git surfaces CONFLICT rather than silently
    // dropping one side. Test that this is the contract.
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const storeA = gitLKGStore({
      repoRoot: repo,
      authorship: { name: "A", email: "a@t" },
    });
    storeA.register(jsonTracker(target));
    const promoted = await storeA.observe(target);
    expect(promoted.outcome).toBe("promoted");

    // Branch: agent-b edits the same key.
    await execFileP("git", ["checkout", "-q", "-b", "agent-b"], { cwd: repo });
    await fs.writeFile(target, '{"ok":false,"by":"b"}');
    await execFileP("git", ["add", "cfg.json"], { cwd: repo });
    await execFileP("git", ["-c", "user.email=b@t", "-c", "user.name=B", "commit", "-m", "b"], {
      cwd: repo,
    });

    // Back on main, agent-a edits the same key differently.
    await execFileP("git", ["checkout", "-q", "main"], { cwd: repo });
    await fs.writeFile(target, '{"ok":true,"by":"a"}');
    await execFileP("git", ["add", "cfg.json"], { cwd: repo });
    await execFileP("git", ["-c", "user.email=a@t", "-c", "user.name=A", "commit", "-m", "a"], {
      cwd: repo,
    });

    // Merge ⇒ CONFLICT exit code (1) — exec rejects.
    let conflicted = false;
    try {
      await execFileP(
        "git",
        ["-c", "user.email=m@t", "-c", "user.name=M", "merge", "--no-ff", "agent-b"],
        { cwd: repo },
      );
    } catch (err) {
      conflicted = true;
      expect((err as { stdout?: string }).stdout ?? "").toContain("CONFLICT");
    }
    expect(conflicted).toBe(true);
  });

  it("M2 [shape] git: gitignore added AFTER first promote does NOT retroactively ignore a tracked file (git semantics)", async () => {
    // `git check-ignore` reports "not ignored" for already-tracked
    // files even when a matching .gitignore rule exists. So adding a
    // gitignore rule for an already-promoted LKG path doesn't disable
    // the tracker — the operator would need `git rm --cached` to
    // actually exclude. This locks in the contract so we notice if a
    // future change starts pre-checking with `--no-index` or similar.
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target); // promote (= commit)

    await fs.writeFile(path.join(repo, ".gitignore"), "cfg.json\n");
    await execFileP("git", ["add", ".gitignore"], { cwd: repo });
    await execFileP("git", ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-m", "gi"], {
      cwd: repo,
    });

    const obs = await store.observe(target);
    // Tracker continues to function; gitignore is a no-op once tracked.
    expect(["valid", "promoted"]).toContain(obs.outcome);
  });

  it("M3 git: HEAD reset to before the promote (force-rollback) — observe sees no HEAD blob and skips", async () => {
    const repo = await makeGitRepo();
    const target = path.join(repo, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = gitLKGStore({ repoRoot: repo, authorship: AUTHOR });
    store.register(jsonTracker(target));
    await store.observe(target); // promote (= commit on top of seed)

    // Reset to seed (drops the promote commit).
    await execFileP("git", ["reset", "-q", "--hard", "HEAD~1"], { cwd: repo });

    // Working tree is clobbered by reset; recreate as garbage and observe.
    await fs.writeFile(target, "{ broken", "utf-8");
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("skipped");
    if (obs.outcome === "skipped") expect(obs.reason).toBe("no-lkg-available");
  });
});

// ============================================================
// N. No-LKG initial state
// ============================================================

describe("N · No-LKG initial state", () => {
  it("N1 FS: first observe on an invalid file → skipped (no LKG to recover from), no .lkg file written", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":false}'); // invalid from the start
    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("skipped");
    // Confirm no LKG companion file was created.
    let lkgExists = false;
    try {
      await fs.stat(lkgPathFor(target));
      lkgExists = true;
    } catch {
      /* */
    }
    expect(lkgExists).toBe(false);
  });

  it("N2 FS: observe returns failed for a tracker whose file was never written", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "never-written.json");
    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("failed");
  });
});
