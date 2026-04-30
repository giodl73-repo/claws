/**
 * v2 chain — end-to-end integration test.
 *
 * Wires every carved package together to prove the full v2 contract chain
 * composes:
 *
 *   1. claws-side policy generator           → emits v2 PolicyIR JSON
 *      (@bic/openclaw-policy)                  per the lower.ts projection
 *
 *   2. PolicyIR lands inside a snapshot      → workspace dir contains
 *      bundle (@bic/openclaw-snap)             .openclaw/policy/policy-ir.json
 *
 *   3. SnapshotStore captures the workspace  → content-addressed bundle id
 *      (@bic/openclaw-snap filesystemStore)
 *
 *   4. Guardrails policy plugin              → reads PolicyIR via store.read,
 *      (@bic/openclaw-guardrails               validates v2 shape, dispatches
 *       /policy-runtime)                       to composed GuardrailProvider
 *
 *   5. Tool-call evaluation                  → R5 tool blocked via denyRule
 *                                              (R5-lowering proves out);
 *                                              R0–R4 tool flows through
 *
 * The chain is the load-bearing artifact for the upstream PR series — if
 * this test stays green through the carves, we know the contracts compose
 * without surprise integration glue.
 *
 * @module @bic/v2-prototype/tests/v2-chain
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { generateInMemory } from '@bic/openclaw-policy';
import {
  filesystemStore,
  type SnapshotId,
  type SnapshotStore,
} from '@bic/openclaw-snap';
import {
  buildPolicyPlugin,
  type PolicyContextWithSnapshot,
} from '@bic/openclaw-guardrails/policy-runtime';
import type {
  AuthorizationDecision,
  GuardrailProvider,
  ToolCallEvent,
} from '@bic/openclaw-guardrails';
import { validatePolicyIR, type PolicyIR } from '@bic/v2-prototype';

const TEXT_DECODER = new TextDecoder('utf-8');

/**
 * Materialize a workspace with a v2 PolicyIR baked into
 * `.openclaw/policy/policy-ir.json`, capture it via the SnapshotStore,
 * and return both the captured snapshot id and a reusable store handle.
 */
async function materializeAndCapture(
  scratchRoot: string,
): Promise<{
  snapshotId: SnapshotId;
  store: SnapshotStore;
  workspaceDir: string;
  policyIrJson: string;
}> {
  const workspaceDir = path.join(scratchRoot, 'workspace');
  const storeRoot = path.join(scratchRoot, 'snap-store');
  await fs.mkdir(workspaceDir, { recursive: true });
  await fs.mkdir(storeRoot, { recursive: true });

  const FROZEN = (): Date => new Date('2026-04-29T00:00:00.000Z');
  const out = generateInMemory({
    workspaceRoot: workspaceDir,
    draft: {
      soul: {
        denyRules: [
          {
            id: 'soul-secrets',
            pattern: '*secret*',
            reason: 'no secrets in tool args',
            severity: 'block',
          },
        ],
        modelAllowlist: [],
        tone: '',
      },
      user: { oboScope: [], authorityBounds: [] },
      agents: { delegationMap: {}, architectureBoundaries: [] },
      tools: [
        {
          name: 'send-email',
          riskLevel: 5,
          capabilities: ['IRREVERSIBLE_EXTERNAL'],
          effectiveTier: 'R5',
        },
        { name: 'read-doc', riskLevel: 1, capabilities: ['READ'] },
      ],
      skills: [],
      governance: {
        rules: [],
        sensitivityPropagation: [],
        governanceSurface: [],
      },
      identity: { name: 'v2-chain-fixture' },
    },
    now: FROZEN,
  });

  const policyDir = path.join(workspaceDir, '.openclaw', 'policy');
  await fs.mkdir(policyDir, { recursive: true });
  await fs.writeFile(path.join(policyDir, 'policy-ir.json'), out.policyIr, 'utf8');

  const store = filesystemStore({ root: storeRoot });
  const snapshotId = await store.capture(workspaceDir);

  return { snapshotId, store, workspaceDir, policyIrJson: out.policyIr };
}

/**
 * Build a `GuardrailProvider` that reads the PolicyIR via the snapshot
 * already validated upstream by the plugin shell, then enforces both:
 *
 *   1. `denyRules[].when.tool` matches by tool name (covers R5-lowered
 *      entries — `r5-tier:<tool>` rules emitted by the projection).
 *   2. `denyRules[].when.tag` matches by an arg substring (covers
 *      `soul.denyRules` projections that use a `tag` predicate).
 *
 * Real claws-side providers do more (audit, approvals, budget); this is
 * a minimal evaluator that proves the v2 contract is enforceable from
 * the wire shape alone — no R0-R5 tier semantics needed in the
 * evaluator code, which is the whole point of the lowering.
 */
function v2RuleEvaluator(store: SnapshotStore): GuardrailProvider {
  return {
    name: 'v2-rule-evaluator',
    async preAuthorize(event: ToolCallEvent): Promise<AuthorizationDecision> {
      const snap = (event.context as { snapshotId?: SnapshotId }).snapshotId;
      if (snap === undefined) {
        return { decision: 'deny', reason: 'no snapshot in context' };
      }
      const bytes = await store.read(snap, '.openclaw/policy/policy-ir.json');
      const parsed: unknown = JSON.parse(TEXT_DECODER.decode(bytes));
      validatePolicyIR(parsed);
      const ir = parsed as PolicyIR;

      for (const rule of ir.denyRules) {
        if (rule.when.tool !== undefined && rule.when.tool === event.tool) {
          return { decision: 'deny', reason: rule.reason };
        }
        if (rule.when.tag !== undefined) {
          const pat = rule.when.tag.replaceAll('*', '');
          for (const v of Object.values(event.arguments)) {
            if (typeof v === 'string' && v.includes(pat)) {
              return { decision: 'deny', reason: rule.reason };
            }
          }
        }
      }
      return { decision: 'allow', riskLevel: 1 };
    },
    async postAudit() {
      /* noop for the test */
    },
    getCapabilities() {
      return {
        description: 'v2 PolicyIR rule evaluator (test fixture)',
        version: '0.0.1',
        riskClassification: false,
        auditTrail: false,
        externalApproval: false,
        argumentModification: false,
      };
    },
  };
}

describe('v2 chain — full end-to-end composition', () => {
  it('R5 tool is blocked via denyRule (lowering proves out at the wire)', async () => {
    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'v2-chain-r5-'));
    try {
      const { snapshotId, store } = await materializeAndCapture(scratch);
      const plugin = buildPolicyPlugin(v2RuleEvaluator(store), { store });

      const decision = await plugin.evaluate(
        { toolName: 'send-email', params: { to: 'eve@example.com' } },
        { toolName: 'send-email', sessionId: 's1', snapshotId } as PolicyContextWithSnapshot,
      );

      expect(decision).toBeDefined();
      expect(decision).toMatchObject({
        block: true,
        blockReason: expect.stringContaining('r5-fail-closed'),
      });
    } finally {
      await fs.rm(scratch, { recursive: true, force: true });
    }
  });

  it('non-R5 tool is allowed (chain returns no-op decision)', async () => {
    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'v2-chain-allow-'));
    try {
      const { snapshotId, store } = await materializeAndCapture(scratch);
      const plugin = buildPolicyPlugin(v2RuleEvaluator(store), { store });

      const decision = await plugin.evaluate(
        { toolName: 'read-doc', params: { path: 'public/doc.txt' } },
        { toolName: 'read-doc', sessionId: 's1', snapshotId } as PolicyContextWithSnapshot,
      );

      // 'allow' translates to undefined per the upstream-adapter mapping
      // — chain continues with no decision.
      expect(decision).toBeUndefined();
    } finally {
      await fs.rm(scratch, { recursive: true, force: true });
    }
  });

  it('soul deny-rule via tag fires on argument substring', async () => {
    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'v2-chain-soul-'));
    try {
      const { snapshotId, store } = await materializeAndCapture(scratch);
      const plugin = buildPolicyPlugin(v2RuleEvaluator(store), { store });

      const decision = await plugin.evaluate(
        { toolName: 'read-doc', params: { path: 'leaked-secret-data' } },
        { toolName: 'read-doc', sessionId: 's1', snapshotId } as PolicyContextWithSnapshot,
      );

      expect(decision).toMatchObject({
        block: true,
        blockReason: expect.stringContaining('no secrets'),
      });
    } finally {
      await fs.rm(scratch, { recursive: true, force: true });
    }
  });

  it('missing ctx.snapshotId fails closed (plugin shell guard, before evaluator)', async () => {
    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'v2-chain-missing-snap-'));
    try {
      const { store } = await materializeAndCapture(scratch);
      const plugin = buildPolicyPlugin(v2RuleEvaluator(store), { store });

      // Note: NO snapshotId on the context.
      const decision = await plugin.evaluate(
        { toolName: 'read-doc', params: {} },
        { toolName: 'read-doc', sessionId: 's1' },
      );

      expect(decision).toMatchObject({
        block: true,
        blockReason: expect.stringContaining('ctx.snapshotId'),
      });
    } finally {
      await fs.rm(scratch, { recursive: true, force: true });
    }
  });

  it('captured policy-ir.json is the v2 shape (tools, denyRules, generatedFrom)', async () => {
    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'v2-chain-shape-'));
    try {
      const { snapshotId, store } = await materializeAndCapture(scratch);
      const bytes = await store.read(snapshotId, '.openclaw/policy/policy-ir.json');
      const parsed: unknown = JSON.parse(TEXT_DECODER.decode(bytes));
      validatePolicyIR(parsed);
      const ir = parsed as PolicyIR;

      // Lean upstream shape — no soul/agents/governance/identity richness.
      expect(ir.tools.map((t) => t.id).sort()).toEqual(['read-doc', 'send-email']);
      expect(ir.tools.find((t) => t.id === 'send-email')?.risk).toBe('critical');
      expect(ir.tools.find((t) => t.id === 'read-doc')?.risk).toBe('low');

      // R5 lowering produced the explicit deny rule.
      const r5Rule = ir.denyRules.find((r) => r.id === 'r5-tier:send-email');
      expect(r5Rule).toBeDefined();
      expect(r5Rule?.when.tool).toBe('send-email');

      // Soul deny-rule was projected to the v2 shape.
      const soulRule = ir.denyRules.find((r) => r.id === 'soul-secrets');
      expect(soulRule).toBeDefined();
      expect(soulRule?.when.tag).toBe('*secret*');
    } finally {
      await fs.rm(scratch, { recursive: true, force: true });
    }
  });

  it('capture is content-addressable end-to-end (same workspace ⇒ same snapshot id)', async () => {
    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'v2-chain-idem-'));
    try {
      const a = await materializeAndCapture(scratch);
      // Reset the scratch dir and rematerialize byte-identically
      // (using FROZEN now → same policyIrJson). Capture a second time;
      // because the workspace content is byte-identical, the snapshot id
      // must match — that's the content-addressable invariant.
      await fs.rm(path.join(scratch, 'workspace'), { recursive: true, force: true });
      await fs.rm(path.join(scratch, 'snap-store'), { recursive: true, force: true });
      const b = await materializeAndCapture(scratch);
      expect(b.snapshotId).toBe(a.snapshotId);
      expect(b.policyIrJson).toBe(a.policyIrJson);
    } finally {
      await fs.rm(scratch, { recursive: true, force: true });
    }
  });
});
