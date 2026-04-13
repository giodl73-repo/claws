/**
 * Tier 2 migration integration test — full before_tool_call -> handler -> response lifecycle.
 *
 * Simulates a skill that has been migrated from Tier 1 (YAML-only) to Tier 2
 * (decorators + MockGateway) and validates the complete governance flow.
 */

import { describe, it, expect } from 'vitest';
import { MockGateway } from '../../src/mock/mock-gateway.js';
import { MockApproval } from '../../src/mock/mock-approval.js';
import { skill } from '../../src/factory/skill.js';
import { classify } from '../../src/decorators/classify.js';
import { obo } from '../../src/decorators/obo.js';
import { audit } from '../../src/decorators/audit.js';
import { budget } from '../../src/decorators/budget.js';
import { timeout } from '../../src/decorators/timeout.js';
import { GOVERNANCE_METADATA_KEY } from '../../src/types.js';

describe('Tier 2 migration — full lifecycle', () => {
  it('decorated skill with MockGateway simulates full before_tool_call -> handler -> response', async () => {
    // 1. Create a fully-decorated skill (Tier 2 adoption)
    let handler = skill('send-email', async (input: { to: string; body: string }) => {
      return { sent: true, to: input.to };
    });
    handler = classify('R4', handler);
    handler = obo('email', handler);
    handler = audit(handler);
    handler = budget(10000, handler);
    handler = timeout(30, handler);

    // 2. Wire up MockGateway with approval flow
    const approval = new MockApproval({ mode: 'approve' });
    const gateway = new MockGateway({
      defaultDecision: 'require-approval',
      approvalProvider: approval,
    });
    gateway.register(handler);

    // 3. Capture lifecycle events
    const events: string[] = [];
    gateway.on('before_tool_call', (event) => {
      events.push(`before:${event.toolName}:${event.decision}`);
    });

    // 4. Invoke — should go through full approval flow
    const result = await gateway.invoke(handler, { to: 'user@example.com', body: 'Hello' });

    // 5. Verify result
    expect(result).toEqual({ sent: true, to: 'user@example.com' });

    // 6. Verify governance metadata was exposed to the event
    expect(events).toHaveLength(1);
    expect(events[0]).toBe('before:send-email:require-approval');

    // 7. Verify approval was requested with correct metadata
    expect(approval.requests).toHaveLength(1);
    expect(approval.requests[0]!.toolName).toBe('send-email');

    // 8. Verify all governance metadata is intact
    const meta = handler[GOVERNANCE_METADATA_KEY];
    expect(meta.riskLevel).toBe('R4');
    expect(meta.obo).toBe('email');
    expect(meta.audit).toBe(true);
    expect(meta.tokenBudget).toBe(10000);
    expect(meta.timeoutSeconds).toBe(30);
  });

  it('deny decision prevents handler execution', async () => {
    let handlerExecuted = false;
    const handler = skill('dangerous-op', () => {
      handlerExecuted = true;
      throw new Error('Should never run');
    });
    classify('R5', handler);

    const gateway = new MockGateway({ defaultDecision: 'deny' });
    gateway.register(handler);

    await expect(gateway.invoke(handler, {})).rejects.toThrow(/denied/i);
    // Handler should NOT have executed — gateway blocked it
    expect(handlerExecuted).toBe(false);
  });
});
