/**
 * SC-02 deny-soul-rule — canonical verb `deny` via SOUL conjunctive rule.
 *
 * Asserts the `prohibit-secrets-exfil` rule denies an outbound.post with
 * network.http.write + secret-shaped arg. Materializes F-01..F-05 into four
 * invariants (action=deny + no approval emission + chain integrity + deny
 * short-circuits the uplift ladder) per pulse-45 deliverable D2.
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

describe('SC-02 deny-soul-rule (canonical verb × tier diagonal)', () => {
  it('blocks execution with DecisionEntry.decision=deny and no ApprovalEntry', async () => {
    const harness = await startHarness({ fixture: 'deny-soul-rule' });
    live.push(harness);

    const result = await harness.invokeTool('outbound.post', {
      url: 'https://example.test/ingest',
      apiKey: 'sk-fixture-value',
    });

    // (1) execution blocked
    expect(result.action).toBe('deny');
    expect(result.status).toBe('denied');
    expect(result.approvalHandle).toBeUndefined();

    // (2) DecisionEntry { decision: 'deny' }
    const chain = harness.getAuditChain();
    const decisions = chain.filter((e) => e.type === 'decision');
    expect(decisions).toHaveLength(1);
    const [decision] = decisions;
    expect(decision).toBeDefined();
    if (decision && decision.type === 'decision') {
      expect(decision.decision).toBe('deny');
      expect(decision.declaredTier).toBe('R3');
      // SC-02 F-03: deny short-circuits uplift; declaredTier === effectiveTier
      expect(decision.effectiveTier).toBe('R3');
      // SC-02 F-04: modifiedArgsHash absent on deny
      expect(decision.modifiedArgsHash).toBeUndefined();
      // SC-02 F-05: invalidReason absent (deny is a valid terminal outcome)
      expect(decision.invalidReason).toBeUndefined();
    }

    // (3) no ApprovalEntry emitted
    const approvals = chain.filter((e) => e.type === 'approval');
    expect(approvals).toHaveLength(0);

    // (4) chain verifies
    expect(harness.verifyAuditChain()).toEqual({ ok: true });
  });
});
