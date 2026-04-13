/**
 * L0: GovernanceAST unit tests — AST construction and cross-reference resolution.
 *
 * 3 unit tests covering:
 * 1. buildGovernanceAST() from SOUL.md + TOOLS.md intents produces AST with deny + tool categories
 * 2. Pass 2 cross-reference: SOUL.md deny "never use prod-deploy" resolves against TOOLS.md tool
 * 3. Unresolved reference: SOUL.md deny "never use nonexistent-tool" produces diagnostic with suggestion
 */

import { describe, it, expect } from 'vitest';
import { buildGovernanceAST } from '../../src/compile/governance-ast.js';
import type {
  IntentResult,
  SoulIntent,
  ToolManifestEntry,
  DelegationIntent,
} from '../../src/compile/types.js';
import type { AnyIntentResult } from '../../src/compile/intent/index.js';

/** Helper to create a SOUL.md IntentResult with deny intents. */
function makeSoulResult(intents: SoulIntent[]): IntentResult<SoulIntent> {
  return { source: 'SOUL.md', intents, diagnostics: [] };
}

/** Helper to create a TOOLS.md IntentResult with tool entries. */
function makeToolsResult(intents: ToolManifestEntry[]): IntentResult<ToolManifestEntry> {
  return { source: 'TOOLS.md', intents, diagnostics: [] };
}

/** Helper to create an AGENTS.md IntentResult with delegation edges. */
function makeAgentsResult(intents: DelegationIntent[]): IntentResult<DelegationIntent> {
  return { source: 'AGENTS.md', intents, diagnostics: [] };
}

describe('buildGovernanceAST()', () => {
  it('groups SOUL.md + TOOLS.md intents into deny and tool categories', () => {
    const soulIntents: SoulIntent[] = [
      {
        keyword: 'never',
        confidence: 0.95,
        scope: 'tool',
        pattern: 'bypass security policies',
        rawLine: 'Never bypass security policies',
        line: 3,
        autoExtracted: true,
        intentKind: 'deny',
      },
      {
        keyword: 'always',
        confidence: 0.90,
        scope: 'tool',
        pattern: 'audit tool usage',
        rawLine: 'Always audit tool usage',
        line: 4,
        autoExtracted: true,
        intentKind: 'require',
      },
    ];

    const toolIntents: ToolManifestEntry[] = [
      {
        name: 'Bash',
        riskClass: 2,
        oboFlag: false,
        capabilities: ['read', 'execute'],
        description: 'Restricted to read-only operations.',
        line: 3,
      },
      {
        name: 'Write',
        riskClass: 2,
        oboFlag: false,
        capabilities: ['write', 'audit'],
        description: 'All file writes must be audited.',
        line: 7,
      },
    ];

    const intentResults: AnyIntentResult[] = [
      makeSoulResult(soulIntents) as AnyIntentResult,
      makeToolsResult(toolIntents) as AnyIntentResult,
    ];

    const ast = buildGovernanceAST(intentResults);

    // Deny category should contain deny intents from SOUL.md
    expect(ast.deny).toHaveLength(1);
    expect(ast.deny[0]!.source).toBe('SOUL.md');
    expect(ast.deny[0]!.intents).toHaveLength(1);
    expect(ast.deny[0]!.intents[0]!.intentKind).toBe('deny');

    // Tool category should contain TOOLS.md entries
    expect(ast.tool).toHaveLength(1);
    expect(ast.tool[0]!.source).toBe('TOOLS.md');
    expect(ast.tool[0]!.intents).toHaveLength(2);
    expect(ast.tool[0]!.intents[0]!.name).toBe('Bash');
    expect(ast.tool[0]!.intents[1]!.name).toBe('Write');

    // Empty categories for missing files
    expect(ast.delegation).toHaveLength(0);
    expect(ast.identity).toHaveLength(0);
    expect(ast.authority).toHaveLength(0);
    expect(ast.memory).toHaveLength(0);
    expect(ast.schedule).toHaveLength(0);
    expect(ast.skill).toHaveLength(0);
    expect(ast.workflow).toHaveLength(0);
  });

  it('pass 2 cross-reference: SOUL.md deny resolves against TOOLS.md tool', () => {
    const soulIntents: SoulIntent[] = [
      {
        keyword: 'never',
        confidence: 0.95,
        scope: 'tool',
        pattern: 'use prod-deploy in development environments',
        rawLine: 'Never use prod-deploy in development environments',
        line: 5,
        autoExtracted: true,
        intentKind: 'deny',
      },
    ];

    const toolIntents: ToolManifestEntry[] = [
      {
        name: 'prod-deploy',
        riskClass: 5,
        oboFlag: false,
        capabilities: ['write', 'execute'],
        description: 'Deploy to production write access.',
        line: 3,
      },
      {
        name: 'Bash',
        riskClass: 2,
        oboFlag: false,
        capabilities: ['execute'],
        description: 'Shell access.',
        line: 8,
      },
    ];

    const intentResults: AnyIntentResult[] = [
      makeSoulResult(soulIntents) as AnyIntentResult,
      makeToolsResult(toolIntents) as AnyIntentResult,
    ];

    const ast = buildGovernanceAST(intentResults);

    // Cross-reference should resolve "prod-deploy" in deny intent
    expect(ast.crossReferences.length).toBeGreaterThanOrEqual(1);
    const resolved = ast.crossReferences.find(
      cr => cr.normalizedName === 'prod-deploy',
    );
    expect(resolved).toBeDefined();
    expect(resolved!.resolved).toBe(true);
    expect(resolved!.targetSource).toBe('TOOLS.md');
    expect(resolved!.fromSource).toBe('SOUL.md');
  });

  it('unresolved reference produces diagnostic with edit-distance suggestion', () => {
    const soulIntents: SoulIntent[] = [
      {
        keyword: 'never',
        confidence: 0.95,
        scope: 'tool',
        pattern: 'use prod-deploi in development',
        rawLine: 'Never use prod-deploi in development',
        line: 5,
        autoExtracted: true,
        intentKind: 'deny',
      },
    ];

    const toolIntents: ToolManifestEntry[] = [
      {
        name: 'prod-deploy',
        riskClass: 5,
        oboFlag: false,
        capabilities: ['write', 'execute'],
        description: 'Deploy to production write access.',
        line: 3,
      },
    ];

    const intentResults: AnyIntentResult[] = [
      makeSoulResult(soulIntents) as AnyIntentResult,
      makeToolsResult(toolIntents) as AnyIntentResult,
    ];

    const ast = buildGovernanceAST(intentResults);

    // Should have an unresolved cross-reference
    const unresolved = ast.crossReferences.find(
      cr => cr.normalizedName === 'prod-deploi',
    );
    expect(unresolved).toBeDefined();
    expect(unresolved!.resolved).toBe(false);

    // Should produce a diagnostic with a "did you mean?" suggestion
    const diagWithSuggestion = ast.diagnostics.find(
      d => d.code === 'CLAWS-X001' && d.message.includes('did you mean'),
    );
    expect(diagWithSuggestion).toBeDefined();
    expect(diagWithSuggestion!.message).toContain('prod-deploy');
    expect(diagWithSuggestion!.severity).toBe('warning');
    expect(diagWithSuggestion!.file).toBe('SOUL.md');
    expect(diagWithSuggestion!.line).toBe(5);
  });
});
