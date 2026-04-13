/**
 * MockGateway unit tests — simulates OC Gateway before_tool_call event lifecycle.
 *
 * Tests:
 * - Fires before_tool_call event with governance response when tool is invoked
 * - Supports configurable hook responses (allow, deny, require-approval)
 * - Lifecycle: register -> invoke -> receive event -> respond
 */

import { describe, it, expect } from 'vitest';
import { MockGateway } from '../../src/mock/mock-gateway.js';
import { skill } from '../../src/factory/skill.js';
import { classify } from '../../src/decorators/classify.js';
import { obo } from '../../src/decorators/obo.js';
import { GOVERNANCE_METADATA_KEY } from '../../src/types.js';

function makeDecoratedSkill() {
  const handler = skill('test-skill', (input: string) => `echo: ${input}`);
  classify('R3', handler);
  obo('email', handler);
  return handler;
}

describe('MockGateway', () => {
  it('fires before_tool_call event with governance response when tool is invoked', async () => {
    const gateway = new MockGateway({ defaultDecision: 'allow' });
    const handler = makeDecoratedSkill();

    gateway.register(handler);

    const events: Array<{ toolName: string; decision: string }> = [];
    gateway.on('before_tool_call', (event) => {
      events.push({ toolName: event.toolName, decision: event.decision });
    });

    const result = await gateway.invoke(handler, 'hello');

    expect(result).toBe('echo: hello');
    expect(events).toHaveLength(1);
    expect(events[0]!.toolName).toBe('test-skill');
    expect(events[0]!.decision).toBe('allow');
  });

  it('defaults to deny when no decision is configured', async () => {
    const gateway = new MockGateway();
    const handler = makeDecoratedSkill();
    gateway.register(handler);

    await expect(gateway.invoke(handler, 'test')).rejects.toThrow(
      /denied by governance/i,
    );
  });

  it('supports configurable hook response: allow', async () => {
    const gateway = new MockGateway({ defaultDecision: 'allow' });
    const handler = makeDecoratedSkill();
    gateway.register(handler);

    const result = await gateway.invoke(handler, 'test');
    expect(result).toBe('echo: test');
  });

  it('supports configurable hook response: deny', async () => {
    const gateway = new MockGateway({ defaultDecision: 'deny' });
    const handler = makeDecoratedSkill();
    gateway.register(handler);

    await expect(gateway.invoke(handler, 'test')).rejects.toThrow(
      /denied by governance/i,
    );
  });

  it('supports configurable hook response: require-approval', async () => {
    const gateway = new MockGateway({ defaultDecision: 'require-approval' });
    const handler = makeDecoratedSkill();
    gateway.register(handler);

    // Without an approval provider, require-approval should throw
    await expect(gateway.invoke(handler, 'test')).rejects.toThrow(
      /requires approval/i,
    );
  });

  it('per-tool decision overrides default', async () => {
    const gateway = new MockGateway({ defaultDecision: 'allow' });
    const handler = makeDecoratedSkill();
    gateway.register(handler);
    gateway.setDecision('test-skill', 'deny');

    await expect(gateway.invoke(handler, 'test')).rejects.toThrow(
      /denied by governance/i,
    );
  });

  it('exposes governance metadata in event', async () => {
    const gateway = new MockGateway({ defaultDecision: 'allow' });
    const handler = makeDecoratedSkill();
    gateway.register(handler);

    let capturedMeta: unknown = null;
    gateway.on('before_tool_call', (event) => {
      capturedMeta = event.governanceMetadata;
    });

    await gateway.invoke(handler, 'hello');

    expect(capturedMeta).toEqual(
      expect.objectContaining({
        riskLevel: 'R3',
        obo: 'email',
      }),
    );
  });

  it('throws when invoking unregistered handler', async () => {
    const gateway = new MockGateway();
    const handler = makeDecoratedSkill();

    await expect(gateway.invoke(handler, 'test')).rejects.toThrow(
      /not registered/i,
    );
  });
});
