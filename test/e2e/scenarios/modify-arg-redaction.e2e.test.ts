/**
 * SC-04 modify-arg-redaction — canonical verb `modify` with arg redaction.
 *
 * Exercises the `redact-email-addresses` SOUL rule applied to `notes.store`.
 * Materializes F-01..F-07 into three invariants:
 *   1. args are rewritten (post-redaction payload differs from original).
 *   2. DecisionEntry.modifiedArgsHash is present and matches the rewritten
 *      argument canonical hash (SC-04 F-02 / F-07 pin this contract).
 *   3. modifiedArgsHash !== originalArgsHash (identity check; any redaction
 *      must produce a different hash).
 * Per pulse-45 deliverable D4.
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

describe('SC-04 modify-arg-redaction (canonical verb × tier diagonal)', () => {
  it('rewrites args, stamps modifiedArgsHash, and hash differs from originalArgsHash', async () => {
    const harness = await startHarness({ fixture: 'modify-arg-redaction' });
    live.push(harness);

    const original = {
      title: 'weekly sync',
      body: 'Ping alice@example.test and bob@example.test for Friday.',
    };
    const result = await harness.invokeTool('notes.store', original);

    // (1) args rewritten — no emails in the resulting payload.
    expect(result.action).toBe('modify');
    expect(result.status).toBe('modified');
    expect(result.modifiedArgs).toBeDefined();
    const modified = result.modifiedArgs as {
      title: string;
      body: string;
    };
    expect(modified.body).not.toContain('alice@example.test');
    expect(modified.body).not.toContain('bob@example.test');
    expect(modified.body).toContain('[REDACTED-EMAIL]');

    // (2) DecisionEntry.modifiedArgsHash is present and equals the rewritten
    // payload's canonical hash (reported by the driver).
    const chain = harness.getAuditChain();
    const decisions = chain.filter((e) => e.type === 'decision');
    expect(decisions).toHaveLength(1);
    const [decision] = decisions;
    expect(decision).toBeDefined();
    if (decision && decision.type === 'decision') {
      expect(decision.modifiedArgsHash).toBeDefined();
      expect(decision.modifiedArgsHash).toBe(result.modifiedArgsHash);
    }

    // (3) SC-04 F-07 identity check: rewritten hash ≠ original hash.
    expect(result.originalArgsHash).toBeDefined();
    expect(result.modifiedArgsHash).toBeDefined();
    expect(result.modifiedArgsHash).not.toBe(result.originalArgsHash);

    // chain verifies.
    expect(harness.verifyAuditChain()).toEqual({ ok: true });
  });
});
