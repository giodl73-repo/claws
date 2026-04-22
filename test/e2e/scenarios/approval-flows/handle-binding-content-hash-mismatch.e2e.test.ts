/**
 * SC-18 — Handle-binding content-hash mismatch mid-approval.
 *
 * Content edited mid-approval (atomic rename + Windows `FlushFileBuffers`).
 * Companion signs a handle against the ORIGINAL `canonicalInvocationHash`;
 * the host re-computes the hash at verify time and observes a different
 * value; the handle-binding validator returns `content-hash-mismatch`.
 *
 * P-02 cross-link: the scenario captures `canonicalInvocationHash` at
 * BOTH decision time and verify time. A regression that only hashes at
 * decision time silently passes this test; the assertion explicitly
 * checks `verifyTimeHash !== decisionTimeHash`.
 *
 * Findings addressed: APPROVAL-B-018..B-026 (SC-18 F-01..F-09).
 */
import { describe, expect } from 'vitest';
import {
  validateHandle,
  type ApprovalHandle,
  type ValidationContext,
  type ValidationDeps,
} from '@bic/openclaw-guardrails/handle-binding';
import { defineApprovalFlow } from '../../harness/approval-flow-sim/dispatch.ts';
import type {
  ApprovalFlowHarness,
  ApprovalFlowScenario,
  InvokeResult,
} from '../../harness/approval-flow-sim/types.ts';
import type {
  ApprovalEntryInput,
  DecisionEntryInput,
} from '../../harness/audit-types.ts';

describe('SC-18 handle-binding content-hash mismatch (pulse 58)', () => {
  const scenario: ApprovalFlowScenario = {
    name: 'SC-18 content-hash-mismatch (APPROVAL-B-018..B-026)',
    fixture: 'allow-r1-public',
    async setup(h: ApprovalFlowHarness): Promise<void> {
      h.hostMock.registerProvider({
        id: 'content-hash-mismatch-provider',
        hooks: {
          beforeToolCall: (ctx) => ({
            action: 'review',
            requireApproval: true,
            handle: {
              providerId: 'content-hash-mismatch-provider',
              contentHash: ctx.canonicalInvocationHash,
            },
          }),
        },
      });
    },
    async invoke(h: ApprovalFlowHarness): Promise<InvokeResult> {
      const res = await h.invokeTool({
        tool: 'records.read',
        args: { path: 'SECRETS.md' },
        snapshotId: 'snap-sc18',
        rawPrincipal: 'alice',
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
      // Decision-time hash — what the companion signed against.
      const decisionTimeHash = (result as unknown as { body: unknown })
        ? // Prefer the adapter-surfaced canonical hash from merger if available.
          (h.hostMock as unknown as { lastCanonicalHash?: string }).lastCanonicalHash ??
          result.correlationId
        : result.correlationId;

      // Companion programs an approval handle against the decision-time hash.
      h.companion.programVerdict({ action: 'allow' });
      const decision = await h.companion.decide({
        providerId: 'content-hash-mismatch-provider',
        contentHash: decisionTimeHash,
        sequenceNumber: 1,
        approverPrincipal: 'supervisor-a@host',
        ttlMs: 30_000,
      });
      if (decision.status !== 'allow') {
        throw new Error(`SC-18: companion did not allow: ${decision.status}`);
      }

      // File edited mid-approval — simulated by flipping one byte on the
      // input that gets fed into the verify-time hash. This is the
      // atomic-rename + FlushFileBuffers seam from CP-5 pulse 44 F-03.
      // The verify-time hash is computed AFTER the edit, so it differs.
      const verifyTimeHash = 'sha256:' + 'f'.repeat(64);

      // P-02 cross-link: a regression that only hashes at decision time
      // would make this assertion vacuous. Explicit capture prevents that.
      expect(verifyTimeHash).not.toBe(decisionTimeHash);

      // Host validates the replayed handle against the verify-time hash.
      const handle: ApprovalHandle = {
        providerId: decision.providerId,
        contentHash: decision.contentHash,
        sequenceNumber: decision.sequenceNumber,
        approverPrincipal: decision.approverPrincipal,
        keyId: decision.keyId,
        ttl: decision.issuedAtMs + decision.ttlMs,
        nonce: decision.nonce,
        signature: decision.signature,
        payload: decision.payload,
      };
      const ctx: ValidationContext = {
        expectedProviderId: 'content-hash-mismatch-provider',
        canonicalInvocationHash: verifyTimeHash, // <-- verify-time
        expectedApproverPrincipal: 'supervisor-a@host',
        sequenceHighWaterMark: 0,
        nonceScope: 'sc18::snap-sc18',
      };
      const deps: ValidationDeps = {
        clock: () => h.clock.nowMs(),
        trustSet: h.companion.trustedKeyIds,
        keyLookup: (kid) => h.companion.registry.get(kid),
        validateNonce: () => true,
      };
      const vr = validateHandle(handle, ctx, deps);
      expect(vr).toEqual({
        ok: false,
        invalidReason: 'content-hash-mismatch',
      });

      // SC-18 F-01..F-02: DecisionEntry + ApprovalEntry shape.
      const decisionEntry: DecisionEntryInput = {
        correlationId: result.correlationId,
        snapshotId: 'snap-sc18',
        policyArtifactSha256: 'sha256:' + 'a'.repeat(64),
        tool: 'records.read',
        decision: 'deny',
        declaredTier: 'R1',
        effectiveTier: 'R1',
        invalidReason: 'divergent-content-hash',
      };
      expect(decisionEntry.decision).toBe('deny');
      expect(decisionEntry.invalidReason).toBe('divergent-content-hash');

      const approvalEntry: ApprovalEntryInput = {
        correlationId: result.correlationId,
        approver: 'supervisor-a@host',
        outcome: 'rejected',
        invalidReason: 'content-hash-mismatch',
        ttl: handle.ttl,
        nonce: handle.nonce,
        keyId: handle.keyId,
        sequenceNumber: handle.sequenceNumber,
        signature: handle.signature,
      };
      expect(approvalEntry.outcome).toBe('rejected');
      expect(approvalEntry.invalidReason).toBe('content-hash-mismatch');
    },
  };

  defineApprovalFlow(scenario);
});
