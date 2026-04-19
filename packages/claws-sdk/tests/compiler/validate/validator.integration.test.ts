/**
 * L1 integration tests for the 12-check validator.
 *
 * 3 tests:
 * 1. Full validation of a fixture workspace passes all 12 checks.
 * 2. Validation of an intentionally broken workspace reports expected
 *    failures across multiple checks (one failure does not short-circuit).
 * 3. Validation report JSON format conforms to the documented schema.
 */

import { describe, it, expect } from 'vitest';

import {
  validate,
  formatReportJson,
  formatReportText,
} from '#src/compiler/validate/index.js';
import type { EmitResultShape } from '#src/compiler/validate/index.js';
import type { OCWorkspaceIR } from '#src/compiler/ir/workspace-ir.js';
import type { FileReference } from '#src/compiler/ir/field-types.js';
import type { GovAnalysis, GovViolation } from '#src/compiler/enforce/types.js';

function fr(path: string): FileReference {
  return { path, hash: 'hash', size: 1 };
}

function goodWorkspace(): OCWorkspaceIR {
  return {
    soul: {
      persona: 'governance-agent',
      principles: ['least-privilege'],
      boundaries: [{ text: 'no prod writes', line: 5 }],
      source: fr('SOUL.md'),
    },
    tools: {
      tools: [
        { name: 'read', description: 'read', trustLevel: 1, oboFlag: false, line: 1 },
        { name: 'write', description: 'write', trustLevel: 2, oboFlag: false, line: 2 },
      ],
      source: fr('TOOLS.md'),
    },
    agents: {
      agents: [{ name: 'ops', description: 'ops', tools: ['read', 'write'], line: 1 }],
      delegations: [{ from: 'ops', to: 'read', tools: ['read'], line: 3 }],
      source: fr('AGENTS.md'),
    },
    memory: { entries: [], hasIndex: true, source: fr('MEMORY.md') },
    identity: {
      organization: 'acme',
      team: 'ops',
      authMethod: 'sso',
      roles: [{ role: 'admin', permissions: ['read', 'write'] }],
      source: fr('IDENTITY.md'),
    },
    user: {
      role: 'sre',
      bounds: ['no-delete'],
      platform: 'claude-code',
      environment: { NODE_ENV: 'test' },
      source: fr('USER.md'),
    },
    heartbeat: { schedules: [], source: fr('HEARTBEAT.md') },
    skills: {
      skills: [{ name: 'deploy', description: 'deploy', requiredTools: ['write'], path: 'skills/deploy' }],
      source: fr('skills/'),
    },
    lobster: {
      name: 'ops-wf',
      description: 'ops workflow',
      steps: [
        { name: 'fetch', command: 'read' },
        { name: 'apply', command: 'write' },
      ],
      dependencies: { fetch: [], apply: ['fetch'] },
      source: fr('lobster.yaml'),
    },
    compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-16T00:00:00Z', schemaVersion: 1 },
    diagnostics: [],
  };
}

function goodAnalysis(): GovAnalysis {
  return {
    violations: [],
    warnings: [
      {
        ruleId: 'R2-01',
        level: 2,
        message: 'minor',
        subRuleDiagnosticCode: 'CLAWS-W-02',
        category: 'hygiene',
        subRuleIndex: 1,
      },
    ],
    enforcementPlan: {
      blockedTools: ['rm'],
      requiredApprovals: ['write'],
      auditOnlyRules: [],
      channelRedactions: [],
      ruleSuppressions: [],
    },
    reclassificationTable: [],
    effectiveR5Count: { derived: 3, overridden: 0, total: 3 },
  };
}

function goodEmit(): EmitResultShape {
  return {
    platform: 'claude-code',
    outputs: { 'claude.md': '# claude rules' },
    outputHash: 'b'.repeat(64),
    sidecarVersion: '1.2.3',
  };
}

describe('validate — integration', () => {
  it('fixture workspace passes all 12 checks', () => {
    const report = validate(goodWorkspace(), goodAnalysis(), goodEmit());
    expect(report.overallPass).toBe(true);
    expect(report.passCount).toBe(12);
    expect(report.failCount).toBe(0);
    for (const r of report.checks) {
      expect(r.pass).toBe(true);
    }
  });

  it('broken workspace reports expected failures without short-circuiting', () => {
    const brokenIR: OCWorkspaceIR = {
      ...goodWorkspace(),
      soul: { persona: '', principles: [], boundaries: [], source: fr('SOUL.md') },
      lobster: {
        name: 'cyclic',
        description: '',
        steps: [
          { name: 'a', command: 'x' },
          { name: 'b', command: 'y' },
        ],
        dependencies: { a: ['b'], b: ['a'] },
        source: fr('lobster.yaml'),
      },
      diagnostics: [
        {
          severity: 'error',
          message: 'audit write rejected',
          file: 'audit.ndjson',
          code: 'AUDIT-WRITE-FAIL',
        },
      ],
    };
    const ambiguousViolation: GovViolation = {
      ruleId: 'R5-X',
      level: 5,
      message: 'ambiguous',
      target: 't',
      diagnosticCode: 'CLAWS-X',
      fixSuggestions: [],
      toolFuzzyMatches: [],
    };
    const brokenAnalysis: GovAnalysis = {
      ...goodAnalysis(),
      violations: [ambiguousViolation],
    };
    const brokenEmit: EmitResultShape = {
      platform: 'cursor',
      outputs: {},
      outputHash: 'notvalidhex',
      sidecarVersion: '2.0.0',
    };

    const report = validate(brokenIR, brokenAnalysis, brokenEmit);

    expect(report.checks).toHaveLength(12);
    expect(report.overallPass).toBe(false);
    expect(report.failCount).toBeGreaterThanOrEqual(5);
    const failedIds = report.checks.filter((c) => !c.pass).map((c) => c.checkId).sort((a, b) => a - b);
    expect(failedIds).toEqual(expect.arrayContaining([2, 4, 7, 8, 9, 10, 12]));

    const text = formatReportText(report);
    expect(text).toContain('[FAIL]');
    expect(text).toContain('OVERALL FAIL');
  });

  it('text format renders WARN symbols for emit-absent checks', () => {
    const report = validate(goodWorkspace(), goodAnalysis(), undefined);
    const text = formatReportText(report);
    expect(text).toContain('[WARN]');
    expect(text).toContain('#5');
    const json = formatReportJson(report);
    const parsed = JSON.parse(json) as { checks: ReadonlyArray<{ severity: string }> };
    expect(parsed.checks.some((c) => c.severity === 'warning')).toBe(true);
  });

  it('JSON format matches schema and text format is non-empty', () => {
    const report = validate(goodWorkspace(), goodAnalysis(), goodEmit());
    const json = formatReportJson(report);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed['version']).toBe(1);
    expect(parsed['overallPass']).toBe(true);
    expect(parsed['passCount']).toBe(12);
    expect(parsed['failCount']).toBe(0);
    const checks = parsed['checks'] as ReadonlyArray<Record<string, unknown>>;
    expect(checks).toHaveLength(12);
    expect(checks[0]).toHaveProperty('checkId');
    expect(checks[0]).toHaveProperty('name');
    expect(checks[0]).toHaveProperty('pass');
    expect(checks[0]).toHaveProperty('severity');
    expect(checks[0]).toHaveProperty('message');

    const text = formatReportText(report);
    expect(text).toContain('OVERALL PASS');
    expect(text).toContain('#1');
    expect(text.split('\n').length).toBeGreaterThan(12);
  });
});
