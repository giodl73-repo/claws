/**
 * L0: Loss-aware routing — path enumeration, optimal route selection,
 * --strict-loss blocking, fidelity scoring.
 *
 * 4 unit tests:
 * 1. Loss matrix scores OC as zero loss for all governance features
 * 2. Path enumerator returns optimal route minimizing total loss
 * 3. --strict-loss blocks advisory emission for R5 tools
 * 4. --strict-loss allows advisory emission for R1-R2 tools
 */

import { describe, it, expect } from 'vitest';
import {
  buildLossMatrix,
  platformLossScore,
  featureLoss,
  canEnforceAtL2,
} from '../../src/emit/loss-matrix.js';
import { routeAndEmit } from '../../src/emit/platform-router.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

describe('loss-routing', () => {
  it('loss matrix scores OC as zero loss for all governance features', () => {
    const matrix = buildLossMatrix();

    // OC total loss must be 0
    const ocScore = platformLossScore(matrix, 'openclaw');
    expect(ocScore).toBe(0);

    // Every individual feature must be 0 loss on OC
    for (const feature of matrix.features) {
      const cell = featureLoss(matrix, 'openclaw', feature);
      expect(cell).toBeDefined();
      expect(cell!.lossScore).toBe(0);
      expect(cell!.enforcement).toBe('full');
    }

    // OC must be able to enforce all features at L2+
    for (const feature of matrix.features) {
      expect(canEnforceAtL2(matrix, 'openclaw', feature)).toBe(true);
    }
  });

  it('path enumerator returns optimal route minimizing total loss', () => {
    const ir = minimalGovernanceIR();

    // Emit for all platforms with --allow-advisory-r5 to avoid blocking
    const result = routeAndEmit(ir, { allowAdvisoryR5: true });

    // All 7 platforms should emit (no blocking)
    expect(result.emittedCount).toBe(7);
    expect(result.blockedCount).toBe(0);

    // Routes should be sorted by loss score (ascending)
    const lossScores = result.routes.map((r) => r.lossScore);
    for (let i = 1; i < lossScores.length; i++) {
      expect(lossScores[i]!).toBeGreaterThanOrEqual(lossScores[i - 1]!);
    }

    // OC should be first (zero loss)
    expect(result.routes[0]!.platform).toBe('openclaw');
    expect(result.routes[0]!.lossScore).toBe(0);

    // Advisory platforms should have higher loss scores than OC
    for (const route of result.routes.slice(1)) {
      expect(route.lossScore).toBeGreaterThan(0);
    }
  });

  it('--strict-loss blocks advisory emission for R5 tools', () => {
    const ir = minimalGovernanceIR();
    // minimalGovernanceIR has R5 tools (delete_database is critical, deny intent at level 5)

    // Default: --strict-loss (allowAdvisoryR5 = false)
    const result = routeAndEmit(ir);

    // OC should NOT be blocked (full enforcement)
    const ocRoute = result.routes.find((r) => r.platform === 'openclaw');
    expect(ocRoute).toBeDefined();
    expect(ocRoute!.blocked).toBe(false);

    // Advisory platforms SHOULD be blocked
    const cursorRoute = result.routes.find((r) => r.platform === 'cursor');
    expect(cursorRoute).toBeDefined();
    expect(cursorRoute!.blocked).toBe(true);
    expect(cursorRoute!.blockReason).toContain('CLAWS-E310');
    expect(cursorRoute!.blockReason).toContain('--strict-loss');

    // Blocked platforms report should include R5 tools and missing capabilities
    expect(result.blockedPlatforms.length).toBeGreaterThan(0);
    const cursorBlocked = result.blockedPlatforms.find((b) => b.platform === 'cursor');
    expect(cursorBlocked).toBeDefined();
    expect(cursorBlocked!.r5Tools.length).toBeGreaterThan(0);
    expect(cursorBlocked!.missingCapabilities.length).toBeGreaterThan(0);

    // Block reason must include actionable info (R1 amendment: Platform-Eng)
    expect(cursorRoute!.blockReason).toContain('delete_database');
    expect(cursorRoute!.blockReason).toContain('--allow-advisory-r5');
  });

  it('--strict-loss allows advisory emission for R1-R2 tools', () => {
    // Create an IR with only R1-R2 tools (no R5)
    const baseIR = minimalGovernanceIR();
    const lowRiskIR: GovernanceIR = {
      ...baseIR,
      capabilities: {
        ...baseIR.capabilities,
        tools: [
          {
            name: 'read_file',
            description: 'Read a file',
            riskLevel: 'low',
            oboFlag: false,
            classification: 'filesystem',
          },
          {
            name: 'list_dir',
            description: 'List directory',
            riskLevel: 'low',
            oboFlag: false,
            classification: 'filesystem',
          },
        ],
      },
      intents: [
        {
          id: 'intent-003',
          ruleId: 'AUD-001',
          level: 2,
          kind: 'label',
          description: 'Audit label for read_file',
          key: 'read_file',
          value: 'audit-enabled',
        },
      ],
      analysis: {
        ...baseIR.analysis,
        violations: [],
        enforcementPlan: {
          blockedTools: [],
          requiredApprovals: [],
          auditOnlyRules: ['AUD-001'],
          channelRedactions: [],
          ruleSuppressions: [],
        },
        effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
      },
    };

    // Default strict-loss mode — but no R5 tools, so nothing should be blocked
    const result = routeAndEmit(lowRiskIR);

    // No platforms should be blocked (no R5 tools to gate)
    expect(result.blockedCount).toBe(0);
    expect(result.emittedCount).toBe(7);

    // All platforms should have emit results
    for (const route of result.routes) {
      expect(route.blocked).toBe(false);
      expect(route.emitResult).toBeDefined();
    }
  });
});
