/**
 * L2 E2E: End-to-end Tier 2 adoption from ungoverned skill to passing pinch.
 *
 * Simulates the complete journey a skill author takes:
 * 1. Start with an ungoverned OC skill (plain handler function)
 * 2. Install @bic/claws-skill-kit (already available in test context)
 * 3. Wrap handler with skill(), add @classify + @obo decorators
 * 4. Add governance frontmatter, validate it, propagate to decorators
 * 5. Wire up MockGateway and verify the full governance lifecycle
 *
 * This is the "claws pinch" equivalent — the lightweight governance check
 * that validates a skill's governance annotations are consistent.
 */

import { describe, it, expect } from 'vitest';

// These are the imports a skill author would use after `npm install @bic/claws-skill-kit`
import {
  skill,
  classify,
  obo,
  audit,
  budget,
  timeout,
  MockGateway,
  MockApproval,
  GovernanceAnnotationSchema,
  parseAnnotation,
  propagateToDecorators,
  getGovernanceMetadata,
  GOVERNANCE_METADATA_KEY,
  RISK_LEVEL_MAP,
} from '../../src/index.js';

describe('E2E: Tier 2 adoption — ungoverned to passing pinch', () => {
  it('complete adoption lifecycle from ungoverned skill to governed + tested', async () => {
    // === Phase 1: The ungoverned skill ===
    // This is what the author starts with — a plain async function
    const originalHandler = async (input: { to: string; subject: string; body: string }) => {
      return {
        messageId: `msg-${Math.random().toString(36).slice(2)}`,
        to: input.to,
        subject: input.subject,
        status: 'delivered',
      };
    };

    // === Phase 2: Add governance frontmatter to SKILL.md ===
    // The author adds these 3 lines to their SKILL.md YAML frontmatter:
    const frontmatterYaml = {
      risk_level: 'R4',
      obo: 'email',
      tier: 'typed',
    };

    // Validate the frontmatter
    const parseResult = parseAnnotation(frontmatterYaml);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) throw new Error('parse failed');

    expect(parseResult.data.risk_level).toBe('R4');
    expect(parseResult.data.obo).toBe('email');

    // === Phase 3: Wrap handler with skill() + decorators ===
    // Propagate frontmatter to decorator arguments
    const decoratorArgs = propagateToDecorators(parseResult.data);
    expect(decoratorArgs.classify).toBe('R4');
    expect(decoratorArgs.obo).toBe('email');

    // Apply skill() wrapper
    let handler = skill('send-notification', originalHandler);

    // Apply decorators from propagated arguments
    handler = classify(decoratorArgs.classify, handler);
    if (decoratorArgs.obo) {
      handler = obo(decoratorArgs.obo, handler);
    }
    handler = audit(handler);
    handler = budget(10000, handler);
    handler = timeout(30, handler);

    // === Phase 4: Verify governance metadata (the "pinch" check) ===
    const meta = getGovernanceMetadata(handler);
    expect(meta).toBeDefined();
    expect(meta!.riskLevel).toBe('R4');
    expect(meta!.riskLevelNumeric).toBe(RISK_LEVEL_MAP['R4']);
    expect(meta!.obo).toBe('email');
    expect(meta!.audit).toBe(true);
    expect(meta!.tokenBudget).toBe(10000);
    expect(meta!.timeoutSeconds).toBe(30);

    // Verify the GOVERNANCE_METADATA_KEY symbol is accessible
    expect(handler[GOVERNANCE_METADATA_KEY]).toBe(meta);

    // === Phase 5: Test with MockGateway (approval flow) ===
    const approval = new MockApproval({ mode: 'approve' });
    const gateway = new MockGateway({
      defaultDecision: 'require-approval',
      approvalProvider: approval,
    });
    gateway.register(handler);

    // Track events
    const events: Array<{ tool: string; decision: string }> = [];
    gateway.on('before_tool_call', (event) => {
      events.push({ tool: event.toolName, decision: event.decision });
    });

    // Invoke through gateway
    const input = { to: 'user@company.com', subject: 'Alert', body: 'Server down' };
    const result = await gateway.invoke(handler, input);

    // === Phase 6: Verify complete lifecycle ===
    // Result is correct
    expect(result.to).toBe('user@company.com');
    expect(result.subject).toBe('Alert');
    expect(result.status).toBe('delivered');

    // Event was fired
    expect(events).toHaveLength(1);
    expect(events[0]!.tool).toBe('send-notification');
    expect(events[0]!.decision).toBe('require-approval');

    // Approval was requested
    expect(approval.requests).toHaveLength(1);
    expect(approval.requests[0]!.toolName).toBe('send-notification');

    // The governed handler IS the original handler — no behavior change
    expect(typeof result.messageId).toBe('string');
    expect(result.messageId.startsWith('msg-')).toBe(true);
  });

  it('pinch validation catches frontmatter / decorator mismatch', () => {
    // Author writes bad frontmatter
    const badFrontmatter = { risk_level: 'R9', obo: 'banking' };
    const result = parseAnnotation(badFrontmatter);

    expect(result.success).toBe(false);
    if (!result.success) {
      // Should report both errors
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain('risk_level');
      expect(paths).toContain('obo');
    }
  });

  it('pinch validation warns on contradictory R1 + transact', () => {
    const contradictory = { risk_level: 'R1', obo: 'transact' };
    const result = parseAnnotation(contradictory);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
      expect(result.warnings![0]).toContain('Contradictory');
    }
  });

  it('GovernanceAnnotationSchema is exported for custom validation', () => {
    expect(GovernanceAnnotationSchema).toBeDefined();
    expect(typeof GovernanceAnnotationSchema.parse).toBe('function');
  });
});
