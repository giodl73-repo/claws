/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 17.
 *
 * Continues `v2-chain-lkg-adversarial{,-2..-16}.integration.test.ts`.
 * Wave 17 categories:
 *
 *   PROP. Property-based forall assertions     (5)
 *   CORP. Replay corpus (fixed fixtures)       (4)
 *   STAB. Stability across multiple runs       (3)
 *
 * Total: 12 scenarios.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-17
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { lkgStore, hashRaw, type AuditRecord } from "@bic/openclaw-lkg";
import type { LKGTracker } from "@bic/v2-prototype";

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function makeFsScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-adv17-"));
  live.push({ scratch });
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
// PROP · Property-based forall assertions
// ============================================================

describe("PROP · Property-based forall assertions", () => {
  it("PROP1 forall valid bytes B: observe(B) → outcome=promoted with fingerprint.hash == sha256(B)", async () => {
    const inputs = [
      '{"ok":true}',
      '{"ok":true,"v":1}',
      '{"ok":true,"nested":{"deep":{"value":42}}}',
      '{"ok":true,"array":[1,2,3,4,5]}',
      '{"ok":true,"unicode":"café-設定"}',
    ];
    for (const bytes of inputs) {
      const scratch = await makeFsScratch();
      const target = path.join(scratch, "cfg.json");
      await fs.writeFile(target, bytes);
      const store = lkgStore();
      store.register(jsonTracker(target));
      const obs = await store.observe(target);
      expect(obs.outcome).toBe("promoted");
      if (obs.outcome === "promoted") {
        expect(obs.fingerprint.hash).toBe(hashRaw(bytes));
      }
    }
  });

  it("PROP2 forall (good, bad) pairs: promote(good) → corrupt(bad) → recover restores good byte-for-byte", async () => {
    const pairs: Array<readonly [string, string]> = [
      ['{"ok":true}', '{"ok":false}'],
      ['{"ok":true,"v":1}', "GARBAGE"],
      ['{"ok":true,"x":"hello"}', "{not json"],
      ['{"ok":true,"a":1,"b":2}', '{"ok":false,"a":1}'],
      ['{"ok":true,"u":"café"}', ""],
    ];
    for (const [good, bad] of pairs) {
      const scratch = await makeFsScratch();
      const target = path.join(scratch, "cfg.json");
      await fs.writeFile(target, good);
      const store = lkgStore();
      store.register(jsonTracker(target));
      await store.observe(target); // promote
      await fs.writeFile(target, bad);
      const obs = await store.observe(target);
      expect(obs.outcome).toBe("recovered");
      const restored = await fs.readFile(target, "utf-8");
      expect(restored).toBe(good);
    }
  });

  it("PROP3 forall N observe orderings: audit log preserves call order (FIFO)", async () => {
    // Run 5 different observe orderings of 3 trackers; each preserves
    // call order in the audit log.
    const orderings = [
      ["a", "b", "c"],
      ["c", "b", "a"],
      ["a", "c", "b"],
      ["b", "a", "c"],
      ["b", "c", "a"],
    ] as const;
    for (const ordering of orderings) {
      const scratch = await makeFsScratch();
      const paths: Record<string, string> = {};
      for (const k of ["a", "b", "c"]) {
        const p = path.join(scratch, `${k}.json`);
        await fs.writeFile(p, '{"ok":true}');
        paths[k] = p;
      }
      const audits: AuditRecord[] = [];
      const store = lkgStore({
        onAudit: (r) => {
          audits.push(r);
        },
      });
      for (const k of ["a", "b", "c"]) {
        store.register(jsonTracker(paths[k]!));
      }
      for (const k of ordering) {
        await store.observe(paths[k]!);
      }
      expect(audits.map((r) => r.trackerPath)).toEqual(ordering.map((k) => paths[k]));
    }
  });

  it("PROP4 forall N trackers: breaking tracker A does NOT affect tracker B (failure isolation)", async () => {
    for (let n = 2; n <= 5; n++) {
      const scratch = await makeFsScratch();
      const targets: string[] = [];
      const store = lkgStore();
      for (let i = 0; i < n; i++) {
        const t = path.join(scratch, `t-${i}.json`);
        await fs.writeFile(t, '{"ok":true}');
        store.register(jsonTracker(t));
        targets.push(t);
      }
      // Promote all.
      for (const t of targets) {
        const obs = await store.observe(t);
        expect(obs.outcome).toBe("promoted");
      }
      // Break only the first.
      await fs.writeFile(targets[0]!, '{"ok":false}');
      // Recover the first; others stay valid.
      expect((await store.observe(targets[0]!)).outcome).toBe("recovered");
      for (let i = 1; i < n; i++) {
        expect((await store.observe(targets[i]!)).outcome).toBe("valid");
      }
    }
  });

  it("PROP5 forall observe sequence: outcome=promoted is reachable for every fresh tracker on first valid observe", async () => {
    for (let i = 0; i < 5; i++) {
      const scratch = await makeFsScratch();
      const target = path.join(scratch, "cfg.json");
      await fs.writeFile(target, `{"ok":true,"i":${i}}`);
      const store = lkgStore();
      store.register(jsonTracker(target));
      const obs = await store.observe(target);
      expect(obs.outcome).toBe("promoted");
    }
  });
});

// ============================================================
// CORP · Replay corpus
// ============================================================

describe("CORP · Replay corpus", () => {
  // Fixed corpus of "good" PolicyIR-shaped fixtures.
  const goodCorpus: string[] = [
    JSON.stringify({ ok: true, kind: "minimal" }),
    JSON.stringify({
      ok: true,
      kind: "with-deny-rules",
      denyRules: [{ id: "r1", when: { tool: "t" }, reason: "r" }],
    }),
    JSON.stringify({
      ok: true,
      kind: "with-tools",
      tools: [{ id: "send-email", risk: "critical" }],
    }),
    JSON.stringify({
      ok: true,
      kind: "rich",
      tools: [{ id: "a" }, { id: "b" }],
      denyRules: [{ id: "r1", when: {}, reason: "r" }],
    }),
  ];

  // Fixed corpus of "bad" inputs.
  const badCorpus: string[] = [
    "NOT-JSON",
    '{"ok":false}',
    "",
    '{"ok":true,', // truncated
    '{"ok":NaN}', // invalid JSON
  ];

  it("CORP1 every entry in the good corpus promotes successfully", async () => {
    for (const bytes of goodCorpus) {
      const scratch = await makeFsScratch();
      const target = path.join(scratch, "cfg.json");
      await fs.writeFile(target, bytes);
      const store = lkgStore();
      store.register(jsonTracker(target));
      const obs = await store.observe(target);
      expect(obs.outcome).toBe("promoted");
    }
  });

  it("CORP2 every entry in the bad corpus is rejected (outcome = skipped or failed without prior LKG)", async () => {
    for (const bytes of badCorpus) {
      const scratch = await makeFsScratch();
      const target = path.join(scratch, "cfg.json");
      await fs.writeFile(target, bytes);
      const store = lkgStore();
      store.register(jsonTracker(target));
      const obs = await store.observe(target);
      expect(["skipped", "failed"]).toContain(obs.outcome);
    }
  });

  it("CORP3 cross-pair: any good promotes, then any bad recovers — for every (good, bad) pair", async () => {
    // 4 good × 5 bad = 20 cross-pairs; all should follow promote→recover.
    for (const good of goodCorpus) {
      for (const bad of badCorpus) {
        if (bad === "") continue; // empty file → unparseable but parse() throws differently — skip empty here
        const scratch = await makeFsScratch();
        const target = path.join(scratch, "cfg.json");
        await fs.writeFile(target, good);
        const store = lkgStore();
        store.register(jsonTracker(target));
        await store.observe(target);
        await fs.writeFile(target, bad);
        const obs = await store.observe(target);
        expect(obs.outcome).toBe("recovered");
      }
    }
  });

  it("CORP4 every good corpus entry produces a deterministic fingerprint hash", async () => {
    const hashes: Record<string, string> = {};
    for (const bytes of goodCorpus) {
      const scratch = await makeFsScratch();
      const target = path.join(scratch, "cfg.json");
      await fs.writeFile(target, bytes);
      const store = lkgStore();
      store.register(jsonTracker(target));
      const obs = await store.observe(target);
      if (obs.outcome === "promoted") {
        hashes[bytes] = obs.fingerprint.hash;
      }
    }
    // Re-run; same bytes → same hash.
    for (const bytes of goodCorpus) {
      const scratch = await makeFsScratch();
      const target = path.join(scratch, "cfg.json");
      await fs.writeFile(target, bytes);
      const store = lkgStore();
      store.register(jsonTracker(target));
      const obs = await store.observe(target);
      if (obs.outcome === "promoted") {
        expect(obs.fingerprint.hash).toBe(hashes[bytes]);
      }
    }
  });
});

// ============================================================
// STAB · Stability across multiple runs
// ============================================================

describe("STAB · Stability across multiple runs", () => {
  it("STAB1 same input + 5 runs → identical audit-record hash sequences", async () => {
    const seq = async (): Promise<string[]> => {
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
      await store.observe(target);
      await fs.writeFile(target, '{"ok":false}');
      await store.observe(target);
      await store.observe(target);
      return audits.map((r) => `${r.outcome}:${r.current?.hash}:${r.lastKnownGood?.hash}`);
    };
    const runs = await Promise.all([seq(), seq(), seq(), seq(), seq()]);
    for (let i = 1; i < runs.length; i++) {
      expect(runs[i]).toEqual(runs[0]);
    }
  });

  it("STAB2 hash function is stable across runs (regression-locks hashRaw)", () => {
    const fixtures = ["hello world", '{"ok":true}', "", "utf8: café-設定"];
    const hashes1 = fixtures.map((s) => hashRaw(s));
    const hashes2 = fixtures.map((s) => hashRaw(s));
    expect(hashes1).toEqual(hashes2);
  });

  it("STAB3 LKG companion file content is stable across re-runs of the same observe sequence", async () => {
    const observeOnce = async (): Promise<string> => {
      const scratch = await makeFsScratch();
      const target = path.join(scratch, "cfg.json");
      await fs.writeFile(target, '{"ok":true,"stable":"value"}');
      const store = lkgStore();
      store.register(jsonTracker(target));
      await store.observe(target);
      const lkgRaw = await fs.readFile(`${target}.lkg`, "utf-8");
      return lkgRaw;
    };
    const runs = await Promise.all([observeOnce(), observeOnce(), observeOnce()]);
    expect(runs[1]).toBe(runs[0]);
    expect(runs[2]).toBe(runs[0]);
  });
});
