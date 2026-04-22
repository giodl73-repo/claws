/**
 * SC-01 allow-r1-public — canonical verb `allow` on R1/PUBLIC.
 *
 * Asserts the default R1-on-PUBLIC path resolves to `allow` without any
 * companion approval cycle. Materializes F-01..F-10 into three invariants
 * (decision action + audit shape + chain integrity) per pulse-45 deliverable
 * D1 and Phase-2 FINDINGS.md HC-BLOCKs (HARNESS-E-001, AUDIT-X-001, listen(0)).
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

describe('SC-01 allow-r1-public (canonical verb × tier diagonal)', () => {
  it('resolves to allow with matching DecisionEntry + chain verifies', async () => {
    const harness = await startHarness({ fixture: 'allow-r1-public' });
    live.push(harness);

    const result = await harness.invokeTool('r1-public-read', {
      path: 'public/doc.txt',
    });

    // (1) execution allowed
    expect(result.action).toBe('allow');
    expect(result.status).toBe('allowed');

    // (2) DecisionEntry with decision=allow, declared=R1, effective=R1
    const chain = harness.getAuditChain();
    const decisions = chain.filter((e) => e.type === 'decision');
    expect(decisions).toHaveLength(1);
    const [entry] = decisions;
    expect(entry).toBeDefined();
    expect(entry!.type).toBe('decision');
    if (entry!.type === 'decision') {
      expect(entry!.decision).toBe('allow');
      expect(entry!.declaredTier).toBe('R1');
      expect(entry!.effectiveTier).toBe('R1');
      // no uplift cap triggered — declared === effective per SC-01 F-01
      expect(entry!.declaredTier).toBe(entry!.effectiveTier);
    }

    // (3) verifyChain oracle returns ok
    const verdict = harness.verifyAuditChain();
    expect(verdict.ok).toBe(true);
  });
});
