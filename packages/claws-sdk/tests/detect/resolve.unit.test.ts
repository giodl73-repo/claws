/**
 * L0: resolve() — select primary platform from PlatformInventory.
 *
 * Tests enforcement precedence (full > advisory > explicit-only),
 * ambiguity rejection, config override, single-platform trivial case,
 * and case-sensitive marker matching.
 */

import { describe, it, expect } from 'vitest';
import { resolve as resolveFn } from '../../src/detect/resolve.js';
import type {
  PlatformInventory,
  PlatformInfo,
  MarkerResult,
} from '../../src/detect/types.js';

/** Helper: build a MarkerResult for testing. */
function marker(
  platform: MarkerResult['platform'],
  enforcement: MarkerResult['enforcement'],
  defaultTrustTier: MarkerResult['defaultTrustTier'] = 2,
): MarkerResult {
  return {
    platform,
    confidence: 1.0,
    enforcement,
    defaultTrustTier,
    markerFiles: [`/workspace/${platform}-marker`],
  };
}

/** Helper: build a PlatformInfo from a MarkerResult. */
function info(m: MarkerResult, notes?: string): PlatformInfo {
  return notes ? { marker: m, notes } : { marker: m };
}

/** Helper: build a PlatformInventory from platform infos. */
function inventory(...entries: PlatformInfo[]): PlatformInventory {
  const platforms = new Map<MarkerResult['platform'], PlatformInfo>();
  for (const e of entries) {
    platforms.set(e.marker.platform, e);
  }
  return {
    platforms,
    detected: platforms.size > 0,
    zeroConfig: false,
  };
}

describe('resolve()', () => {
  it('CLAUDE.md + .cursorrules resolves to claude-code as primary (full > advisory)', () => {
    const claudeInfo = info(marker('claude-code', 'full'));
    const cursorInfo = info(marker('cursor', 'advisory', 1));
    const inv = inventory(claudeInfo, cursorInfo);

    const target = resolveFn(inv);

    expect(target.primary.marker.platform).toBe('claude-code');
    expect(target.primary.marker.enforcement).toBe('full');
    expect(target.secondaries).toHaveLength(1);
    expect(target.secondaries[0].marker.platform).toBe('cursor');
    expect(target.method).toBe('auto-enforcement');
    expect(target.platformCount).toBe(2);
  });

  it('two advisory platforms without explicit target rejects with actionable error', () => {
    const cursorInfo = info(marker('cursor', 'advisory', 1));
    const copilotInfo = info(marker('github-copilot', 'advisory', 1));
    const inv = inventory(cursorInfo, copilotInfo);

    expect(() => resolveFn(inv)).toThrow(/ambiguous platform/i);
    try {
      resolveFn(inv);
    } catch (e: unknown) {
      const msg = (e as Error).message;
      // Error must be actionable: include claws.json guidance
      expect(msg).toContain('claws.json');
      expect(msg).toContain('targets');
    }
  });

  it('claws.json targets override auto-detection precedence', () => {
    const claudeInfo = info(marker('claude-code', 'full'));
    const cursorInfo = info(marker('cursor', 'advisory', 1));
    const inv = inventory(claudeInfo, cursorInfo);

    const target = resolveFn(inv, { targets: ['cursor'] });

    expect(target.primary.marker.platform).toBe('cursor');
    expect(target.method).toBe('config-override');
    expect(target.secondaries).toHaveLength(1);
    expect(target.secondaries[0].marker.platform).toBe('claude-code');
  });

  it('single platform inventory resolves without ambiguity', () => {
    const claudeInfo = info(marker('claude-code', 'full'));
    const inv = inventory(claudeInfo);

    const target = resolveFn(inv);

    expect(target.primary.marker.platform).toBe('claude-code');
    expect(target.secondaries).toHaveLength(0);
    expect(target.method).toBe('single-platform');
    expect(target.platformCount).toBe(1);
  });

  it('case-sensitive marker matching: CLAUDE.md vs claude.md paths preserved', () => {
    // Simulate a detection where the marker file has the exact case as found on disk
    const m: MarkerResult = {
      platform: 'claude-code',
      confidence: 1.0,
      enforcement: 'full',
      defaultTrustTier: 2,
      markerFiles: ['/workspace/CLAUDE.md'],
    };
    const claudeInfo = info(m);
    const inv = inventory(claudeInfo);

    const target = resolveFn(inv);

    expect(target.primary.marker.platform).toBe('claude-code');
    expect(target.primary.marker.markerFiles[0]).toBe('/workspace/CLAUDE.md');
    // Verify detection is based on platform identity, not file name casing
    expect(target.method).toBe('single-platform');
  });
});
