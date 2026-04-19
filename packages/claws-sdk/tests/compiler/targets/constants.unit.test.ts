/**
 * L0 unit tests for the shared free-tier target constants.
 *
 * These constants are the single source of truth shared by both
 * compiler/emit/registry.ts and compiler/validate/checks.ts (CM-3).
 * A drift between the runtime list and the TS type would reintroduce
 * the original freemium-gate leak, so we lock in:
 *   - the canonical free-tier list is exactly ['oc', 'claude-code'];
 *   - isFreeTierTarget accepts every listed target;
 *   - isFreeTierTarget rejects paid-tier + nonsense inputs;
 *   - the EmitTarget type is structurally assignable to the list values.
 */

import { describe, it, expect } from 'vitest';

import {
  FREE_TIER_TARGETS,
  isFreeTierTarget,
  type EmitTarget,
} from '#src/compiler/targets/constants.js';

describe('compiler/targets/constants', () => {
  it('FREE_TIER_TARGETS contains exactly oc and claude-code', () => {
    expect([...FREE_TIER_TARGETS]).toEqual(['oc', 'claude-code']);
  });

  it('isFreeTierTarget accepts every listed free-tier target', () => {
    for (const t of FREE_TIER_TARGETS) {
      expect(isFreeTierTarget(t)).toBe(true);
    }
  });

  it('isFreeTierTarget rejects paid-tier platforms', () => {
    for (const t of ['cursor', 'copilot', 'crewai', 'langgraph', 'bedrock']) {
      expect(isFreeTierTarget(t)).toBe(false);
    }
  });

  it('isFreeTierTarget rejects empty and unrelated strings', () => {
    expect(isFreeTierTarget('')).toBe(false);
    expect(isFreeTierTarget('not-a-platform')).toBe(false);
    expect(isFreeTierTarget('OC')).toBe(false); // case-sensitive
  });

  it('EmitTarget is structurally the free-tier union', () => {
    const oc: EmitTarget = 'oc';
    const cc: EmitTarget = 'claude-code';
    expect(oc).toBe('oc');
    expect(cc).toBe('claude-code');
  });
});
