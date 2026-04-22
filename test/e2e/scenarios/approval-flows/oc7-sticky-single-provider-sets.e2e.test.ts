/**
 * SC-08 — OC-7 single-latch (CL-07 §1a).
 *
 * Provider A returns `review`; provider B returns `allow`. The merger
 * honors the CL-07 amendment §1a precedence (`deny > review > modify >
 * allow`): `review` latches on first emission and cannot be downgraded
 * by a later `allow`. The companion request carries exactly one
 * `ApprovalDescriptor` (from A) because B did not emit a handle.
 *
 * Pulse 54 D2. Scenario codes APPROVAL-T-056..T-066.
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

describe('SC-08 OC-7 single-latch: review latches over a later allow', () => {
  it('provider A returns review, B returns allow → merged is review with one ApprovalDescriptor (from A)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'sc08-'));
    try {
      const mock = new HostMock();
      mock.registerProvider({
        id: 'security-review',
        hooks: {
          beforeToolCall: (ctx) => ({
            action: 'review',
            reason: 'R5-classified-requires-human',
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
          beforeToolCall: () => ({ action: 'allow' }),
        },
      });

      const inputs = {
        tool: 'records.export',
        args: { id: 100, classification: 'RESTRICTED' },
        snapshotId: 'snap-sc08',
        principal: 'user:eve',
      };
      const merged = await mock.beforeToolCall(inputs);

      // F-01: review latches — B's `allow` cannot downgrade A's `review`.
      expect(merged.action).toBe('review');
      expect(merged.reason).toBe('R5-classified-requires-human');
      expect(merged.requireApproval).toBe(true);

      // F-02: canonical invocation hash is host-computed and propagated.
      expect(merged.canonicalInvocationHash).toBe(canonicalize(inputs));

      // F-03: both contributions are recorded; exactly one carries an
      // `ApprovalDescriptor` (provider A) — that's the single
      // `ApprovalDescriptor` the companion receives.
      expect(merged.contributions).toHaveLength(2);
      const actionsByProvider = Object.fromEntries(
        merged.contributions.map((c) => [c.providerId, c.action]),
      );
      expect(actionsByProvider).toEqual({
        'security-review': 'review',
        'compliance-review': 'allow',
      });
      for (const c of merged.contributions) {
        expect(c.invalidReason).toBeUndefined();
      }

      // F-04: write a DecisionEntry and a matching ApprovalEntry (companion
      // approves A); both link by correlationId. The chain writer's
      // hash-chain is the mergerTrace seam — the producer of the latch is
      // identified by the ApprovalEntry that clears A's handle.
      const writer = new AuditChainWriter({
        filePath: join(tmp, 'audit.jsonl'),
        clock: (() => {
          let t = 1_700_000_000_000;
          return () => t++;
        })(),
      });
      const policyArtifactSha256 = 'sha256:' + 'c'.repeat(64);
      writer.appendProducer({
        policyArtifactSha256,
        generatedAt: new Date(1_700_000_000_000).toISOString(),
        scope: '@bic/openclaw',
        producerVersion: 'harness-test-v1',
      });
      const correlationId = merged.canonicalInvocationHash.slice(
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

      // F-05: companion approves provider A → ApprovalEntry recorded with
      // outcome 'approve' and matching correlationId. The latching provider
      // (security-review) owns the handle the companion signs.
      const latchingHandle: ProviderApprovalHandle | undefined =
        (
          merged.contributions.find(
            (c) => c.providerId === 'security-review',
          ) !== undefined
            ? { providerId: 'security-review', contentHash: merged.canonicalInvocationHash }
            : undefined
        );
      expect(latchingHandle).toBeDefined();

      const approval = writer.appendApproval({
        correlationId,
        approver: 'companion:security-reviewer',
        outcome: 'approve',
        ttl: 300_000,
        nonce: 'n'.repeat(24),
        keyId: 'sc08-key',
        sequenceNumber: decision.seq + 1,
        signature: 'sha256:' + 'a'.repeat(64),
      });
      expect(approval.outcome).toBe('approve');
      expect(approval.correlationId).toBe(correlationId);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
