/**
 * L0 unit tests for GovernanceDiagnosticProvider (pulse 56).
 *
 * Required (4 tests):
 *   1. R5 violation maps to Error diagnostic
 *   2. R3 violation maps to Warning diagnostic
 *   3. Missing elicitation gate maps to Information diagnostic
 *   4. Deny rule warning in SOUL.md maps to Warning diagnostic
 *
 * Plus branch-coverage tests to meet 95/90/95/95 per-file.
 */

import { describe, it, expect } from 'vitest';
import {
  computeGovernanceDiagnostics,
  computeToolDiagnostics,
  computeSoulDiagnostics,
  classifyGovernanceFile,
  normalizeRiskLevel,
  riskLevelToSeverity,
} from '../../src/providers/governance-diagnostic.js';
import type { GovernanceIRLike } from '../../src/compilation-host.js';

function makeIR(partial: {
  tools?: readonly { name: string; riskLevel: string | number; elicitationGate?: boolean; locked?: boolean }[];
  intents?: readonly { kind: string; target: string; source?: string; ruleId?: string }[];
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

describe('GovernanceDiagnosticProvider — L0 unit', () => {
  // Required test 1: R5 → Error
  it('maps R5 tool to Error diagnostic', () => {
    const ir = makeIR({
      tools: [{ name: 'shell-exec', riskLevel: 'R5', elicitationGate: true, locked: true }],
    });
    const content = '# Tools\nshell-exec: dangerous';
    const diags = computeGovernanceDiagnostics('file:///ws/TOOLS.md', ir, content);

    const r5 = diags.find((d) => d.code === 'CLAWS-G-R5');
    expect(r5).toBeDefined();
    expect(r5!.severity).toBe(1); // Error
    expect(r5!.message).toContain('R5');
    expect(r5!.message).toContain('locked');
    expect(r5!.range.start.line).toBe(1);
  });

  // Required test 2: R3 → Warning
  it('maps R3 tool to Warning diagnostic', () => {
    const ir = makeIR({
      tools: [{ name: 'send-email', riskLevel: 'R3' }],
    });
    const content = '# Tools\nsend-email: messaging';
    const diags = computeGovernanceDiagnostics('file:///ws/TOOLS.md', ir, content);

    const r3 = diags.find((d) => d.code === 'CLAWS-G-R3');
    expect(r3).toBeDefined();
    expect(r3!.severity).toBe(2); // Warning
    expect(r3!.source).toBe('claws-governance');
  });

  // Required test 3: Missing elicitation gate → Information
  it('maps missing elicitation gate on R5 tool to Information diagnostic', () => {
    const ir = makeIR({
      tools: [{ name: 'transfer-funds', riskLevel: 'R5', elicitationGate: false }],
    });
    const content = '# Tools\ntransfer-funds: money';
    const diags = computeGovernanceDiagnostics('file:///ws/TOOLS.md', ir, content);

    const elicit = diags.find((d) => d.code === 'CLAWS-G-ELICIT');
    expect(elicit).toBeDefined();
    expect(elicit!.severity).toBe(3); // Information
    expect(elicit!.message).toContain('elicitation gate');
  });

  // Required test 4: Deny rule warning in SOUL.md → Warning
  it('maps deny rule in SOUL.md to Warning diagnostic', () => {
    const ir = makeIR({
      intents: [{ kind: 'deny', target: 'shell-exec', source: 'user' }],
    });
    const content = '# Soul\nDeny shell-exec outright.';
    const diags = computeGovernanceDiagnostics('file:///ws/SOUL.md', ir, content);

    const deny = diags.find((d) => d.code === 'CLAWS-G-DENY');
    expect(deny).toBeDefined();
    expect(deny!.severity).toBe(2); // Warning
    expect(deny!.message).toContain('shell-exec');
    expect(deny!.message).toContain('user-authored');
  });

  // Branch-coverage tests to reach 95/90/95/95
  it('riskLevelToSeverity maps R1/R2 → Information', () => {
    expect(riskLevelToSeverity(1)).toBe(3);
    expect(riskLevelToSeverity(2)).toBe(3);
  });

  it('riskLevelToSeverity maps R4 → Warning', () => {
    expect(riskLevelToSeverity(4)).toBe(2);
  });

  it('normalizeRiskLevel handles numeric, token, and label forms', () => {
    expect(normalizeRiskLevel(3)).toBe(3);
    expect(normalizeRiskLevel('R4')).toBe(4);
    expect(normalizeRiskLevel('critical')).toBe(5);
    expect(normalizeRiskLevel('minimal')).toBe(1);
    expect(normalizeRiskLevel('low')).toBe(2);
    expect(normalizeRiskLevel('medium')).toBe(3);
    expect(normalizeRiskLevel('high')).toBe(4);
    expect(normalizeRiskLevel('2')).toBe(2);
  });

  it('normalizeRiskLevel returns undefined for unknown input', () => {
    expect(normalizeRiskLevel('bogus')).toBeUndefined();
    expect(normalizeRiskLevel(42)).toBeUndefined();
  });

  it('classifyGovernanceFile recognizes TOOLS.md, SOUL.md, otherwise other', () => {
    expect(classifyGovernanceFile('file:///ws/TOOLS.md')).toBe('tools');
    expect(classifyGovernanceFile('file:///ws/SOUL.md')).toBe('soul');
    expect(classifyGovernanceFile('file:///ws/AGENTS.md')).toBe('other');
    expect(classifyGovernanceFile('file:///c:/ws\\TOOLS.md')).toBe('tools');
    expect(classifyGovernanceFile('file:///c:/ws\\SOUL.md')).toBe('soul');
  });

  it('skips tools with unknown risk level', () => {
    const ir = makeIR({
      tools: [{ name: 'mystery', riskLevel: 'unknown-label' }],
    });
    const diags = computeToolDiagnostics(ir, '# Tools\nmystery');
    expect(diags).toHaveLength(0);
  });

  it('R5 with elicitationGate=true does not emit elicit info', () => {
    const ir = makeIR({
      tools: [{ name: 'wire', riskLevel: 'R5', elicitationGate: true }],
    });
    const diags = computeToolDiagnostics(ir, '# Tools\nwire');
    expect(diags.filter((d) => d.code === 'CLAWS-G-ELICIT')).toHaveLength(0);
    expect(diags.filter((d) => d.code === 'CLAWS-G-R5')).toHaveLength(1);
  });

  it('tool range falls back to line 0 when target not found in content', () => {
    const ir = makeIR({ tools: [{ name: 'missing-from-doc', riskLevel: 3 }] });
    const diags = computeToolDiagnostics(ir, '# Tools\nsomething-else');
    expect(diags[0]!.range.start.line).toBe(0);
  });

  it('deny intent from compiler source labels as compiler-injected', () => {
    const ir = makeIR({
      intents: [{ kind: 'deny', target: 'leak', source: 'compiler' }],
    });
    const diags = computeSoulDiagnostics(ir, '# Soul\nleak banned');
    expect(diags[0]!.message).toContain('compiler-injected');
  });

  it('non-deny intents in SOUL produce no diagnostics', () => {
    const ir = makeIR({
      intents: [{ kind: 'label', target: 'pii' }],
    });
    const diags = computeSoulDiagnostics(ir, '# Soul\npii data');
    expect(diags).toHaveLength(0);
  });

  it('returns empty array for non-governance URI', () => {
    const ir = makeIR({ tools: [{ name: 'x', riskLevel: 'R3' }] });
    const diags = computeGovernanceDiagnostics('file:///ws/README.md', ir, '# Readme');
    expect(diags).toHaveLength(0);
  });

  it('handles IR with missing capabilities or intents arrays', () => {
    const bareIR: GovernanceIRLike = {
      capabilities: {},
      analysis: {},
      // no intents, no delegationMap
      delegationMap: [],
      conflicts: {},
      compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-17T00:00:00Z', schemaVersion: 1 },
    } as unknown as GovernanceIRLike;

    expect(computeToolDiagnostics(bareIR, '')).toHaveLength(0);
    expect(computeSoulDiagnostics(bareIR, '')).toHaveLength(0);
  });

  it('omits (locked) when tool is not locked', () => {
    const ir = makeIR({
      tools: [{ name: 'read-docs', riskLevel: 'R1', locked: false }],
    });
    const diags = computeToolDiagnostics(ir, '# Tools\nread-docs');
    expect(diags[0]!.message).toContain('R1');
    expect(diags[0]!.message).not.toContain('locked');
  });
});
