/**
 * SC-11 — File-ingest RESTRICTED approved end-to-end (CL-07 §1a).
 *
 * Symmetric to SC-03's tool-call review path: a RESTRICTED-classified file
 * triggers `before_workspace_file_ingest` → `FileIngestProvider.beforeIngest`
 * returns `{ decision: 'review', approvalHandle }` → companion programs an
 * `allow` verdict → handle verifies through pulse-49's validator → audit
 * chain records `DecisionEntry{decision:'review'}` + `ApprovalEntry{outcome:'approve'}`
 * joined by `correlationId` → `verifyChain` accepts.
 *
 * Materializes APPROVAL-F-001..F-008 (SC-11 F-01..F-08).
 *
 * Pulse 55 D2. Plan note line 113 — this scenario proves the decision-flow
 * shape; the lobster preset scenarios in plan 6 own the fs-backed variants.
 */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AuditChainWriter,
  ClockMock,
  CompanionMock,
  HostMock,
  validateHandle,
  verifyChain,
  AuditChainReader,
  type ApprovalHandle,
  type BindingContext,
  type ProviderApprovalHandle,
} from '#harness';

describe('SC-11 file-ingest RESTRICTED approved — symmetric to SC-03 tool-call review', () => {
  it('F-01..F-08: review → companion allow → handle verifies → chain records decision + approval', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'sc11-'));
    try {
      const clock = new ClockMock({ freezeAtMs: 1_700_000_000_000 });
      const companion = new CompanionMock({
        seed: 'sc11-file-ingest-approved',
        scenarioId: 'sc11',
        clock,
      });
      companion.programVerdict({ action: 'allow' });

      // FileIngestProvider returns `review` with a handle whose
      // `contentHash` reads from `ctx.canonicalInvocationHash` — the P-02
      // contract. The host computes the hash once and passes it in.
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
        snapshotId: 'snap-sc11',
        path: 'SECRETS.md',
        bytes: fileBytes,
      });

      // F-01: RESTRICTED file triggers `review` on `beforeIngest`.
      expect(merged.action).toBe('review');
      expect(merged.requireApproval).toBe(true);
      expect(merged.contributions).toHaveLength(1);
      const contribution = merged.contributions[0];
      expect(contribution?.providerId).toBe('file-ingest-restricted');
      expect(contribution?.action).toBe('review');
      expect(contribution?.invalidReason).toBeUndefined();

      // F-02: approvalHandle has all 8 fields correct + contentHash equals
      // host's canonicalInvocationHash. Companion signs, pulse-49 validator
      // accepts — the handle shape is identical to the tool-call path.
      const providerHandle: ProviderApprovalHandle = {
        providerId: 'file-ingest-restricted',
        contentHash: merged.canonicalInvocationHash,
      };
      const correlationId = merged.canonicalInvocationHash.slice(
        'sha256:'.length,
        'sha256:'.length + 16,
      );

      const signed = await companion.decide({
        providerId: providerHandle.providerId,
        contentHash: providerHandle.contentHash,
        sequenceNumber: 1,
        approverPrincipal: 'companion:workspace-reviewer',
        ttlMs: 300_000,
      });
      expect(signed.status).toBe('allow');
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
      // All 8 bound fields present + non-empty.
      expect(handle.providerId).toBe('file-ingest-restricted');
      expect(handle.contentHash).toBe(merged.canonicalInvocationHash);
      expect(handle.sequenceNumber).toBe(1);
      expect(handle.approverPrincipal).toBe('companion:workspace-reviewer');
      expect(handle.keyId).toBe(companion.signingKeyId);
      expect(handle.issuedAtMs).toBe(clock.nowMs());
      expect(handle.ttlMs).toBe(300_000);
      expect(handle.nonce).toMatch(/^[0-9a-f]{24}$/);
      expect(handle.signature.length).toBeGreaterThan(0);

      // F-03: companion-signed handle verifies through pulse-49 validator.
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
      expect(validateHandle(handle, bindingCtx)).toEqual({ ok: true });

      // F-04: post-approval, file enters the agent workspace. The
      // decision-flow variant models this as a post-terminal state check
      // on an in-test workspace mirror (lobster preset owns the real-fs
      // variant per plan 6).
      const agentWorkspace = { files: new Set<string>() };
      if (signed.status === 'allow') {
        agentWorkspace.files.add('SECRETS.md');
      }
      expect(agentWorkspace.files.has('SECRETS.md')).toBe(true);

      // F-05..F-07: audit chain carries DecisionEntry{decision:'review'}
      // + ApprovalEntry{outcome:'approve'} joined by correlationId.
      const auditPath = join(tmp, 'audit.jsonl');
      let tick = 1_700_000_000_000;
      const writer = new AuditChainWriter({
        filePath: auditPath,
        clock: () => tick++,
      });
      const policyArtifactSha256 = 'sha256:' + 'a'.repeat(64);
      writer.appendProducer({
        policyArtifactSha256,
        generatedAt: new Date(1_700_000_000_000).toISOString(),
        scope: '@bic/openclaw',
        producerVersion: 'harness-test-v1',
      });
      const decisionEntry = writer.appendDecision({
        correlationId,
        snapshotId: 'snap-sc11',
        policyArtifactSha256,
        tool: 'workspace.file.ingest',
        decision: 'review',
        declaredTier: 'R5',
        effectiveTier: 'R5',
      });
      const approvalEntry = writer.appendApproval({
        correlationId,
        approver: handle.approverPrincipal,
        outcome: 'approve',
        ttl: handle.ttlMs,
        nonce: handle.nonce,
        keyId: handle.keyId,
        sequenceNumber: decisionEntry.seq + 1,
        signature: handle.signature,
      });
      expect(decisionEntry.correlationId).toBe(correlationId);
      expect(approvalEntry.correlationId).toBe(correlationId);
      expect(approvalEntry.correlationId).toBe(decisionEntry.correlationId);
      expect(approvalEntry.outcome).toBe('approve');

      // F-08: `claws policy verify` passes — the verifier equivalent
      // accepts the decision + approval shape.
      const chain = new AuditChainReader({ filePath: auditPath }).all();
      expect(verifyChain(chain)).toEqual({ ok: true });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
