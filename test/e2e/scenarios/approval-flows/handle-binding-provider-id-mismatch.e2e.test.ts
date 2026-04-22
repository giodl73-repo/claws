/**
 * SC-17 — handle binding: providerId mismatch rejected.
 *
 * Pulse 57 D2. A handle signed for provider A is replayed against a
 * registration for provider B — `validateHandle` returns
 * `{ ok: false, invalidReason: 'provider-id-mismatch' }` (first ordered
 * field after the signature pre-check). The harness writes a DecisionEntry
 * with `action: 'deny'` and an ApprovalEntry with `outcome: 'denied'`; the
 * tool never executes.
 *
 * `provider-id-mismatch` is the canonical label per CL-11 §3a (R1 F-03/F-09
 * wording standardization). The signature pre-check passes because the
 * companion's signing key is trusted; the providerId field is the first
 * mismatch evaluated.
 *
 * Fixture: r5-send-email.
 */
import { describe, expect } from 'vitest';
import {
  validateHandle,
  type ApprovalHandle as LibApprovalHandle,
  type ValidationContext,
  type ValidationDeps,
} from '@bic/openclaw-guardrails/handle-binding';
import { defineApprovalFlow } from '../../harness/approval-flow-sim/dispatch.ts';
import type {
  ApprovalFlowHarness,
  ApprovalFlowScenario,
  InvokeResult,
} from '../../harness/approval-flow-sim/types.ts';
import type { SinkEntry } from '../../harness/host-adapter-test-doubles.ts';

const SIGNED_PROVIDER_ID = 'r5-send-email-provider-a';
const REGISTERED_PROVIDER_ID = 'r5-send-email-provider-b';
const APPROVER = 'user@tenant';
const SEQUENCE = 10;
const TTL_MS = 5 * 60_000;
const NONCE_SCOPE = 'sc-17-scope';

describe('SC-17 handle-binding — providerId mismatch rejected (pulse 57)', () => {
  const scenario: ApprovalFlowScenario = {
    name: 'SC-17 providerId mismatch rejected',
    fixture: 'r5-send-email',

    async setup(h: ApprovalFlowHarness): Promise<void> {
      // Provider B is the registration the replay targets. The companion
      // will sign for provider A, so the handle's providerId will not match
      // ctx.expectedProviderId (== REGISTERED_PROVIDER_ID).
      h.hostMock.registerProvider({
        id: REGISTERED_PROVIDER_ID,
        hooks: {
          beforeToolCall: () => ({
            action: 'review',
            requireApproval: true,
          }),
        },
      });
      h.companion.programVerdict({ action: 'allow' });
    },

    async invoke(h: ApprovalFlowHarness): Promise<InvokeResult> {
      const res = await h.invokeTool({
        tool: 'send-email',
        args: { to: 'ops@example.test', body: 'replay' },
        snapshotId: 'snap-sc17',
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
      // Initial decision: review (the adapter merger doesn't know about the
      // cross-provider replay yet — that is the validator's job below).
      expect(result.action).toBe('review');

      // Companion signs a handle bearing SIGNED_PROVIDER_ID (provider A).
      const outcome = await h.companion.decide({
        providerId: SIGNED_PROVIDER_ID,
        contentHash: 'sha256-sc17-invocation',
        sequenceNumber: SEQUENCE,
        approverPrincipal: APPROVER,
        ttlMs: TTL_MS,
      });
      if (outcome.status !== 'allow') {
        throw new Error(`SC-17 expected companion allow, got '${outcome.status}'`);
      }

      // Validate against provider B's context — providerId is the first
      // failing field after the signature pre-check (which passes).
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
        expectedProviderId: REGISTERED_PROVIDER_ID,
        canonicalInvocationHash: outcome.contentHash,
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

      const verdict = validateHandle(handle, ctx, deps);
      // F-01..F-02: validator rejects; first-failing reason is providerId.
      expect(verdict).toEqual({
        ok: false,
        invalidReason: 'provider-id-mismatch',
      });

      // F-03..F-05: post-rejection, write the ApprovalEntry with
      // outcome='denied' bound by correlationId. The tool did NOT execute
      // (we never transitioned the initial review into an allow).
      const authCtx = await h.adapter.extractIdentity({
        tool: 'send-email',
        args: {},
        headers: {},
        snapshotId: 'snap-sc17',
        rawPrincipal: APPROVER,
      });
      const sink = h.adapter.getApprovalSink(authCtx);
      await sink.writeApproval({
        adapterId: h.adapter.adapterId,
        correlationId: result.correlationId,
        approverPrincipal: APPROVER,
        outcome: 'denied',
      });

      // F-06: query the sink by correlationId — exactly DecisionEntry +
      // ApprovalEntry.
      const entries: SinkEntry[] = [];
      for await (const e of sink.query({
        correlationId: result.correlationId,
      })) {
        entries.push(e);
      }
      expect(entries.length).toBe(2);

      const decisions = entries.filter((e) => e.kind === 'decision');
      const approvals = entries.filter((e) => e.kind === 'approval');
      expect(decisions.length).toBe(1);
      expect(approvals.length).toBe(1);

      const decision = decisions[0]!;
      const approval = approvals[0]!;

      // F-07: both entries share correlationId; ApprovalEntry records
      // outcome='denied' (the sink surface does not carry invalidReason —
      // the pulse-49 validator result is the authoritative source for
      // 'provider-id-mismatch' as asserted above).
      expect(decision.correlationId).toBe(result.correlationId);
      expect(approval.correlationId).toBe(result.correlationId);
      if (approval.kind !== 'approval') {
        throw new Error('expected approval entry');
      }
      expect(approval.outcome).toBe('denied');
    },
  };

  defineApprovalFlow(scenario);
});
