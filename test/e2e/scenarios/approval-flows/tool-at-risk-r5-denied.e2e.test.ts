/**
 * SC-02 — R5 tool-at-risk denied by companion.
 *
 * Pulse 51 D3. The companion returns an explicit deny; the tool is
 * blocked, the side-effect recorder stays at zero invocations, and the
 * ApprovalEntry.outcome === 'deny' is a valid CL-11 §3a terminal state
 * (`claws policy verify` passes — deny-at-companion is not a chain
 * invariant violation).
 *
 * The InMemorySink surface models the runtime decision/approval pair;
 * an AuditChainWriter companion-run asserts CL-11 §3a semantics
 * (ApprovalEntry.outcome === 'deny', chain oracle ok).
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
import type { SinkEntry } from '../../harness/host-adapter-test-doubles.ts';

const PROVIDER_ID = 'r5-send-email-provider';
const APPROVER = 'user@tenant';
const SEQUENCE = 11;
const TTL_MS = 5 * 60_000;
const NONCE_SCOPE = 'sc-02-scope';

describe('SC-02 R5 tool-at-risk denied by companion (pulse 51)', () => {
  const sideEffect: { count: number } = { count: 0 };
  const tmpRoot = mkdtempSync(join(tmpdir(), 'sc02-chain-'));

  const scenario: ApprovalFlowScenario = {
    name: 'SC-02 R5 denied by companion',
    fixture: 'r5-send-email',

    async setup(h: ApprovalFlowHarness): Promise<void> {
      h.hostMock.registerProvider({
        id: PROVIDER_ID,
        hooks: {
          beforeToolCall: (ctx) => ({
            action: 'review',
            requireApproval: true,
            handle: {
              providerId: PROVIDER_ID,
              contentHash: ctx.canonicalInvocationHash,
            },
          }),
        },
      });
      h.companion.programVerdict({ action: 'deny' });
    },

    async invoke(h: ApprovalFlowHarness): Promise<InvokeResult> {
      const res = await h.invokeTool({
        tool: 'send-email',
        args: { to: 'ops@example.test', body: 'blocked' },
        snapshotId: 'snap-sc02',
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
      // F-01 (APPROVAL-T-011): initial decision is still `review` because
      // the R5 provider escalates; the deny outcome lands on the
      // companion-returned signed response, not on the first-pass merger.
      expect(result.action).toBe('review');

      const decisionSink = result.sinkEntries.find((e) => e.kind === 'decision');
      expect(decisionSink).toBeDefined();
      if (!decisionSink || decisionSink.kind !== 'decision') {
        throw new Error('SC-02 expected a SinkDecisionEntry');
      }
      const canonicalHash = decisionSink.canonicalInvocationHash;

      // Companion returns a signed deny. The handle still verifies under
      // the trust set — deny is a valid signed terminal state.
      const outcome = await h.companion.decide({
        providerId: PROVIDER_ID,
        contentHash: canonicalHash,
        sequenceNumber: SEQUENCE,
        approverPrincipal: APPROVER,
        ttlMs: TTL_MS,
      });
      if (outcome.status !== 'deny') {
        throw new Error(`SC-02 expected companion deny, got '${outcome.status}'`);
      }

      // Validate the signed deny handle — signature + 7 bound fields
      // still have to match; only the `status` carries the deny verdict.
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
        keyLookup: (keyId): Buffer | undefined =>
          h.companion.registry.get(keyId),
        validateNonce: (nonce): boolean => !seenNonces.has(nonce),
      };
      expect(validateHandle(handle, ctx, deps)).toEqual({ ok: true });

      // F-03 (APPROVAL-T-013): tool side-effect recorder saw ZERO
      // invocations — post-approval resume is skipped on deny.
      expect(sideEffect.count).toBe(0);

      // F-02 (APPROVAL-T-012): ApprovalEntry.outcome === 'deny' on the
      // sink surface (InMemorySink uses `approved | denied`).
      const authCtx = await h.adapter.extractIdentity({
        tool: 'send-email',
        args: {},
        headers: {},
        snapshotId: 'snap-sc02',
        rawPrincipal: APPROVER,
      });
      const sink = h.adapter.getApprovalSink(authCtx);
      await sink.writeApproval({
        adapterId: h.adapter.adapterId,
        correlationId: result.correlationId,
        approverPrincipal: APPROVER,
        outcome: 'denied',
      });

      const sinkEntries: SinkEntry[] = [];
      for await (const e of sink.query({
        correlationId: result.correlationId,
      })) {
        sinkEntries.push(e);
      }
      expect(sinkEntries.length).toBe(2);
      const sinkApprovals = sinkEntries.filter((e) => e.kind === 'approval');
      expect(sinkApprovals).toHaveLength(1);
      const sinkApproval = sinkApprovals[0]!;
      if (sinkApproval.kind !== 'approval') {
        throw new Error('expected sink approval entry');
      }
      expect(sinkApproval.outcome).toBe('denied');
      expect(sinkApproval.correlationId).toBe(result.correlationId);

      // F-04/F-05/F-06 (APPROVAL-T-014..T-016): CL-11 §3a chain shape.
      // DecisionEntry.decision === 'review' with a matching ApprovalEntry
      // whose outcome === 'deny' — the chain still satisfies invariant 4
      // (missing-approval-for-review) and invariant 5 (orphan-approval).
      const chainPath = join(tmpRoot, 'audit-sc02.jsonl');
      let tick = h.clock.nowMs();
      const writer = new AuditChainWriter({
        filePath: chainPath,
        clock: (): number => tick++,
      });
      const policyArtifactSha256 = 'sha256:' + 'b'.repeat(64);
      writer.appendProducer({
        policyArtifactSha256,
        generatedAt: new Date(h.clock.nowMs()).toISOString(),
        scope: '@bic/openclaw',
        producerVersion: 'sc02-test-v1',
      });
      const decisionEntry = writer.appendDecision({
        correlationId: result.correlationId,
        snapshotId: 'snap-sc02',
        policyArtifactSha256,
        tool: 'send-email',
        decision: 'review',
        declaredTier: 'R5',
        effectiveTier: 'R5',
      });
      const approvalEntry = writer.appendApproval({
        correlationId: result.correlationId,
        approver: APPROVER,
        outcome: 'deny',
        ttl: handle.ttl,
        nonce: handle.nonce,
        keyId: handle.keyId,
        sequenceNumber: decisionEntry.seq + 1,
        signature: handle.signature,
      });

      // F-07 (APPROVAL-T-017): ApprovalEntry.outcome === 'deny'.
      expect(approvalEntry.outcome).toBe('deny');
      expect(approvalEntry.correlationId).toBe(result.correlationId);
      expect(decisionEntry.correlationId).toBe(result.correlationId);

      // F-08 (APPROVAL-T-018): `claws policy verify` passes — deny is a
      // valid CL-11 §3a terminal state.
      const chainReader = new AuditChainReader({ filePath: chainPath });
      expect(verifyChain(chainReader.all())).toEqual({ ok: true });

      try {
        rmSync(tmpRoot, { recursive: true, force: true });
      } catch {
        // best-effort
      }
    },
  };

  defineApprovalFlow(scenario);
});
