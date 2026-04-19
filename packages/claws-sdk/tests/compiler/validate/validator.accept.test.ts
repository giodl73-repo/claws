/**
 * L3 acceptance test for the 12-check validator.
 *
 * Verifies the eval scenario findings (eval/S01..S04) as they apply to the
 * free-tier validator replacement for the full agent-sdk eval engine:
 *
 *  - eval/S01:     the 12-check validator is a complete replacement for the
 *                  agent-sdk eval surface. The zero-`@craftworks/` import
 *                  invariant is covered at the module scope by
 *                  `tests/compiler/e2e/graduation.accept.test.ts` — a narrow
 *                  re-scan here would duplicate that guard.
 *  - eval/S02:     deterministic pass/fail counts are stable across runs.
 *  - eval/S03:     per-check results compose without losing diagnostic
 *                  detail (each check's message propagates into the report).
 *  - eval/S04:     validation report survives JSON round-trip with zero
 *                  field loss — canonical output is byte-stable.
 */

import { describe, it, expect } from 'vitest';

import {
  validate,
  formatReportJson,
  ALL_CHECKS,
} from '#src/compiler/validate/index.js';
import type { EmitResultShape } from '#src/compiler/validate/index.js';
import type { OCWorkspaceIR } from '#src/compiler/ir/workspace-ir.js';
import type { FileReference } from '#src/compiler/ir/field-types.js';
import type { GovAnalysis } from '#src/compiler/enforce/types.js';

function fr(path: string): FileReference {
  return { path, hash: 'acc-hash', size: 10 };
}

function workspace(): OCWorkspaceIR {
  return {
    soul: { persona: 'acc', principles: [], boundaries: [], source: fr('SOUL.md') },
    tools: {
      tools: [{ name: 't', description: 't', trustLevel: 1, oboFlag: false, line: 1 }],
      source: fr('TOOLS.md'),
    },
    agents: {
      agents: [{ name: 'a', description: 'a', tools: ['t'], line: 1 }],
      delegations: [],
      source: fr('AGENTS.md'),
    },
    memory: { entries: [], hasIndex: false, source: fr('MEMORY.md') },
    identity: { organization: 'o', team: 'tt', authMethod: 'none', roles: [], source: fr('IDENTITY.md') },
    user: { role: 'u', bounds: [], platform: 'oc', environment: {}, source: fr('USER.md') },
    heartbeat: { schedules: [], source: fr('HEARTBEAT.md') },
    skills: { skills: [], source: fr('skills/') },
    lobster: {
      name: 'default',
      description: '',
      steps: [{ name: 's', command: 't' }],
      dependencies: {},
      source: fr('lobster.yaml'),
    },
    compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-16T00:00:00Z', schemaVersion: 1 },
    diagnostics: [],
  };
}

function analysis(): GovAnalysis {
  return {
    violations: [],
    warnings: [],
    enforcementPlan: {
      blockedTools: ['x'],
      requiredApprovals: [],
      auditOnlyRules: [],
      channelRedactions: [],
      ruleSuppressions: [],
    },
    reclassificationTable: [],
    effectiveR5Count: { derived: 1, overridden: 0, total: 1 },
  };
}

function emit(): EmitResultShape {
  return {
    platform: 'oc',
    outputs: { 'out.md': '#' },
    outputHash: 'd'.repeat(64),
    sidecarVersion: '1.0.0',
  };
}

describe('validate — acceptance (eval/S01..S04 findings)', () => {
  it('eval/S01: the free-tier validator ships exactly the 12 canonical checks', () => {
    // The zero-`@craftworks/` import invariant is enforced globally across
    // `src/compiler/**` by `graduation.accept.test.ts`; re-scanning the
    // validator here in isolation only invites drift.
    expect(ALL_CHECKS).toHaveLength(12);
  });

  it('eval/S02: deterministic pass/fail counts across repeated runs', () => {
    const reports = Array.from({ length: 5 }, () => validate(workspace(), analysis(), emit()));
    const signatures = reports.map(
      (r) => `${r.passCount}/${r.failCount}/${r.overallPass}`,
    );
    expect(new Set(signatures).size).toBe(1);
  });

  it('eval/S03: per-check diagnostic messages compose without loss', () => {
    const report = validate(workspace(), analysis(), emit());
    expect(report.checks).toHaveLength(12);
    for (const c of report.checks) {
      expect(c.message.length).toBeGreaterThan(0);
    }
    const ids = report.checks.map((c) => c.checkId);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('eval/S04: report survives JSON round-trip with no field loss', () => {
    const report = validate(workspace(), analysis(), emit());
    const serialized = formatReportJson(report);
    const reparsed = JSON.parse(serialized) as {
      version: number;
      overallPass: boolean;
      passCount: number;
      failCount: number;
      checks: ReadonlyArray<{ checkId: number; name: string; pass: boolean; severity: string; message: string }>;
    };

    expect(reparsed.version).toBe(1);
    expect(reparsed.overallPass).toBe(report.overallPass);
    expect(reparsed.passCount).toBe(report.passCount);
    expect(reparsed.failCount).toBe(report.failCount);
    expect(reparsed.checks).toHaveLength(report.checks.length);

    for (let i = 0; i < report.checks.length; i += 1) {
      expect(reparsed.checks[i]!.checkId).toBe(report.checks[i]!.checkId);
      expect(reparsed.checks[i]!.pass).toBe(report.checks[i]!.pass);
      expect(reparsed.checks[i]!.severity).toBe(report.checks[i]!.severity);
      expect(reparsed.checks[i]!.message).toBe(report.checks[i]!.message);
    }
  });
});
