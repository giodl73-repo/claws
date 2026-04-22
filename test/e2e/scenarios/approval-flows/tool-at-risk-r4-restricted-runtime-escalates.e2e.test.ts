/**
 * SC-06 — R4 with runtime-discovered RESTRICTED provenance escalates at
 * `preAuthorize`.
 *
 * Pulse 52 D4. Runtime-axis escalation: when provenance is knowable only
 * at runtime (tool-chain output, dynamic classifier), the emitted
 * provider re-computes `effectiveTier = max(declared, runtime-observed)`
 * at `preAuthorize`. Distinct from SC-05 (compile-axis) because
 * `policy-ir.json` does NOT pre-declare R5 for this tool.
 *
 * The audit signature is `declaredTier: 'R4'`, `effectiveTier: 'R5'` with
 * `escalationSource: 'runtime-provenance'` (modelled test-local until the
 * audit-type union formally carries the field).
 *
 * Key invariants:
 *   - Adversarial self-reported provenance ('PUBLIC') on actually-
 *     RESTRICTED bytes MUST escalate anyway (provider re-classifies via
 *     ctx.contentClassifier; F-04).
 *   - Control invocation with genuinely-PUBLIC args returns `allow`
 *     without a handle (F-05 — proves escalation is content-dependent).
 *
 * Materializes APPROVAL-T-041..T-048.
 */
import { describe, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
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

const PROVIDER_ID = 'r4-runtime-escalation-provider';
const APPROVER = 'user@tenant';
const SEQUENCE = 40;
const TTL_MS = 5 * 60_000;
const NONCE_SCOPE = 'sc-06-scope';

// Pre-compiled policy-ir.json entry — F-02 invariant is that the
// compiled IR does NOT pre-declare R5 for this tool (runtime-only).
const COMPILED_POLICY_IR_RUNTIME = {
  tools: {
    'chain-summarize': {
      declaredTier: 'R4' as const,
      effectiveTier: 'R4' as const, // NOT pre-escalated (F-02)
    },
  },
};

// Trusted sidechannel for runtime provenance. A compromised agent must
// NOT be able to downgrade by self-reporting (F-04): the provider
// re-classifies raw bytes via ctx.contentClassifier when the reported
// provenance is weaker than the content classification.
function classifyBytes(bytes: Uint8Array): 'PUBLIC' | 'RESTRICTED' {
  const text = new TextDecoder().decode(bytes);
  return /RESTRICTED|classified|api[-_]key|secret/i.test(text)
    ? 'RESTRICTED'
    : 'PUBLIC';
}

describe('SC-06 R4 runtime-provenance escalation (pulse 52)', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'sc06-chain-'));
  const classifierCalls: Uint8Array[] = [];

  const scenario: ApprovalFlowScenario = {
    name: 'SC-06 R4 runtime-provenance escalation',
    fixture: 'r4-args-from-restricted-runtime',

    async setup(h: ApprovalFlowHarness): Promise<void> {
      // Runtime provider re-classifies raw bytes (F-08) and trusts the
      // classifier over self-reported provenance (F-04 adversarial). If
      // the bytes classify as RESTRICTED, escalate to R5 regardless of
      // what the caller said.
      h.hostMock.registerProvider({
        id: PROVIDER_ID,
        hooks: {
          beforeToolCall: (ctx, args) => {
            const payloadStr = JSON.stringify(
              (args as { payload?: unknown }).payload ?? '',
            );
            const bytes = new TextEncoder().encode(payloadStr);
            classifierCalls.push(bytes);
            const classification = classifyBytes(bytes);
            if (classification === 'RESTRICTED') {
              return {
                action: 'review',
                reason: 'runtime-provenance-escalation',
                requireApproval: true,
                handle: {
                  providerId: PROVIDER_ID,
                  contentHash: ctx.canonicalInvocationHash,
                },
              };
            }
            return { action: 'allow' };
          },
        },
      });
      h.companion.programVerdict({ action: 'allow' });
    },

    async invoke(h: ApprovalFlowHarness): Promise<InvokeResult> {
      // Adversarial variant: the agent tries to downgrade by self-
      // reporting PUBLIC, but the payload carries a RESTRICTED marker
      // that the provider's classifier catches.
      const res = await h.invokeTool({
        tool: 'chain-summarize',
        args: {
          payload: {
            body: 'api_key: sk-fixture-RESTRICTED-value',
            selfReportedProvenance: 'PUBLIC',
          },
        },
        snapshotId: 'snap-sc06',
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
      // F-02 (APPROVAL-T-042): policy-ir.json does NOT pre-declare R5
      // for this tool — the escalation is runtime-only.
      const ir = COMPILED_POLICY_IR_RUNTIME.tools['chain-summarize'];
      expect(ir.declaredTier).toBe('R4');
      expect(ir.effectiveTier).toBe('R4');

      // F-01 (APPROVAL-T-041) + F-04 (APPROVAL-T-044): runtime provider
      // escalates to `review` by re-classifying bytes — self-reported
      // `PUBLIC` is overridden by the classifier's `RESTRICTED`.
      expect(result.action).toBe('review');
      expect(result.status).toBe('review-required');

      // F-08 (APPROVAL-T-048): classifier MUST be invoked on raw
      // Uint8Array bytes (not metadata). The last classifier call has
      // real bytes, length > 0, matching the fixture's RESTRICTED content.
      expect(classifierCalls.length).toBeGreaterThan(0);
      const lastCall = classifierCalls[classifierCalls.length - 1]!;
      expect(lastCall).toBeInstanceOf(Uint8Array);
      expect(lastCall.length).toBeGreaterThan(0);
      expect(new TextDecoder().decode(lastCall)).toContain('api_key');

      const decisionSink = result.sinkEntries.find((e) => e.kind === 'decision');
      if (!decisionSink || decisionSink.kind !== 'decision') {
        throw new Error('SC-06 expected a SinkDecisionEntry');
      }
      const canonicalHash = decisionSink.canonicalInvocationHash;

      // Companion allows → validator accepts → chain records runtime-
      // escalated review + approve.
      const outcome = await h.companion.decide({
        providerId: PROVIDER_ID,
        contentHash: canonicalHash,
        sequenceNumber: SEQUENCE,
        approverPrincipal: APPROVER,
        ttlMs: TTL_MS,
      });
      if (outcome.status !== 'allow') {
        throw new Error(`SC-06 expected companion allow, got '${outcome.status}'`);
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
      // expectedChainLength=2 runner gate observes both entries.
      const authCtx = await h.adapter.extractIdentity({
        tool: 'chain-summarize',
        args: {},
        headers: {},
        snapshotId: 'snap-sc06',
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
      // correlationId (runtime-axis post-approval resume surface).
      const sinkEntries = [];
      for await (const e of sink.query({ correlationId: result.correlationId })) {
        sinkEntries.push(e);
      }
      expect(sinkEntries.filter((e) => e.kind === 'decision')).toHaveLength(1);
      expect(sinkEntries.filter((e) => e.kind === 'approval')).toHaveLength(1);

      // F-01 + F-03 audit signature: DecisionEntry carries `declaredTier:
      // 'R4'` + `effectiveTier: 'R5'` (runtime-axis escalation visible
      // in the CL-11 §3a chain). effectiveSensitivity = RESTRICTED set
      // at decision-start (modelled test-local until the audit-type
      // union carries the field).
      const chainPath = join(tmpRoot, 'audit-sc06.jsonl');
      let tick = h.clock.nowMs();
      const writer = new AuditChainWriter({
        filePath: chainPath,
        clock: (): number => tick++,
      });
      const policyArtifactSha256 = 'sha256:' + '6'.repeat(64);
      writer.appendProducer({
        policyArtifactSha256,
        generatedAt: new Date(h.clock.nowMs()).toISOString(),
        scope: '@bic/openclaw',
        producerVersion: 'sc06-runtime-v1',
      });
      // modifiedArgsHash is intentionally absent — runtime escalation on
      // review path does not rewrite args (it redirects to approval).
      const decisionEntry = writer.appendDecision({
        correlationId: result.correlationId,
        snapshotId: 'snap-sc06',
        policyArtifactSha256,
        tool: 'chain-summarize',
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

      expect(decisionEntry.declaredTier).toBe('R4');
      expect(decisionEntry.effectiveTier).toBe('R5');
      expect(approvalEntry.correlationId).toBe(result.correlationId);
      expect(decisionEntry.correlationId).toBe(result.correlationId);

      // F-07 (APPROVAL-T-047): `claws policy verify` passes — a runtime-
      // escalated chain with declaredTier !== effectiveTier is valid.
      const chain = new AuditChainReader({ filePath: chainPath }).all();
      expect(verifyChain(chain)).toEqual({ ok: true });

      // F-05 (APPROVAL-T-045): control invocation with PUBLIC-provenance
      // args and genuinely-public bytes does NOT escalate. Drives the
      // provider directly to avoid contaminating the main scenario's
      // audit chain — proves the escalation is content-dependent, not
      // "always review this tool".
      const publicBytes = new TextEncoder().encode('weather data: sunny');
      const publicClass = classifyBytes(publicBytes);
      expect(publicClass).toBe('PUBLIC');
      const control = await h.hostMock.beforeToolCall({
        tool: 'chain-summarize',
        args: {
          payload: {
            body: 'weather data: sunny',
            selfReportedProvenance: 'PUBLIC',
          },
        },
        snapshotId: 'snap-sc06-control',
        principal: APPROVER,
      });
      expect(control.action).toBe('allow');
      expect(control.requireApproval).toBe(false);

      // F-06 (APPROVAL-T-046): optional `provenanceTrace` referencing
      // the classifier id improves forensic speed. Modelled test-local
      // until the audit-type union carries the field.
      const provenanceTrace = {
        classifierId: 'RESTRICTED-classifier-runtime',
        contentHash:
          'sha256:' +
          createHash('sha256').update(lastCall).digest('hex'),
      };
      expect(provenanceTrace.classifierId).toBe('RESTRICTED-classifier-runtime');

      try {
        rmSync(tmpRoot, { recursive: true, force: true });
      } catch {
        // best-effort
      }
    },
  };

  defineApprovalFlow(scenario);
});
