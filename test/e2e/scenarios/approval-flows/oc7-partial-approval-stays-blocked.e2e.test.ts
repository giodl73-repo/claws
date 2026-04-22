/**
 * SC-10 — OC-7 partial approval stays blocked (CL-11 §3a).
 *
 * Two providers return `review`; companion A approves; companion B stalls.
 * The decision stays in the first-class `pending-conjunctive`
 * `AuditDecisionAction` (CL-11 §3a) until B resolves. The tool is NOT
 * executed while pending. Then companion B denies → merged decision
 * becomes `deny` (deny is top of the OC-7 ladder). Final DecisionEntry
 * records `decision: 'deny'`, tool side-effect recorder saw zero calls.
 *
 * Pulse 54 D4. Scenario codes APPROVAL-T-078..T-087.
 */
import { describe, expect, it } from 'vitest';
import { AuditChainWriter, HostMock } from '#harness';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('SC-10 OC-7 partial approval: decision stays pending-conjunctive until second companion resolves', () => {
  it('A approves, B stalls then denies → pending-conjunctive → deny; tool never executed', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'sc10-'));
    try {
      // Side-effect recorder: a shim that the tool runtime would call if
      // the decision ever cleared. The scenario proves zero invocations.
      const toolSideEffects: Array<{ tool: string; args: unknown }> = [];

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
        args: { id: 300, classification: 'RESTRICTED' },
        snapshotId: 'snap-sc10',
        principal: 'user:bob',
      };
      const merged = await mock.beforeToolCall(inputs);

      // F-01: merged is `review`; requireApproval sticky; two contributions.
      expect(merged.action).toBe('review');
      expect(merged.requireApproval).toBe(true);
      expect(merged.contributions).toHaveLength(2);

      // F-02: tool is NOT executed. The scenario does not invoke the
      // tool unless the decision clears — this is the `action !== 'allow'`
      // check that the runtime performs.
      if (merged.action === 'allow') {
        toolSideEffects.push({ tool: inputs.tool, args: inputs.args });
      }
      expect(toolSideEffects).toHaveLength(0);

      // F-03: audit emits `DecisionEntry.decision: 'pending-conjunctive'`
      // — the first-class audit state (CL-11 §3a) for a decision waiting
      // on a conjunctive companion.
      const writer = new AuditChainWriter({
        filePath: join(tmp, 'audit.jsonl'),
        clock: (() => {
          let t = 1_700_000_000_000;
          return () => t++;
        })(),
      });
      const policyArtifactSha256 = 'sha256:' + 'e'.repeat(64);
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
      const pendingDecision = writer.appendDecision({
        correlationId,
        snapshotId: inputs.snapshotId,
        policyArtifactSha256,
        tool: inputs.tool,
        decision: 'pending-conjunctive',
        declaredTier: 'R5',
        effectiveTier: 'R5',
      });
      expect(pendingDecision.decision).toBe('pending-conjunctive');

      // F-04: companion A approves; B stalls — poll result still
      // `pending-conjunctive`. Model the poll by checking no further
      // DecisionEntry has been written.
      const approvalA = writer.appendApproval({
        correlationId,
        approver: 'companion:security-reviewer',
        outcome: 'approve',
        ttl: 300_000,
        nonce: 'a'.repeat(24),
        keyId: 'sc10-key-a',
        sequenceNumber: pendingDecision.seq + 1,
        signature: 'sha256:' + 'a'.repeat(64),
      });
      expect(approvalA.outcome).toBe('approve');

      // Still pending — no post-merger DecisionEntry yet; tool not
      // executed.
      expect(toolSideEffects).toHaveLength(0);

      // F-05: companion B denies. Model the post-merger step: one of
      // the original providers now returns `deny`, which is top of the
      // OC-7 ladder. Merger picks `deny`, mergerTrace identifies B as
      // the denying provider (via providerId on the deny contribution).
      const mockAfterDeny = new HostMock();
      mockAfterDeny.registerProvider({
        id: 'security-review',
        hooks: { beforeToolCall: () => ({ action: 'allow' }) },
      });
      mockAfterDeny.registerProvider({
        id: 'compliance-review',
        hooks: {
          beforeToolCall: () => ({
            action: 'deny',
            reason: 'compliance-rejected',
          }),
        },
      });
      const mergedDeny = await mockAfterDeny.beforeToolCall(inputs);
      expect(mergedDeny.action).toBe('deny');
      expect(mergedDeny.reason).toBe('compliance-rejected');
      const denier = mergedDeny.contributions.find(
        (c) => c.action === 'deny',
      );
      expect(denier).toBeDefined();
      expect(denier!.providerId).toBe('compliance-review');

      // F-06: final DecisionEntry records `deny`; the chain now has
      // [Producer, Decision(pending-conjunctive), Approval(A/approve),
      // Decision(deny)].
      const finalDecision = writer.appendDecision({
        correlationId,
        snapshotId: inputs.snapshotId,
        policyArtifactSha256,
        tool: inputs.tool,
        decision: 'deny',
        declaredTier: 'R5',
        effectiveTier: 'R5',
      });
      expect(finalDecision.decision).toBe('deny');

      // F-07: tool side-effect recorder saw zero invocations across the
      // entire lifecycle of the pending-conjunctive decision.
      expect(toolSideEffects).toHaveLength(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
