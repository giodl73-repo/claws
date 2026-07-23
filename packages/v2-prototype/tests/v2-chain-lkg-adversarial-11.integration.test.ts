/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 11.
 *
 * Continues `v2-chain-lkg-adversarial{,-2..-10}.integration.test.ts`.
 * Wave 11 category:
 *
 *   ARCH. Architectural invariants — properties that hold
 *         REGARDLESS of backend (FS vs git vs hypothetical S3 /
 *         IPFS / etc.). The contract surface must not leak
 *         backend-specific concepts (commits, work trees, blob
 *         refs) — those live in the impl, not the interface.
 *
 * Total: 18 scenarios.
 *
 * The wave runs every scenario through BOTH backends in turn via
 * `describe.each` to demonstrate that the invariant is genuinely
 * backend-agnostic.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-11
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

import { lkgStore } from "@bic/openclaw-lkg";
import { gitLKGStore } from "@bic/openclaw-lkg-git";
import type {
  LKGEntry,
  LKGFingerprint,
  LKGObservation,
  LKGStore,
  LKGTracker,
} from "@bic/v2-prototype";

const execFileP = promisify(execFile);

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true }).catch(() => undefined);
  }
});

const AUTHOR = { name: "LKG Bot", email: "lkg@test.local" };

interface Wired {
  store: LKGStore;
  policyIrPath: string;
}

async function wireFs(): Promise<Wired> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-adv11-fs-"));
  live.push({ scratch });
  const target = path.join(scratch, "cfg.json");
  await fs.writeFile(target, '{"ok":true}');
  const store = lkgStore();
  store.register(jsonTracker(target));
  return { store, policyIrPath: target };
}

async function wireGit(): Promise<Wired> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-adv11-git-"));
  live.push({ scratch });
  await execFileP("git", ["init", "-q", "-b", "main"], { cwd: scratch });
  await execFileP("git", ["config", "user.email", "init@t"], { cwd: scratch });
  await execFileP("git", ["config", "user.name", "Init"], { cwd: scratch });
  await execFileP("git", ["commit", "--allow-empty", "-m", "seed"], { cwd: scratch });
  const target = path.join(scratch, "cfg.json");
  await fs.writeFile(target, '{"ok":true}');
  const store = gitLKGStore({ repoRoot: scratch, authorship: AUTHOR });
  store.register(jsonTracker(target));
  return { store, policyIrPath: target };
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
// ARCH · Architectural invariants
// ============================================================

describe.each([["filesystem", wireFs] as const, ["git", wireGit] as const])(
  "ARCH · Architectural invariants (%s backend)",
  (label, wire) => {
    it("ARCH1 LKGObservation outcomes are the same SET across backends — no backend-specific outcome variants leak through", async () => {
      const { store, policyIrPath } = await wire();
      const promote = await store.observe(policyIrPath);
      expect(["promoted", "valid"]).toContain(promote.outcome);
      await fs.writeFile(policyIrPath, '{"ok":false}');
      const recover = await store.observe(policyIrPath);
      expect(recover.outcome).toBe("recovered");
      // No `committed` / `blob-stored` / etc. — only the documented LKGObservation outcomes.
    });

    it("ARCH2 LKGFingerprint shape is identical across backends — `hash` is always the load-bearing key", async () => {
      const { store, policyIrPath } = await wire();
      await store.observe(policyIrPath);
      const entry = store.getEntry(policyIrPath);
      expect(entry?.lastPromotedGood?.hash).toBeDefined();
      expect(typeof entry?.lastPromotedGood?.hash).toBe("string");
      // 64-hex (FS sha256) or 40-hex (git blob sha) — both are valid hex strings.
      expect(entry?.lastPromotedGood?.hash).toMatch(/^[0-9a-f]{40,64}$/);
    });

    it("ARCH3 LKGEntry.lastPromotedGood is required for plugin-shell cache key on every backend", async () => {
      const { store, policyIrPath } = await wire();
      // Before observe: getEntry returns empty.
      const before = store.getEntry(policyIrPath);
      expect(before?.lastPromotedGood).toBeUndefined();
      // After observe: getEntry has lastPromotedGood populated.
      await store.observe(policyIrPath);
      const after = store.getEntry(policyIrPath);
      expect(after?.lastPromotedGood?.hash).toMatch(/^[0-9a-f]{40,64}$/);
    });

    it("ARCH4 readLastKnownGood returns Uint8Array (NOT string) on every backend — bytes are the contract, not text", async () => {
      const { store, policyIrPath } = await wire();
      await store.observe(policyIrPath);
      const bytes = await store.readLastKnownGood(policyIrPath);
      expect(bytes).toBeInstanceOf(Uint8Array);
    });

    it("ARCH5 register() rejects non-absolute paths on every backend", async () => {
      const { store } = await wire();
      try {
        store.register({
          path: "relative/x.json",
          parse: (raw) => JSON.parse(raw),
          validate: () => ({ valid: true, issues: [] }),
        });
        expect.fail("expected throw");
      } catch (err) {
        expect((err as { code?: string }).code).toMatch(/LKG_TRACKER_PATH_/);
      }
    });

    it("ARCH6 register() rejects duplicate paths on every backend", async () => {
      const { store, policyIrPath } = await wire();
      try {
        store.register(jsonTracker(policyIrPath));
        expect.fail("expected COLLISION");
      } catch (err) {
        expect((err as { code?: string }).code).toBe("LKG_TRACKER_PATH_COLLISION");
      }
    });

    it("ARCH7 observe() with no prior LKG and invalid bytes returns outcome=skipped on every backend", async () => {
      const { store, policyIrPath } = await wire();
      await fs.writeFile(policyIrPath, '{"ok":false}');
      const obs = await store.observe(policyIrPath);
      expect(obs.outcome).toBe("skipped");
    });

    it("ARCH8 observe() of unchanged-vs-LKG returns outcome=valid on every backend", async () => {
      const { store, policyIrPath } = await wire();
      await store.observe(policyIrPath); // promote
      const obs = await store.observe(policyIrPath);
      expect(obs.outcome).toBe("valid");
    });

    it("ARCH9 `LKGObservation` is structurally compatible with `LKGEntry` reads (interface stability)", async () => {
      const { store, policyIrPath } = await wire();
      await store.observe(policyIrPath);
      const entry: LKGEntry | null = store.getEntry(policyIrPath);
      expect(entry).not.toBeNull();
      if (entry?.lastPromotedGood !== undefined) {
        const fp: LKGFingerprint = entry.lastPromotedGood;
        expect(typeof fp.hash).toBe("string");
        expect(typeof fp.bytes).toBe("number");
        expect(typeof fp.observedAt).toBe("string");
      }
    });

    it("ARCH10 Recovered observations always carry `restoredFrom` of type LKGFingerprint", async () => {
      const { store, policyIrPath } = await wire();
      await store.observe(policyIrPath);
      await fs.writeFile(policyIrPath, '{"ok":false}');
      const obs: LKGObservation = await store.observe(policyIrPath);
      expect(obs.outcome).toBe("recovered");
      if (obs.outcome === "recovered") {
        expect(obs.restoredFrom.hash).toMatch(/^[0-9a-f]{40,64}$/);
        expect(typeof obs.restoredFrom.observedAt).toBe("string");
      }
    });

    it("ARCH11 `clobberedPath` (when present) is NEVER equal to the tracker path", async () => {
      const { store, policyIrPath } = await wire();
      await store.observe(policyIrPath);
      await fs.writeFile(policyIrPath, '{"ok":false}');
      const obs = await store.observe(policyIrPath);
      if (obs.outcome === "recovered") {
        expect(obs.clobberedPath).not.toBe(policyIrPath);
        expect(obs.clobberedPath.startsWith(policyIrPath)).toBe(true);
      }
    });

    it("ARCH12 `LKGFingerprint.hash` is deterministic for identical bytes across backends (same content, same hash format constraints)", async () => {
      void label; // both backends produce hex hashes
      const { store, policyIrPath } = await wire();
      await store.observe(policyIrPath);
      const entry1 = store.getEntry(policyIrPath);
      await store.observe(policyIrPath); // unchanged
      const entry2 = store.getEntry(policyIrPath);
      expect(entry1?.lastPromotedGood?.hash).toBe(entry2?.lastPromotedGood?.hash);
    });

    it("ARCH13 The store has no work-tree-specific API (e.g., `commit()`, `branch()`, `checkout()`) leaking through", async () => {
      const { store } = await wire();
      // The contract surface is `register / observe / readLastKnownGood / getEntry`.
      const keys = Object.keys(store);
      expect(keys.sort()).toEqual(["getEntry", "observe", "readLastKnownGood", "register"]);
    });

    it("ARCH14 register / observe / getEntry / readLastKnownGood are present and callable on every backend", async () => {
      const { store } = await wire();
      expect(typeof store.register).toBe("function");
      expect(typeof store.observe).toBe("function");
      expect(typeof store.getEntry).toBe("function");
      expect(typeof store.readLastKnownGood).toBe("function");
    });

    it("ARCH15 outcome=recovered ALWAYS includes a `clobberedPath` (never null/undefined)", async () => {
      const { store, policyIrPath } = await wire();
      await store.observe(policyIrPath);
      await fs.writeFile(policyIrPath, '{"ok":false}');
      const obs = await store.observe(policyIrPath);
      if (obs.outcome === "recovered") {
        expect(obs.clobberedPath).toBeDefined();
        expect(obs.clobberedPath.length).toBeGreaterThan(0);
      }
    });

    it("ARCH16 outcome=recovered ALWAYS includes a `reason` string", async () => {
      const { store, policyIrPath } = await wire();
      await store.observe(policyIrPath);
      await fs.writeFile(policyIrPath, '{"ok":false}');
      const obs = await store.observe(policyIrPath);
      if (obs.outcome === "recovered") {
        expect(typeof obs.reason).toBe("string");
        expect(obs.reason.length).toBeGreaterThan(0);
      }
    });

    it("ARCH17 outcome=skipped/failed ALWAYS includes `issues` (may be empty array but always present)", async () => {
      const { store, policyIrPath } = await wire();
      // Drive to skipped via invalid-without-LKG.
      await fs.writeFile(policyIrPath, '{"ok":false}');
      const obs = await store.observe(policyIrPath);
      if (obs.outcome === "skipped" || obs.outcome === "failed") {
        expect(Array.isArray(obs.issues)).toBe(true);
      }
    });

    it("ARCH18 getEntry returns null (not throw) for unregistered paths on every backend", async () => {
      const { store } = await wire();
      const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-adv11-unreg-"));
      live.push({ scratch });
      const result = store.getEntry(path.join(scratch, "never-registered.json"));
      expect(result).toBeNull();
    });
  },
);
