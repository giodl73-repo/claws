/**
 * L0: @obo decorator — annotates handler with OBO boundary metadata.
 *
 * Tests:
 * 1. @obo('email') annotates handler with OBO boundary metadata readable via getGovernanceMetadata()
 * 2. All valid OBO boundary types are accepted
 * 3. Invalid OBO type throws
 */

import { describe, it, expect } from 'vitest';
import { skill } from '../../src/factory/skill.js';
import { obo } from '../../src/decorators/obo.js';
import { getGovernanceMetadata, type OboBoundary } from '../../src/types.js';

describe('@obo decorator', () => {
  it("@obo('email') annotates handler with OBO boundary metadata readable via getGovernanceMetadata()", () => {
    const handler = skill('send-email', (input: { to: string }) => {
      return { sent: true, to: input.to };
    });

    const annotated = obo('email', handler);

    // Returns the same handler reference
    expect(annotated).toBe(handler);

    // Metadata is readable
    const meta = getGovernanceMetadata(annotated);
    expect(meta).toBeDefined();
    expect(meta!.obo).toBe('email');
  });

  it('accepts all valid OBO boundary types', () => {
    const validTypes: OboBoundary[] = [
      'email', 'message', 'calendar', 'social', 'purchase', 'transact',
    ];

    for (const type of validTypes) {
      const handler = skill(`test-${type}`, () => {});
      obo(type, handler);
      expect(getGovernanceMetadata(handler)!.obo).toBe(type);
    }
  });

  it('throws on invalid OBO type', () => {
    const handler = skill('bad-obo', () => {});
    expect(() => obo('invalid' as OboBoundary, handler)).toThrow('invalid OBO boundary type');
  });

  it('handler remains callable after decoration', () => {
    const handler = skill('email-sender', (n: number) => n * 2);
    obo('email', handler);
    expect(handler(5)).toBe(10);
  });
});
