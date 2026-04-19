/**
 * L0: R5 fail-closed enforcement unit tests.
 *
 * Free-tier R5 fires on ambiguous governance violations, R5-count anomalies,
 * and workspace error diagnostics. Cross-rule conflict reports (OBO,
 * multi-constraint) are a paid-tier extension and not wired into enforceR5.
 */

import { describe, it, expect } from 'vitest';
import { enforceR5 } from '../../../src/compiler/enforce/r5.js';
import { compileGuard } from '../../../src/compiler/enforce/guard.js';
import { CompilationDeniedError } from '../../../src/compiler/enforce/errors.js';
import type { GovAnalysis, GovViolation } from '../../../src/ir/gov-analysis.js';
import type { OCWorkspaceIR } from '../../../src/compiler/ir/workspace-ir.js';
import type { FileReference } from '../../../src/compiler/ir/field-types.js';

// ── Helpers ────────────────────────────────────────────────────────────

function fileRef(path: string): FileReference {
  return { path, hash: 'abc123', size: 100 };
}

function minimalWorkspaceIR(overrides?: Partial<OCWorkspaceIR>): OCWorkspaceIR {
  return {
    soul: { persona: 'test', principles: [], boundaries: [], source: fileRef('SOUL.md') },
    tools: { tools: [], source: fileRef('TOOLS.md') },
    agents: { agents: [], delegations: [], source: fileRef('AGENTS.md') },
    memory: { entries: [], hasIndex: false, source: fileRef('MEMORY.md') },
    identity: { organization: 'test-org', team: 'test-team', authMethod: 'none', roles: [], source: fileRef('IDENTITY.md') },
    user: { role: 'dev', bounds: [], platform: 'oc', environment: {}, source: fileRef('USER.md') },
    heartbeat: { schedules: [], source: fileRef('HEARTBEAT.md') },
    skills: { skills: [], source: fileRef('skills/') },
    lobster: { name: 'default', description: 'wf', steps: [], dependencies: {}, source: fileRef('lobster.yaml') },
    compiler: { compilerVersion: '0.1.0', compiledAt: '2026-04-16T00:00:00Z', schemaVersion: 1 },
    diagnostics: [],
    ...overrides,
  };
}

function cleanAnalysis(overrides?: Partial<GovAnalysis>): GovAnalysis {
  return {
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
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('enforceR5', () => {
  it('clean analysis passes R5', () => {
    const analysis = cleanAnalysis({
      warnings: [
        { ruleId: 'R2-01', level: 2, message: 'minor', subRuleDiagnosticCode: 'G-INPUT-01', category: 'G-INPUT', subRuleIndex: 1 },
      ],
    });
    const workspace = minimalWorkspaceIR();

    const result = enforceR5(analysis, workspace);

    expect(result.ok).toBe(true);
    expect(result.rulesChecked).toBeGreaterThan(0);
  });

  it('ambiguous rule triggers fail-closed', () => {
    const ambiguousViolation: GovViolation = {
      ruleId: 'R3-TOOL-SCOPE',
      level: 3,
      message: 'Tool scope is ambiguous — both tighten and relax apply',
      target: 'file-writer',
      diagnosticCode: 'CLAWS-V003',
      fixSuggestions: [
        { direction: 'tighten', description: 'Remove tool entirely', target: 'file-writer' },
        { direction: 'relax', description: 'Expand scope to all files', target: 'file-writer' },
      ],
      toolFuzzyMatches: [],
    };

    const analysis = cleanAnalysis({ violations: [ambiguousViolation] });
    const result = enforceR5(analysis, minimalWorkspaceIR());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]!.rule).toBe('R3-TOOL-SCOPE');
      expect(result.violations[0]!.explanation).toContain('cannot be definitively resolved');
    }
  });

  it('workspace error diagnostic triggers fail-closed', () => {
    const workspace = minimalWorkspaceIR({
      diagnostics: [
        { severity: 'error', message: 'Broken SOUL.md', file: 'SOUL.md', code: 'WS-ERR-001' },
      ],
    });

    const result = enforceR5(cleanAnalysis(), workspace);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]!.rule).toBe('WS-ERR-001');
    }
  });

  it('multiple violations collected', () => {
    const ambiguousViolation: GovViolation = {
      ruleId: 'R5-CRITICAL',
      level: 5,
      message: 'Critical rule cannot be resolved',
      target: 'api-caller',
      diagnosticCode: 'CLAWS-V005',
      fixSuggestions: [],
      toolFuzzyMatches: [],
    };

    const fuzzyViolation: GovViolation = {
      ruleId: 'R3-TOOL-REF',
      level: 3,
      message: 'Tool reference is ambiguous',
      target: 'file-reed',
      diagnosticCode: 'CLAWS-V010',
      fixSuggestions: [],
      toolFuzzyMatches: [{ original: 'file-reed', suggestion: 'file-read', score: 0.9 }],
    };

    const workspace = minimalWorkspaceIR({
      diagnostics: [
        { severity: 'error', message: 'Broken SOUL.md', file: 'SOUL.md', code: 'WS-ERR-001' },
      ],
    });

    const analysis = cleanAnalysis({ violations: [ambiguousViolation, fuzzyViolation] });
    const result = enforceR5(analysis, workspace);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // 2 ambiguous violations + 1 workspace diag = 3
      expect(result.violations).toHaveLength(3);
      const rules = result.violations.map((v) => v.rule);
      expect(rules).toContain('R5-CRITICAL');
      expect(rules).toContain('R3-TOOL-REF');
      expect(rules).toContain('WS-ERR-001');
    }
  });

  it('empty analysis passes', () => {
    const analysis = cleanAnalysis();
    const workspace = minimalWorkspaceIR();

    const result = enforceR5(analysis, workspace);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Even with no violations/warnings, rules checked includes the R5 count check
      expect(result.rulesChecked).toBe(1);
    }
  });

  it('analysis with all rules resolved passes', () => {
    // Non-ambiguous violations (no bidirectional fix, no fuzzy, not R5)
    const resolvedViolation: GovViolation = {
      ruleId: 'R2-SCOPE-NARROW',
      level: 2,
      message: 'Tool scope too narrow',
      target: 'logger',
      diagnosticCode: 'CLAWS-V002',
      fixSuggestions: [
        { direction: 'relax', description: 'Widen scope', target: 'logger' },
      ],
      toolFuzzyMatches: [],
    };

    // Warning diagnostic (not error, does not trigger fail-closed)
    const workspace = minimalWorkspaceIR({
      diagnostics: [
        { severity: 'warning', message: 'Missing optional', file: 'USER.md', code: 'WS-WARN-001' },
      ],
    });

    const analysis = cleanAnalysis({
      violations: [resolvedViolation],
      warnings: [
        { ruleId: 'R1-INFO', level: 1, message: 'info', subRuleDiagnosticCode: 'G-INPUT-01', category: 'G-INPUT', subRuleIndex: 1 },
      ],
      effectiveR5Count: { derived: 3, overridden: 1, total: 4 },
    });

    const result = enforceR5(analysis, workspace);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rulesChecked).toBeGreaterThan(0);
    }
  });
});

// ── Branch coverage: R5 count anomaly ────────────────────────────────

describe('enforceR5 R5 count anomaly', () => {
  it('triggers fail-closed when overridden > derived', () => {
    const analysis = cleanAnalysis({
      effectiveR5Count: { derived: 1, overridden: 5, total: 6 },
    });

    const result = enforceR5(analysis, minimalWorkspaceIR());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]!.rule).toBe('R5-COUNT-ANOMALY');
      expect(result.violations[0]!.severity).toBe('critical');
      expect(result.violations[0]!.context).toContain('Derived: 1');
      expect(result.violations[0]!.context).toContain('overridden: 5');
    }
  });
});

// ── Branch coverage: severity mapping ────────────────────────────────

describe('enforceR5 severity mapping', () => {
  it('maps R4 violations to high severity', () => {
    const v: GovViolation = {
      ruleId: 'R4-HIGH',
      level: 4,
      message: 'High-severity issue',
      target: 'tool-x',
      diagnosticCode: 'CLAWS-V004',
      fixSuggestions: [
        { direction: 'tighten', description: 'a', target: 'tool-x' },
        { direction: 'relax', description: 'b', target: 'tool-x' },
      ],
      toolFuzzyMatches: [],
    };

    const result = enforceR5(cleanAnalysis({ violations: [v] }), minimalWorkspaceIR());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations[0]!.severity).toBe('high');
    }
  });

  it('maps R3 violations to medium severity', () => {
    const v: GovViolation = {
      ruleId: 'R3-MEDIUM',
      level: 3,
      message: 'Medium-severity issue',
      target: 'tool-y',
      diagnosticCode: 'CLAWS-V003',
      fixSuggestions: [
        { direction: 'tighten', description: 'a', target: 'tool-y' },
        { direction: 'relax', description: 'b', target: 'tool-y' },
      ],
      toolFuzzyMatches: [],
    };

    const result = enforceR5(cleanAnalysis({ violations: [v] }), minimalWorkspaceIR());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations[0]!.severity).toBe('medium');
    }
  });
});

// ── CompilationDeniedError unit tests ────────────────────────────────

describe('CompilationDeniedError', () => {
  it('constructs with violations and formats message', () => {
    const err = new CompilationDeniedError(
      [
        { rule: 'R5-TEST', context: 'ctx', severity: 'critical', explanation: 'Test explanation' },
      ],
      5,
    );

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('CompilationDeniedError');
    expect(err.violations).toHaveLength(1);
    expect(err.rulesChecked).toBe(5);
    expect(err.message).toContain('Compilation denied');
    expect(err.message).toContain('1 R5 fail-closed violation');
    expect(err.message).toContain('R5-TEST');
    expect(err.message).toContain('CRITICAL');
    expect(err.message).toContain('Test explanation');
    expect(err.message).toContain('5 rules checked');
  });

  it('pluralizes correctly for multiple violations', () => {
    const err = new CompilationDeniedError(
      [
        { rule: 'R5-A', context: 'a', severity: 'critical', explanation: 'First' },
        { rule: 'R5-B', context: 'b', severity: 'high', explanation: 'Second' },
      ],
      10,
    );

    expect(err.message).toContain('2 R5 fail-closed violations');
    expect(err.message).toContain('10 rules checked');
    expect(err.message).toContain('1.');
    expect(err.message).toContain('2.');
  });

  it('handles single rule checked without plural', () => {
    const err = new CompilationDeniedError(
      [{ rule: 'R5-ONLY', context: 'only', severity: 'critical', explanation: 'Only one' }],
      1,
    );

    expect(err.message).toContain('1 R5 fail-closed violation detected');
    expect(err.message).not.toContain('violations detected');
    expect(err.message).toContain('1 rule checked');
    expect(err.message).not.toContain('1 rules checked');
  });
});

// ── compileGuard unit tests ──────────────────────────────────────────

describe('compileGuard unit', () => {
  it('does not throw for clean input', () => {
    expect(() => {
      compileGuard(cleanAnalysis(), minimalWorkspaceIR());
    }).not.toThrow();
  });

  it('throws CompilationDeniedError for R5 violation', () => {
    const analysis = cleanAnalysis({
      violations: [{
        ruleId: 'R5-UNIT',
        level: 5,
        message: 'R5 unit test',
        target: 'unit-target',
        diagnosticCode: 'CLAWS-U001',
        fixSuggestions: [],
        toolFuzzyMatches: [],
      }],
    });

    expect(() => {
      compileGuard(analysis, minimalWorkspaceIR());
    }).toThrow(CompilationDeniedError);
  });
});
