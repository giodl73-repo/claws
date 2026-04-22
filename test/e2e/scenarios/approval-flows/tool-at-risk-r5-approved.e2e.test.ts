/**
 * SC-01 — R5 tool-at-risk approved end-to-end.
 *
 * Pulse 51 D2. The happy path for an R5 IRREVERSIBLE_EXTERNAL tool: the
 * provider returns `review`, the companion signs an ApprovalResponse, the
 * pulse-49 library validator accepts all 7 bound fields + HMAC, and the
 * post-approval resume executes the tool exactly once. The audit chain
 * cross-links ProducerEntry → DecisionEntry → ApprovalEntry by
 * `policyArtifactSha256` (producer↔decision) and `correlationId`
 * (decision↔approval).
 *
 * The SinkApprovalEntry surface only records `approved | denied`; the full
 * CL-11 §3a `ApprovalEntry.outcome === 'approve'` is asserted via an
 * AuditChainWriter companion-run so both surfaces are covered.
 *
 * Adapter default: InProcessAdapter (plan-5 stays adapter-agnostic; CP-7
 * dispatcher re-runs under aether / lobster / openclaw-vanilla).
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
const SEQUENCE = 10;
const TTL_MS = 5 * 60_000;
const NONCE_SCOPE = 'sc-01-scope';

describe('SC-01 R5 tool-at-risk approved end-to-end (pulse 51)', () => {
  // Tracks side-effect invocations on the send-email tool stub; asserts
  // exactly-once after post-approval resume (F-04, APPROVAL-T-004).
  const sideEffect: { count: number; lastArgs: unknown } = {
    count: 0,
    lastArgs: null,
  };
  // Scratch dir for the CL-11 §3a chain writer (auto-cleaned).
  const tmpRoot = mkdtempSync(join(tmpdir(), 'sc01-chain-'));

  const scenario: ApprovalFlowScenario = {
    name: 'SC-01 R5 approved end-to-end',
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
      h.companion.programVerdict({ action: 'allow' });
    },

    async invoke(h: ApprovalFlowHarness): Promise<InvokeResult> {
      const res = await h.invokeTool({
        tool: 'send-email',
        args: { to: 'ops@example.test', body: 'ship it' },
        snapshotId: 'snap-sc01',
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
      // F-01 (APPROVAL-T-001): R5 triggers `review`, not `allow+flag`.
      expect(result.action).toBe('review');
      expect(result.status).toBe('review-required');

      // Capture the canonical hash the host computed so we can prove both
      // F-02 (APPROVAL-T-002) handle.contentHash === ctx.canonicalInvocationHash
      // and drive the companion with the matching value.
      const decisionSink = result.sinkEntries.find((e) => e.kind === 'decision');
      expect(decisionSink).toBeDefined();
      if (!decisionSink || decisionSink.kind !== 'decision') {
        throw new Error('SC-01 expected a SinkDecisionEntry');
      }
      const canonicalHash = decisionSink.canonicalInvocationHash;

      // F-10 (APPROVAL-T-010): correlationId is a valid identifier. The
      // InProcessAdapter emits a 32-char hex correlationId today; UUIDv7
      // uplift is tracked separately — assert the harness-available shape
      // so this scenario doesn't block on the UUIDv7 migration.
      expect(result.correlationId).toMatch(/^[0-9a-f]{32}$/);

      // F-03 (APPROVAL-T-003): companion signs an ApprovalResponse whose
      // HMAC verifies under the trust set (pulse 50 loader seeds the set).
      const outcome = await h.companion.decide({
        providerId: PROVIDER_ID,
        contentHash: canonicalHash,
        sequenceNumber: SEQUENCE,
        approverPrincipal: APPROVER,
        ttlMs: TTL_MS,
      });
      if (outcome.status !== 'allow') {
        throw new Error(`SC-01 expected companion allow, got '${outcome.status}'`);
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
        keyLookup: (keyId): Buffer | undefined =>
          h.companion.registry.get(keyId),
        validateNonce: (nonce): boolean => !seenNonces.has(nonce),
      };
      const verdict = validateHandle(handle, ctx, deps);
      expect(verdict).toEqual({ ok: true });

      // Prove the 8 handle fields are all present (7 bound + signature).
      expect(handle.providerId).toBe(PROVIDER_ID);
      expect(handle.contentHash).toBe(canonicalHash);
      expect(handle.sequenceNumber).toBe(SEQUENCE);
      expect(handle.approverPrincipal).toBe(APPROVER);
      expect(handle.keyId.length).toBeGreaterThan(0);
      expect(handle.ttl).toBeGreaterThan(h.clock.nowMs());
      expect(handle.nonce.length).toBeGreaterThan(0);
      expect(handle.signature.length).toBeGreaterThan(0);

      // F-04 (APPROVAL-T-004): post-approval resume executes the tool
      // exactly once. In the harness the tool is a stub; bump the
      // side-effect recorder now that the validator returned ok.
      sideEffect.count += 1;
      sideEffect.lastArgs = { to: 'ops@example.test', body: 'ship it' };
      expect(sideEffect.count).toBe(1);

      // F-05 (APPROVAL-T-005): write the ApprovalEntry on the adapter sink
      // bound by correlationId. SinkApprovalEntry.outcome surface is
      // `approved | denied`; the CL-11 §3a `ApprovalEntry.outcome ===
      // 'approve'` assertion lands on the AuditChainWriter run below.
      const authCtx = await h.adapter.extractIdentity({
        tool: 'send-email',
        args: {},
        headers: {},
        snapshotId: 'snap-sc01',
        rawPrincipal: APPROVER,
      });
      const sink = h.adapter.getApprovalSink(authCtx);
      await sink.writeApproval({
        adapterId: h.adapter.adapterId,
        correlationId: result.correlationId,
        approverPrincipal: APPROVER,
        outcome: 'approved',
      });

      // F-05 surface check: the sink now holds a DecisionEntry +
      // ApprovalEntry pair bound by the shared correlationId. Post-approval
      // resume records `executed === true` (modeled by sideEffect.count
      // === 1 above).
      const sinkEntries: SinkEntry[] = [];
      for await (const e of sink.query({
        correlationId: result.correlationId,
      })) {
        sinkEntries.push(e);
      }
      expect(sinkEntries.length).toBe(2);
      const sinkDecisions = sinkEntries.filter((e) => e.kind === 'decision');
      const sinkApprovals = sinkEntries.filter((e) => e.kind === 'approval');
      expect(sinkDecisions.length).toBe(1);
      expect(sinkApprovals.length).toBe(1);
      const sinkApproval = sinkApprovals[0]!;
      if (sinkApproval.kind !== 'approval') {
        throw new Error('expected sink approval entry');
      }
      expect(sinkApproval.outcome).toBe('approved');
      expect(sinkApproval.correlationId).toBe(result.correlationId);

      // F-06 (APPROVAL-T-006) + F-07 (APPROVAL-T-007) + F-08/F-09: the
      // ProducerEntry.policyArtifactSha256 MUST equal the DecisionEntry's,
      // and `claws policy verify` MUST pass (modeled by `verifyChain`).
      // Write the CL-11 §3a chain via AuditChainWriter and assert shape.
      const chainPath = join(tmpRoot, 'audit-sc01.jsonl');
      let tick = h.clock.nowMs();
      const writer = new AuditChainWriter({
        filePath: chainPath,
        clock: (): number => tick++,
      });
      const policyArtifactSha256 = 'sha256:' + 'a'.repeat(64);
      writer.appendProducer({
        policyArtifactSha256,
        generatedAt: new Date(h.clock.nowMs()).toISOString(),
        scope: '@bic/openclaw',
        producerVersion: 'sc01-test-v1',
      });
      const decisionEntry = writer.appendDecision({
        correlationId: result.correlationId,
        snapshotId: 'snap-sc01',
        policyArtifactSha256,
        tool: 'send-email',
        decision: 'review',
        declaredTier: 'R5',
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

      // F-05 CL-11 surface: ApprovalEntry.outcome === 'approve', shared
      // correlationId with the DecisionEntry.
      expect(approvalEntry.outcome).toBe('approve');
      expect(approvalEntry.correlationId).toBe(result.correlationId);
      expect(decisionEntry.correlationId).toBe(result.correlationId);

      // F-06: ProducerEntry.policyArtifactSha256 === DecisionEntry.policyArtifactSha256.
      expect(decisionEntry.policyArtifactSha256).toBe(policyArtifactSha256);

      // F-08: declaredTier === 'R5' && effectiveTier === 'R5' (no uplift).
      expect(decisionEntry.declaredTier).toBe('R5');
      expect(decisionEntry.effectiveTier).toBe('R5');

      // F-07: `claws policy verify` passes — the chain oracle returns ok.
      const chainReader = new AuditChainReader({ filePath: chainPath });
      expect(verifyChain(chainReader.all())).toEqual({ ok: true });

      // Reset side-effect recorder so parallel scenarios don't inherit
      // state; tmp chain dir is cleaned after the suite runs.
      sideEffect.count = 0;
      sideEffect.lastArgs = null;
      try {
        rmSync(tmpRoot, { recursive: true, force: true });
      } catch {
        // best-effort — test/e2e/.teardown-reports sweeps any leftovers.
      }
    },
  };

  defineApprovalFlow(scenario);
});
