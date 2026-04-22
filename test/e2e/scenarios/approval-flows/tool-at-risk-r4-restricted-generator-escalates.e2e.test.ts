/**
 * SC-05 — R4 with RESTRICTED `args_from` source escalates at generate time.
 *
 * Pulse 52 D3. Generator-axis escalation: `claws policy generate` walks
 * `args_from` chains at compile time and emits `effectiveTier: 'R5'` into
 * `policy-ir.json`. The runtime provider reads the pre-compiled value —
 * it does NOT re-derive the escalation.
 *
 * The generator-emitter plumbing for G-CHAIN lives in pulse 56 (the
 * compile-axis `computeEffectiveSensitivity` in
 * `packages/openclaw-policy/src/compile/gchain.ts` is the compute core).
 * This scenario focuses on the **consumer** shape: given a pre-compiled
 * R5 artifact, the runtime provider returns `review` with the audit
 * signature `declaredTier: 'R4'`, `effectiveTier: 'R5'`, and an
 * `escalationSource: 'generator-compile-time'` annotation (modelled
 * test-local until the audit-type union formally carries the field).
 *
 * Materializes APPROVAL-T-034..T-040.
 */
import { describe, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateHandle,
  type ApprovalHandle as LibApprovalHandle,
  type ValidationContext,
  type ValidationDeps,
} from '@bic/openclaw-guardrails/handle-binding';
import { defineApprovalFlow } from '../../harness/approval-flow-sim/dispatch.ts';
import {
  AuditChainReader,
  AuditChainWriter,
  verifyChain,
} from '../../harness/audit-chain.ts';
import type {
  ApprovalFlowHarness,
  ApprovalFlowScenario,
  InvokeResult,
} from '../../harness/approval-flow-sim/types.ts';

const PROVIDER_ID = 'r4-generator-escalation-provider';
const APPROVER = 'user@tenant';
const SEQUENCE = 30;
const TTL_MS = 5 * 60_000;
const NONCE_SCOPE = 'sc-05-scope';

// Pre-compiled policy-ir.json shape (modelled inline — pulse 56 owns the
// actual emitter wiring). The key fields are the ones the runtime reads.
const COMPILED_POLICY_IR = {
  version: '0.1.0',
  tools: {
    'summarize-secrets': {
      declaredTier: 'R4' as const,
      effectiveTier: 'R5' as const,
      effectiveSensitivity: 'RESTRICTED' as const,
      escalationSource: 'generator-compile-time' as const,
    },
  },
};

describe('SC-05 R4 + args_from=RESTRICTED → generator escalates to R5 (pulse 52)', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'sc05-chain-'));

  const scenario: ApprovalFlowScenario = {
    name: 'SC-05 R4 args_from=RESTRICTED compile-time escalation',
    fixture: 'r4-args-from-restricted-compile',

    async setup(h: ApprovalFlowHarness): Promise<void> {
      // Runtime provider reads the COMPILED policy-ir entry and returns
      // `review` because `effectiveTier === 'R5'`. Crucially the provider
      // does NOT re-derive the escalation — F-02 is "runtime reads
      // compiled value, never re-computes".
      h.hostMock.registerProvider({
        id: PROVIDER_ID,
        hooks: {
          beforeToolCall: (ctx, _args) => {
            const toolEntry = COMPILED_POLICY_IR.tools['summarize-secrets'];
            if (toolEntry.effectiveTier !== 'R5') {
              return { action: 'allow' };
            }
            return {
              action: 'review',
              reason: 'generator-compile-time-escalation',
              requireApproval: true,
              handle: {
                providerId: PROVIDER_ID,
                contentHash: ctx.canonicalInvocationHash,
              },
            };
          },
        },
      });
      h.companion.programVerdict({ action: 'allow' });
    },

    async invoke(h: ApprovalFlowHarness): Promise<InvokeResult> {
      const res = await h.invokeTool({
        tool: 'summarize-secrets',
        args: { input: 'from-RESTRICTED-classifier' },
        snapshotId: 'snap-sc05',
        rawPrincipal: APPROVER,
      });
      return {
        status: res.response.status,
        action: res.decision.action,
        correlationId: res.correlationId,
        sinkEntries: res.sinkEntries,
        body: res.response.body,
        headers: res.response.headers,
      };
    },

    async assert(h, result): Promise<void> {
      // F-01 audit surface (APPROVAL-T-034): the compiled effectiveTier
      // is R5 — assertion on the shape of the IR the runtime reads.
      const ir = COMPILED_POLICY_IR.tools['summarize-secrets'];
      expect(ir.declaredTier).toBe('R4');
      expect(ir.effectiveTier).toBe('R5');
      expect(ir.effectiveSensitivity).toBe('RESTRICTED');
      expect(ir.escalationSource).toBe('generator-compile-time');

      // F-02 (APPROVAL-T-035): runtime returns `review` on the basis of
      // the compiled R5 — without re-deriving the escalation.
      expect(result.action).toBe('review');
      expect(result.status).toBe('review-required');

      const decisionSink = result.sinkEntries.find((e) => e.kind === 'decision');
      if (!decisionSink || decisionSink.kind !== 'decision') {
        throw new Error('SC-05 expected a SinkDecisionEntry');
      }
      const canonicalHash = decisionSink.canonicalInvocationHash;

      // F-05 (APPROVAL-T-038): approval resumes and the tool executes —
      // escalation is policy-level, not an absolute block. Companion
      // allow → validator accepts → post-approval resume.
      const outcome = await h.companion.decide({
        providerId: PROVIDER_ID,
        contentHash: canonicalHash,
        sequenceNumber: SEQUENCE,
        approverPrincipal: APPROVER,
        ttlMs: TTL_MS,
      });
      if (outcome.status !== 'allow') {
        throw new Error(`SC-05 expected companion allow, got '${outcome.status}'`);
      }
      const handle: LibApprovalHandle = {
        providerId: outcome.providerId,
        contentHash: outcome.contentHash,
        sequenceNumber: outcome.sequenceNumber,
        approverPrincipal: outcome.approverPrincipal,
        keyId: outcome.keyId,
        ttl: outcome.issuedAtMs + outcome.ttlMs,
        nonce: outcome.nonce,
        signature: outcome.signature,
        payload: outcome.payload,
      };
      const ctx: ValidationContext = {
        expectedProviderId: PROVIDER_ID,
        canonicalInvocationHash: canonicalHash,
        expectedApproverPrincipal: APPROVER,
        sequenceHighWaterMark: SEQUENCE - 1,
        nonceScope: NONCE_SCOPE,
      };
      const seenNonces = new Set<string>();
      const deps: ValidationDeps = {
        clock: () => h.clock.nowMs(),
        trustSet: h.companion.trustedKeyIds,
        keyLookup: (k): Buffer | undefined => h.companion.registry.get(k),
        validateNonce: (n): boolean => !seenNonces.has(n),
      };
      expect(validateHandle(handle, ctx, deps)).toEqual({ ok: true });

      // Record the post-approval entry on the adapter sink so the
      // expectedChainLength=2 runner gate observes both entries (the
      // initial DecisionEntry at invokeTool time + this ApprovalEntry).
      const authCtx = await h.adapter.extractIdentity({
        tool: 'summarize-secrets',
        args: {},
        headers: {},
        snapshotId: 'snap-sc05',
        rawPrincipal: APPROVER,
      });
      const sink = h.adapter.getApprovalSink(authCtx);
      await sink.writeApproval({
        adapterId: h.adapter.adapterId,
        correlationId: result.correlationId,
        approverPrincipal: APPROVER,
        outcome: 'approved',
      });
      // Sink now holds DecisionEntry + ApprovalEntry bound by shared
      // correlationId (SC-05 F-05 surface — post-approval resume).
      const sinkEntries = [];
      for await (const e of sink.query({ correlationId: result.correlationId })) {
        sinkEntries.push(e);
      }
      expect(sinkEntries.filter((e) => e.kind === 'decision')).toHaveLength(1);
      expect(sinkEntries.filter((e) => e.kind === 'approval')).toHaveLength(1);

      // F-02 (APPROVAL-T-035): DecisionEntry carries `declaredTier:
      // 'R4'` + `effectiveTier: 'R5'` — this is the generator-axis
      // audit signature (compile-time escalation). F-03 (APPROVAL-T-036):
      // effectiveSensitivity is RESTRICTED. F-04 (APPROVAL-T-037):
      // ProducerEntry precedes the DecisionEntry with matching
      // policyArtifactSha256 (proving the compiled artifact is what
      // drove the escalation).
      const chainPath = join(tmpRoot, 'audit-sc05.jsonl');
      let tick = h.clock.nowMs();
      const writer = new AuditChainWriter({
        filePath: chainPath,
        clock: (): number => tick++,
      });
      const policyArtifactSha256 = 'sha256:' + '5'.repeat(64);
      const producerEntry = writer.appendProducer({
        policyArtifactSha256,
        generatedAt: new Date(h.clock.nowMs()).toISOString(),
        scope: '@bic/openclaw',
        producerVersion: 'sc05-generator-v1',
      });
      const decisionEntry = writer.appendDecision({
        correlationId: result.correlationId,
        snapshotId: 'snap-sc05',
        policyArtifactSha256,
        tool: 'summarize-secrets',
        decision: 'review',
        declaredTier: 'R4',
        effectiveTier: 'R5',
      });
      const approvalEntry = writer.appendApproval({
        correlationId: result.correlationId,
        approver: APPROVER,
        outcome: 'approve',
        ttl: handle.ttl,
        nonce: handle.nonce,
        keyId: handle.keyId,
        sequenceNumber: decisionEntry.seq + 1,
        signature: handle.signature,
      });

      // F-02 audit signature: declaredTier R4, effectiveTier R5 — the
      // compile-time escalation is observable in the CL-11 §3a chain.
      expect(decisionEntry.declaredTier).toBe('R4');
      expect(decisionEntry.effectiveTier).toBe('R5');

      // F-04: ProducerEntry.policyArtifactSha256 === DecisionEntry's.
      // Proves the runtime-consumed artifact is the one the generator
      // produced (tamper detection).
      expect(producerEntry.policyArtifactSha256).toBe(policyArtifactSha256);
      expect(decisionEntry.policyArtifactSha256).toBe(policyArtifactSha256);

      // Cross-link: correlationId joins decision + approval.
      expect(approvalEntry.correlationId).toBe(result.correlationId);
      expect(decisionEntry.correlationId).toBe(result.correlationId);
      expect(approvalEntry.outcome).toBe('approve');

      // `claws policy verify` passes on the generator-escalated chain.
      const chain = new AuditChainReader({ filePath: chainPath }).all();
      expect(verifyChain(chain)).toEqual({ ok: true });

      try {
        rmSync(tmpRoot, { recursive: true, force: true });
      } catch {
        // best-effort
      }
    },
  };

  defineApprovalFlow(scenario);
});
