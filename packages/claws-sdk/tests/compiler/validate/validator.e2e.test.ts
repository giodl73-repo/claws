/**
 * L2 e2e test for the 12-check validator.
 *
 * End-to-end: runs the full validator over a fixture workspace and
 * confirms the aggregate report is stable and fully passing.
 */

import { describe, it, expect } from 'vitest';

import { validate, formatReportJson } from '#src/compiler/validate/index.js';
import type { EmitResultShape } from '#src/compiler/validate/index.js';
import type { OCWorkspaceIR } from '#src/compiler/ir/workspace-ir.js';
import type { FileReference } from '#src/compiler/ir/field-types.js';
import type { GovAnalysis } from '#src/compiler/enforce/types.js';

function fr(path: string): FileReference {
  return { path, hash: 'h', size: 1 };
}

function fixture(): {
  workspace: OCWorkspaceIR;
  analysis: GovAnalysis;
  emit: EmitResultShape;
} {
  const workspace: OCWorkspaceIR = {
    soul: {
      persona: 'e2e-runner',
      principles: ['immutable'],
      boundaries: [],
      source: fr('SOUL.md'),
    },
    tools: {
      tools: [
        { name: 'list', description: '', trustLevel: 0, oboFlag: false, line: 1 },
        { name: 'deploy', description: '', trustLevel: 4, oboFlag: true, line: 2 },
      ],
      source: fr('TOOLS.md'),
    },
    agents: {
      agents: [{ name: 'ci', description: '', tools: ['list', 'deploy'], line: 1 }],
      delegations: [{ from: 'ci', to: 'deploy', tools: ['deploy'], line: 2 }],
      source: fr('AGENTS.md'),
    },
    memory: { entries: [], hasIndex: false, source: fr('MEMORY.md') },
    identity: {
      organization: 'e2e-org',
      team: 'platform',
      authMethod: 'token',
      roles: [],
      source: fr('IDENTITY.md'),
    },
    user: { role: 'qa', bounds: [], platform: 'oc', environment: {}, source: fr('USER.md') },
    heartbeat: { schedules: [], source: fr('HEARTBEAT.md') },
    skills: {
      skills: [{ name: 'lint', description: '', requiredTools: ['list'], path: 'skills/lint' }],
      source: fr('skills/'),
    },
    lobster: {
      name: 'ci',
      description: 'ci pipeline',
      steps: [
        { name: 'build', command: 'list' },
        { name: 'ship', command: 'deploy' },
      ],
      dependencies: { build: [], ship: ['build'] },
      source: fr('lobster.yaml'),
    },
    compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-16T00:00:00Z', schemaVersion: 1 },
    diagnostics: [],
  };

  const analysis: GovAnalysis = {
    violations: [],
    warnings: [],
    enforcementPlan: {
      blockedTools: ['rm'],
      requiredApprovals: ['deploy'],
      auditOnlyRules: [],
      channelRedactions: [],
      ruleSuppressions: [],
    },
    reclassificationTable: [],
    effectiveR5Count: { derived: 1, overridden: 0, total: 1 },
  };

  const emit: EmitResultShape = {
    platform: 'oc',
    outputs: { 'workspace.oc': 'compiled' },
    outputHash: 'c'.repeat(64),
    sidecarVersion: '1.0.0',
  };

  return { workspace, analysis, emit };
}

describe('validate — e2e', () => {
  it('runs all 12 checks against a fixture workspace and reports stable output', () => {
    const { workspace, analysis, emit } = fixture();
    const first = validate(workspace, analysis, emit);
    const second = validate(workspace, analysis, emit);

    expect(first.overallPass).toBe(true);
    expect(first.passCount).toBe(12);
    expect(first.checks.map((c) => c.checkId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    expect(formatReportJson(first)).toBe(formatReportJson(second));
  });
});
