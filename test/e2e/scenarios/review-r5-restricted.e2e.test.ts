/**
 * SC-03 review-r5-restricted — canonical verb `review` on R5/RESTRICTED.
 *
 * The load-bearing scenario for correlationId cross-linking. Materializes
 * F-01..F-12 into three invariants:
 *   1. approval flow: handle emitted, companion signs, response unblocks.
 *   2. chain carries BOTH DecisionEntry{decision:'review'} and
 *      ApprovalEntry{outcome:'approve'} linked by correlationId.
 *   3. declaredTier=R5, effectiveTier preserved (no uplift cap).
 * Per pulse-45 deliverable D3.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { startHarness, type Harness } from './_lib/start-harness.ts';

const live: Harness[] = [];
afterEach(async () => {
  while (live.length > 0) {
    const h = live.pop()!;
    await h.shutdown();
  }
});

describe('SC-03 review-r5-restricted (canonical verb × tier diagonal)', () => {
  it('approval flow completes end-to-end: handle emitted, companion signs, response unblocks', async () => {
    const harness = await startHarness({ fixture: 'review-r5-restricted' });
    live.push(harness);

    const result = await harness.invokeTool('fleet-db.query', {
      sql: 'SELECT id FROM fleet_units LIMIT 1',
    });

    expect(result.action).toBe('review');
    expect(result.status).toBe('review-required');
    expect(result.approvalHandle).toBeDefined();
    expect(result.correlationId).toMatch(/^[0-9a-f]+$/);
  });

  it('chain contains both DecisionEntry{decision:review} and ApprovalEntry{outcome:approve} with matching correlationId', async () => {
    const harness = await startHarness({
      fixture: 'review-r5-restricted',
      scenarioId: 'review-link',
    });
    live.push(harness);

    const result = await harness.invokeTool('fleet-db.query', {
      sql: 'SELECT name FROM fleet_units',
    });

    const chain = harness.getAuditChain();
    const decisions = chain.filter((e) => e.type === 'decision');
    const approvals = chain.filter((e) => e.type === 'approval');
    expect(decisions).toHaveLength(1);
    expect(approvals).toHaveLength(1);

    const [decision] = decisions;
    const [approval] = approvals;
    expect(decision).toBeDefined();
    expect(approval).toBeDefined();
    if (decision && decision.type === 'decision' && approval && approval.type === 'approval') {
      expect(decision.decision).toBe('review');
      expect(approval.outcome).toBe('approve');
      // SC-03 F-06: correlationId threads decision and approval records.
      expect(decision.correlationId).toBe(result.correlationId);
      expect(approval.correlationId).toBe(result.correlationId);
      expect(decision.correlationId).toBe(approval.correlationId);
    }

    // chain oracle verifies — invariant 4 (missing-approval-for-review)
    // does NOT fire because the ApprovalEntry is present.
    expect(harness.verifyAuditChain()).toEqual({ ok: true });
  });

  it('declaredTier=R5 + effectiveTier preserved (no uplift cap)', async () => {
    const harness = await startHarness({
      fixture: 'review-r5-restricted',
      scenarioId: 'review-tier',
    });
    live.push(harness);

    await harness.invokeTool('fleet-db.query', { sql: 'SELECT 1' });

    const chain = harness.getAuditChain();
    const decisions = chain.filter((e) => e.type === 'decision');
    expect(decisions).toHaveLength(1);
    const [entry] = decisions;
    if (entry && entry.type === 'decision') {
      expect(entry.declaredTier).toBe('R5');
      // no uplift — effective does not exceed declared (CL-07 §1a Rule 2)
      expect(entry.effectiveTier).toBe('R5');
    }
  });
});
