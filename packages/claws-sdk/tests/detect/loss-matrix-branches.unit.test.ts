/**
 * L0: Line/statement coverage gaps in detect/loss-matrix.ts.
 *
 * Targets:
 * - Line 55: secondaries loop (computeLossMatrix with secondary platforms)
 */

import { describe, it, expect } from 'vitest';
import { computeLossMatrix } from '../../src/detect/loss-matrix.js';
import type { PlatformTarget, PlatformInfo } from '../../src/detect/types.js';

function makePlatformInfo(
  platform: string,
  enforcement: 'full' | 'advisory' | 'explicit-only',
): PlatformInfo {
  return {
    marker: {
      platform: platform as any,
      confidence: 1.0,
      enforcement,
      defaultTrustTier: 1,
      markerFiles: ['/test/' + platform],
    },
  };
}

describe('computeLossMatrix — secondary platforms', () => {
  it('includes entries for both primary and secondary platforms', () => {
    const target: PlatformTarget = {
      primary: makePlatformInfo('openclaw', 'full'),
      secondaries: [
        makePlatformInfo('cursor', 'advisory'),
        makePlatformInfo('crewai', 'advisory'),
      ],
      method: 'auto-enforcement',
      platformCount: 3,
    };

    const entries = computeLossMatrix(target);

    // 1 primary + 2 secondaries = 3 entries
    expect(entries).toHaveLength(3);

    // Primary: full enforcement (0 lost)
    expect(entries[0]!.platform).toBe('openclaw');
    expect(entries[0]!.lostCount).toBe(0);
    expect(entries[0]!.retainedCount).toBe(4);

    // Secondary 1: advisory (2 lost: deny + trustTier)
    expect(entries[1]!.platform).toBe('cursor');
    expect(entries[1]!.lostCount).toBe(2);
    expect(entries[1]!.retainedCount).toBe(2);
    expect(entries[1]!.capabilities.deny).toBe(false);
    expect(entries[1]!.capabilities.trustTier).toBe(false);
    expect(entries[1]!.capabilities.audit).toBe(true);
    expect(entries[1]!.capabilities.emit).toBe(true);

    // Secondary 2: advisory (same as cursor)
    expect(entries[2]!.platform).toBe('crewai');
    expect(entries[2]!.lostCount).toBe(2);
  });

  it('explicit-only enforcement loses deny, trustTier, and audit', () => {
    const target: PlatformTarget = {
      primary: makePlatformInfo('bedrock', 'explicit-only'),
      secondaries: [],
      method: 'single-platform',
      platformCount: 1,
    };

    const entries = computeLossMatrix(target);
    expect(entries).toHaveLength(1);

    const bedrock = entries[0]!;
    expect(bedrock.capabilities.deny).toBe(false);
    expect(bedrock.capabilities.trustTier).toBe(false);
    expect(bedrock.capabilities.audit).toBe(false);
    expect(bedrock.capabilities.emit).toBe(true);
    expect(bedrock.lostCount).toBe(3);
    expect(bedrock.retainedCount).toBe(1);
  });

  it('single secondary platform is included in the output', () => {
    const target: PlatformTarget = {
      primary: makePlatformInfo('openclaw', 'full'),
      secondaries: [makePlatformInfo('langgraph', 'advisory')],
      method: 'auto-enforcement',
      platformCount: 2,
    };

    const entries = computeLossMatrix(target);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.platform).toBe('openclaw');
    expect(entries[1]!.platform).toBe('langgraph');
  });

  it('mixed enforcement models across secondaries', () => {
    const target: PlatformTarget = {
      primary: makePlatformInfo('openclaw', 'full'),
      secondaries: [
        makePlatformInfo('cursor', 'advisory'),
        makePlatformInfo('bedrock', 'explicit-only'),
        makePlatformInfo('claude-code', 'full'),
      ],
      method: 'auto-enforcement',
      platformCount: 4,
    };

    const entries = computeLossMatrix(target);
    expect(entries).toHaveLength(4);

    // full: 0 lost
    expect(entries[0]!.lostCount).toBe(0);
    // advisory: 2 lost
    expect(entries[1]!.lostCount).toBe(2);
    // explicit-only: 3 lost
    expect(entries[2]!.lostCount).toBe(3);
    // full: 0 lost
    expect(entries[3]!.lostCount).toBe(0);
  });
});
