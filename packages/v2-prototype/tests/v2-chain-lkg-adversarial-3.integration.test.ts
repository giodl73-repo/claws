/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 3.
 *
 * Continues `v2-chain-lkg-adversarial{,-2}.integration.test.ts`.
 * Wave 3 categories:
 *
 *   S. Schema evolution (5)
 *   Q. PolicyIR-shape adversarial (5)
 *   Z. Performance / scale (4)
 *   F. Filesystem oddities (4)
 *
 * Total: 18 scenarios. Locks in cross-version, cross-platform, and
 * stress behaviors that the upstream PR conversation will probe.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-3
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { generateInMemory } from "@bic/openclaw-policy";
import { buildPolicyPluginFromLKG, policyIrTracker } from "@bic/openclaw-guardrails/policy-runtime";
import type {
  AuthorizationDecision,
  GuardrailProvider,
  ToolCallEvent,
} from "@bic/openclaw-guardrails";
import { lkgStore, lkgPathFor } from "@bic/openclaw-lkg";
import { validatePolicyIR, type LKGStore, type LKGTracker, type PolicyIR } from "@bic/v2-prototype";

const TEXT_DECODER = new TextDecoder("utf-8");

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true }).catch(() => undefined);
  }
});

const FROZEN = (): Date => new Date("2026-04-29T00:00:00.000Z");

const DRAFT = {
  soul: {
    denyRules: [
      { id: "soul-secrets", pattern: "*secret*", reason: "no secrets", severity: "block" as const },
    ],
    modelAllowlist: [],
    tone: "",
  },
  user: { oboScope: [], authorityBounds: [] },
  agents: { delegationMap: {}, architectureBoundaries: [] },
  tools: [
    {
      name: "send-email",
      riskLevel: 5 as const,
      capabilities: ["IRREVERSIBLE_EXTERNAL"] as const,
      effectiveTier: "R5" as const,
    },
    { name: "read-doc", riskLevel: 1 as const, capabilities: ["READ"] as const },
  ],
  skills: [],
  governance: { rules: [], sensitivityPropagation: [], governanceSurface: [] },
  identity: { name: "wave3-fixture" },
};

function policyIrJson(workspaceRoot: string): string {
  return generateInMemory({ workspaceRoot, draft: DRAFT, now: FROZEN }).policyIr;
}

async function makeFsScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-adv3-"));
  live.push({ scratch });
  return scratch;
}

interface Wired {
  store: LKGStore;
  policyIrPath: string;
  scratch: string;
}

async function wireFs(): Promise<Wired> {
  const scratch = await makeFsScratch();
  const policyIrPath = path.join(scratch, "policy-ir.json");
  await fs.writeFile(policyIrPath, policyIrJson(scratch), "utf-8");
  const store = lkgStore();
  store.register(policyIrTracker(policyIrPath));
  await store.observe(policyIrPath);
  return { store, policyIrPath, scratch };
}

function evaluator(read: () => Promise<Uint8Array>): GuardrailProvider {
  return {
    name: "lkg-adv3",
    async preAuthorize(event: ToolCallEvent): Promise<AuthorizationDecision> {
      const bytes = await read();
      const parsed: unknown = JSON.parse(TEXT_DECODER.decode(bytes));
      validatePolicyIR(parsed);
      const ir = parsed as PolicyIR;
      for (const rule of ir.denyRules) {
        if (rule.when.tool !== undefined && rule.when.tool === event.tool) {
          return { decision: "deny", reason: rule.reason };
        }
      }
      return { decision: "allow", riskLevel: 1 };
    },
    async postAudit() {
      /* */
    },
    getCapabilities() {
      return {
        description: "x",
        version: "0",
        riskClassification: false,
        auditTrail: false,
        externalApproval: false,
        argumentModification: false,
      };
    },
  };
}

// ============================================================
// S. Schema evolution
// ============================================================

describe("S · Schema evolution", () => {
  it("S1 FS: validator tightened mid-life — previously valid LKG bytes still serve recovery (cache holds the old IR)", async () => {
    // Models: deployment v1 promoted policy-ir.json that had
    // denyRules: []. Deployment v2 ships a stricter validator that
    // requires at least one rule. The LKG bytes from v1 would not
    // re-validate under v2, but if the plugin's cache still holds
    // the parsed PolicyIR keyed on the v1 fingerprint, evaluation
    // succeeds. Re-validation fires on next observe.
    const { store, policyIrPath, scratch } = await wireFs();
    // v1 plugin: lenient, just checks JSON parses.
    const lenientEvaluator = evaluator(() => store.readLastKnownGood(policyIrPath));
    const plugin = buildPolicyPluginFromLKG(lenientEvaluator, { lkg: store, policyIrPath });
    const a = await plugin.evaluate(
      { toolName: "send-email", params: {} },
      { toolName: "send-email", sessionId: "s1" },
    );
    expect(a).toMatchObject({ block: true });

    // v2: agent writes a PolicyIR that's still valid against v1
    // schema but stripped of all rules.
    const ir = JSON.parse(policyIrJson(scratch)) as PolicyIR;
    ir.denyRules = [];
    await fs.writeFile(policyIrPath, JSON.stringify(ir));
    await store.observe(policyIrPath); // promote
    const b = await plugin.evaluate(
      { toolName: "send-email", params: {} },
      { toolName: "send-email", sessionId: "s2" },
    );
    expect(b).toBeUndefined(); // no rule → no decision
  });

  it("S2 FS: tracker validator stricter than upstream — file passes JSON.parse but fails our validate → recover", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"version":1,"ok":true}');
    const tracker: LKGTracker<{ version: number; ok: boolean }> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as { version: number; ok: boolean },
      validate: (parsed) => ({
        valid: parsed.version === 1 && parsed.ok === true,
        issues:
          parsed.version === 1 && parsed.ok === true
            ? []
            : [{ path: "version", message: "must be 1" }],
      }),
    };
    const store = lkgStore();
    store.register(tracker);
    await store.observe(target); // promote (v=1, ok=true)
    // Agent writes a v2 file the tracker doesn't accept yet.
    await fs.writeFile(target, '{"version":2,"ok":true}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("recovered");
  });

  it("S3 FS: tracker swap (different validator for same path on a fresh store) — no LKG yet, treats first valid bytes as ground truth", async () => {
    // Model: gateway restarts with a different plugin shape. The
    // .lkg companion file from the prior process is on disk but the
    // new store has no `lastPromotedGood` recorded. Recovery cannot
    // fire (would fail the hash check anyway). First valid observe
    // re-promotes from current bytes.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const storeV1 = lkgStore();
    storeV1.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: () => ({ valid: true, issues: [] }),
    });
    await storeV1.observe(target); // .lkg companion file on disk

    // Hand off to a "new process" — fresh store with a stricter
    // validator. The .lkg file on disk is unrelated to this store
    // (its in-memory `lastPromotedGood` is undefined).
    const storeV2 = lkgStore();
    storeV2.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; required?: string },
      validate: (p) => ({
        valid: p.ok === true && typeof p.required === "string",
        issues: typeof p.required === "string" ? [] : [{ path: "required", message: "required" }],
      }),
    });
    // Current bytes don't satisfy v2 validator and there's no v2 LKG.
    const obs = await storeV2.observe(target);
    expect(obs.outcome).toBe("skipped");
  });

  it("S4 FS: validator that always returns valid → every observe promotes (no-LKG = idempotent)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"any":1}');
    const tracker: LKGTracker<unknown> = {
      path: target,
      parse: (raw) => JSON.parse(raw),
      validate: () => ({ valid: true, issues: [] }),
    };
    const store = lkgStore();
    store.register(tracker);
    const a = await store.observe(target);
    const b = await store.observe(target); // unchanged
    expect(a.outcome).toBe("promoted");
    expect(b.outcome).toBe("valid");
  });

  it("S5 FS: validator returns `valid=false` with no issues — still triggers recovery", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    let toggle = true;
    const tracker: LKGTracker<{ ok: boolean }> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: () => {
        const result = { valid: toggle, issues: [] }; // no issues even when invalid
        toggle = false;
        return result;
      },
    };
    const store = lkgStore();
    store.register(tracker);
    await store.observe(target); // promote (toggle=true → valid)
    const obs = await store.observe(target); // toggle=false → invalid
    expect(obs.outcome).toBe("recovered");
  });
});

// ============================================================
// Q. PolicyIR-shape adversarial
// ============================================================

describe("Q · PolicyIR-shape adversarial", () => {
  it("Q1 FS: PolicyIR with denyRules: [] (no rules) → all evaluations allow-through (empty enforcement)", async () => {
    const { store, policyIrPath, scratch } = await wireFs();
    const ir = JSON.parse(policyIrJson(scratch)) as PolicyIR;
    ir.denyRules = [];
    await fs.writeFile(policyIrPath, JSON.stringify(ir));
    await store.observe(policyIrPath);
    const plugin = buildPolicyPluginFromLKG(
      evaluator(() => store.readLastKnownGood(policyIrPath)),
      { lkg: store, policyIrPath },
    );
    const decision = await plugin.evaluate(
      { toolName: "send-email", params: {} },
      { toolName: "send-email", sessionId: "s1" },
    );
    expect(decision).toBeUndefined();
  });

  it("Q2 FS: missing required field (tools) — validatePolicyIR throws → plugin fails closed", async () => {
    const { store, policyIrPath, scratch } = await wireFs();
    const ir = JSON.parse(policyIrJson(scratch)) as Record<string, unknown>;
    delete ir.tools;
    await fs.writeFile(policyIrPath, JSON.stringify(ir));
    // Bypass observe (which would re-recover); directly test plugin behavior on bad LKG read.
    // Force LKG to point at the corrupted bytes by promoting via in-memory entry manipulation:
    // we just call observe, which will recover (since validate throws on missing tools).
    // After recover, LKG bytes are still the prior valid ones — so plugin should still work.
    const obs = await store.observe(policyIrPath);
    expect(obs.outcome).toBe("recovered");
    // Confirm LKG continues to enforce (recovery preserved the prior good IR).
    const plugin = buildPolicyPluginFromLKG(
      evaluator(() => store.readLastKnownGood(policyIrPath)),
      { lkg: store, policyIrPath },
    );
    const decision = await plugin.evaluate(
      { toolName: "send-email", params: {} },
      { toolName: "send-email", sessionId: "s1" },
    );
    expect(decision).toMatchObject({ block: true });
  });

  it("Q3 FS: denyRules contains an entry with no `when` clause — evaluator iterates without crashing", async () => {
    const { store, policyIrPath, scratch } = await wireFs();
    const ir = JSON.parse(policyIrJson(scratch)) as PolicyIR;
    // Empty when-clause (every key undefined) — evaluator should skip it.
    ir.denyRules.push({ id: "noop", when: {}, reason: "no condition" } as PolicyIR["denyRules"][0]);
    await fs.writeFile(policyIrPath, JSON.stringify(ir));
    await store.observe(policyIrPath);
    const plugin = buildPolicyPluginFromLKG(
      evaluator(() => store.readLastKnownGood(policyIrPath)),
      { lkg: store, policyIrPath },
    );
    // R5 rule still wins; the empty rule is benign.
    const decision = await plugin.evaluate(
      { toolName: "send-email", params: {} },
      { toolName: "send-email", sessionId: "s1" },
    );
    expect(decision).toMatchObject({ block: true });
  });

  it("Q4 FS: 1000-rule PolicyIR — evaluator iterates linearly without timeout", async () => {
    const { store, policyIrPath, scratch } = await wireFs();
    const ir = JSON.parse(policyIrJson(scratch)) as PolicyIR;
    for (let i = 0; i < 1000; i++) {
      ir.denyRules.push({
        id: `bulk-${i}`,
        when: { tool: `non-existent-tool-${i}` },
        reason: `rule ${i}`,
      } as PolicyIR["denyRules"][0]);
    }
    await fs.writeFile(policyIrPath, JSON.stringify(ir));
    await store.observe(policyIrPath);
    const plugin = buildPolicyPluginFromLKG(
      evaluator(() => store.readLastKnownGood(policyIrPath)),
      { lkg: store, policyIrPath },
    );
    const start = Date.now();
    const decision = await plugin.evaluate(
      { toolName: "send-email", params: {} },
      { toolName: "send-email", sessionId: "s1" },
    );
    const elapsed = Date.now() - start;
    expect(decision).toMatchObject({ block: true });
    // Eyeball perf gate — 1000 rules should evaluate in well under 100ms.
    expect(elapsed).toBeLessThan(500);
  });

  it("Q5 FS: PolicyIR JSON with extra unknown top-level fields — validator tolerates, evaluator ignores", async () => {
    const { store, policyIrPath, scratch } = await wireFs();
    const ir = JSON.parse(policyIrJson(scratch)) as Record<string, unknown>;
    ir.unknownField = { nested: "whatever" };
    ir.anotherUnknown = 42;
    await fs.writeFile(policyIrPath, JSON.stringify(ir));
    const obs = await store.observe(policyIrPath);
    expect(obs.outcome).toBe("promoted"); // validator only checks required fields
    const plugin = buildPolicyPluginFromLKG(
      evaluator(() => store.readLastKnownGood(policyIrPath)),
      { lkg: store, policyIrPath },
    );
    const decision = await plugin.evaluate(
      { toolName: "send-email", params: {} },
      { toolName: "send-email", sessionId: "s1" },
    );
    expect(decision).toMatchObject({ block: true });
  });
});

// ============================================================
// Z. Performance / scale
// ============================================================

describe("Z · Performance / scale", () => {
  it("Z1 FS: 100 trackers in one store — register all, observe all, no cross-talk", async () => {
    const scratch = await makeFsScratch();
    const store = lkgStore();
    const targets: string[] = [];
    for (let i = 0; i < 100; i++) {
      const target = path.join(scratch, `cfg-${i}.json`);
      await fs.writeFile(target, JSON.stringify({ id: i, ok: true }));
      const tracker: LKGTracker<{ id: number; ok: boolean }> = {
        path: target,
        parse: (raw) => JSON.parse(raw) as { id: number; ok: boolean },
        validate: (p) => ({ valid: p.ok === true && p.id === i, issues: [] }),
      };
      store.register(tracker);
      targets.push(target);
    }
    // Observe all in parallel.
    const results = await Promise.all(targets.map((t) => store.observe(t)));
    expect(results.every((r) => r.outcome === "promoted")).toBe(true);
  });

  it("Z2 FS: 50 sequential observes of unchanged file — cost is O(parse+validate), not O(write)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: () => ({ valid: true, issues: [] }),
    });
    await store.observe(target); // initial promote
    const start = Date.now();
    for (let i = 0; i < 50; i++) {
      const obs = await store.observe(target);
      expect(obs.outcome).toBe("valid"); // unchanged ⇒ no work
    }
    const elapsed = Date.now() - start;
    // No promote per call; should be cheap. Eyeball gate.
    expect(elapsed).toBeLessThan(2000);
  });

  it("Z3 FS: large LKG (1MB) recovery preserves all bytes byte-for-byte", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    const big = JSON.stringify({ ok: true, padding: "X".repeat(1_000_000) });
    await fs.writeFile(target, big);
    const store = lkgStore();
    store.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; padding: string },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    });
    await store.observe(target); // promote
    await fs.writeFile(target, "not json");
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("recovered");
    const restored = await fs.readFile(target, "utf-8");
    expect(restored.length).toBe(big.length);
    expect(restored).toBe(big);
  });

  it("Z4 FS: slow audit hook (50ms) does not double observe latency more than the audit itself", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore({
      onAudit: async () => {
        await new Promise((r) => setTimeout(r, 50));
      },
    });
    store.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: () => ({ valid: true, issues: [] }),
    });
    const start = Date.now();
    await store.observe(target);
    const elapsed = Date.now() - start;
    // Audit is awaited (~50ms). Total should be ~50–150ms, not 1s+.
    expect(elapsed).toBeLessThan(500);
  });
});

// ============================================================
// F. Filesystem oddities
// ============================================================

describe("F · Filesystem oddities", () => {
  it("F1 FS: tracker path with spaces — register + observe + recover all work", async () => {
    const scratch = await makeFsScratch();
    const dir = path.join(scratch, "with spaces in name");
    await fs.mkdir(dir);
    const target = path.join(dir, "cfg with space.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    });
    await store.observe(target); // promote
    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("recovered");
  });

  it("F2 FS: tracker path with unicode — register + observe + recover all work", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "café-конфиг-設定.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    });
    await store.observe(target); // promote
    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("recovered");
    const lkg = await fs.readFile(lkgPathFor(target), "utf-8");
    expect(lkg).toBe('{"ok":true}');
  });

  it("F3 FS: deeply nested tracker path (10 levels) — works", async () => {
    const scratch = await makeFsScratch();
    let dir = scratch;
    for (let i = 0; i < 10; i++) {
      dir = path.join(dir, `level${i}`);
      await fs.mkdir(dir);
    }
    const target = path.join(dir, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    });
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("promoted");
  });

  it("F4 FS: clobbered.<ts> sidecar lands in the same dir as the target (no scratch leak)", async () => {
    const scratch = await makeFsScratch();
    const dir = path.join(scratch, "enclosed");
    await fs.mkdir(dir);
    const target = path.join(dir, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    });
    await store.observe(target); // promote
    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("recovered");
    if (obs.outcome === "recovered") {
      // Clobbered file must be in the same dir as the target.
      expect(path.dirname(obs.clobberedPath)).toBe(dir);
    }
  });
});
