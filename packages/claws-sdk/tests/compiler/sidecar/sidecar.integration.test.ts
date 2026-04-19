/**
 * L1 integration tests for sidecar resolver + detection heuristics.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { resolveSidecar } from '#src/compiler/sidecar/resolver.js';
import { detectWorkspacePlatforms } from '#src/compiler/sidecar/detect.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('sidecar resolver + heuristics integration', () => {
  it('resolver + heuristics produce consistent results for fixture workspace', async () => {
    const claudeFixture = resolve(FIXTURES, 'sidecar-heuristic-claude');

    // Direct heuristic detection
    const heuristics = await detectWorkspacePlatforms(claudeFixture);
    expect(heuristics.length).toBeGreaterThanOrEqual(1);
    expect(heuristics[0]!.platform).toBe('claude-code');

    // Resolver falls back to same heuristics
    const result = await resolveSidecar(claudeFixture);
    expect(result.found).toBe(false);
    if (result.found) return;

    expect(result.heuristics).toEqual(heuristics);
  });

  it('sidecar overrides heuristic defaults when both present', async () => {
    const overrideFixture = resolve(FIXTURES, 'sidecar-override');

    // Heuristics would detect claude-code from CLAUDE.md
    const heuristics = await detectWorkspacePlatforms(overrideFixture);
    expect(heuristics.some((h) => h.platform === 'claude-code')).toBe(true);

    // But resolver returns the sidecar config, not heuristics
    const result = await resolveSidecar(overrideFixture);
    expect(result.found).toBe(true);
    if (!result.found) return;

    expect(result.sidecar.version).toBe('1.2.3');
    expect(result.sidecar.targets).toEqual(['claude-code']);
    expect(result.sidecar.options?.strict).toBe(true);
    // heuristics field is undefined when sidecar is found
    expect(result.heuristics).toBeUndefined();
  });
});
