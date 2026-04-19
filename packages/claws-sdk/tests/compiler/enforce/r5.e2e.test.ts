/**
 * L2: End-to-end R5 enforcement through the full compile pipeline.
 *
 * Tests the complete flow: workspace IR + governance analysis ->
 * enforceR5 -> compileGuard -> pass or deny.
 *
 * The free tier does not consume cross-rule conflict reports; ambiguous
 * violations and workspace error diagnostics are the only fail-closed
 * triggers here. Rich conflict detection is a paid-tier extension.
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
  return { path, hash: 'e2e-hash-' + path.replace(/[^a-z]/g, ''), size: 256 };
}

function fullWorkspaceIR(): OCWorkspaceIR {
  return {
    soul: {
      persona: 'Enterprise governance agent',
      principles: ['Fail closed on ambiguity', 'Least privilege'],
      voice: 'Professional and precise',
      boundaries: [
        { text: 'Never expose PII', line: 5 },
        { text: 'Require approval for production writes', line: 8 },
      ],
      source: fileRef('SOUL.md'),
    },
    tools: {
      tools: [
        { name: 'read-file', description: 'Read files', trustLevel: 1, oboFlag: false, line: 1 },
        { name: 'write-file', description: 'Write files', trustLevel: 3, oboFlag: true, line: 5 },
        { name: 'deploy', description: 'Deploy to prod', trustLevel: 4, oboFlag: true, line: 10 },
        { name: 'admin-api', description: 'Admin operations', trustLevel: 4, oboFlag: true, line: 15 },
      ],
      source: fileRef('TOOLS.md'),
    },
    agents: {
      agents: [
        { name: 'code-agent', description: 'Writes code', tools: ['read-file', 'write-file'], line: 1 },
        { name: 'deploy-agent', description: 'Deploys', tools: ['deploy'], line: 5 },
      ],
      delegations: [
        { from: 'code-agent', to: 'deploy-agent', tools: ['deploy'], line: 10 },
      ],
      source: fileRef('AGENTS.md'),
    },
    memory: {
      entries: [
        { label: 'deployment-log', sensitivity: 'internal', retention: 'permanent', line: 1 },
      ],
      hasIndex: true,
      source: fileRef('MEMORY.md'),
    },
    identity: {
      organization: 'acme-corp',
      team: 'platform',
      authMethod: 'sso',
      ssoProvider: 'okta',
      roles: [
        { role: 'admin', permissions: ['read', 'write', 'deploy'] },
        { role: 'operator', permissions: ['read', 'deploy'] },
        { role: 'viewer', permissions: ['read'] },
      ],
      source: fileRef('IDENTITY.md'),
    },
    user: {
      role: 'operator',
      bounds: ['deploy', 'read'],
      platform: 'claude-code',
      environment: { NODE_ENV: 'production' },
      source: fileRef('USER.md'),
    },
    heartbeat: {
      schedules: [
        { trigger: 'on_start', actions: ['verify-identity', 'load-config'], line: 1 },
        { trigger: 'every_5m', actions: ['check-health'], line: 5 },
      ],
      lastHeartbeat: '2026-04-16T12:00:00Z',
      status: 'healthy',
      source: fileRef('HEARTBEAT.md'),
    },
    skills: {
      skills: [
        { name: 'deploy-skill', description: 'Deploy to prod', requiredTools: ['deploy'], path: 'skills/deploy/' },
      ],
      source: fileRef('skills/'),
    },
    lobster: {
      name: 'ci-pipeline',
      description: 'CI/CD pipeline',
      steps: [
        { name: 'test', command: 'npm test' },
        { name: 'build', command: 'npm run build' },
        { name: 'deploy', command: 'deploy-skill' },
      ],
      dependencies: { build: ['test'], deploy: ['build'] },
      source: fileRef('lobster.yaml'),
    },
    compiler: { compilerVersion: '0.1.0', compiledAt: '2026-04-16T14:00:00Z', schemaVersion: 1 },
    diagnostics: [],
  };
}

function fullCleanAnalysis(): GovAnalysis {
  return {
    violations: [],
    warnings: [
      { ruleId: 'R2-TOOL-TRUST', level: 2, message: 'Trust level advisory for deploy', subRuleDiagnosticCode: 'G-TRUST-01', category: 'G-TRUST', subRuleIndex: 1 },
      { ruleId: 'R1-LOGGING', level: 1, message: 'Logging recommended', subRuleDiagnosticCode: 'G-AUDIT-01', category: 'G-AUDIT', subRuleIndex: 1 },
    ],
    enforcementPlan: {
      blockedTools: [],
      requiredApprovals: ['deploy'],
      auditOnlyRules: ['R1-LOGGING'],
      channelRedactions: [],
      ruleSuppressions: [],
    },
    reclassificationTable: [],
    effectiveR5Count: { derived: 2, overridden: 0, total: 2 },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('R5 end-to-end enforcement', () => {
  it('full pipeline: clean workspace passes, then violations deny compilation', () => {
    const workspace = fullWorkspaceIR();
    const analysis = fullCleanAnalysis();

    // Phase 1: Clean pipeline passes enforceR5
    const passResult = enforceR5(analysis, workspace);
    expect(passResult.ok).toBe(true);
    expect(passResult.rulesChecked).toBeGreaterThan(0);

    // Phase 2: Clean pipeline passes compileGuard
    expect(() => compileGuard(analysis, workspace)).not.toThrow();

    // Phase 3: Introduce violations + a workspace-error diagnostic and verify denial.
    const ambiguousViolation: GovViolation = {
      ruleId: 'R5-DEPLOY-SCOPE',
      level: 5,
      message: 'Deploy tool scope is ambiguous across environments',
      target: 'deploy',
      diagnosticCode: 'CLAWS-V050',
      fixSuggestions: [
        { direction: 'tighten', description: 'Limit to staging only', target: 'deploy' },
        { direction: 'relax', description: 'Allow all environments', target: 'deploy' },
      ],
      toolFuzzyMatches: [],
    };

    const fuzzyViolation: GovViolation = {
      ruleId: 'R3-ADMIN-REF',
      level: 3,
      message: 'admin-apii has a typo and cannot be resolved',
      target: 'admin-apii',
      diagnosticCode: 'CLAWS-V060',
      fixSuggestions: [],
      toolFuzzyMatches: [{ original: 'admin-apii', suggestion: 'admin-api', score: 0.95 }],
    };

    const taintedWorkspace: OCWorkspaceIR = {
      ...workspace,
      diagnostics: [
        { severity: 'error', message: 'Broken SOUL.md', file: 'SOUL.md', code: 'WS-ERR-SOUL' },
      ],
    };

    const taintedAnalysis: GovAnalysis = {
      ...analysis,
      violations: [ambiguousViolation, fuzzyViolation],
    };

    // enforceR5 returns fail result
    const failResult = enforceR5(taintedAnalysis, taintedWorkspace);
    expect(failResult.ok).toBe(false);
    if (!failResult.ok) {
      expect(failResult.violations.length).toBeGreaterThanOrEqual(3);
      expect(failResult.rulesChecked).toBeGreaterThan(0);
    }

    // compileGuard throws CompilationDeniedError
    let caughtError: CompilationDeniedError | undefined;
    try {
      compileGuard(taintedAnalysis, taintedWorkspace);
    } catch (err) {
      caughtError = err as CompilationDeniedError;
    }

    expect(caughtError).toBeInstanceOf(CompilationDeniedError);
    expect(caughtError!.violations.length).toBeGreaterThanOrEqual(3);
    expect(caughtError!.message).toContain('Compilation denied');
    expect(caughtError!.message).toContain('R5-DEPLOY-SCOPE');
    expect(caughtError!.message).toContain('R3-ADMIN-REF');
    expect(caughtError!.message).toContain('WS-ERR-SOUL');
    expect(caughtError!.name).toBe('CompilationDeniedError');

    // Phase 4: Verify violation details are structured correctly
    for (const v of caughtError!.violations) {
      expect(v.rule).toBeTruthy();
      expect(v.context).toBeTruthy();
      expect(v.severity).toBeTruthy();
      expect(v.explanation).toBeTruthy();
      expect(['critical', 'high', 'medium']).toContain(v.severity);
    }
  });
});
