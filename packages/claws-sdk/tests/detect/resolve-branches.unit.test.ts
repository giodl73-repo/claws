/**
 * L0: resolve() — branch coverage for config targets not matching,
 * empty inventory error, and three-way enforcement resolution.
 */

import { describe, it, expect } from 'vitest';
import { resolve as resolveFn } from '../../src/detect/resolve.js';
import type {
  PlatformInventory,
  PlatformInfo,
  MarkerResult,
} from '../../src/detect/types.js';

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

function info(m: MarkerResult): PlatformInfo {
  return { marker: m };
}

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

describe('resolve() — branch coverage', () => {
  it('throws actionable error when no platforms detected', () => {
    const inv = inventory();
    expect(() => resolveFn(inv)).toThrow(/no platforms detected/i);
    try {
      resolveFn(inv);
    } catch (e: unknown) {
      expect((e as Error).message).toContain('claws init');
    }
  });

  it('throws when config targets do not match any detected platform', () => {
    const claudeInfo = info(marker('claude-code', 'full'));
    const inv = inventory(claudeInfo);

    expect(() => resolveFn(inv, { targets: ['cursor', 'github-copilot'] })).toThrow(
      /do not match any detected platform/i,
    );
    try {
      resolveFn(inv, { targets: ['cursor'] });
    } catch (e: unknown) {
      const msg = (e as Error).message;
      expect(msg).toContain('claude-code'); // lists available
      expect(msg).toContain('claws.json');
    }
  });

  it('config targets selects first match when multiple targets given', () => {
    const claudeInfo = info(marker('claude-code', 'full'));
    const cursorInfo = info(marker('cursor', 'advisory', 1));
    const inv = inventory(claudeInfo, cursorInfo);

    // Targets lists cursor first — it should be selected
    const target = resolveFn(inv, { targets: ['cursor', 'claude-code'] });
    expect(target.primary.marker.platform).toBe('cursor');
    expect(target.method).toBe('config-override');
  });

  it('resolves three platforms by enforcement rank (full wins over advisory and explicit-only)', () => {
    const claudeInfo = info(marker('claude-code', 'full'));
    const cursorInfo = info(marker('cursor', 'advisory', 1));
    const copilotInfo = info(marker('github-copilot', 'explicit-only', 1));
    const inv = inventory(claudeInfo, cursorInfo, copilotInfo);

    const target = resolveFn(inv);
    expect(target.primary.marker.platform).toBe('claude-code');
    expect(target.method).toBe('auto-enforcement');
    expect(target.secondaries).toHaveLength(2);
    expect(target.platformCount).toBe(3);
  });

  it('empty targets array falls through to auto-resolution', () => {
    const claudeInfo = info(marker('claude-code', 'full'));
    const inv = inventory(claudeInfo);

    // Empty targets array should not use config-override path
    const target = resolveFn(inv, { targets: [] });
    expect(target.method).toBe('single-platform');
  });
});
