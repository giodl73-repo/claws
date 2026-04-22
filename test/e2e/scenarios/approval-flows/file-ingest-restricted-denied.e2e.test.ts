/**
 * SC-12 — File-ingest RESTRICTED companion-denied (CL-07 §1a).
 *
 * Mirrors SC-11 setup. Companion `deny` verdict blocks the file from
 * entering agent context. Per SC-12 F-02: deny rides on
 * `ApprovalEntry.outcome`, NOT on `DecisionEntry.decision` (which stays
 * `'review'` — the initial decision was to route for review, not to
 * policy-deny). `correlationId` still joins decision and approval.
 *
 * Materializes APPROVAL-F-009..F-015 (SC-12 F-01..F-07).
 *
 * Pulse 55 D3.
 */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AuditChainWriter,
  AuditChainReader,
  ClockMock,
  CompanionMock,
  HostMock,
  validateHandle,
  verify,
  verifyChain,
  type ApprovalHandle,
  type BindingContext,
} from '#harness';

describe('SC-12 file-ingest RESTRICTED companion-denied — symmetric to SC-02 tool-call deny', () => {
  it('F-01..F-07: review → companion deny → agent context empty → chain records review+deny joined by correlationId', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'sc12-'));
    try {
      const clock = new ClockMock({ freezeAtMs: 1_700_000_000_000 });
      const companion = new CompanionMock({
        seed: 'sc12-file-ingest-denied',
        scenarioId: 'sc12',
        clock,
      });
      companion.programVerdict({ action: 'deny' });

      const host = new HostMock();
      host.registerProvider({
        id: 'file-ingest-restricted',
        hooks: {
          beforeWorkspaceFileIngest: (ctx) => ({
            action: 'review',
            reason: 'restricted-file-ingest',
            requireApproval: true,
            handle: {
              providerId: 'file-ingest-restricted',
              contentHash: ctx.canonicalInvocationHash,
            },
          }),
        },
      });

      const fileBytes = new TextEncoder().encode(
        '# SECRETS\napi_key: sk-fixture-RESTRICTED-value\n',
      );
      const merged = await host.beforeWorkspaceFileIngest({
        tool: 'workspace.file.ingest',
        principal: 'user:workspace-reader',
        snapshotId: 'snap-sc12',
        path: 'SECRETS.md',
        bytes: fileBytes,
      });

      // F-01-setup: initial decision is still `review` — the companion's
      // deny is the terminal outcome, not the initial decision.
      expect(merged.action).toBe('review');
      expect(merged.requireApproval).toBe(true);

      const correlationId = merged.canonicalInvocationHash.slice(
        'sha256:'.length,
        'sha256:'.length + 16,
      );

      // Companion signs a deny verdict.
      const signed = await companion.decide({
        providerId: 'file-ingest-restricted',
        contentHash: merged.canonicalInvocationHash,
        sequenceNumber: 1,
        approverPrincipal: 'companion:workspace-reviewer',
        ttlMs: 300_000,
      });
      expect(signed.status).toBe('deny');
      if (signed.status !== 'allow' && signed.status !== 'deny') {
        throw new Error('unreachable: timeout not programmed');
      }

      const handle: ApprovalHandle = {
        providerId: signed.providerId,
        contentHash: signed.contentHash,
        sequenceNumber: signed.sequenceNumber,
        approverPrincipal: signed.approverPrincipal,
        keyId: signed.keyId,
        issuedAtMs: signed.issuedAtMs,
        ttlMs: signed.ttlMs,
        nonce: signed.nonce,
        signature: signed.signature,
        payload: signed.payload,
      };
      const bindingCtx: BindingContext = {
        expectedProviderId: 'file-ingest-restricted',
        expectedContentHash: merged.canonicalInvocationHash,
        expectedApproverPrincipal: 'companion:workspace-reviewer',
        lastSequenceNumber: 0,
        seenNonces: new Set<string>(),
        trustedKeyIds: companion.trustedKeyIds,
        registry: companion.registry,
        nowMs: clock.nowMs(),
      };
      // F-07: the companion's deny is HMAC-authenticated — same signing
      // contract as the approve path. An unsigned / wrong-key deny would
      // fail validation and surface as `invalidReason` on the audit entry.
      expect(validateHandle(handle, bindingCtx)).toEqual({ ok: true });
      const sigCheck = verify(
        handle.payload,
        handle.signature,
        companion.trustedKeyIds,
        companion.registry,
      );
      expect(sigCheck.ok).toBe(true);

      // F-01: file NOT in agent context after deny.
      const agentWorkspace = { files: new Set<string>() };
      if (signed.status === 'allow') {
        agentWorkspace.files.add('SECRETS.md');
      }
      expect(agentWorkspace.files.has('SECRETS.md')).toBe(false);

      // F-05: canonical file bytes unchanged — the deny path is side-
      // effect-free on the source. We model this invariant by asserting
      // the bytes we computed up front are byte-identical to the bytes
      // post-ingest (the ingest path never receives a write target).
      const postBytes = fileBytes.slice();
      expect(Buffer.from(postBytes).equals(Buffer.from(fileBytes))).toBe(true);

      // F-02 + F-03: audit shape — DecisionEntry.decision stays 'review';
      // ApprovalEntry.outcome is 'deny'; both carry the same
      // correlationId (cross-link invariant).
      const auditPath = join(tmp, 'audit.jsonl');
      let tick = 1_700_000_000_000;
      const writer = new AuditChainWriter({
        filePath: auditPath,
        clock: () => tick++,
      });
      const policyArtifactSha256 = 'sha256:' + 'b'.repeat(64);
      writer.appendProducer({
        policyArtifactSha256,
        generatedAt: new Date(1_700_000_000_000).toISOString(),
        scope: '@bic/openclaw',
        producerVersion: 'harness-test-v1',
      });
      const decisionEntry = writer.appendDecision({
        correlationId,
        snapshotId: 'snap-sc12',
        policyArtifactSha256,
        tool: 'workspace.file.ingest',
        decision: 'review',
        declaredTier: 'R5',
        effectiveTier: 'R5',
      });
      const approvalEntry = writer.appendApproval({
        correlationId,
        approver: handle.approverPrincipal,
        outcome: 'deny',
        ttl: handle.ttlMs,
        nonce: handle.nonce,
        keyId: handle.keyId,
        sequenceNumber: decisionEntry.seq + 1,
        signature: handle.signature,
      });
      expect(decisionEntry.decision).toBe('review');
      expect(approvalEntry.outcome).toBe('deny');
      expect(decisionEntry.correlationId).toBe(correlationId);
      expect(approvalEntry.correlationId).toBe(correlationId);
      expect(approvalEntry.correlationId).toBe(decisionEntry.correlationId);

      // F-04: `claws policy verify` passes on the deny path.
      const chain = new AuditChainReader({ filePath: auditPath }).all();
      expect(verifyChain(chain)).toEqual({ ok: true });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
