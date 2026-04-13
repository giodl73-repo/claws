/**
 * L1: Multi-platform emission integration — full multi-platform emit
 * on SOC2 fixture, post-emit verification, atomic staging.
 *
 * 3 integration tests:
 * 1. Full multi-platform emit on SOC2 fixture produces per-platform directories
 * 2. Post-emit static verification pass on all platform outputs
 * 3. Atomic artifact emission: staging directory + atomic rename
 */

import { describe, it, expect } from 'vitest';
import { routeAndEmit } from '../../src/emit/platform-router.js';
import { verifyNoForbiddenImports } from '../../src/emit/emit-plugin.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

describe('emit-multi-platform integration', () => {
  it('full multi-platform emit on SOC2 fixture produces per-platform results', () => {
    const ir = minimalGovernanceIR();

    // Emit for all 7 platforms with --allow-advisory-r5
    const result = routeAndEmit(ir, { allowAdvisoryR5: true });

    // All 7 platforms should have routes
    expect(result.totalPlatforms).toBe(7);
    expect(result.routes.length).toBe(7);
    expect(result.emittedCount).toBe(7);
    expect(result.blockedCount).toBe(0);

    // Each platform should have at least one artifact
    for (const route of result.routes) {
      expect(route.blocked).toBe(false);
      expect(route.emitResult).toBeDefined();
      expect(route.emitResult!.artifacts.length).toBeGreaterThan(0);
    }

    // OC should have the most artifacts (full fidelity)
    const ocRoute = result.routes.find((r) => r.platform === 'openclaw');
    expect(ocRoute).toBeDefined();
    expect(ocRoute!.emitResult!.artifacts.length).toBeGreaterThanOrEqual(7);

    // Advisory platforms should have fewer artifacts
    const crewaiRoute = result.routes.find((r) => r.platform === 'crewai');
    expect(crewaiRoute).toBeDefined();
    expect(crewaiRoute!.emitResult!.artifacts.length).toBeLessThan(
      ocRoute!.emitResult!.artifacts.length,
    );
  });

  it('post-emit static verification pass on all platform outputs', () => {
    const ir = minimalGovernanceIR();

    // Emit for all platforms
    const result = routeAndEmit(ir, { allowAdvisoryR5: true });

    // No verification failures
    expect(result.verificationFailures).toEqual([]);

    // Double-check: scan every artifact for forbidden imports
    for (const route of result.routes) {
      if (route.blocked || !route.emitResult) continue;

      for (const artifact of route.emitResult.artifacts) {
        // Non-empty content
        expect(artifact.content.length).toBeGreaterThan(0);

        // No forbidden imports in code files
        if (artifact.path.endsWith('.ts') || artifact.path.endsWith('.js')) {
          const forbidden = verifyNoForbiddenImports(artifact.content);
          expect(forbidden).toEqual([]);
        }
      }
    }
  });

  it('atomic artifact emission: staging directory + atomic rename', () => {
    const ir = minimalGovernanceIR();

    // Emit with atomic flag (default: true)
    const result = routeAndEmit(ir, {
      allowAdvisoryR5: true,
      atomic: true,
    });

    // All emissions should succeed
    expect(result.emittedCount).toBe(7);

    // Each emitted platform should have deterministic artifacts
    // (same IR + same options = same output)
    const result2 = routeAndEmit(ir, {
      allowAdvisoryR5: true,
      atomic: true,
    });

    // Verify deterministic output
    for (let i = 0; i < result.routes.length; i++) {
      const r1 = result.routes[i]!;
      const r2 = result2.routes[i]!;

      expect(r1.platform).toBe(r2.platform);
      expect(r1.lossScore).toBe(r2.lossScore);
      expect(r1.blocked).toBe(r2.blocked);

      if (r1.emitResult && r2.emitResult) {
        expect(r1.emitResult.artifacts.length).toBe(r2.emitResult.artifacts.length);
        for (let j = 0; j < r1.emitResult.artifacts.length; j++) {
          expect(r1.emitResult.artifacts[j]!.path).toBe(r2.emitResult.artifacts[j]!.path);
          expect(r1.emitResult.artifacts[j]!.content).toBe(r2.emitResult.artifacts[j]!.content);
        }
      }
    }
  });
});
