/**
 * MockApproval unit tests — simulates elicitation gate: approve, deny, timeout.
 *
 * Tests:
 * - auto-approve mode grants approval immediately
 * - auto-deny mode denies approval immediately
 * - timeout mode rejects after configured delay
 * - integrates with MockGateway require-approval flow
 */

import { describe, it, expect, vi } from 'vitest';
import { MockApproval } from '../../src/mock/mock-approval.js';
import { MockGateway } from '../../src/mock/mock-gateway.js';
import { skill } from '../../src/factory/skill.js';
import { classify } from '../../src/decorators/classify.js';

function makeSkill() {
  const handler = skill('approval-test', (input: string) => `approved: ${input}`);
  classify('R4', handler);
  return handler;
}

describe('MockApproval', () => {
  it('auto-approve mode grants approval immediately', async () => {
    const approval = new MockApproval({ mode: 'approve' });
    const result = await approval.requestApproval('approval-test', { riskLevel: 'R4' });
    expect(result.granted).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('auto-deny mode denies approval immediately', async () => {
    const approval = new MockApproval({ mode: 'deny' });
    const result = await approval.requestApproval('approval-test', { riskLevel: 'R4' });
    expect(result.granted).toBe(false);
    expect(result.reason).toBe('denied');
  });

  it('timeout mode rejects after configured delay', async () => {
    vi.useFakeTimers();
    const approval = new MockApproval({ mode: 'timeout', timeoutMs: 5000 });

    const promise = approval.requestApproval('approval-test', { riskLevel: 'R4' });
    await vi.advanceTimersByTimeAsync(5000);

    const result = await promise;
    expect(result.granted).toBe(false);
    expect(result.reason).toBe('timeout');

    vi.useRealTimers();
  });

  it('records approval requests for inspection', async () => {
    const approval = new MockApproval({ mode: 'approve' });
    await approval.requestApproval('skill-a', { riskLevel: 'R3' });
    await approval.requestApproval('skill-b', { riskLevel: 'R5' });

    expect(approval.requests).toHaveLength(2);
    expect(approval.requests[0]!.toolName).toBe('skill-a');
    expect(approval.requests[1]!.toolName).toBe('skill-b');
  });

  it('integrates with MockGateway require-approval flow', async () => {
    const approval = new MockApproval({ mode: 'approve' });
    const gateway = new MockGateway({
      defaultDecision: 'require-approval',
      approvalProvider: approval,
    });
    const handler = makeSkill();
    gateway.register(handler);

    const result = await gateway.invoke(handler, 'test');
    expect(result).toBe('approved: test');
  });

  it('timeout mode uses default 5000ms when timeoutMs not specified', async () => {
    vi.useFakeTimers();
    const approval = new MockApproval({ mode: 'timeout' });

    const promise = approval.requestApproval('approval-test', { riskLevel: 'R4' });
    await vi.advanceTimersByTimeAsync(5000);

    const result = await promise;
    expect(result.granted).toBe(false);
    expect(result.reason).toBe('timeout');

    vi.useRealTimers();
  });

  it('MockGateway denies when approval provider denies', async () => {
    const approval = new MockApproval({ mode: 'deny' });
    const gateway = new MockGateway({
      defaultDecision: 'require-approval',
      approvalProvider: approval,
    });
    const handler = makeSkill();
    gateway.register(handler);

    await expect(gateway.invoke(handler, 'test')).rejects.toThrow(
      /approval denied/i,
    );
  });
});
