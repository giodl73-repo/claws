/**
 * L0: skill() factory — creates typed SkillHandler with governance metadata slots.
 *
 * Tests:
 * 1. skill() creates a handler with empty governance metadata slots
 * 2. skill() name parameter must match skill directory name convention
 */

import { describe, it, expect } from 'vitest';
import { skill } from '../../src/factory/skill.js';
import { GOVERNANCE_METADATA_KEY, getGovernanceMetadata } from '../../src/types.js';

describe('skill() factory', () => {
  it('creates a typed SkillHandler with empty governance metadata slots', () => {
    const handler = skill('send-email', (input: { to: string }) => {
      return { sent: true, to: input.to };
    });

    // Handler is callable
    const result = handler({ to: 'test@example.com' });
    expect(result).toEqual({ sent: true, to: 'test@example.com' });

    // Skill name is set
    expect(handler.skillName).toBe('send-email');

    // Governance metadata is attached and empty
    const meta = handler[GOVERNANCE_METADATA_KEY];
    expect(meta).toBeDefined();
    expect(meta.obo).toBeUndefined();
    expect(meta.riskLevel).toBeUndefined();
    expect(meta.riskLevelNumeric).toBeUndefined();
    expect(meta.audit).toBeUndefined();
    expect(meta.validationSchema).toBeUndefined();
    expect(meta.tokenBudget).toBeUndefined();
    expect(meta.timeoutSeconds).toBeUndefined();

    // getGovernanceMetadata() returns the same object
    const retrieved = getGovernanceMetadata(handler);
    expect(retrieved).toBe(meta);
  });

  it('name parameter must match skill directory name convention', () => {
    // Valid names — no error
    expect(() => skill('send-email', () => {})).not.toThrow();
    expect(() => skill('my-tool', () => {})).not.toThrow();
    expect(() => skill('a', () => {})).not.toThrow();
    expect(() => skill('tool123', () => {})).not.toThrow();
    expect(() => skill('my-tool-v2', () => {})).not.toThrow();

    // Invalid names — should throw
    expect(() => skill('SendEmail', () => {})).toThrow(/Invalid skill name 'SendEmail'/);
    expect(() => skill('send_email', () => {})).toThrow(/Invalid skill name/);
    expect(() => skill('123-bad', () => {})).toThrow(/Invalid skill name/);
    expect(() => skill('', () => {})).toThrow(/Invalid skill name/);
    expect(() => skill('-leading-hyphen', () => {})).toThrow(/Invalid skill name/);
  });

  it('skillName property is read-only', () => {
    const handler = skill('my-skill', () => 'hello');
    expect(() => {
      (handler as Record<string, unknown>).skillName = 'overwritten';
    }).toThrow();
    expect(handler.skillName).toBe('my-skill');
  });

  it('governance metadata key is not enumerable', () => {
    const handler = skill('my-skill', () => 'hello');
    const keys = Object.keys(handler);
    expect(keys).toContain('skillName');
    // Symbol key should not appear in Object.keys
    expect(keys).not.toContain(GOVERNANCE_METADATA_KEY.toString());
  });
});
