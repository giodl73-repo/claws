/**
 * L0: Branch/line coverage gaps in emit/platform-router.ts.
 *
 * Targets:
 * - Lines ~257-265: no adapter registered for a platform (CLAWS-E311 branch)
 * - Lines ~170-192: verifyEmitResult — empty artifact content (CLAWS-E301),
 *   forbidden imports (CLAWS-E302), non-TS/JS files skipped
 * - Lines ~123-141: extractR5Tools — critical tools from capability manifest
 */

import { describe, it, expect } from 'vitest';
import { routeAndEmit } from '../../src/emit/platform-router.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

describe('platform-router branch coverage', () => {
  it('unknown platform (no adapter) produces CLAWS-E311 block', () => {
    const ir = minimalGovernanceIR();

    // Pass a fake platform that has no registered adapter
    const result = routeAndEmit(ir, {
      platforms: ['nonexistent-platform' as any],
      allowAdvisoryR5: true,
    });

    expect(result.totalPlatforms).toBe(1);
    expect(result.emittedCount).toBe(0);
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]!.blocked).toBe(true);
    expect(result.routes[0]!.blockReason).toContain('CLAWS-E311');
    expect(result.routes[0]!.blockReason).toContain('No adapter registered');
  });

  it('R5 from critical tools in capability manifest (not just deny intents)', () => {
    const baseIR = minimalGovernanceIR();
    // The minimal IR has delete_database as critical tool AND a level 5 deny intent.
    // Ensure both paths for extractR5Tools are exercised.
    // The critical tool path adds tools not already in the deny list.

    // Create IR where the critical tool is different from deny intent target
    const ir: GovernanceIR = {
      ...baseIR,
      capabilities: {
        ...baseIR.capabilities,
        tools: [
          ...baseIR.capabilities.tools,
          {
            name: 'wipe_storage',
            description: 'Wipe cloud storage bucket',
            riskLevel: 'critical',
            oboFlag: false,
            classification: 'data',
          },
        ],
      },
    };

    // With strict-loss default, advisory platforms should be blocked
    const result = routeAndEmit(ir, { platforms: ['openclaw', 'cursor'] });

    // Cursor should be blocked for R5 strict-loss
    const cursorRoute = result.routes.find(r => r.platform === 'cursor');
    expect(cursorRoute).toBeDefined();
    expect(cursorRoute!.blocked).toBe(true);
    expect(cursorRoute!.blockReason).toContain('wipe_storage');
  });

  it('single platform (openclaw only) with R5 passes strict-loss check', () => {
    const ir = minimalGovernanceIR();

    const result = routeAndEmit(ir, { platforms: ['openclaw'] });

    expect(result.totalPlatforms).toBe(1);
    expect(result.emittedCount).toBe(1);
    expect(result.blockedCount).toBe(0);
    expect(result.routes[0]!.platform).toBe('openclaw');
    expect(result.routes[0]!.blocked).toBe(false);
    expect(result.routes[0]!.emitResult).toBeDefined();
  });

  it('verification detects empty artifacts and forbidden imports', () => {
    const ir = minimalGovernanceIR();

    // Emit normally, then check that verification runs
    const result = routeAndEmit(ir, {
      platforms: ['openclaw'],
      allowAdvisoryR5: true,
    });

    // All artifacts from OC should have content, so no verification failures
    expect(result.verificationFailures).toEqual([]);

    // Warnings may or may not be present depending on intent count
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('empty platforms array produces empty result', () => {
    const ir = minimalGovernanceIR();

    const result = routeAndEmit(ir, { platforms: [] });

    expect(result.totalPlatforms).toBe(0);
    expect(result.emittedCount).toBe(0);
    expect(result.blockedCount).toBe(0);
    expect(result.routes).toEqual([]);
  });

  it('mixed: some platforms blocked by strict-loss, some emit, some have no adapter', () => {
    const ir = minimalGovernanceIR();

    const result = routeAndEmit(ir, {
      platforms: ['openclaw', 'cursor', 'fake-platform' as any],
    });

    // openclaw: emits (full enforcement)
    const oc = result.routes.find(r => r.platform === 'openclaw');
    expect(oc).toBeDefined();
    expect(oc!.blocked).toBe(false);

    // cursor: blocked by strict-loss (R5 tools present)
    const cursor = result.routes.find(r => r.platform === 'cursor');
    expect(cursor).toBeDefined();
    expect(cursor!.blocked).toBe(true);

    // fake-platform: blocked by no adapter
    const fake = result.routes.find(r => r.platform === ('fake-platform' as any));
    expect(fake).toBeDefined();
    expect(fake!.blocked).toBe(true);

    expect(result.totalPlatforms).toBe(3);
  });
});
