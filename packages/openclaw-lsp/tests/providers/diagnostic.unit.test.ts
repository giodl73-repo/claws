/**
 * L0 unit tests for DiagnosticProvider.
 *
 * 4 tests:
 *   1. Diagnostic emission for governance violation
 *   2. Severity mapping (RuleLevel → DiagnosticSeverity)
 *   3. Cross-file tension diagnostic location
 *   4. 10 categories all mapped
 */

import { describe, it, expect } from 'vitest';
import {
  extractDiagnostics,
  toLspDiagnostics,
  computeTensions,
  CATEGORY_META,
  ALL_CATEGORIES,
  classifyFile,
  type DiagnosticCategory,
  type RawDiagnostic,
} from '../../src/providers/diagnostic.js';
import type { GovernanceIRLike } from '../../src/compilation-host.js';

/** Build a minimal GovernanceIR-like with violations. */
function makeIR(overrides: {
  violations?: readonly { ruleId: string; level: number; message: string; target: string; diagnosticCode?: string }[];
  warnings?: readonly { ruleId: string; message: string; category?: string; subRuleDiagnosticCode?: string }[];
  oboConflicts?: readonly { toolName: string; grantRuleId: string; denyRuleId: string; description: string }[];
  denyIntents?: readonly { kind: 'deny'; target: string; description: string; id: string; ruleId: string; level: number }[];
  labelIntents?: readonly { kind: 'label'; key: string; value: string; id: string; ruleId: string; level: number; description: string }[];
  delegationMap?: readonly { ruleId: string; target: string; mechanism: string }[];
  requiredApprovals?: readonly string[];
  ruleSuppressions?: readonly { ruleId: string; expiresAt: string; reason: string; authorizedBy: string }[];
  tools?: readonly { name: string; riskLevel: string; description: string; oboFlag: boolean; classification: string }[];
} = {}): GovernanceIRLike {
  const intents: unknown[] = [
    ...(overrides.denyIntents ?? []),
    ...(overrides.labelIntents ?? []),
  ];

  return {
    capabilities: {
      tools: overrides.tools ?? [],
      skills: [],
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: overrides.violations ?? [],
      warnings: overrides.warnings ?? [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: overrides.requiredApprovals ?? [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: overrides.ruleSuppressions ?? [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents,
    delegationMap: overrides.delegationMap ?? [],
    conflicts: {
      oboConflicts: overrides.oboConflicts ?? [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: (overrides.oboConflicts ?? []).length,
    },
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: '2026-04-15T00:00:00Z',
      schemaVersion: 1,
    },
  };
}

describe('DiagnosticProvider', () => {
  it('emits a diagnostic for a governance violation', () => {
    const ir = makeIR({
      violations: [
        {
          ruleId: 'SEC-001',
          level: 5,
          message: 'R5 rule must fail-closed',
          target: 'shell-exec',
          diagnosticCode: 'OC-POLICY-E001',
        },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    expect(rawDiags.length).toBeGreaterThanOrEqual(1);

    // Should produce a fail-mode diagnostic for the R5/OC-POLICY-E001 violation
    const failModeDiag = rawDiags.find((d) => d.category === 'fail-mode');
    expect(failModeDiag).toBeDefined();
    expect(failModeDiag!.message).toBe('R5 rule must fail-closed');
    expect(failModeDiag!.target).toBe('shell-exec');

    // Convert to LSP and verify range resolution
    const content = '# Rules\nshell-exec: deny\napproval: required';
    const lspDiags = toLspDiagnostics(rawDiags, content);
    const failLsp = lspDiags.find((d) => d.code === 'CLAWS-D006');
    expect(failLsp).toBeDefined();
    expect(failLsp!.range.start.line).toBe(1); // "shell-exec" is on line 2 (0-based: 1)
    expect(failLsp!.severity).toBe(1); // Error
    expect(failLsp!.source).toBe('claws');
  });

  it('maps severity correctly per category', () => {
    // tool-risk → Error (1), delegation-scope → Warning (2), context-violation → Info (3)
    const ir = makeIR({
      tools: [
        { name: 'rm-tool', riskLevel: 'critical', description: 'delete files', oboFlag: false, classification: 'filesystem' },
      ],
      delegationMap: [
        { ruleId: 'DEL-01', target: 'sub-agent', mechanism: 'hook' },
      ],
      warnings: [
        { ruleId: 'W-01', message: 'Context width exceeded', category: 'G-CONTEXT', subRuleDiagnosticCode: 'G-CONTEXT-01' },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    const content = '# Config\nrm-tool\nsub-agent\nG-CONTEXT-01';
    const lspDiags = toLspDiagnostics(rawDiags, content);

    // tool-risk → Error (severity 1)
    const toolRiskDiag = lspDiags.find((d) => d.code === 'CLAWS-D001');
    expect(toolRiskDiag).toBeDefined();
    expect(toolRiskDiag!.severity).toBe(1);

    // delegation-scope → Warning (severity 2)
    const delegationDiag = lspDiags.find((d) => d.code === 'CLAWS-D004');
    expect(delegationDiag).toBeDefined();
    expect(delegationDiag!.severity).toBe(2);

    // context-violation → Information (severity 3)
    const contextDiag = lspDiags.find((d) => d.code === 'CLAWS-D008');
    expect(contextDiag).toBeDefined();
    expect(contextDiag!.severity).toBe(3);
  });

  it('produces tension diagnostics with correct file:line locations', () => {
    // Edit TOOLS.md → should produce tension on SOUL.md where deny intents live
    const toolsIR = makeIR({
      tools: [{ name: 'shell', riskLevel: 'high', description: 'shell', oboFlag: false, classification: 'execution' }],
    });

    const soulIR = makeIR({
      denyIntents: [
        { kind: 'deny', target: 'shell', description: 'Deny shell access', id: 'i1', ruleId: 'SEC-01', level: 5 },
      ],
    });

    const soulContent = '# Soul\nDeny intents:\n- shell is blocked\n- safe tool is ok';

    const workspaceFiles = new Map<string, { content: string; ir: GovernanceIRLike }>([
      ['file:///ws/TOOLS.md', { content: '# Tools\nshell', ir: toolsIR }],
      ['file:///ws/SOUL.md', { content: soulContent, ir: soulIR }],
    ]);

    const tensions = computeTensions('file:///ws/TOOLS.md', workspaceFiles);
    expect(tensions.length).toBe(1);
    expect(tensions[0]!.targetUri).toBe('file:///ws/SOUL.md');
    expect(tensions[0]!.diagnostic.code).toBe('CLAWS-T001');

    // "shell" appears on line 3 (0-based: 2)
    expect(tensions[0]!.diagnostic.range.start.line).toBe(2);
    expect(tensions[0]!.diagnostic.message).toContain('shell');
    expect(tensions[0]!.diagnostic.message).toContain('TOOLS.md');
  });

  it('has all 10 diagnostic categories mapped in CATEGORY_META', () => {
    expect(ALL_CATEGORIES).toHaveLength(10);

    const expectedCategories: DiagnosticCategory[] = [
      'tool-risk',
      'obo-conflict',
      'deny-intent',
      'delegation-scope',
      'approval-required',
      'fail-mode',
      'capability-gap',
      'context-violation',
      'label-missing',
      'suppression-expired',
    ];

    for (const cat of expectedCategories) {
      expect(CATEGORY_META[cat]).toBeDefined();
      expect(CATEGORY_META[cat].code).toMatch(/^CLAWS-D0\d{2}$/);
      expect(CATEGORY_META[cat].severity).toBeGreaterThanOrEqual(1);
      expect(CATEGORY_META[cat].severity).toBeLessThanOrEqual(4);
      expect(CATEGORY_META[cat].source).toBe('claws');
    }

    // Verify codes are unique
    const codes = expectedCategories.map((c) => CATEGORY_META[c].code);
    expect(new Set(codes).size).toBe(10);

    // Verify classifyFile recognizes key governance files
    expect(classifyFile('file:///ws/TOOLS.md')).toBe('tools');
    expect(classifyFile('file:///ws/SOUL.md')).toBe('soul');
    expect(classifyFile('file:///ws/AGENTS.md')).toBe('agents');
    expect(classifyFile('file:///ws/MEMORY.md')).toBe('memory');
    expect(classifyFile('file:///ws/RULES.md')).toBe('rules');
    expect(classifyFile('file:///ws/README.md')).toBe('other');
  });

  it('extracts approval-required diagnostics from enforcement plan', () => {
    const ir = makeIR({
      requiredApprovals: ['manager-sign-off', 'security-review'],
    });

    const rawDiags = extractDiagnostics(ir);
    const approvalDiags = rawDiags.filter((d) => d.category === 'approval-required');
    expect(approvalDiags).toHaveLength(2);
    expect(approvalDiags[0]!.message).toContain('manager-sign-off');
    expect(approvalDiags[1]!.message).toContain('security-review');

    const content = 'manager-sign-off\nsecurity-review';
    const lspDiags = toLspDiagnostics(approvalDiags, content);
    expect(lspDiags[0]!.code).toBe('CLAWS-D005');
    expect(lspDiags[0]!.severity).toBe(2); // Warning
    expect(lspDiags[0]!.range.start.line).toBe(0);
    expect(lspDiags[1]!.range.start.line).toBe(1);
  });

  it('extracts capability-gap diagnostics from non-R5 violations', () => {
    const ir = makeIR({
      violations: [
        {
          ruleId: 'CAP-01',
          level: 3,
          message: 'Missing tool declaration for "custom-api"',
          target: 'custom-api',
          diagnosticCode: 'CAP-MISS-01',
        },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    const gapDiags = rawDiags.filter((d) => d.category === 'capability-gap');
    expect(gapDiags).toHaveLength(1);
    expect(gapDiags[0]!.message).toContain('custom-api');

    const content = 'custom-api entry';
    const lspDiags = toLspDiagnostics(gapDiags, content);
    expect(lspDiags[0]!.code).toBe('CLAWS-D007');
    expect(lspDiags[0]!.severity).toBe(2); // Warning
  });

  it('extracts label-missing diagnostics from label intents', () => {
    const ir = makeIR({
      labelIntents: [
        {
          kind: 'label',
          key: 'pii',
          value: 'true',
          id: 'l1',
          ruleId: 'DATA-01',
          level: 2,
          description: 'PII label',
        },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    const labelDiags = rawDiags.filter((d) => d.category === 'label-missing');
    expect(labelDiags).toHaveLength(1);
    expect(labelDiags[0]!.message).toContain('pii=true');

    const content = '# Data\npii: field\nretention: 90d';
    const lspDiags = toLspDiagnostics(labelDiags, content);
    expect(lspDiags[0]!.code).toBe('CLAWS-D009');
    expect(lspDiags[0]!.severity).toBe(3); // Information
    expect(lspDiags[0]!.range.start.line).toBe(1); // "pii" on line 2 (0-based 1)
  });

  it('extracts suppression-expired diagnostics for past timestamps', () => {
    const ir = makeIR({
      ruleSuppressions: [
        {
          ruleId: 'SEC-TEMP',
          expiresAt: '2020-01-01T00:00:00Z', // Clearly in the past
          reason: 'temporary override',
          authorizedBy: 'admin',
        },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    const expiredDiags = rawDiags.filter((d) => d.category === 'suppression-expired');
    expect(expiredDiags).toHaveLength(1);
    expect(expiredDiags[0]!.message).toContain('SEC-TEMP');
    expect(expiredDiags[0]!.message).toContain('expired');

    const content = '# Suppressions\nSEC-TEMP: override\nother-rule';
    const lspDiags = toLspDiagnostics(expiredDiags, content);
    expect(lspDiags[0]!.code).toBe('CLAWS-D010');
    expect(lspDiags[0]!.severity).toBe(2); // Warning
    expect(lspDiags[0]!.range.start.line).toBe(1);
  });

  it('does not emit suppression-expired for future timestamps', () => {
    const ir = makeIR({
      ruleSuppressions: [
        {
          ruleId: 'SEC-FUTURE',
          expiresAt: '2099-12-31T23:59:59Z',
          reason: 'long-lived override',
          authorizedBy: 'admin',
        },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    const expiredDiags = rawDiags.filter((d) => d.category === 'suppression-expired');
    expect(expiredDiags).toHaveLength(0);
  });

  it('does not emit suppression-expired for empty expiresAt', () => {
    const ir = makeIR({
      ruleSuppressions: [
        {
          ruleId: 'SEC-NO-EXPIRY',
          expiresAt: '',
          reason: 'permanent',
          authorizedBy: 'admin',
        },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    const expiredDiags = rawDiags.filter((d) => d.category === 'suppression-expired');
    expect(expiredDiags).toHaveLength(0);
  });

  it('handles target not found in content — falls back to first line', () => {
    const rawDiags: RawDiagnostic[] = [
      { category: 'tool-risk', message: 'Test message', target: 'nonexistent-tool' },
    ];
    const content = '# Config\nother content\nmore lines';
    const lspDiags = toLspDiagnostics(rawDiags, content);
    // Target not found → line 1 (0-based: 0)
    expect(lspDiags[0]!.range.start.line).toBe(0);
  });

  it('handles empty IR with no violations, warnings, or intents', () => {
    const ir = makeIR();
    const rawDiags = extractDiagnostics(ir);
    expect(rawDiags).toHaveLength(0);
  });

  it('classifyFile handles backslash paths on Windows', () => {
    expect(classifyFile('file:///c:/workspace\\TOOLS.md')).toBe('tools');
    expect(classifyFile('file:///c:/workspace\\SOUL.md')).toBe('soul');
    expect(classifyFile('file:///c:/workspace\\AGENTS.md')).toBe('agents');
    expect(classifyFile('file:///c:/workspace\\MEMORY.md')).toBe('memory');
  });

  it('obo-conflict uses fallback message when description is missing', () => {
    const ir = makeIR({
      oboConflicts: [
        {
          toolName: 'send-email',
          grantRuleId: 'OBO-01',
          denyRuleId: 'SEC-05',
          description: '',
        },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    const oboDiags = rawDiags.filter((d) => d.category === 'obo-conflict');
    expect(oboDiags).toHaveLength(1);
    // When description is empty, uses fallback message
    expect(oboDiags[0]!.message).toContain('OBO-01');
    expect(oboDiags[0]!.message).toContain('SEC-05');
  });

  it('computes AGENTS.md tension on workspace files with delegation', () => {
    const agentsIR = makeIR({
      delegationMap: [
        { ruleId: 'DEL-01', target: 'sub-agent', mechanism: 'hook' },
      ],
    });

    const rulesIR = makeIR({
      delegationMap: [
        { ruleId: 'DEL-02', target: 'reviewer-bot', mechanism: 'approval' },
      ],
    });

    const rulesContent = '# Rules\nreviewer-bot: approval\nsub-agent: hook';

    const workspaceFiles = new Map([
      ['file:///ws/AGENTS.md', { content: '# Agents\nsub-agent', ir: agentsIR }],
      ['file:///ws/RULES.md', { content: rulesContent, ir: rulesIR }],
    ]);

    const tensions = computeTensions('file:///ws/AGENTS.md', workspaceFiles);
    // Should emit tension on RULES.md (not on AGENTS.md itself)
    const rulesTensions = tensions.filter((t) => t.targetUri === 'file:///ws/RULES.md');
    expect(rulesTensions.length).toBeGreaterThanOrEqual(1);
    expect(rulesTensions[0]!.diagnostic.code).toBe('CLAWS-T002');
    expect(rulesTensions[0]!.diagnostic.message).toContain('AGENTS.md');
  });

  it('soul change triggers MEMORY.md data label review tension', () => {
    const soulIR = makeIR({
      denyIntents: [
        { kind: 'deny', target: 'shell', description: 'Deny shell', id: 'i1', ruleId: 'SEC-01', level: 5 },
      ],
    });

    const memoryIR = makeIR({
      labelIntents: [
        { kind: 'label', key: 'retention', value: '90d', id: 'l1', ruleId: 'DATA-01', level: 2, description: 'Retention label' },
      ],
    });

    const workspaceFiles = new Map([
      ['file:///ws/SOUL.md', { content: '# Soul\ndeny: shell', ir: soulIR }],
      ['file:///ws/MEMORY.md', { content: '# Memory\nretention: 90 days\nother data', ir: memoryIR }],
    ]);

    const tensions = computeTensions('file:///ws/SOUL.md', workspaceFiles);
    const memTensions = tensions.filter((t) => t.targetUri === 'file:///ws/MEMORY.md');
    expect(memTensions.length).toBeGreaterThanOrEqual(1);
    expect(memTensions[0]!.diagnostic.code).toBe('CLAWS-T003');
    expect(memTensions[0]!.diagnostic.message).toContain('SOUL.md');
    expect(memTensions[0]!.diagnostic.message).toContain('retention');
  });

  it('non-governance file change produces no tensions', () => {
    const otherIR = makeIR();
    const workspaceFiles = new Map([
      ['file:///ws/README.md', { content: '# Readme', ir: otherIR }],
    ]);

    const tensions = computeTensions('file:///ws/README.md', workspaceFiles);
    expect(tensions).toHaveLength(0);
  });

  it('deny-intent uses description fallback chain', () => {
    const ir = makeIR({
      denyIntents: [
        {
          kind: 'deny',
          target: 'dangerous-tool',
          description: '',
          id: 'i1',
          ruleId: 'SEC-01',
          level: 5,
        },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    const denyDiags = rawDiags.filter((d) => d.category === 'deny-intent');
    expect(denyDiags).toHaveLength(1);
    // Falls through to target when description is empty
    expect(denyDiags[0]!.message).toContain('dangerous-tool');
  });

  it('violations with level 5 but no OC-POLICY-E001 code still map to fail-mode', () => {
    const ir = makeIR({
      violations: [
        {
          ruleId: 'CRIT-01',
          level: 5,
          message: 'Critical rule violation',
          target: 'restricted-op',
          diagnosticCode: 'OTHER-CODE',
        },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    const failModeDiags = rawDiags.filter((d) => d.category === 'fail-mode');
    expect(failModeDiags).toHaveLength(1);
    expect(failModeDiags[0]!.message).toBe('Critical rule violation');
  });

  it('violations without diagnosticCode are skipped by capability-gap', () => {
    const ir = makeIR({
      violations: [
        {
          ruleId: 'NO-CODE',
          level: 3,
          message: 'No diagnostic code',
          target: 'some-target',
          // diagnosticCode is undefined
        },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    const gapDiags = rawDiags.filter((d) => d.category === 'capability-gap');
    // Without diagnosticCode, condition fails → no capability-gap diagnostic
    expect(gapDiags).toHaveLength(0);
  });

  it('warnings with G-INPUT category produce context-violation', () => {
    const ir = makeIR({
      warnings: [
        { ruleId: 'W-INPUT', message: 'Input not sanitized', category: 'G-INPUT', subRuleDiagnosticCode: 'G-INPUT-02' },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    const ctxDiags = rawDiags.filter((d) => d.category === 'context-violation');
    expect(ctxDiags).toHaveLength(1);
    expect(ctxDiags[0]!.message).toContain('Input not sanitized');
  });

  it('low-risk tools do not emit tool-risk diagnostics', () => {
    const ir = makeIR({
      tools: [
        { name: 'safe-tool', riskLevel: 'low', description: 'safe', oboFlag: false, classification: 'data' },
        { name: 'medium-tool', riskLevel: 'medium', description: 'medium', oboFlag: false, classification: 'data' },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    const toolRiskDiags = rawDiags.filter((d) => d.category === 'tool-risk');
    expect(toolRiskDiags).toHaveLength(0);
  });

  it('warnings with non-governance category are not context-violations', () => {
    const ir = makeIR({
      warnings: [
        { ruleId: 'W-OTHER', message: 'Some other warning', category: 'G-OTHER', subRuleDiagnosticCode: 'G-OTHER-01' },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    const ctxDiags = rawDiags.filter((d) => d.category === 'context-violation');
    expect(ctxDiags).toHaveLength(0);
  });

  it('TOOLS→SOUL tension skips non-deny intents in SOUL', () => {
    const soulIR = makeIR({
      labelIntents: [
        { kind: 'label', key: 'data', value: 'true', id: 'l1', ruleId: 'DATA-01', level: 2, description: 'Label' },
      ],
    });

    const workspaceFiles = new Map([
      ['file:///ws/TOOLS.md', { content: '# Tools', ir: makeIR() }],
      ['file:///ws/SOUL.md', { content: '# Soul\ndata: info', ir: soulIR }],
    ]);

    const tensions = computeTensions('file:///ws/TOOLS.md', workspaceFiles);
    // No CLAWS-T001 since SOUL has no deny intents
    const t001 = tensions.filter((t) => t.diagnostic.code === 'CLAWS-T001');
    expect(t001).toHaveLength(0);
  });

  it('AGENTS tension skips non-object delegation entries', () => {
    // IR with a delegation map where entries are not proper objects
    const rulesIR: GovernanceIRLike = {
      capabilities: { tools: [], skills: [], agents: [], workflows: [] },
      analysis: { violations: [], warnings: [], enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] }, reclassificationTable: [], effectiveR5Count: { derived: 0, overridden: 0, total: 0 } },
      intents: [],
      delegationMap: ['not-an-object' as unknown] as readonly unknown[],
      conflicts: { oboConflicts: [], multiConstraintConflicts: [], haltReason: null, hasOboWithoutElicit: false, totalConflicts: 0 },
      compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-15T00:00:00Z', schemaVersion: 1 },
    };

    const workspaceFiles = new Map([
      ['file:///ws/AGENTS.md', { content: '# Agents', ir: makeIR() }],
      ['file:///ws/RULES.md', { content: '# Rules', ir: rulesIR }],
    ]);

    const tensions = computeTensions('file:///ws/AGENTS.md', workspaceFiles);
    // Non-object delegation entries are skipped
    const t002 = tensions.filter((t) => t.diagnostic.code === 'CLAWS-T002');
    expect(t002).toHaveLength(0);
  });

  it('TOOLS→MEMORY tension skips intents without key', () => {
    // Label intent missing key field
    const memoryIR: GovernanceIRLike = {
      capabilities: { tools: [], skills: [], agents: [], workflows: [] },
      analysis: { violations: [], warnings: [], enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] }, reclassificationTable: [], effectiveR5Count: { derived: 0, overridden: 0, total: 0 } },
      intents: [{ kind: 'label', value: 'true' }], // no key
      delegationMap: [],
      conflicts: { oboConflicts: [], multiConstraintConflicts: [], haltReason: null, hasOboWithoutElicit: false, totalConflicts: 0 },
      compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-15T00:00:00Z', schemaVersion: 1 },
    };

    const workspaceFiles = new Map([
      ['file:///ws/TOOLS.md', { content: '# Tools', ir: makeIR() }],
      ['file:///ws/MEMORY.md', { content: '# Memory', ir: memoryIR }],
    ]);

    const tensions = computeTensions('file:///ws/TOOLS.md', workspaceFiles);
    const t003 = tensions.filter((t) => t.diagnostic.code === 'CLAWS-T003');
    expect(t003).toHaveLength(0);
  });

  it('AGENTS change skips self (changedUri) in delegation analysis', () => {
    const agentsIR = makeIR({
      delegationMap: [
        { ruleId: 'DEL-01', target: 'self-target', mechanism: 'hook' },
      ],
    });

    const workspaceFiles = new Map([
      ['file:///ws/AGENTS.md', { content: '# Agents\nself-target', ir: agentsIR }],
    ]);

    // Only AGENTS.md in workspace — should skip itself
    const tensions = computeTensions('file:///ws/AGENTS.md', workspaceFiles);
    expect(tensions).toHaveLength(0);
  });

  it('delegation-scope skips entries without ruleId and target', () => {
    // Delegation entry that is an object but lacks 'ruleId' or 'target'
    const ir: GovernanceIRLike = {
      capabilities: { tools: [], skills: [], agents: [], workflows: [] },
      analysis: { violations: [], warnings: [], enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] }, reclassificationTable: [], effectiveR5Count: { derived: 0, overridden: 0, total: 0 } },
      intents: [],
      delegationMap: [{ mechanism: 'hook' }] as readonly unknown[],
      conflicts: { oboConflicts: [], multiConstraintConflicts: [], haltReason: null, hasOboWithoutElicit: false, totalConflicts: 0 },
      compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-15T00:00:00Z', schemaVersion: 1 },
    };

    const rawDiags = extractDiagnostics(ir);
    const delegDiags = rawDiags.filter((d) => d.category === 'delegation-scope');
    expect(delegDiags).toHaveLength(0);
  });

  it('deny intent with reason but no description uses reason', () => {
    const ir = makeIR({
      denyIntents: [
        {
          kind: 'deny',
          target: 'rm-rf',
          description: '',
          id: 'i1',
          ruleId: 'SEC-01',
          level: 5,
        },
      ],
    });

    const rawDiags = extractDiagnostics(ir);
    const denyDiags = rawDiags.filter((d) => d.category === 'deny-intent');
    expect(denyDiags).toHaveLength(1);
    // Empty description + no reason → falls through to target
    expect(denyDiags[0]!.message).toContain('rm-rf');
  });

  it('extractDiagnostics with no analysis/capabilities still runs', () => {
    const minimalIR: GovernanceIRLike = {
      capabilities: {},
      analysis: {},
      intents: [],
      delegationMap: [],
      conflicts: {},
      compiler: { compilerVersion: '0.36.0', compiledAt: '2026-04-15T00:00:00Z', schemaVersion: 1 },
    };

    const rawDiags = extractDiagnostics(minimalIR);
    expect(rawDiags).toHaveLength(0);
  });
});
