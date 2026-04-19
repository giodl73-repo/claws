/**
 * L0 unit tests for GovernanceCodeLensProvider (pulse 56).
 *
 * Required (2 tests):
 *   1. Tool declaration gets R-level code lens
 *   2. Deny rule gets classification code lens
 *
 * Plus branch-coverage tests to meet 95/90/95/95 per-file.
 */

import { describe, it, expect } from 'vitest';
import {
  computeGovernanceCodeLenses,
  computeToolLenses,
  computeDenyRuleLenses,
  formatRiskLens,
  formatDenyLens,
} from '../../src/providers/governance-code-lens.js';
import type { GovernanceIRLike } from '../../src/compilation-host.js';

function makeIR(partial: {
  tools?: readonly { name: string; riskLevel: string | number; locked?: boolean }[];
  intents?: readonly { kind: string; target: string; source?: string }[];
}): GovernanceIRLike {
  return {
    capabilities: { tools: partial.tools ?? [], skills: [], agents: [], workflows: [] },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: partial.intents ?? [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: '2026-04-17T00:00:00Z',
      schemaVersion: 1,
    },
  };
}

describe('GovernanceCodeLensProvider — L0 unit', () => {
  // Required test 1: R-level code lens per tool
  it('produces R-level code lens for a tool declaration in TOOLS.md', () => {
    const ir = makeIR({
      tools: [
        { name: 'ping-site', riskLevel: 'R1' },
        { name: 'send-email', riskLevel: 'R3' },
        { name: 'wire-funds', riskLevel: 'R5', locked: true },
      ],
    });
    const content = [
      '# Tools',
      'ping-site: health check',
      'send-email: messaging',
      'wire-funds: financial',
    ].join('\n');

    const lenses = computeGovernanceCodeLenses('file:///ws/TOOLS.md', ir, content);
    expect(lenses).toHaveLength(3);

    expect(lenses[0]!.display).toBe('R1 READ');
    expect(lenses[0]!.line).toBe(1);
    expect(lenses[0]!.kind).toBe('tool-risk');

    expect(lenses[1]!.display).toBe('R3 COMMUNICATE');
    expect(lenses[1]!.line).toBe(2);

    expect(lenses[2]!.display).toBe('R5 TRANSACT (locked)');
    expect(lenses[2]!.line).toBe(3);
  });

  // Required test 2: Deny rule classification code lens
  it('produces classification code lens for a deny rule in SOUL.md', () => {
    const ir = makeIR({
      intents: [
        { kind: 'deny', target: 'shell-exec', source: 'user' },
        { kind: 'deny', target: 'exfiltrate', source: 'compiler' },
      ],
    });
    const content = '# Soul\nshell-exec: forbidden\nexfiltrate: forbidden';

    const lenses = computeGovernanceCodeLenses('file:///ws/SOUL.md', ir, content);
    expect(lenses).toHaveLength(2);

    expect(lenses[0]!.display).toBe('Deny Rule (user-authored)');
    expect(lenses[0]!.kind).toBe('deny-rule');
    expect(lenses[0]!.line).toBe(1);

    expect(lenses[1]!.display).toBe('Deny Rule (compiler-injected)');
    expect(lenses[1]!.line).toBe(2);
  });

  // Branch-coverage tests
  it('formatRiskLens handles all five levels and lock state', () => {
    expect(formatRiskLens(1, false)).toBe('R1 READ');
    expect(formatRiskLens(2, false)).toBe('R2 OBSERVE');
    expect(formatRiskLens(3, false)).toBe('R3 COMMUNICATE');
    expect(formatRiskLens(4, false)).toBe('R4 MUTATE');
    expect(formatRiskLens(5, false)).toBe('R5 TRANSACT');
    expect(formatRiskLens(5, true)).toBe('R5 TRANSACT (locked)');
  });

  it('formatDenyLens defaults to user-authored when source missing', () => {
    expect(formatDenyLens(undefined)).toBe('Deny Rule (user-authored)');
    expect(formatDenyLens('user')).toBe('Deny Rule (user-authored)');
    expect(formatDenyLens('compiler')).toBe('Deny Rule (compiler-injected)');
  });

  it('skips tools with unknown risk level', () => {
    const ir = makeIR({
      tools: [{ name: 'mystery', riskLevel: 'xx-unknown' }],
    });
    const lenses = computeToolLenses(ir, '# Tools\nmystery');
    expect(lenses).toHaveLength(0);
  });

  it('skips non-deny intents', () => {
    const ir = makeIR({
      intents: [{ kind: 'label', target: 'pii' }],
    });
    const lenses = computeDenyRuleLenses(ir, '# Soul\npii');
    expect(lenses).toHaveLength(0);
  });

  it('returns empty array for non-governance URI', () => {
    const ir = makeIR({ tools: [{ name: 'x', riskLevel: 'R3' }] });
    const lenses = computeGovernanceCodeLenses('file:///ws/README.md', ir, '# Readme');
    expect(lenses).toHaveLength(0);
  });

  it('handles IR with no capabilities or intents arrays', () => {
    const bareIR: GovernanceIRLike = {
      capabilities: {},
      analysis: {},
      delegationMap: [],
      conflicts: {},
      compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-17T00:00:00Z', schemaVersion: 1 },
    } as unknown as GovernanceIRLike;

    expect(computeToolLenses(bareIR, '')).toHaveLength(0);
    expect(computeDenyRuleLenses(bareIR, '')).toHaveLength(0);
  });

  it('falls back to line 0 when target not found in content', () => {
    const ir = makeIR({
      tools: [{ name: 'ghost-tool', riskLevel: 'R4' }],
    });
    const lenses = computeToolLenses(ir, '# Tools\nsomething-else');
    expect(lenses[0]!.line).toBe(0);
  });
});
