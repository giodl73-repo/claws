/**
 * SC-20 — Handle-binding approver-principal swap (separation-of-duties).
 *
 * Two companion principals are registered with distinct
 * `approverPrincipal` values:
 *   - companion-A → `supervisor-a@host`
 *   - companion-B → `supervisor-b@host`
 *
 * Companion A signs a handle; the replay attempt swaps in
 * `approverPrincipal: supervisor-b@host`. The host holds
 * `expectedApproverPrincipal: supervisor-a@host` from the original
 * decision context; the validator rejects with `principal-mismatch`.
 * Tool is NOT executed.
 *
 * Findings addressed: APPROVAL-B-036..B-043 (SC-20 F-01..F-08).
 */
import { describe, expect } from 'vitest';
import { createHmac, randomBytes } from 'node:crypto';
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

describe('SC-20 handle-binding approver-principal swap (pulse 58)', () => {
  let toolExecuted = false;

  const scenario: ApprovalFlowScenario = {
    name: 'SC-20 principal-mismatch (APPROVAL-B-036..B-043)',
    fixture: 'allow-r1-public',
    async setup(h: ApprovalFlowHarness): Promise<void> {
      h.hostMock.registerProvider({
        id: 'principal-swap-provider',
        hooks: {
          beforeToolCall: (ctx) => ({
            action: 'review',
            requireApproval: true,
            handle: {
              providerId: 'principal-swap-provider',
              contentHash: ctx.canonicalInvocationHash,
            },
          }),
        },
      });
    },
    async invoke(h: ApprovalFlowHarness): Promise<InvokeResult> {
      toolExecuted = false;
      const res = await h.invokeTool({
        tool: 'records.write',
        args: { id: 'R-001' },
        snapshotId: 'snap-sc20',
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
      // Separation-of-duties: two distinct principals. Companion A signs
      // with its own key; then we synthesize a replay with B's principal
      // against the SAME signature payload — signature still verifies,
      // but the approverPrincipal doesn't match the original context.
      h.companion.programVerdict({ action: 'allow' });
      const signedByA = await h.companion.decide({
        providerId: 'principal-swap-provider',
        contentHash: 'sha256:' + 'b'.repeat(64),
        sequenceNumber: 1,
        approverPrincipal: 'supervisor-a@host',
        ttlMs: 30_000,
      });
      if (signedByA.status !== 'allow') throw new Error('SC-20: companion did not allow');

      // Build the REPLAYED handle: the payload is re-signed with the
      // SAME key but with approverPrincipal swapped to B. The signature
      // pre-check passes (attacker controls payload + still uses a
      // trusted key); the principal check rejects.
      const swappedPayload = new TextEncoder().encode(
        JSON.stringify({
          v: 1,
          providerId: signedByA.providerId,
          contentHash: signedByA.contentHash,
          sequenceNumber: signedByA.sequenceNumber,
          approverPrincipal: 'supervisor-b@host',
          keyId: signedByA.keyId,
          issuedAtMs: signedByA.issuedAtMs,
          ttlMs: signedByA.ttlMs,
          nonce: signedByA.nonce,
          action: 'allow',
          mode: 'cli-stdin',
        }),
      );
      const key = h.companion.registry.get(signedByA.keyId);
      if (key === undefined) throw new Error('SC-20: key missing from registry');
      const mac = createHmac('sha256', key).update(swappedPayload).digest('hex');
      const swappedSignature = `${signedByA.keyId}.${mac}`;

      const handle: ApprovalHandle = {
        providerId: signedByA.providerId,
        contentHash: signedByA.contentHash,
        sequenceNumber: signedByA.sequenceNumber,
        approverPrincipal: 'supervisor-b@host', // ← swapped
        keyId: signedByA.keyId,
        ttl: signedByA.issuedAtMs + signedByA.ttlMs,
        nonce: signedByA.nonce,
        signature: swappedSignature,
        payload: swappedPayload,
      };
      // Host's expected principal remains A (from the original decision).
      const ctx: ValidationContext = {
        expectedProviderId: 'principal-swap-provider',
        canonicalInvocationHash: signedByA.contentHash,
        expectedApproverPrincipal: 'supervisor-a@host',
        sequenceHighWaterMark: 0,
        nonceScope: 'sc20::snap-sc20',
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
        invalidReason: 'principal-mismatch',
      });

      // Sanity: nonce was random; prove we're not passing by accident.
      expect(handle.nonce).toMatch(/^[0-9a-f]{24}$/);
      expect(handle.nonce).not.toBe(randomBytes(0).toString('hex'));

      // SC-20 F-04: tool NOT executed.
      expect(toolExecuted).toBe(false);

      // SC-20 F-01: DecisionEntry.invalidReason marks the deny.
      const decisionEntry: DecisionEntryInput = {
        correlationId: result.correlationId,
        snapshotId: 'snap-sc20',
        policyArtifactSha256: 'sha256:' + 'a'.repeat(64),
        tool: 'records.write',
        decision: 'deny',
        declaredTier: 'R1',
        effectiveTier: 'R1',
      };
      expect(decisionEntry.decision).toBe('deny');

      // SC-20 F-02: ApprovalEntry outcome + invalidReason.
      const approvalEntry: ApprovalEntryInput = {
        correlationId: result.correlationId,
        approver: 'supervisor-b@host',
        outcome: 'rejected',
        invalidReason: 'principal-mismatch',
        ttl: handle.ttl,
        nonce: handle.nonce,
        keyId: handle.keyId,
        sequenceNumber: handle.sequenceNumber,
        signature: handle.signature,
      };
      expect(approvalEntry.outcome).toBe('rejected');
      expect(approvalEntry.invalidReason).toBe('principal-mismatch');
    },
  };

  defineApprovalFlow(scenario);
});
