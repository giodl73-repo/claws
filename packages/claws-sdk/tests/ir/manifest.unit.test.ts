/**
 * L0: CapabilityManifest, GovAnalysis, and ConflictReport types.
 *
 * 5 unit tests covering:
 * 1. Construct CapabilityManifest with tools, skills, agents, workflows
 * 2. GovAnalysis with violations carries bidirectional fix suggestions
 * 3. GovAnalysis with warnings carries sub-rule diagnostic codes
 * 4. ConflictReport with per-tool OBO conflicts and halt-reason
 * 5. ConflictReport OBO-WITHOUT-ELICIT annotation present
 */

import { describe, it, expect } from 'vitest';
import type {
  CapabilityManifest,
  ToolCapability,
  SkillCapability,
  AgentCapability,
  WorkflowCapability,
  GovAnalysis,
  GovViolation,
  GovWarning,
  FixSuggestion,
  ConflictReport,
  OboConflict,
} from '../../src/ir/index.js';

describe('CapabilityManifest', () => {
  it('constructs with tools, skills, agents, workflows', () => {
    const tool: ToolCapability = {
      name: 'bash',
      description: 'Execute shell commands',
      riskLevel: 'high',
      oboFlag: false,
      classification: 'execution',
    };

    const skill: SkillCapability = {
      name: 'deploy',
      description: 'Deploy to production',
      requiredTools: ['bash', 'git'],
      governanceLevel: 4,
    };

    const agent: AgentCapability = {
      name: 'code-review-bot',
      description: 'Automated code reviewer',
      delegations: [
        { from: 'code-review-bot', to: 'lint-agent', permissions: ['read'] },
      ],
      maxAutonomousLevel: 3,
    };

    const workflow: WorkflowCapability = {
      name: 'ci-pipeline',
      description: 'Continuous integration pipeline',
      steps: ['lint', 'test', 'build', 'deploy'],
      requiresApproval: true,
    };

    const manifest: CapabilityManifest = {
      tools: [tool],
      skills: [skill],
      agents: [agent],
      workflows: [workflow],
    };

    expect(manifest.tools).toHaveLength(1);
    expect(manifest.tools[0].name).toBe('bash');
    expect(manifest.tools[0].riskLevel).toBe('high');
    expect(manifest.tools[0].oboFlag).toBe(false);
    expect(manifest.tools[0].classification).toBe('execution');

    expect(manifest.skills).toHaveLength(1);
    expect(manifest.skills[0].requiredTools).toEqual(['bash', 'git']);
    expect(manifest.skills[0].governanceLevel).toBe(4);

    expect(manifest.agents).toHaveLength(1);
    expect(manifest.agents[0].delegations).toHaveLength(1);
    expect(manifest.agents[0].delegations[0].to).toBe('lint-agent');
    expect(manifest.agents[0].maxAutonomousLevel).toBe(3);

    expect(manifest.workflows).toHaveLength(1);
    expect(manifest.workflows[0].steps).toEqual(['lint', 'test', 'build', 'deploy']);
    expect(manifest.workflows[0].requiresApproval).toBe(true);
  });
});

describe('GovAnalysis', () => {
  it('violations carry bidirectional fix suggestions', () => {
    const tighten: FixSuggestion = {
      direction: 'tighten',
      description: 'Add explicit deny rule for bash:rm',
      target: 'SEC-001',
    };
    const relax: FixSuggestion = {
      direction: 'relax',
      description: 'Downgrade bash risk level to medium',
      target: 'tool-classification.bash',
    };

    const violation: GovViolation = {
      ruleId: 'SEC-001',
      level: 5,
      message: 'Critical tool used without approval gate',
      target: 'bash:rm',
      diagnosticCode: 'CLAWS-V001',
      fixSuggestions: [tighten, relax],
      toolFuzzyMatches: [],
    };

    const analysis: GovAnalysis = {
      violations: [violation],
      warnings: [],
      enforcementPlan: {
        blockedTools: ['bash:rm'],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 1, overridden: 0, total: 1 },
    };

    expect(analysis.violations[0].fixSuggestions).toHaveLength(2);
    expect(analysis.violations[0].fixSuggestions[0].direction).toBe('tighten');
    expect(analysis.violations[0].fixSuggestions[1].direction).toBe('relax');
    expect(analysis.violations[0].diagnosticCode).toBe('CLAWS-V001');
  });

  it('warnings carry sub-rule diagnostic codes', () => {
    const inputWarning: GovWarning = {
      ruleId: 'INPUT-001',
      level: 2,
      message: 'User input not sanitized before tool call',
      subRuleDiagnosticCode: 'G-INPUT-01',
      category: 'G-INPUT',
      subRuleIndex: 1,
    };
    const contextWarning: GovWarning = {
      ruleId: 'CTX-002',
      level: 3,
      message: 'Context window exceeds recommended limit',
      subRuleDiagnosticCode: 'G-CONTEXT-04',
      category: 'G-CONTEXT',
      subRuleIndex: 4,
    };

    const analysis: GovAnalysis = {
      violations: [],
      warnings: [inputWarning, contextWarning],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [
          { channel: 'audit-log', redactedFields: ['userInput'], suppress: false },
        ],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    };

    expect(analysis.warnings).toHaveLength(2);
    expect(analysis.warnings[0].subRuleDiagnosticCode).toBe('G-INPUT-01');
    expect(analysis.warnings[0].category).toBe('G-INPUT');
    expect(analysis.warnings[0].subRuleIndex).toBe(1);
    expect(analysis.warnings[1].subRuleDiagnosticCode).toBe('G-CONTEXT-04');
    expect(analysis.warnings[1].category).toBe('G-CONTEXT');
    expect(analysis.warnings[1].subRuleIndex).toBe(4);
  });
});

describe('ConflictReport', () => {
  it('carries per-tool OBO conflicts and halt-reason', () => {
    const conflict: OboConflict = {
      toolName: 'bash:curl',
      grantRuleId: 'OBO-GRANT-001',
      denyRuleId: 'SEC-DENY-002',
      severity: 'error',
      grantLevel: 3,
      denyLevel: 5,
      description: 'OBO grant at R3 conflicts with R5 deny on bash:curl',
      oboWithoutElicit: false,
    };

    const report: ConflictReport = {
      oboConflicts: [conflict],
      multiConstraintConflicts: [],
      haltReason: 'Error-severity OBO conflict on bash:curl blocks EMIT',
      hasOboWithoutElicit: false,
      totalConflicts: 1,
    };

    expect(report.oboConflicts).toHaveLength(1);
    expect(report.oboConflicts[0].toolName).toBe('bash:curl');
    expect(report.oboConflicts[0].severity).toBe('error');
    expect(report.oboConflicts[0].grantLevel).toBe(3);
    expect(report.oboConflicts[0].denyLevel).toBe(5);
    expect(report.haltReason).toBe('Error-severity OBO conflict on bash:curl blocks EMIT');
    expect(report.totalConflicts).toBe(1);
  });

  it('OBO-WITHOUT-ELICIT annotation present', () => {
    const conflict: OboConflict = {
      toolName: 'github:create-pr',
      grantRuleId: 'OBO-GRANT-005',
      denyRuleId: 'ELICIT-GATE-001',
      severity: 'warning',
      grantLevel: 2,
      denyLevel: 3,
      description: 'OBO granted on github:create-pr without elicit gate — breaking change',
      oboWithoutElicit: true,
    };

    const report: ConflictReport = {
      oboConflicts: [conflict],
      multiConstraintConflicts: [
        {
          target: 'github:create-pr',
          ruleIds: ['OBO-GRANT-005', 'ELICIT-GATE-001', 'AUDIT-REQ-003'],
          severity: 'warning',
          description: '3-way conflict: OBO grant + missing elicit + audit requirement',
        },
      ],
      haltReason: null,
      hasOboWithoutElicit: true,
      totalConflicts: 2,
    };

    expect(report.oboConflicts[0].oboWithoutElicit).toBe(true);
    expect(report.hasOboWithoutElicit).toBe(true);
    expect(report.haltReason).toBeNull();
    expect(report.multiConstraintConflicts).toHaveLength(1);
    expect(report.multiConstraintConflicts[0].ruleIds).toHaveLength(3);
    expect(report.totalConflicts).toBe(2);
  });
});
