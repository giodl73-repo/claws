/**
 * L1 Integration: Tier 2 TYPED adoption path for an existing ungoverned skill.
 *
 * Validates the 3-step Tier 2 migration:
 * 1. Wrap handler with skill()
 * 2. Add decorators (@classify + @obo)
 * 3. Add governance frontmatter (3-line YAML)
 *
 * The migration must complete in <15 minutes for an experienced developer.
 * This test validates the mechanical steps are correct and composable.
 */

import { describe, it, expect } from 'vitest';
import { skill } from '../../src/factory/skill.js';
import { classify } from '../../src/decorators/classify.js';
import { obo } from '../../src/decorators/obo.js';
import { parseAnnotation } from '../../src/schema/annotation.js';
import { propagateToDecorators } from '../../src/schema/propagation.js';
import { GOVERNANCE_METADATA_KEY } from '../../src/types.js';

describe('Tier 2 adoption — ungoverned to TYPED', () => {
  /**
   * Factory: create a fresh ungoverned handler per test to avoid
   * property conflicts from skill()'s non-configurable defineProperty.
   */
  function makeUngovernedHandler() {
    return async (input: { recipient: string; subject: string; body: string }) => {
      return {
        messageId: `msg-${Date.now()}`,
        to: input.recipient,
        status: 'sent',
      };
    };
  }

  it('Step 1: wrap with skill() — handler is now a SkillHandler', () => {
    const handler = skill('send-email', makeUngovernedHandler());

    // Should be callable like the original
    expect(typeof handler).toBe('function');
    // Should have skill name
    expect(handler.skillName).toBe('send-email');
    // Should have empty governance metadata
    expect(handler[GOVERNANCE_METADATA_KEY]).toBeDefined();
    expect(handler[GOVERNANCE_METADATA_KEY].riskLevel).toBeUndefined();
  });

  it('Step 2: add decorators — governance metadata is populated', () => {
    let handler = skill('send-email', makeUngovernedHandler());
    handler = classify('R4', handler);
    handler = obo('email', handler);

    const meta = handler[GOVERNANCE_METADATA_KEY];
    expect(meta.riskLevel).toBe('R4');
    expect(meta.riskLevelNumeric).toBe(4);
    expect(meta.obo).toBe('email');
  });

  it('Step 3: validate frontmatter — 3-line YAML parses correctly', () => {
    // The 3 lines of YAML the author adds to SKILL.md:
    // governance:
    //   risk_level: R4
    //   obo: email
    const frontmatter = {
      risk_level: 'R4',
      obo: 'email',
    };

    const result = parseAnnotation(frontmatter);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.risk_level).toBe('R4');
      expect(result.data.obo).toBe('email');
    }
  });

  it('full Tier 2 pipeline: frontmatter -> propagation -> decorators -> handler', () => {
    // 1. Parse frontmatter from SKILL.md
    const frontmatter = {
      risk_level: 'R3',
      obo: 'calendar',
      tier: 'typed',
    };
    const parsed = parseAnnotation(frontmatter);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    // 2. Propagate to decorator arguments
    const decoratorArgs = propagateToDecorators(parsed.data);
    expect(decoratorArgs.classify).toBe('R3');
    expect(decoratorArgs.obo).toBe('calendar');

    // 3. Apply decorators using propagated arguments
    let handler = skill('manage-calendar', async (input: { event: string }) => ({
      created: true,
      event: input.event,
    }));
    handler = classify(decoratorArgs.classify, handler);
    if (decoratorArgs.obo) {
      handler = obo(decoratorArgs.obo, handler);
    }

    // 4. Verify the complete chain
    const meta = handler[GOVERNANCE_METADATA_KEY];
    expect(meta.riskLevel).toBe('R3');
    expect(meta.riskLevelNumeric).toBe(3);
    expect(meta.obo).toBe('calendar');

    // 5. Handler still works
    expect(handler({ event: 'meeting' })).resolves.toEqual({
      created: true,
      event: 'meeting',
    });
  });

  it('Tier 2 migration preserves original handler behavior', async () => {
    const input = { recipient: 'bob@example.com', subject: 'Test', body: 'Hello' };

    // Run ungoverned handler
    const rawResult = await makeUngovernedHandler()(input);

    // Run governed handler
    let handler = skill('send-email', makeUngovernedHandler());
    handler = classify('R4', handler);
    handler = obo('email', handler);
    const govResult = await handler(input);

    // Same shape, same fields (messageId differs due to Date.now())
    expect(govResult.to).toBe(rawResult.to);
    expect(govResult.status).toBe(rawResult.status);
    expect(govResult.messageId).toBeDefined();
  });
});
