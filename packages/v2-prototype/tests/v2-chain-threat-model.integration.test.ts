/**
 * v2 chain — threat-model scenarios.
 *
 * Distinct from the S01..S100 adversarial suite — these tests pin
 * **trust-boundary** behaviors that depend on which layer of the stack
 * an attacker has access to. They make the threat-model claims in our
 * architecture diagrams load-bearing as tests rather than just prose.
 *
 * Today there's one scenario:
 *
 *   S101 — direct-fs bypass evades the policy-plugin's deny rules.
 *          Demonstrates that supervisor authority over snap operations
 *          is partial: it bites at the tool-call layer but not at the
 *          direct-fs layer. Defense for the latter must live BELOW our
 *          policy plugin (cloud-storage ACLs, FUSE write filters,
 *          container sandboxing — Eduardo's runtime-governance design,
 *          etc.).
 *
 * Adding more here as the threat model is extended (e.g., S102 when
 * snap operations are registered as tools and the tool-path becomes
 * the only legitimate channel).
 *
 * @module @bic/v2-prototype/tests/v2-chain-threat-model
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { generateInMemory } from "@bic/openclaw-policy";
import {
  filesystemStore,
  workspaceRefStore,
  type SnapshotId,
  type SnapshotStore,
  type RefStore,
} from "@bic/openclaw-snap";
import {
  buildPolicyPlugin,
  type PolicyContextWithSnapshot,
} from "@bic/openclaw-guardrails/policy-runtime";
import type {
  AuthorizationDecision,
  GuardrailProvider,
  ToolCallEvent,
} from "@bic/openclaw-guardrails";
import { type PolicyIR } from "@bic/v2-prototype";

const TEXT_DECODER = new TextDecoder("utf-8");

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true });
  }
});

/**
 * Reference evaluator that honors v2 PolicyIR `denyRules`. Same shape as
 * the one used in the main e2e suite — represents what a real
 * tool-policy provider would do in production.
 */
function ruleEvaluator(store: SnapshotStore): GuardrailProvider {
  return {
    name: "rule-evaluator",
    async preAuthorize(event: ToolCallEvent): Promise<AuthorizationDecision> {
      const snap = (event.context as { snapshotId?: SnapshotId }).snapshotId;
      if (snap === undefined) return { decision: "deny", reason: "no-snap" };
      const bytes = await store.read(snap, ".openclaw/policy/policy-ir.json");
      const ir = JSON.parse(TEXT_DECODER.decode(bytes)) as PolicyIR;
      for (const rule of ir.denyRules) {
        if (rule.when.tool !== undefined && rule.when.tool === event.tool) {
          return { decision: "deny", reason: rule.reason };
        }
      }
      return { decision: "allow", riskLevel: 1 };
    },
    async postAudit() {},
    getCapabilities() {
      return {
        description: "rule eval",
        version: "0",
        riskClassification: false,
        auditTrail: false,
        externalApproval: false,
        argumentModification: false,
      };
    },
  };
}

describe("Threat model — supervisor authority limits", () => {
  it("S101 [TRUST-BOUNDARY GAP] direct-fs bypass evades policy-plugin denyRule for snap_promote", async () => {
    // ───────────────────────────────────────────────────────────────────
    // Threat model:
    //   - Supervisor (legitimate operator) authors a PolicyIR with
    //     denyRule for `snap_promote`.
    //   - Supervisor captures a snapshot containing this IR; this is the
    //     active HEAD (in mode 3 — managed container — the gateway would
    //     also sign it, but signing is out of scope for this prototype).
    //   - A compromised agent inside the OpenClaw container wants to
    //     promote a different snapshot (e.g. one with a permissive IR
    //     that re-allows everything).
    //
    // What we want: supervisor's deny rule blocks the promotion.
    // What actually happens depends on which path the agent takes.
    //
    // Path A (tool call): agent invokes the `snap_promote` tool. The
    //                     policy plugin reads PolicyIR via store.read,
    //                     evaluates the deny rule, returns block. ✓
    //                     Supervisor authority HOLDS.
    //
    // Path B (direct fs): agent writes refs/<hash>.json directly to the
    //                     workspace's snap dir, bypassing the tool path.
    //                     The policy plugin never sees the write. ✗
    //                     Supervisor authority FAILS at this layer.
    //
    // Defense for Path B lives BELOW the policy plugin:
    //   - Cloud-storage ACLs (Graph API permissions on OneDrive paths)
    //   - FUSE write filtering (Aether could mount snap dir read-only
    //     to the agent's UID, with a separate UID for the snap service)
    //   - Container sandboxing (no fs access to .openclaw/snapshots/;
    //     all snap ops MUST go through tool calls — Eduardo's runtime-
    //     governance v1.0 lands at this layer)
    //
    // This test pins the gap so we notice when defense lands.
    // ───────────────────────────────────────────────────────────────────

    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "v2-threat-"));
    live.push({ scratch });
    const workspace = path.join(scratch, "workspace");
    const storeRoot = path.join(scratch, "snap-store");
    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(storeRoot, { recursive: true });

    // Supervisor authors and captures snap-A: the IR has denyRule for
    // snap_promote. Set this as HEAD.
    const FROZEN = (): Date => new Date("2026-04-30T00:00:00.000Z");
    const supervisorOut = generateInMemory({
      workspaceRoot: workspace,
      draft: {
        soul: { denyRules: [], modelAllowlist: [], tone: "" },
        user: { oboScope: [], authorityBounds: [] },
        agents: { delegationMap: {}, architectureBoundaries: [] },
        tools: [
          // 'snap_promote' as a declared tool with a deny rule.
          // R5 marks it as critical; the soul rule explicitly blocks it.
          {
            name: "snap_promote",
            riskLevel: 5,
            capabilities: ["IRREVERSIBLE_EXTERNAL"],
            effectiveTier: "R5",
          },
        ],
        skills: [],
        governance: { rules: [], sensitivityPropagation: [], governanceSurface: [] },
        identity: { name: "supervisor" },
      },
      now: FROZEN,
    });
    await fs.mkdir(path.join(workspace, ".openclaw", "policy"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, ".openclaw", "policy", "policy-ir.json"),
      supervisorOut.policyIr,
    );

    const store = filesystemStore({ root: storeRoot });
    const refs = workspaceRefStore({ root: storeRoot });
    const snapA = await store.capture(workspace);
    await refs.setHead(workspace, snapA);

    // Attacker authors snap-B: a permissive IR that re-allows snap_promote.
    // (In a real attack, this would be a snapshot with no deny rules at
    // all — for simplicity here we just produce one with no tools.)
    const attackerOut = generateInMemory({
      workspaceRoot: workspace,
      draft: {
        soul: { denyRules: [], modelAllowlist: [], tone: "" },
        user: { oboScope: [], authorityBounds: [] },
        agents: { delegationMap: {}, architectureBoundaries: [] },
        tools: [],
        skills: [],
        governance: { rules: [], sensitivityPropagation: [], governanceSurface: [] },
        identity: { name: "attacker" },
      },
      now: FROZEN,
    });
    await fs.writeFile(
      path.join(workspace, ".openclaw", "policy", "policy-ir.json"),
      attackerOut.policyIr,
    );
    const snapB = await store.capture(workspace);
    expect(snapB).not.toBe(snapA);

    // ── PATH A: tool-call path ────────────────────────────────────────
    // Agent attempts the `snap_promote` tool call. The plugin reads the
    // CURRENT PolicyIR (snapA's, since HEAD=snapA), sees the deny rule,
    // and blocks. Supervisor authority HOLDS at this layer.
    const plugin = buildPolicyPlugin(ruleEvaluator(store), { store });
    const toolDecision = await plugin.evaluate({ toolName: "snap_promote", params: {} }, {
      toolName: "snap_promote",
      sessionId: "attacker-session",
      snapshotId: snapA,
    } as PolicyContextWithSnapshot);
    expect(toolDecision).toMatchObject({
      block: true,
      blockReason: expect.stringContaining("r5-fail-closed"),
    });

    // ── PATH B: direct fs bypass ──────────────────────────────────────
    // Same agent, but instead of calling the tool, it writes refs.json
    // directly inside the FUSE-mounted snap dir. The policy plugin
    // never sees the write. HEAD silently flips to snapB.
    //
    // (refPath() is internal to workspaceRefStore — we reproduce the
    // same hashing scheme to write at the right path.)
    const crypto = await import("node:crypto");
    const wsKey = crypto.createHash("sha256").update(workspace, "utf8").digest("hex").slice(0, 32);
    const refPath = path.join(storeRoot, "refs", `${wsKey}.json`);
    const directWriteContent =
      JSON.stringify({
        HEAD: snapB, // ← attacker's snap
        STAGE: null,
        history: [snapA],
      }) + "\n";
    await fs.writeFile(refPath, directWriteContent);

    // Verify the bypass worked: refs.getHead returns the attacker's snap.
    const headAfterBypass = await refs.getHead(workspace);
    expect(headAfterBypass).toBe(snapB);
    // The attacker's permissive IR is now the one a fresh session would
    // bind to. A subsequent tool call evaluated against snapB would not
    // be blocked by the supervisor's rule — because the supervisor's
    // rule was in snapA, not snapB.
    const newSessionDecision = await plugin.evaluate({ toolName: "snap_promote", params: {} }, {
      toolName: "snap_promote",
      sessionId: "fresh-session",
      snapshotId: snapB,
    } as PolicyContextWithSnapshot);
    expect(newSessionDecision).toBeUndefined(); // allow → no-op

    // ── ASSERTION: the threat model gap is real ───────────────────────
    // - Tool-path: blocked by supervisor's rule (snapA active). ✓
    // - Direct-fs path: bypassed silently. ✗
    // Closing path B requires defense BELOW the policy plugin.
    //
    // When that defense lands (cloud ACLs / FUSE filter / sandbox), the
    // direct write at line `refPath` would fail with EACCES or similar,
    // and this test would need to update to assert the failure.
  });
});
