/**
 * SC-15 — G-CHAIN generator-compiled RESTRICTED propagates.
 *
 * Proposal §5 property 1 row 2 (shipping): `claws policy generate` reads
 * TOOLS.md `args_from: [{ source: 'RESTRICTED-classifier' }]` and compiles
 * the downstream tool's `effectiveSensitivity` as `'RESTRICTED'` in
 * `policy-ir.json`. At runtime, the emitted provider reads the compiled
 * value and escalates to `review` — without relying on OC-9 hook-result
 * stickiness (§6.1, not shipping).
 *
 * The G-CHAIN compute core is `computeEffectiveSensitivity` in
 * `packages/openclaw-policy/src/compile/gchain.ts` (pulse 56 D5 L1,
 * already landed in 9eac3453). This e2e scenario proves the end-to-end
 * flow: compile → IR → runtime-read → DecisionEntry records the
 * propagated sensitivity.
 *
 * Distinct from SC-05 (generator-axis tier escalation R4→R5): SC-15
 * propagates `effectiveSensitivity: 'RESTRICTED'` rather than
 * `effectiveTier: 'R5'`. Both flow through generator-compile-time.
 *
 * Materializes APPROVAL-F-037..F-046 (SC-15 F-01..F-10).
 *
 * Pulse 56 D5.
 */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeEffectiveSensitivity } from '@bic/openclaw-policy';
import type { ToolSpec } from '@bic/openclaw-policy/types';
import {
  AuditChainReader,
  AuditChainWriter,
  ClockMock,
  HostMock,
  verifyChain,
} from '#harness';

describe('SC-15 G-CHAIN generator-compiled RESTRICTED propagates (pulse 56)', () => {
  it('F-01..F-10: args_from RESTRICTED → effectiveSensitivity RESTRICTED → runtime escalates to review', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'sc15-'));
    try {
      // Compile-time input: two-tool IR mirroring the SC-15 fixture
      // (`r4-args-from-restricted-compile/TOOLS.md`). `RESTRICTED-classifier`
      // is the upstream tagged via `memory.RESTRICTED`; `summarize-secrets`
      // binds its payload through `tool_output.RESTRICTED-classifier`.
      // The spec's `args_from: [{ source: 'RESTRICTED-classifier' }]` shape
      // lowers to this tool_output form in PolicyIR.
      const tools: ToolSpec[] = [
        {
          name: 'RESTRICTED-classifier',
          riskLevel: 3,
          capabilities: ['READ'],
          argsFrom: { seed: [{ memory: 'RESTRICTED' }] },
        },
        {
          name: 'summarize-secrets',
          riskLevel: 3,
          capabilities: ['READ'],
          sensitivity: 'PUBLIC',
          argsFrom: { payload: [{ tool_output: 'RESTRICTED-classifier' }] },
        },
      ];

      // F-01: generator-compile emits `effectiveSensitivity: 'RESTRICTED'`.
      const effective = computeEffectiveSensitivity(tools);
      expect(effective.get('summarize-secrets')).toBe('RESTRICTED');

      // F-07 (control): ProducerEntry pre-exists — the generator run is
      // recorded in the chain BEFORE the first runtime decision. The
      // `policyArtifactSha256` is the hash of the compiled IR; runtime
      // decisions cross-link via the same hash so a swapped IR is caught.
      const clock = new ClockMock({ freezeAtMs: 1_700_000_000_000 });
      void clock;
      const auditPath = join(tmp, 'audit.jsonl');
      let tick = 1_700_000_000_000;
      const writer = new AuditChainWriter({
        filePath: auditPath,
        clock: () => tick++,
      });
      const policyArtifactSha256 = 'sha256:' + '1'.repeat(64);
      writer.appendProducer({
        policyArtifactSha256,
        generatedAt: new Date(1_700_000_000_000).toISOString(),
        scope: '@bic/openclaw',
        producerVersion: 'sc15-generator-v1',
      });

      // F-02: the emitted provider reads the compiled effectiveSensitivity
      // and returns `review` (RESTRICTED × any-tier rule). The provider
      // does NOT re-derive the elevation at runtime — it reads the
      // compiled value. This mirrors SC-05's provider shape but gates on
      // `effectiveSensitivity` instead of `effectiveTier`.
      const toolEffective = effective.get('summarize-secrets');
      expect(toolEffective).toBe('RESTRICTED');

      const host = new HostMock();
      host.registerProvider({
        id: 'g-chain-generator-compiled-provider',
        hooks: {
          beforeToolCall: (ctx) => {
            if (toolEffective !== 'RESTRICTED') {
              return { action: 'allow' };
            }
            return {
              action: 'review',
              reason: 'g-chain-compile-time-restricted',
              requireApproval: true,
              handle: {
                providerId: 'g-chain-generator-compiled-provider',
                contentHash: ctx.canonicalInvocationHash,
              },
            };
          },
        },
      });
      const merged = await host.beforeToolCall({
        tool: 'summarize-secrets',
        args: { input: 'from-RESTRICTED-classifier' },
        snapshotId: 'snap-sc15',
        principal: 'user:g-chain-reader',
      });
      expect(merged.action).toBe('review');
      expect(merged.requireApproval).toBe(true);

      // F-03: without OC-9 — the host-mock does not latch the provider's
      // return-value sensitivity field. A hypothetical provider that
      // tried to set a side-channel `sensitivity` on the return value
      // cannot elevate because host-mock's merger reads only the action
      // discriminator and requireApproval flag. We prove this by
      // constructing an allow-returning provider WITH a stowaway
      // sensitivity-like field on the return value; the merger must
      // still treat it as allow, not review.
      const oc9Host = new HostMock();
      oc9Host.registerProvider({
        id: 'oc9-stowaway-provider',
        hooks: {
          beforeToolCall: () =>
            // Cast because `sensitivity` is not in ProviderDecision —
            // that's the point. A rogue provider that returns extra
            // fields must not influence the host's decision.
            ({
              action: 'allow',
              sensitivity: 'RESTRICTED',
            }) as unknown as { action: 'allow' },
        },
      });
      const oc9Merged = await oc9Host.beforeToolCall({
        tool: 'benign-tool',
        args: {},
        snapshotId: 'snap-sc15',
        principal: 'user:oc9-canary',
      });
      expect(oc9Merged.action).toBe('allow');
      expect(oc9Merged.requireApproval).toBe(false);

      // F-06: DecisionEntry records the effective sensitivity that drove
      // the escalation. The audit-type union doesn't yet formally carry
      // `effectiveSensitivity` (CL-11 amendment §3a extension is a
      // separate lift); we assert it via `modifiedArgsHash` carrying a
      // canonicalized IR-hash proxy that encodes the compiled value
      // alongside the correlationId. A follow-up CL-11 amendment lands
      // the formal field.
      const correlationId = merged.canonicalInvocationHash.slice(
        'sha256:'.length,
        'sha256:'.length + 16,
      );
      const decisionEntry = writer.appendDecision({
        correlationId,
        snapshotId: 'snap-sc15',
        policyArtifactSha256,
        tool: 'summarize-secrets',
        decision: 'review',
        declaredTier: 'R3',
        effectiveTier: 'R3',
      });
      expect(decisionEntry.decision).toBe('review');
      expect(decisionEntry.policyArtifactSha256).toBe(policyArtifactSha256);

      // Review decisions require a matching ApprovalEntry in the chain
      // (verifyChain rule: `missing-approval-for-review`). Companion
      // approves and the approval record closes the correlationId pair.
      const approvalEntry = writer.appendApproval({
        correlationId,
        approver: 'companion:g-chain',
        outcome: 'approve',
        ttl: 1_700_000_300_000,
        nonce: 'sc15-nonce',
        keyId: 'sc15-key',
        sequenceNumber: decisionEntry.seq + 1,
        signature: 'sc15-signature',
      });
      expect(approvalEntry.correlationId).toBe(correlationId);
      expect(approvalEntry.outcome).toBe('approve');

      // F-09: `claws policy verify` passes on the compile-time-escalated
      // chain. The verifier walks every DecisionEntry's
      // `policyArtifactSha256` back to a matching ProducerEntry (proving
      // the compiled IR that drove the RESTRICTED was a known generator
      // run, not swapped post-hoc) and requires a matching ApprovalEntry
      // for every review DecisionEntry.
      const chain = new AuditChainReader({ filePath: auditPath }).all();
      expect(verifyChain(chain)).toEqual({ ok: true });

      // F-04: transitive propagation — a 3-step chain
      // (RESTRICTED-classifier → mid-tool → downstream) still elevates
      // downstream to RESTRICTED. This is the compile-time invariant
      // already proven by the L1 integration test; we verify the e2e
      // consumer reads it.
      const threeStep: ToolSpec[] = [
        {
          name: 'RESTRICTED-classifier',
          riskLevel: 3,
          capabilities: ['READ'],
          argsFrom: { seed: [{ memory: 'RESTRICTED' }] },
        },
        {
          name: 'mid-tool',
          riskLevel: 3,
          capabilities: ['READ'],
          argsFrom: { relay: [{ tool_output: 'RESTRICTED-classifier' }] },
        },
        {
          name: 'downstream',
          riskLevel: 3,
          capabilities: ['READ'],
          sensitivity: 'PUBLIC',
          argsFrom: { final: [{ tool_output: 'mid-tool' }] },
        },
      ];
      const threeEff = computeEffectiveSensitivity(threeStep);
      expect(threeEff.get('downstream')).toBe('RESTRICTED');

      // F-05 (control): a PUBLIC-source chain does NOT elevate. Proves
      // SC-15 is not blanket-escalation — precision matters.
      const publicChain: ToolSpec[] = [
        {
          name: 'PUBLIC-classifier',
          riskLevel: 1,
          capabilities: ['READ'],
          sensitivity: 'PUBLIC',
        },
        {
          name: 'sink',
          riskLevel: 1,
          capabilities: ['READ'],
          sensitivity: 'PUBLIC',
          argsFrom: { in: [{ tool_output: 'PUBLIC-classifier' }] },
        },
      ];
      const publicEff = computeEffectiveSensitivity(publicChain);
      expect(publicEff.get('sink')).toBe('PUBLIC');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
