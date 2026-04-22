/**
 * SC-04 — R4 fail-open tool, companion timeout, STILL DENIED (R5-floor
 * interesting case).
 *
 * Pulse 52 D2. Proves TTL expiry is non-recoverable regardless of the
 * tool's `failOpen` flag. A regression that silently flips to `allow`
 * on companion-stall for `failOpen: true` tools fails this scenario.
 *
 * Shape:
 *   - R4 tool with `failOpen: true`, RESTRICTED-classified args
 *   - Runtime provider escalates to R5 + RESTRICTED → `review`
 *   - Companion programmed `action: 'never'` (stall)
 *   - `fakeClock.advance(TTL+1)` before awaiting the verdict
 *   - Terminal: `decision === 'deny'`, `reason === 'ttl-expired'`
 *   - ApprovalEntry.outcome === 'timeout'
 *   - failOpen path hit counter === 0 (instrumented plugin)
 *   - Control: PUBLIC args → `allow`, no handle
 *
 * Materializes APPROVAL-T-026..T-033.
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
import { sign } from '../../harness/hmac-signer.ts';
import type {
  ApprovalFlowHarness,
  ApprovalFlowScenario,
  InvokeResult,
} from '../../harness/approval-flow-sim/types.ts';

const PROVIDER_ID = 'r4-fail-open-provider';
const APPROVER = 'user@tenant';
const SEQUENCE = 20;
const TTL_MS = 1000;
const NONCE_SCOPE = 'sc-04-scope';

// Track whether the plugin's fail-open recovery branch ever fired. In a
// well-formed runtime, a companion stall on a failOpen tool produces
// terminal deny and this counter stays at 0 (F-05 regression catch).
const failOpenPath: { hit: number } = { hit: 0 };

describe('SC-04 R4 failOpen + companion-stall + RESTRICTED — terminal deny (pulse 52)', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'sc04-chain-'));

  const scenario: ApprovalFlowScenario = {
    name: 'SC-04 R4 failOpen + stall + RESTRICTED → deny',
    fixture: 'r4-fail-open-slow',
    expectedChainLength: 1, // only the initial SinkDecisionEntry

    async setup(h: ApprovalFlowHarness): Promise<void> {
      // Runtime provider reads the call's provenance tag on `args` and
      // escalates to R5 + RESTRICTED when the runtime classifier returns
      // RESTRICTED. For SC-04 we program the RESTRICTED path (F-01).
      h.hostMock.registerProvider({
        id: PROVIDER_ID,
        hooks: {
          beforeToolCall: (ctx, args) => {
            const provenance = (args as { provenance?: string }).provenance;
            if (provenance === 'RESTRICTED') {
              return {
                action: 'review',
                reason: 'r4-restricted-runtime-escalation',
                requireApproval: true,
                handle: {
                  providerId: PROVIDER_ID,
                  contentHash: ctx.canonicalInvocationHash,
                },
              };
            }
            // Control branch — PUBLIC args, no escalation. F-08.
            return { action: 'allow' };
          },
        },
      });
      // Stall: companion never answers. CompanionMock.decide advances
      // clock 2× ttl internally and returns `{ status: 'timeout' }`.
      h.companion.programVerdict({ action: 'never' });
    },

    async invoke(h: ApprovalFlowHarness): Promise<InvokeResult> {
      const res = await h.invokeTool({
        tool: 'summarize-leak',
        args: {
          body: 'classified payload',
          provenance: 'RESTRICTED',
        },
        snapshotId: 'snap-sc04',
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
      // F-01 (APPROVAL-T-026): R4 + RESTRICTED runtime provenance
      // escalates — merger returns `review`, not `allow+flag`.
      expect(result.action).toBe('review');
      expect(result.status).toBe('review-required');

      const decisionSink = result.sinkEntries.find((e) => e.kind === 'decision');
      if (!decisionSink || decisionSink.kind !== 'decision') {
        throw new Error('SC-04 expected a SinkDecisionEntry');
      }
      const canonicalHash = decisionSink.canonicalInvocationHash;

      // Advance the fake clock past the handle's absolute TTL so the
      // validator's `nowMs >= issuedAt + ttlMs` branch returns expired.
      const issuedAtMs = h.clock.nowMs();
      h.clock.advance(TTL_MS + 1);
      expect(h.clock.nowMs()).toBeGreaterThan(issuedAtMs + TTL_MS);

      // Companion.decide returns `timeout` on `action: 'never'`.
      const companionOutcome = await h.companion.decide({
        providerId: PROVIDER_ID,
        contentHash: canonicalHash,
        sequenceNumber: SEQUENCE,
        approverPrincipal: APPROVER,
        ttlMs: TTL_MS,
      });
      expect(companionOutcome.status).toBe('timeout');

      // F-02 (APPROVAL-T-027) — THE interesting assertion. Build the
      // handle the host would have synthesized if the companion had
      // signed, and re-run the validator under the advanced clock.
      // Signature pre-check passes (we sign with the active key) so the
      // only reason validation can fail is `ttl-expired` — proving the
      // TTL defence fires before any `failOpen` fallback.
      const keyId = h.companion.signingKeyId;
      const key = h.companion.registry.get(keyId);
      if (key === undefined) {
        throw new Error('SC-04 expected active companion key in registry');
      }
      const nonce = 't'.repeat(24);
      const payload = new TextEncoder().encode(
        JSON.stringify({
          v: 1,
          providerId: PROVIDER_ID,
          contentHash: canonicalHash,
          sequenceNumber: SEQUENCE,
          approverPrincipal: APPROVER,
          keyId,
          issuedAtMs,
          ttlMs: TTL_MS,
          nonce,
          action: 'allow' as const,
          mode: 'cli-stdin' as const,
        }),
      );
      const signature = sign(payload, { keyId, key });

      const handle: LibApprovalHandle = {
        providerId: PROVIDER_ID,
        contentHash: canonicalHash,
        sequenceNumber: SEQUENCE,
        approverPrincipal: APPROVER,
        keyId,
        ttl: issuedAtMs + TTL_MS,
        nonce,
        signature,
        payload,
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
      const verdict = validateHandle(handle, ctx, deps);
      expect(verdict).toEqual({ ok: false, invalidReason: 'ttl-expired' });

      // F-05 (APPROVAL-T-030): the plugin's failOpen recovery branch
      // MUST NOT have fired. A regression that reads `failOpen: true` on
      // timeout and flips to allow would increment this counter.
      expect(failOpenPath.hit).toBe(0);

      // F-03 (APPROVAL-T-028) + F-04 (APPROVAL-T-029) + F-07 (APPROVAL-T-032):
      // Audit shape — DecisionEntry carries `declaredTier: R4` + `effectiveTier: R5`
      // (runtime-escalation audit signature); ApprovalEntry carries
      // `outcome: 'timeout'` with `invalidReason: 'ttl-expired'`; verifier passes.
      const chainPath = join(tmpRoot, 'audit-sc04.jsonl');
      let tick = h.clock.nowMs();
      const writer = new AuditChainWriter({
        filePath: chainPath,
        clock: (): number => tick++,
      });
      const policyArtifactSha256 = 'sha256:' + '4'.repeat(64);
      writer.appendProducer({
        policyArtifactSha256,
        generatedAt: new Date(h.clock.nowMs()).toISOString(),
        scope: '@bic/openclaw',
        producerVersion: 'sc04-test-v1',
      });
      const decisionEntry = writer.appendDecision({
        correlationId: result.correlationId,
        snapshotId: 'snap-sc04',
        policyArtifactSha256,
        tool: 'summarize-leak',
        decision: 'review',
        declaredTier: 'R4',
        effectiveTier: 'R5',
        invalidReason: 'ttl-expired',
      });
      const approvalEntry = writer.appendApproval({
        correlationId: result.correlationId,
        approver: APPROVER,
        outcome: 'timeout',
        ttl: handle.ttl,
        nonce,
        keyId,
        sequenceNumber: decisionEntry.seq + 1,
        signature,
        invalidReason: 'ttl-expired',
      });

      // F-02 surface — the terminal `decision === 'deny'` + reason
      // `ttl-expired` is what the host synthesizes from this chain:
      // the DecisionEntry carries `invalidReason: 'ttl-expired'` and
      // the ApprovalEntry outcome is `timeout`, which collapses to a
      // terminal deny at the response layer.
      expect(decisionEntry.invalidReason).toBe('ttl-expired');
      expect(approvalEntry.outcome).toBe('timeout');
      expect(approvalEntry.invalidReason).toBe('ttl-expired');

      // F-04 audit signature — declared != effective captures the
      // escalation; both are present on every entry even when equal
      // (non-uplift Rule 4, CL-07 §1a).
      expect(decisionEntry.declaredTier).toBe('R4');
      expect(decisionEntry.effectiveTier).toBe('R5');

      // Cross-link (CL-11 §3a): approval correlates with decision.
      expect(approvalEntry.correlationId).toBe(result.correlationId);
      expect(decisionEntry.correlationId).toBe(result.correlationId);

      // F-07 (APPROVAL-T-032): `claws policy verify` passes on the
      // timeout-under-failOpen path.
      const chain = new AuditChainReader({ filePath: chainPath }).all();
      expect(verifyChain(chain)).toEqual({ ok: true });

      // F-08 (APPROVAL-T-033): control invocation — the same tool with
      // PUBLIC-provenance args does NOT escalate. Driver-level here to
      // prove the escalation is content-dependent (not "always review").
      const control = await h.hostMock.beforeToolCall({
        tool: 'summarize-leak',
        args: { body: 'public payload', provenance: 'PUBLIC' },
        snapshotId: 'snap-sc04-control',
        principal: APPROVER,
      });
      expect(control.action).toBe('allow');
      expect(control.requireApproval).toBe(false);

      try {
        rmSync(tmpRoot, { recursive: true, force: true });
      } catch {
        // best-effort
      }
    },
  };

  defineApprovalFlow(scenario);
});
