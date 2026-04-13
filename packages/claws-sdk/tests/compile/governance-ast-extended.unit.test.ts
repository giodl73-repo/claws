/**
 * L0: GovernanceAST extended unit tests — covers branches not hit by existing tests.
 *
 * Covers:
 * 1. IDENTITY.md intents categorized into identity group
 * 2. USER.md intents categorized into authority group
 * 3. MEMORY.md intents categorized into memory group
 * 4. HEARTBEAT.md intents categorized into schedule group
 * 5. skills/ intents categorized into skill group
 * 6. lobster.yaml intents categorized into workflow group
 * 7. Unknown source produces CLAWS-X003 warning diagnostic
 * 8. 'all' token in AGENTS.md delegation expands to full tool list + R4+ warnings
 * 9. Agent roster cross-references built from delegation graph
 * 10. Diagnostics from intent results propagated to AST
 * 11. Deny intents with non-tool scope are skipped in tool reference resolution
 * 12. Elicit intents included in deny group (SM-4 support)
 */

import { describe, it, expect } from 'vitest';
import { buildGovernanceAST } from '../../src/compile/governance-ast.js';
import type {
  IntentResult,
  SoulIntent,
  ToolManifestEntry,
  DelegationIntent,
  IdentityIntent,
  AuthorityIntent,
  MemoryIntent,
  ScheduleIntent,
  SkillIntent,
  WorkflowIntent,
  ParseDiagnostic,
} from '../../src/compile/types.js';
import type { AnyIntentResult } from '../../src/compile/intent/index.js';

describe('buildGovernanceAST() — extended coverage', () => {
  it('categorizes IDENTITY.md intents into identity group', () => {
    const intents: IdentityIntent[] = [
      { organization: 'Acme', team: 'Platform', authMethod: 'token', attestationLevel: 'L2' },
    ];
    const result: IntentResult<IdentityIntent> = { source: 'IDENTITY.md', intents, diagnostics: [] };

    const ast = buildGovernanceAST([result as AnyIntentResult]);

    expect(ast.identity).toHaveLength(1);
    expect(ast.identity[0]!.source).toBe('IDENTITY.md');
    expect(ast.identity[0]!.intents[0]!.organization).toBe('Acme');
  });

  it('categorizes USER.md intents into authority group', () => {
    const intents: AuthorityIntent[] = [
      { role: 'admin', bounds: ['Approve R4+ tool usage'], line: 3 },
    ];
    const result: IntentResult<AuthorityIntent> = { source: 'USER.md', intents, diagnostics: [] };

    const ast = buildGovernanceAST([result as AnyIntentResult]);

    expect(ast.authority).toHaveLength(1);
    expect(ast.authority[0]!.intents[0]!.role).toBe('admin');
  });

  it('categorizes MEMORY.md intents into memory group', () => {
    const intents: MemoryIntent[] = [
      { label: 'API Keys', sensitivity: 'restricted', retention: 'session', line: 5 },
    ];
    const result: IntentResult<MemoryIntent> = { source: 'MEMORY.md', intents, diagnostics: [] };

    const ast = buildGovernanceAST([result as AnyIntentResult]);

    expect(ast.memory).toHaveLength(1);
    expect(ast.memory[0]!.intents[0]!.sensitivity).toBe('restricted');
  });

  it('categorizes HEARTBEAT.md intents into schedule group', () => {
    const intents: ScheduleIntent[] = [
      { trigger: 'on_idle', actions: ['run cleanup'], riskLevel: 2, line: 10 },
    ];
    const result: IntentResult<ScheduleIntent> = { source: 'HEARTBEAT.md', intents, diagnostics: [] };

    const ast = buildGovernanceAST([result as AnyIntentResult]);

    expect(ast.schedule).toHaveLength(1);
    expect(ast.schedule[0]!.intents[0]!.trigger).toBe('on_idle');
  });

  it('categorizes skills/ intents into skill group', () => {
    const intents: SkillIntent[] = [
      { name: 'scan', description: 'Scan code', requiredTools: ['Read'], line: 1 },
    ];
    const result: IntentResult<SkillIntent> = { source: 'skills/', intents, diagnostics: [] };

    const ast = buildGovernanceAST([result as AnyIntentResult]);

    expect(ast.skill).toHaveLength(1);
    expect(ast.skill[0]!.intents[0]!.name).toBe('scan');
  });

  it('categorizes lobster.yaml intents into workflow group', () => {
    const intents: WorkflowIntent[] = [
      { name: 'deploy-flow', description: 'Deploy workflow', steps: [{ name: 'build', command: 'npm run build' }], dependencies: {} },
    ];
    const result: IntentResult<WorkflowIntent> = { source: 'lobster.yaml', intents, diagnostics: [] };

    const ast = buildGovernanceAST([result as AnyIntentResult]);

    expect(ast.workflow).toHaveLength(1);
    expect(ast.workflow[0]!.intents[0]!.name).toBe('deploy-flow');
  });

  it('unknown source produces CLAWS-X003 warning diagnostic', () => {
    const result: IntentResult<SoulIntent> = {
      source: 'UNKNOWN.md',
      intents: [{ keyword: 'never', confidence: 0.95, scope: 'tool', pattern: 'test', rawLine: 'test', line: 1, autoExtracted: true, intentKind: 'deny' }],
      diagnostics: [],
    };

    const ast = buildGovernanceAST([result as AnyIntentResult]);

    const unknownDiag = ast.diagnostics.find(d => d.code === 'CLAWS-X003');
    expect(unknownDiag).toBeDefined();
    expect(unknownDiag!.severity).toBe('warning');
    expect(unknownDiag!.message).toContain('UNKNOWN.md');
  });

  it('expands "all" token in delegation to full tool list with R4+ warnings', () => {
    const toolResult: IntentResult<ToolManifestEntry> = {
      source: 'TOOLS.md',
      intents: [
        { name: 'Read', riskClass: 1, oboFlag: false, capabilities: ['read'], description: 'Read files', line: 3 },
        { name: 'prod-deploy', riskClass: 5, oboFlag: true, capabilities: ['deploy'], description: 'Deploy', line: 8 },
      ],
      diagnostics: [],
    };

    const agentResult: IntentResult<DelegationIntent> = {
      source: 'AGENTS.md',
      intents: [
        { from: 'Orchestrator', to: 'Worker', tools: ['all'], line: 5 },
      ],
      diagnostics: [],
    };

    const ast = buildGovernanceAST([
      toolResult as AnyIntentResult,
      agentResult as AnyIntentResult,
    ]);

    // Delegation should be expanded: 'all' replaced with actual tool names
    expect(ast.delegation).toHaveLength(1);
    const tools = ast.delegation[0]!.intents[0]!.tools;
    expect(tools).toContain('Read');
    expect(tools).toContain('prod-deploy');
    expect(tools).not.toContain('all');

    // R4+ implicit delegation warning produced
    const implicitWarning = ast.diagnostics.find(d => d.code === 'CLAWS-X002');
    expect(implicitWarning).toBeDefined();
    expect(implicitWarning!.message).toContain('IMPLICIT-R4-DELEGATION');
    expect(implicitWarning!.message).toContain('prod-deploy');
  });

  it('does not expand delegation tools when "all" token is not present', () => {
    const toolResult: IntentResult<ToolManifestEntry> = {
      source: 'TOOLS.md',
      intents: [
        { name: 'Read', riskClass: 1, oboFlag: false, capabilities: ['read'], description: 'Read', line: 3 },
      ],
      diagnostics: [],
    };

    const agentResult: IntentResult<DelegationIntent> = {
      source: 'AGENTS.md',
      intents: [
        { from: 'A', to: 'B', tools: ['Read'], line: 5 },
      ],
      diagnostics: [],
    };

    const ast = buildGovernanceAST([
      toolResult as AnyIntentResult,
      agentResult as AnyIntentResult,
    ]);

    expect(ast.delegation[0]!.intents[0]!.tools).toEqual(['Read']);
    expect(ast.diagnostics.filter(d => d.code === 'CLAWS-X002')).toHaveLength(0);
  });

  it('propagates diagnostics from intent results', () => {
    const diag: ParseDiagnostic = {
      severity: 'warning',
      message: 'Malformed line in SOUL.md',
      file: 'SOUL.md',
      line: 7,
      code: 'CLAWS-P001',
    };

    const result: IntentResult<SoulIntent> = {
      source: 'SOUL.md',
      intents: [],
      diagnostics: [diag],
    };

    const ast = buildGovernanceAST([result as AnyIntentResult]);

    expect(ast.diagnostics).toHaveLength(1);
    expect(ast.diagnostics[0]!.message).toBe('Malformed line in SOUL.md');
  });

  it('builds agent roster cross-references from delegation graph', () => {
    const toolResult: IntentResult<ToolManifestEntry> = {
      source: 'TOOLS.md',
      intents: [{ name: 'Read', riskClass: 1, oboFlag: false, capabilities: ['read'], description: 'Read', line: 3 }],
      diagnostics: [],
    };

    const agentResult: IntentResult<DelegationIntent> = {
      source: 'AGENTS.md',
      intents: [
        { from: 'A', to: 'B', tools: ['Read'], line: 3 },
        { from: 'B', to: 'C', tools: ['Read'], line: 5 },
      ],
      diagnostics: [],
    };

    const ast = buildGovernanceAST([
      toolResult as AnyIntentResult,
      agentResult as AnyIntentResult,
    ]);

    // Cross-references should include agent roster refs
    const agentRefs = ast.crossReferences.filter(cr => cr.fromSource === 'AGENTS.md');
    expect(agentRefs.length).toBeGreaterThanOrEqual(2);
    // B and C should be resolved (they appear in the graph)
    const bRef = agentRefs.find(cr => cr.referencedName === 'B');
    expect(bRef).toBeDefined();
    expect(bRef!.resolved).toBe(true);
  });

  it('elicit intents in SOUL.md are included in deny group', () => {
    const soulResult: IntentResult<SoulIntent> = {
      source: 'SOUL.md',
      intents: [
        { keyword: 'require', confidence: 0.85, scope: 'tool', pattern: 'confirm before deploy', rawLine: 'Require confirm before deploy', line: 3, autoExtracted: true, intentKind: 'elicit' },
      ],
      diagnostics: [],
    };

    const ast = buildGovernanceAST([soulResult as AnyIntentResult]);

    expect(ast.deny).toHaveLength(1);
    expect(ast.deny[0]!.intents[0]!.intentKind).toBe('elicit');
  });

  it('skips empty intent results without creating groups', () => {
    const emptyToolResult: IntentResult<ToolManifestEntry> = {
      source: 'TOOLS.md',
      intents: [],
      diagnostics: [],
    };

    const ast = buildGovernanceAST([emptyToolResult as AnyIntentResult]);

    expect(ast.tool).toHaveLength(0);
  });

  it('deny intents with non-tool scope are not checked for tool references', () => {
    const soulResult: IntentResult<SoulIntent> = {
      source: 'SOUL.md',
      intents: [
        { keyword: 'never', confidence: 0.95, scope: 'action', pattern: 'use prod-deploy', rawLine: 'Never use prod-deploy', line: 3, autoExtracted: true, intentKind: 'deny' },
      ],
      diagnostics: [],
    };

    const toolResult: IntentResult<ToolManifestEntry> = {
      source: 'TOOLS.md',
      intents: [
        { name: 'prod-deploy', riskClass: 5, oboFlag: false, capabilities: ['deploy'], description: 'Deploy', line: 8 },
      ],
      diagnostics: [],
    };

    const ast = buildGovernanceAST([
      soulResult as AnyIntentResult,
      toolResult as AnyIntentResult,
    ]);

    // 'action' scope deny should NOT produce tool cross-references
    const toolRefs = ast.crossReferences.filter(cr => cr.fromSource === 'SOUL.md');
    expect(toolRefs).toHaveLength(0);
  });

  it('extractToolRefsFromDeny finds tool names in pattern via direct match', () => {
    const soulResult: IntentResult<SoulIntent> = {
      source: 'SOUL.md',
      intents: [
        { keyword: 'never', confidence: 0.95, scope: 'tool', pattern: 'the bash tool is dangerous', rawLine: 'Never use the bash tool', line: 3, autoExtracted: true, intentKind: 'deny' },
      ],
      diagnostics: [],
    };

    const toolResult: IntentResult<ToolManifestEntry> = {
      source: 'TOOLS.md',
      intents: [
        { name: 'bash', riskClass: 2, oboFlag: false, capabilities: ['exec'], description: 'Shell', line: 3 },
      ],
      diagnostics: [],
    };

    const ast = buildGovernanceAST([
      soulResult as AnyIntentResult,
      toolResult as AnyIntentResult,
    ]);

    const ref = ast.crossReferences.find(cr => cr.normalizedName === 'bash');
    expect(ref).toBeDefined();
    expect(ref!.resolved).toBe(true);
  });

  it('unresolved tool reference without close match produces no suggestion', () => {
    const soulResult: IntentResult<SoulIntent> = {
      source: 'SOUL.md',
      intents: [
        { keyword: 'never', confidence: 0.95, scope: 'tool', pattern: 'use zzzzzzz-tool', rawLine: 'Never use zzzzzzz-tool', line: 3, autoExtracted: true, intentKind: 'deny' },
      ],
      diagnostics: [],
    };

    const toolResult: IntentResult<ToolManifestEntry> = {
      source: 'TOOLS.md',
      intents: [
        { name: 'Read', riskClass: 1, oboFlag: false, capabilities: ['read'], description: 'Read files', line: 3 },
      ],
      diagnostics: [],
    };

    const ast = buildGovernanceAST([
      soulResult as AnyIntentResult,
      toolResult as AnyIntentResult,
    ]);

    const diag = ast.diagnostics.find(d => d.code === 'CLAWS-X001');
    expect(diag).toBeDefined();
    // Should NOT contain "did you mean" because "zzzzzzz-tool" is far from "read"
    expect(diag!.message).not.toContain('did you mean');
  });
});
