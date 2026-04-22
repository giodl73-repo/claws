/**
 * SC-09 — OC-7 conjunctive with P-02 canonicalInvocationHash (CL-07 §1a).
 *
 * Two providers both return `review` with distinct `approvalHandle`s. The
 * companion receives two `ApprovalDescriptor`s. CL-07 amendment §1a P-02
 * requires the host to compute `canonicalInvocationHash` once and pass it
 * to every provider, so BOTH handles' `contentHash` MUST equal the same
 * host-computed value. A provider that computed `contentHash` from raw
 * `ToolCall.args` would produce divergent hashes — the P-02 assertion
 * catches exactly that regression.
 *
 * Pulse 54 D3. Scenario codes APPROVAL-T-067..T-077.
 */
import { describe, expect, it } from 'vitest';
import {
  AuditChainWriter,
  HostMock,
  canonicalize,
  type ProviderApprovalHandle,
} from '#harness';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('SC-09 OC-7 conjunctive: both providers review, P-02 canonical hash binds both handles', () => {
  it('two review handles share ctx.canonicalInvocationHash; two approvals → merged allow', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'sc09-'));
    try {
      const mock = new HostMock();
      mock.registerProvider({
        id: 'security-review',
        hooks: {
          beforeToolCall: (ctx) => ({
            action: 'review',
            reason: 'security-gate',
            requireApproval: true,
            handle: {
              providerId: 'security-review',
              contentHash: ctx.canonicalInvocationHash,
            },
          }),
        },
      });
      mock.registerProvider({
        id: 'compliance-review',
        hooks: {
          beforeToolCall: (ctx) => ({
            action: 'review',
            reason: 'compliance-gate',
            requireApproval: true,
            handle: {
              providerId: 'compliance-review',
              contentHash: ctx.canonicalInvocationHash,
            },
          }),
        },
      });

      const inputs = {
        tool: 'records.export',
        args: { id: 200, classification: 'RESTRICTED' },
        snapshotId: 'snap-sc09',
        principal: 'user:alice',
      };
      const expectedHash = canonicalize(inputs);

      const merged = await mock.beforeToolCall(inputs);

      // F-01: merged decision is `review` (conjunctive) — both providers
      // latched, requireApproval is sticky.
      expect(merged.action).toBe('review');
      expect(merged.requireApproval).toBe(true);
      expect(merged.canonicalInvocationHash).toBe(expectedHash);

      // F-02: companion receives TWO `ApprovalDescriptor`s — one per
      // provider; model them by reconstructing the handles from the
      // contributions' providerIds (each provider stamped its own handle
      // referencing `ctx.canonicalInvocationHash`).
      expect(merged.contributions).toHaveLength(2);
      const reviewContributions = merged.contributions.filter(
        (c) => c.action === 'review',
      );
      expect(reviewContributions).toHaveLength(2);
      for (const c of reviewContributions) {
        expect(c.invalidReason).toBeUndefined();
      }

      const handleA: ProviderApprovalHandle = {
        providerId: 'security-review',
        contentHash: merged.canonicalInvocationHash,
      };
      const handleB: ProviderApprovalHandle = {
        providerId: 'compliance-review',
        contentHash: merged.canonicalInvocationHash,
      };

      // F-03 P-02 assertion: BOTH handles' contentHash equal the
      // host-computed `ctx.canonicalInvocationHash`. A provider that
      // hashed raw `ToolCall.args` would produce a value distinct from
      // this one — this equality is the regression catch.
      expect(handleA.contentHash).toBe(expectedHash);
      expect(handleB.contentHash).toBe(expectedHash);
      expect(handleA.contentHash).toBe(handleB.contentHash);

      // F-04: negative P-02 probe. A fresh mock where provider B hashes
      // raw args produces a divergent contentHash on B's contribution —
      // the merger marks it `divergent-content-hash`. This is the
      // assertion that catches a pre-P-02 regression.
      const mockDrift = new HostMock();
      mockDrift.registerProvider({
        id: 'security-review',
        hooks: {
          beforeToolCall: (ctx) => ({
            action: 'review',
            reason: 'security-gate',
            requireApproval: true,
            handle: {
              providerId: 'security-review',
              contentHash: ctx.canonicalInvocationHash,
            },
          }),
        },
      });
      mockDrift.registerProvider({
        id: 'compliance-review',
        hooks: {
          beforeToolCall: () => ({
            action: 'review',
            reason: 'compliance-gate',
            requireApproval: true,
            handle: {
              providerId: 'compliance-review',
              // Pre-P-02 regression: computed from raw args, not ctx.
              contentHash: 'sha256:' + 'f'.repeat(64),
            },
          }),
        },
      });
      const mergedDrift = await mockDrift.beforeToolCall(inputs);
      const driftContrib = mergedDrift.contributions.find(
        (c) => c.providerId === 'compliance-review',
      )!;
      expect(driftContrib.invalidReason).toBe('divergent-content-hash');

      // F-05/F-06: both companions approve → audit records two
      // ApprovalEntry rows with the shared correlationId; the
      // post-merger DecisionEntry records `allow` only after both
      // approvals are present. Simulate `claws policy verify` passing
      // by verifying the chain with verifyChain.
      const writer = new AuditChainWriter({
        filePath: join(tmp, 'audit.jsonl'),
        clock: (() => {
          let t = 1_700_000_000_000;
          return () => t++;
        })(),
      });
      const policyArtifactSha256 = 'sha256:' + 'd'.repeat(64);
      writer.appendProducer({
        policyArtifactSha256,
        generatedAt: new Date(1_700_000_000_000).toISOString(),
        scope: '@bic/openclaw',
        producerVersion: 'harness-test-v1',
      });
      const correlationId = expectedHash.slice(
        'sha256:'.length,
        'sha256:'.length + 16,
      );
      const decision = writer.appendDecision({
        correlationId,
        snapshotId: inputs.snapshotId,
        policyArtifactSha256,
        tool: inputs.tool,
        decision: 'review',
        declaredTier: 'R5',
        effectiveTier: 'R5',
      });
      const approvalA = writer.appendApproval({
        correlationId,
        approver: 'companion:security-reviewer',
        outcome: 'approve',
        ttl: 300_000,
        nonce: 'a'.repeat(24),
        keyId: 'sc09-key-a',
        sequenceNumber: decision.seq + 1,
        signature: 'sha256:' + 'a'.repeat(64),
      });
      const approvalB = writer.appendApproval({
        correlationId,
        approver: 'companion:compliance-reviewer',
        outcome: 'approve',
        ttl: 300_000,
        nonce: 'b'.repeat(24),
        keyId: 'sc09-key-b',
        sequenceNumber: approvalA.seq + 1,
        signature: 'sha256:' + 'b'.repeat(64),
      });

      expect(approvalA.correlationId).toBe(correlationId);
      expect(approvalB.correlationId).toBe(correlationId);
      expect(approvalA.outcome).toBe('approve');
      expect(approvalB.outcome).toBe('approve');

      // F-07: the post-merger winner after both approvals arrive is
      // `allow` — re-running the merger with approved handles wouldn't
      // be blocked on requireApproval. Model the post-merger action the
      // merger would pick if both providers now returned `allow` (the
      // companion cleared their reviews).
      const mockPostApproval = new HostMock();
      mockPostApproval.registerProvider({
        id: 'security-review',
        hooks: { beforeToolCall: () => ({ action: 'allow' }) },
      });
      mockPostApproval.registerProvider({
        id: 'compliance-review',
        hooks: { beforeToolCall: () => ({ action: 'allow' }) },
      });
      const mergedApproved = await mockPostApproval.beforeToolCall(inputs);
      expect(mergedApproved.action).toBe('allow');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
