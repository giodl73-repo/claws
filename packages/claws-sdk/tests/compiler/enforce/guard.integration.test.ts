/**
 * L1: compileGuard integration tests.
 *
 * Covers: clean analysis passes, R5 violation throws, error formatting,
 * reader-output/IR integration. Free-tier guard takes (analysis, workspace)
 * only — rich conflict reports are paid-tier and not exposed here.
 */

import { describe, it, expect } from 'vitest';
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

describe('compileGuard', () => {
  it('passes clean analysis without throwing', () => {
    expect(() => {
      compileGuard(cleanAnalysis(), minimalWorkspaceIR());
    }).not.toThrow();
  });

  it('throws CompilationDeniedError on violation', () => {
    const r5Violation: GovViolation = {
      ruleId: 'R5-DENY-ALL',
      level: 5,
      message: 'Critical security rule violation',
      target: 'admin-api',
      diagnosticCode: 'CLAWS-V099',
      fixSuggestions: [],
      toolFuzzyMatches: [],
    };

    const analysis = cleanAnalysis({ violations: [r5Violation] });

    expect(() => {
      compileGuard(analysis, minimalWorkspaceIR());
    }).toThrow(CompilationDeniedError);

    try {
      compileGuard(analysis, minimalWorkspaceIR());
    } catch (err) {
      expect(err).toBeInstanceOf(CompilationDeniedError);
      const denied = err as CompilationDeniedError;
      expect(denied.violations).toHaveLength(1);
      expect(denied.violations[0]!.rule).toBe('R5-DENY-ALL');
      expect(denied.rulesChecked).toBeGreaterThan(0);
    }
  });

  it('error message includes rule-by-rule explanation', () => {
    const v1: GovViolation = {
      ruleId: 'R5-SCOPE',
      level: 5,
      message: 'Scope violation',
      target: 'file-writer',
      diagnosticCode: 'CLAWS-V001',
      fixSuggestions: [],
      toolFuzzyMatches: [],
    };

    const v2: GovViolation = {
      ruleId: 'R3-FUZZY',
      level: 3,
      message: 'Fuzzy match ambiguity',
      target: 'mailer',
      diagnosticCode: 'CLAWS-V002',
      fixSuggestions: [],
      toolFuzzyMatches: [{ original: 'mailer', suggestion: 'sender', score: 0.8 }],
    };

    const analysis = cleanAnalysis({ violations: [v1, v2] });

    try {
      compileGuard(analysis, minimalWorkspaceIR());
    } catch (err) {
      const denied = err as CompilationDeniedError;
      expect(denied.message).toContain('R5-SCOPE');
      expect(denied.message).toContain('R3-FUZZY');
      expect(denied.message).toContain('Compilation denied');
      expect(denied.message).toContain('2 R5 fail-closed violations');
      expect(denied.message).toContain('1.');
      expect(denied.message).toContain('2.');
      expect(denied.message).toContain('CRITICAL');
    }
  });

  it('integrates with reader output and IR types', () => {
    // Build a workspace with realistic reader output including tools and agents
    const workspace = minimalWorkspaceIR({
      tools: {
        tools: [
          { name: 'read-file', description: 'Read files', trustLevel: 1, oboFlag: false, line: 1 },
          { name: 'write-file', description: 'Write files', trustLevel: 3, oboFlag: true, line: 5 },
        ],
        source: fileRef('TOOLS.md'),
      },
      agents: {
        agents: [
          { name: 'code-agent', description: 'Writes code', tools: ['read-file', 'write-file'], line: 1 },
        ],
        delegations: [
          { from: 'code-agent', to: 'review-agent', tools: ['read-file'], line: 10 },
        ],
        source: fileRef('AGENTS.md'),
      },
      identity: {
        organization: 'acme-corp',
        team: 'platform',
        authMethod: 'sso',
        ssoProvider: 'okta',
        roles: [
          { role: 'admin', permissions: ['read', 'write', 'deploy'] },
          { role: 'viewer', permissions: ['read'] },
        ],
        source: fileRef('IDENTITY.md'),
      },
    });

    const analysis = cleanAnalysis({
      warnings: [
        { ruleId: 'R2-TOOL-TRUST', level: 2, message: 'Trust level advisory', subRuleDiagnosticCode: 'G-TRUST-01', category: 'G-TRUST', subRuleIndex: 1 },
      ],
      effectiveR5Count: { derived: 2, overridden: 1, total: 3 },
    });

    expect(() => {
      compileGuard(analysis, workspace);
    }).not.toThrow();
  });
});
