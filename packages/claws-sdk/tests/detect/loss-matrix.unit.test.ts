/**
 * L0: Loss matrix — per-platform enforcement capability scoring.
 *
 * Advisory platforms lose deny + trustTier capabilities.
 * Full-enforcement platforms retain all capabilities.
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

describe('computeLossMatrix', () => {
  it('advisory platform (Cursor) shows deny: false, trustTier: false', () => {
    const target: PlatformTarget = {
      primary: makePlatformInfo('cursor', 'advisory'),
      secondaries: [],
      method: 'single-platform',
      platformCount: 1,
    };

    const entries = computeLossMatrix(target);
    expect(entries).toHaveLength(1);

    const cursor = entries[0]!;
    expect(cursor.platform).toBe('cursor');
    expect(cursor.capabilities.deny).toBe(false);
    expect(cursor.capabilities.trustTier).toBe(false);
    expect(cursor.capabilities.audit).toBe(true);
    expect(cursor.capabilities.emit).toBe(true);
    expect(cursor.lostCount).toBe(2);
    expect(cursor.retainedCount).toBe(2);
  });

  it('full-enforcement platform (OpenClaw) shows all capabilities true', () => {
    const target: PlatformTarget = {
      primary: makePlatformInfo('openclaw', 'full'),
      secondaries: [],
      method: 'single-platform',
      platformCount: 1,
    };

    const entries = computeLossMatrix(target);
    expect(entries).toHaveLength(1);

    const openclaw = entries[0]!;
    expect(openclaw.platform).toBe('openclaw');
    expect(openclaw.capabilities.deny).toBe(true);
    expect(openclaw.capabilities.trustTier).toBe(true);
    expect(openclaw.capabilities.audit).toBe(true);
    expect(openclaw.capabilities.emit).toBe(true);
    expect(openclaw.lostCount).toBe(0);
    expect(openclaw.retainedCount).toBe(4);
  });
});
