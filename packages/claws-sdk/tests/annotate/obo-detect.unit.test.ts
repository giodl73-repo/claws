/**
 * L0: OBO detection — detect on-behalf-of patterns in tool names/descriptions.
 */

import { describe, it, expect } from 'vitest';
import { detectObo } from '../../src/annotate/obo-detect.js';

describe('detectObo()', () => {
  it('detects "as user" pattern in description', () => {
    const result = detectObo('send-email', 'Send email as user from inbox');
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.0);
    expect(result.confidence).toBeLessThanOrEqual(1.0);
    expect(result.matchedPatterns).toContain('as user');
  });

  it('detects "on behalf of" pattern', () => {
    const result = detectObo('api-call', 'Make API call on behalf of the team lead');
    expect(result.detected).toBe(true);
    expect(result.matchedPatterns).toContain('on behalf of');
  });

  it('detects "impersonate" pattern', () => {
    const result = detectObo('auth-proxy', 'Impersonate service account for deployment');
    expect(result.detected).toBe(true);
    expect(result.matchedPatterns).toContain('impersonate');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('returns detected=false for non-OBO tool', () => {
    const result = detectObo('search-docs', 'Search public documentation');
    expect(result.detected).toBe(false);
    expect(result.confidence).toBe(0.0);
    expect(result.matchedPatterns).toHaveLength(0);
  });

  it('combines multiple OBO patterns for higher confidence', () => {
    const result = detectObo(
      'proxy-send',
      'Act as user on behalf of the principal to send messages',
    );
    expect(result.detected).toBe(true);
    expect(result.matchedPatterns.length).toBeGreaterThanOrEqual(2);
    // Multiple patterns should produce higher confidence than any single one
    expect(result.confidence).toBeGreaterThan(0.75);
  });
});
