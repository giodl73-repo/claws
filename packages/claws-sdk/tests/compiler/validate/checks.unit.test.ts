/**
 * L0 unit tests for the 12-check validator.
 *
 * 8 tests covering the highest-signal checks plus aggregation:
 * 1. Schema conformance passes on a valid IR.
 * 2. Required-field check detects a missing field.
 * 3. Trust-level check detects an inconsistency.
 * 4. R5 fail-closed check detects a fail-open violation.
 * 5. Emit target check rejects unknown platform.
 * 6. Circular dependency check detects a cycle.
 * 7. Output hash check detects an instability (malformed hex).
 * 8. validate() produces correct pass/fail counts.
 */

import { describe, it, expect } from 'vitest';

import {
  checkSchemaConformance,
  checkRequiredFields,
  checkTrustLevels,
  checkR5FailClosed,
  checkEmitTarget,
  checkHandlerTypes,
  checkCircularDeps,
  checkAuditChain,
  checkSidecarVersion,
  checkPlatformAlignment,
  checkOutputHash,
  checkRuleCoverage,
  validate,
  formatReportJson,
  formatReportText,
} from '#src/compiler/validate/index.js';
import type { EmitResultShape } from '#src/compiler/validate/index.js';
import type { OCWorkspaceIR } from '#src/compiler/ir/workspace-ir.js';
import type { FileReference } from '#src/compiler/ir/field-types.js';
import type { GovAnalysis, GovViolation } from '#src/compiler/enforce/types.js';

function fileRef(path: string): FileReference {
  return { path, hash: 'deadbeef', size: 10 };
}

function validIR(overrides?: Partial<OCWorkspaceIR>): OCWorkspaceIR {
  return {
    soul: { persona: 'builder', principles: [], boundaries: [], source: fileRef('SOUL.md') },
    tools: {
      tools: [
        { name: 'read-file', description: 'reads files', trustLevel: 1, oboFlag: false, line: 1 },
        { name: 'git', description: 'git ops', trustLevel: 3, oboFlag: false, line: 2 },
      ],
      source: fileRef('TOOLS.md'),
    },
    agents: {
      agents: [{ name: 'worker', description: 'works', tools: ['read-file', 'git'], line: 1 }],
      delegations: [],
      source: fileRef('AGENTS.md'),
    },
    memory: { entries: [], hasIndex: false, source: fileRef('MEMORY.md') },
    identity: {
      organization: 'acme',
      team: 'platform',
      authMethod: 'sso',
      roles: [],
      source: fileRef('IDENTITY.md'),
    },
    user: { role: 'eng', bounds: [], platform: 'oc', environment: {}, source: fileRef('USER.md') },
    heartbeat: { schedules: [], source: fileRef('HEARTBEAT.md') },
    skills: {
      skills: [{ name: 'scaffold', description: 'scaffolds', requiredTools: ['git'], path: 'skills/scaffold' }],
      source: fileRef('skills/'),
    },
    lobster: {
      name: 'default',
      description: 'wf',
      steps: [{ name: 'a', command: 'echo a' }, { name: 'b', command: 'echo b' }],
      dependencies: { a: [], b: ['a'] },
      source: fileRef('lobster.yaml'),
    },
    compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-16T00:00:00Z', schemaVersion: 1 },
    diagnostics: [],
    ...overrides,
  };
}

function validAnalysis(overrides?: Partial<GovAnalysis>): GovAnalysis {
  return {
    violations: [],
    warnings: [],
    enforcementPlan: {
      blockedTools: ['rm-rf'],
      requiredApprovals: [],
      auditOnlyRules: [],
      channelRedactions: [],
      ruleSuppressions: [],
    },
    reclassificationTable: [],
    effectiveR5Count: { derived: 2, overridden: 0, total: 2 },
    ...overrides,
  };
}

function validEmit(overrides?: Partial<EmitResultShape>): EmitResultShape {
  return {
    platform: 'oc',
    outputs: { 'out.md': '# hello' },
    outputHash: 'a'.repeat(64),
    sidecarVersion: '1.0.0',
    ...overrides,
  };
}

describe('validate — checks', () => {
  it('(1) schema conformance passes on a valid IR', () => {
    const result = checkSchemaConformance(validIR());
    expect(result.pass).toBe(true);
    expect(result.checkId).toBe(1);
    expect(result.severity).toBe('info');
  });

  it('(2) required-field check detects a missing field', () => {
    const ir = validIR({
      identity: {
        organization: '',
        team: 'platform',
        authMethod: 'sso',
        roles: [],
        source: fileRef('IDENTITY.md'),
      },
    });
    const result = checkRequiredFields(ir);
    expect(result.pass).toBe(false);
    expect(result.message).toContain('identity.organization');
  });

  it('(3) trust-level check detects an inconsistency', () => {
    const ir = validIR({
      agents: {
        agents: [{ name: 'rogue', description: 'bad', tools: ['undeclared-tool'], line: 1 }],
        delegations: [],
        source: fileRef('AGENTS.md'),
      },
    });
    const result = checkTrustLevels(ir);
    expect(result.pass).toBe(false);
    expect(result.message).toContain('undeclared-tool');
  });

  it('(4) R5 check detects a fail-open violation', () => {
    const ambiguous: GovViolation = {
      ruleId: 'R5-AMBIGUOUS',
      level: 5,
      message: 'ambiguous',
      target: 'x',
      diagnosticCode: 'CLAWS-X',
      fixSuggestions: [],
      toolFuzzyMatches: [],
    };
    const analysis = validAnalysis({ violations: [ambiguous] });
    const result = checkR5FailClosed(validIR(), analysis);
    expect(result.pass).toBe(false);
    expect(result.message).toContain('R5-AMBIGUOUS');
  });

  it('(5) emit target check rejects unknown platform', () => {
    const emit = validEmit({ platform: 'not-a-real-platform' });
    const result = checkEmitTarget(validIR(), validAnalysis(), emit);
    expect(result.pass).toBe(false);
    expect(result.message).toContain('not-a-real-platform');
  });

  it('(6) circular dependency check detects a cycle', () => {
    const ir = validIR({
      lobster: {
        name: 'cyclic',
        description: '',
        steps: [
          { name: 'a', command: 'x' },
          { name: 'b', command: 'y' },
        ],
        dependencies: { a: ['b'], b: ['a'] },
        source: fileRef('lobster.yaml'),
      },
    });
    const result = checkCircularDeps(ir);
    expect(result.pass).toBe(false);
    expect(result.message).toMatch(/[Cc]ircular/);
  });

  it('(7) output-hash check detects instability (malformed hex)', () => {
    const emit = validEmit({ outputHash: 'ZZZZ' });
    const result = checkOutputHash(validIR(), validAnalysis(), emit);
    expect(result.pass).toBe(false);
    expect(result.message).toContain('64-char');
  });

  it('(8) validate() produces correct pass/fail counts on all-clean inputs', () => {
    const report = validate(validIR(), validAnalysis(), validEmit());
    expect(report.checks).toHaveLength(12);
    expect(report.passCount).toBe(12);
    expect(report.failCount).toBe(0);
    expect(report.overallPass).toBe(true);
  });
});

// ── Branch-coverage tests for each check's failure and degraded paths ──

describe('validate — branch coverage', () => {
  it('schema conformance fails when schemaVersion < 1', () => {
    const ir = validIR({
      compiler: {
        compilerVersion: '0.1.0',
        compiledAt: '2026-04-16T00:00:00Z',
        schemaVersion: 0,
      },
    });
    const r = checkSchemaConformance(ir);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('schemaVersion');
  });

  it('schema conformance fails when a shard is missing', () => {
    const ir = validIR();
    // Force a missing shard by casting; this simulates reader returning an incomplete IR.
    const broken = { ...ir, memory: undefined as unknown as (typeof ir)['memory'] };
    const r = checkSchemaConformance(broken);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('memory');
  });

  it('required fields: each missing field is reported', () => {
    const ir = validIR({
      soul: { persona: '', principles: [], boundaries: [], source: fileRef('SOUL.md') },
      identity: { organization: '', team: '', authMethod: 'none', roles: [], source: fileRef('IDENTITY.md') },
      user: { role: '', bounds: [], platform: 'oc', environment: {}, source: fileRef('USER.md') },
      lobster: { name: '', description: '', steps: [], dependencies: {}, source: fileRef('lobster.yaml') },
      compiler: { compilerVersion: '', compiledAt: '', schemaVersion: 1 },
    });
    const r = checkRequiredFields(ir);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('soul.persona');
    expect(r.message).toContain('identity.organization');
    expect(r.message).toContain('identity.team');
    expect(r.message).toContain('user.role');
    expect(r.message).toContain('lobster.name');
    expect(r.message).toContain('compiler.compilerVersion');
  });

  it('trust levels: invalid level value is rejected', () => {
    const ir = validIR({
      tools: {
        tools: [
          { name: 'bad', description: '', trustLevel: 9 as unknown as 0 | 1 | 2 | 3 | 4, oboFlag: false, line: 1 },
        ],
        source: fileRef('TOOLS.md'),
      },
      agents: { agents: [], delegations: [], source: fileRef('AGENTS.md') },
    });
    const r = checkTrustLevels(ir);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('bad=T9');
  });

  it('R5: count anomaly (overridden > derived) fails', () => {
    const analysis = validAnalysis({
      effectiveR5Count: { derived: 1, overridden: 2, total: 3 },
    });
    const r = checkR5FailClosed(validIR(), analysis);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('count anomaly');
  });

  it('R5: bidirectional fix suggestions mark rule ambiguous', () => {
    const analysis = validAnalysis({
      violations: [
        {
          ruleId: 'R3-BIDIR',
          level: 3,
          message: 'ambiguous',
          target: 'x',
          diagnosticCode: 'C-1',
          fixSuggestions: [
            { direction: 'tighten', description: 't', target: 'x' },
            { direction: 'relax', description: 'r', target: 'x' },
          ],
          toolFuzzyMatches: [],
        },
      ],
    });
    const r = checkR5FailClosed(validIR(), analysis);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('R3-BIDIR');
  });

  it('R5: tool fuzzy match marks rule ambiguous', () => {
    const analysis = validAnalysis({
      violations: [
        {
          ruleId: 'R3-FUZZY',
          level: 3,
          message: 'fuzzy',
          target: 'x',
          diagnosticCode: 'C-2',
          fixSuggestions: [],
          toolFuzzyMatches: [{ original: 'foo', suggestion: 'fooo', score: 0.9 }],
        },
      ],
    });
    const r = checkR5FailClosed(validIR(), analysis);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('R3-FUZZY');
  });

  it('emit target: fails when user.platform is unknown', () => {
    const ir = validIR({
      user: {
        role: 'r',
        bounds: [],
        platform: 'mystery' as unknown as (typeof validIR.prototype)['user']['platform'],
        environment: {},
        source: fileRef('USER.md'),
      },
    });
    const r = checkEmitTarget(ir, validAnalysis(), undefined);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('mystery');
  });

  it('emit target: warns when emit result is undefined', () => {
    const r = checkEmitTarget(validIR(), validAnalysis(), undefined);
    expect(r.pass).toBe(true);
    expect(r.severity).toBe('warning');
  });

  // ── CM-3 regression (Ra CP-2 R1): freemium-gate drift ───────────────
  //
  // Before CM-3 the validator accepted cursor/copilot/crewai/langgraph/
  // bedrock (its local VALID_EMIT_TARGETS list) while emit/registry.ts
  // rejected them, so a cursor workspace passed validate and then
  // crashed at emit with UnsupportedEmitTargetError. After the fix,
  // validate and emit share FREE_TIER_TARGETS and paid-tier platforms
  // must fail check 5 with an explicit free-tier rejection.
  it('emit target: rejects paid-tier user.platform (cursor) with free-tier diagnostic', () => {
    const ir = validIR({
      user: {
        role: 'r',
        bounds: [],
        platform: 'cursor' as unknown as (typeof validIR.prototype)['user']['platform'],
        environment: {},
        source: fileRef('USER.md'),
      },
    });
    const r = checkEmitTarget(ir, validAnalysis(), undefined);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('cursor');
    expect(r.message).toContain('free-tier');
  });

  it('emit target: rejects paid-tier emit platform (copilot) with free-tier diagnostic', () => {
    const emit: EmitResultShape = {
      platform: 'copilot',
      outputs: {},
      outputHash: 'a'.repeat(64),
    };
    const r = checkEmitTarget(validIR(), validAnalysis(), emit);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('copilot');
    expect(r.message).toContain('free-tier');
  });

  it('handler types: empty skill, delegation endpoints, and lobster step all reported', () => {
    const ir = validIR({
      skills: {
        skills: [{ name: '', description: '', requiredTools: [], path: '' }],
        source: fileRef('skills/'),
      },
      agents: {
        agents: [],
        delegations: [
          { from: '', to: '', tools: [], line: 1 },
          { from: 'a', to: 'b', tools: [], line: 2 },
        ],
        source: fileRef('AGENTS.md'),
      },
      lobster: {
        name: 'wf',
        description: '',
        steps: [{ name: '', command: '' }],
        dependencies: {},
        source: fileRef('lobster.yaml'),
      },
    });
    const r = checkHandlerTypes(ir);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('empty name');
    expect(r.message).toContain('empty endpoint');
    expect(r.message).toContain('no tools');
    expect(r.message).toContain('lobster step');
  });

  it('audit chain: AUDIT-coded error diagnostic fails', async () => {
    const ir = validIR({
      diagnostics: [
        { severity: 'error', message: 'broken', file: 'audit.ndjson', code: 'AUDIT-CHAIN-BROKEN' },
        { severity: 'info', message: 'note', file: 'x', code: 'AUDIT-INFO' },
        { severity: 'error', message: 'unrelated', file: 'y', code: 'PARSE-ERR' },
      ],
    });
    const r = checkAuditChain(ir);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('AUDIT-CHAIN-BROKEN');
    expect(r.message).not.toContain('PARSE-ERR');
  });

  it('sidecar version: undefined emit → warn', async () => {
    const r = checkSidecarVersion(validIR(), validAnalysis(), undefined);
    expect(r.pass).toBe(true);
    expect(r.severity).toBe('warning');
  });

  it('sidecar version: invalid semver fails', async () => {
    const emit = validEmit({ sidecarVersion: 'not-semver' });
    const r = checkSidecarVersion(validIR(), validAnalysis(), emit);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('semver');
  });

  it('sidecar version: major mismatch with schemaVersion fails', async () => {
    const emit = validEmit({ sidecarVersion: '2.0.0' });
    const r = checkSidecarVersion(validIR(), validAnalysis(), emit);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('does not match');
  });

  it('sidecar version: missing sidecarVersion inside emit → warn', async () => {
    const emit: EmitResultShape = {
      platform: 'oc',
      outputs: {},
      outputHash: 'a'.repeat(64),
    };
    const r = checkSidecarVersion(validIR(), validAnalysis(), emit);
    expect(r.pass).toBe(true);
    expect(r.severity).toBe('warning');
  });

  it('platform alignment: mismatch fails; undefined emit warns', async () => {
    const emit = validEmit({ platform: 'cursor' });
    const failR = checkPlatformAlignment(validIR(), validAnalysis(), emit);
    expect(failR.pass).toBe(false);
    expect(failR.message).toContain('drift');

    const warnR = checkPlatformAlignment(validIR(), validAnalysis(), undefined);
    expect(warnR.pass).toBe(true);
    expect(warnR.severity).toBe('warning');
  });

  it('output hash: missing outputHash in emit fails', () => {
    const emit: EmitResultShape = { platform: 'oc', outputs: {} };
    const r = checkOutputHash(validIR(), validAnalysis(), emit);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('missing outputHash');
  });

  it('output hash: undefined emit warns', () => {
    const r = checkOutputHash(validIR(), validAnalysis(), undefined);
    expect(r.pass).toBe(true);
    expect(r.severity).toBe('warning');
  });

  it('output hash: wrong length fails', () => {
    const emit: EmitResultShape = { platform: 'oc', outputs: {}, outputHash: 'abc' };
    const r = checkOutputHash(validIR(), validAnalysis(), emit);
    expect(r.pass).toBe(false);
  });

  it('rule coverage: completely empty analysis fails', async () => {
    const analysis: GovAnalysis = {
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
    };
    const r = checkRuleCoverage(validIR(), analysis);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('empty');
  });

  it('circular deps: acyclic graph with deep chain passes', () => {
    const ir = validIR({
      lobster: {
        name: 'dag',
        description: '',
        steps: [
          { name: 'a', command: 'x' },
          { name: 'b', command: 'y' },
          { name: 'c', command: 'z' },
        ],
        dependencies: { a: [], b: ['a'], c: ['a', 'b'] },
        source: fileRef('lobster.yaml'),
      },
    });
    const r = checkCircularDeps(ir);
    expect(r.pass).toBe(true);
  });

  it('circular deps: dependency references unknown node (nullish coalesce fallback)', () => {
    const ir = validIR({
      lobster: {
        name: 'dangling',
        description: '',
        steps: [{ name: 'a', command: 'x' }],
        dependencies: { a: ['unknown-step'] },
        source: fileRef('lobster.yaml'),
      },
    });
    const r = checkCircularDeps(ir);
    expect(r.pass).toBe(true);
  });

  it('R5: non-ambiguous violation (level 3, no fixes, no fuzzy) is allowed', () => {
    const analysis = validAnalysis({
      violations: [
        {
          ruleId: 'R3-CLEAN',
          level: 3,
          message: 'resolved',
          target: 't',
          diagnosticCode: 'C',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        },
      ],
    });
    const r = checkR5FailClosed(validIR(), analysis);
    expect(r.pass).toBe(true);
  });

  it('formatter: text renders OK/WARN/FAIL and JSON round-trips', () => {
    const okReport = validate(validIR(), validAnalysis(), validEmit());
    const text = formatReportText(okReport);
    expect(text).toContain('[OK  ]');
    expect(text).toContain('OVERALL PASS');
    const json = formatReportJson(okReport);
    const parsed = JSON.parse(json) as { overallPass: boolean; checks: unknown[] };
    expect(parsed.overallPass).toBe(true);
    expect(parsed.checks).toHaveLength(12);

    const warnReport = validate(validIR(), validAnalysis(), undefined);
    expect(formatReportText(warnReport)).toContain('[WARN]');

    const brokenIR = validIR({
      soul: { persona: '', principles: [], boundaries: [], source: fileRef('SOUL.md') },
    });
    const failReport = validate(brokenIR, validAnalysis(), validEmit());
    const failText = formatReportText(failReport);
    expect(failText).toContain('[FAIL]');
    expect(failText).toContain('OVERALL FAIL');
  });

  it('R5: only-tighten fix suggestion is not ambiguous', () => {
    const analysis = validAnalysis({
      violations: [
        {
          ruleId: 'R3-TIGHTEN',
          level: 3,
          message: '',
          target: 't',
          diagnosticCode: 'C',
          fixSuggestions: [{ direction: 'tighten', description: '', target: 't' }],
          toolFuzzyMatches: [],
        },
      ],
    });
    const r = checkR5FailClosed(validIR(), analysis);
    expect(r.pass).toBe(true);
  });
});
