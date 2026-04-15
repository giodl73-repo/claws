/**
 * L0: SKILL-TOOL-GHOST conflict detector unit tests.
 *
 * Covers uncovered branches:
 * 1. Phantom tool with no fuzzy match (distance > 2) — lines 35-36, 41
 * 2. Phantom tool with fuzzy match (distance <= 2) — suggestion path
 * 3. Declared tool is found (no conflict) — line 71
 * 4. Skill with multiple required tools (mix of declared and phantom)
 * 5. Empty skills list — no conflicts
 * 6. Empty tools list — all tools are phantom
 */

import { describe, it, expect } from 'vitest';
import { detectSkillToolGhost } from '../../src/compile/conflicts/skill-tool-ghost.js';
import type {
  GovernanceAST,
  ParsedManifest,
  ToolEntry,
  SkillEntry,
} from '../../src/compile/types.js';

function makeAST(): GovernanceAST {
  return {
    deny: [],
    tool: [],
    delegation: [],
    identity: [],
    authority: [],
    memory: [],
    schedule: [],
    skill: [],
    workflow: [],
    crossReferences: [],
    diagnostics: [],
  };
}

function makeManifest(overrides: Partial<ParsedManifest> = {}): ParsedManifest {
  return {
    tools: [],
    skills: [],
    agents: [],
    dataLabels: [],
    diagnostics: [],
    ...overrides,
  };
}

describe('detectSkillToolGhost()', () => {
  it('returns empty when there are no skills', () => {
    const entries = detectSkillToolGhost(makeAST(), makeManifest());
    expect(entries).toEqual([]);
  });

  it('returns empty when all required tools are declared', () => {
    const skills: SkillEntry[] = [
      { name: 'build', description: 'Build project', requiredTools: ['Read', 'Bash'], source: 'skills/', line: 3 },
    ];
    const tools: ToolEntry[] = [
      { name: 'Read', normalizedName: 'read', riskClass: 1, oboFlag: false, capabilities: ['read'], source: 'TOOLS.md', line: 3, denyConstraints: [] },
      { name: 'Bash', normalizedName: 'bash', riskClass: 2, oboFlag: false, capabilities: ['execute'], source: 'TOOLS.md', line: 5, denyConstraints: [] },
    ];
    const entries = detectSkillToolGhost(makeAST(), makeManifest({ skills, tools }));
    expect(entries).toEqual([]);
  });

  it('detects phantom tool with fuzzy match suggestion (distance <= 2)', () => {
    const skills: SkillEntry[] = [
      { name: 'scan', description: 'Scan code', requiredTools: ['Raed'], source: 'skills/', line: 3 },
    ];
    const tools: ToolEntry[] = [
      { name: 'Read', normalizedName: 'read', riskClass: 1, oboFlag: false, capabilities: ['read'], source: 'TOOLS.md', line: 3, denyConstraints: [] },
    ];
    const entries = detectSkillToolGhost(makeAST(), makeManifest({ skills, tools }));

    expect(entries).toHaveLength(1);
    expect(entries[0]!.category).toBe('SKILL-TOOL-GHOST');
    expect(entries[0]!.code).toBe('CLAWS-C006');
    expect(entries[0]!.severity).toBe('Warning');
    expect(entries[0]!.explanation).toContain('Raed');
    expect(entries[0]!.explanation).toContain('did you mean');
    expect(entries[0]!.explanation).toContain('Read');
  });

  it('detects phantom tool with no fuzzy match when distance > 2', () => {
    const skills: SkillEntry[] = [
      { name: 'deploy', description: 'Deploy app', requiredTools: ['completely-different-tool'], source: 'skills/', line: 5 },
    ];
    const tools: ToolEntry[] = [
      { name: 'Read', normalizedName: 'read', riskClass: 1, oboFlag: false, capabilities: ['read'], source: 'TOOLS.md', line: 3, denyConstraints: [] },
    ];
    const entries = detectSkillToolGhost(makeAST(), makeManifest({ skills, tools }));

    expect(entries).toHaveLength(1);
    expect(entries[0]!.explanation).toContain('completely-different-tool');
    // No fuzzy match suggestion
    expect(entries[0]!.explanation).not.toContain('did you mean');
  });

  it('reports one conflict per phantom tool in a skill with mixed tools', () => {
    const skills: SkillEntry[] = [
      { name: 'multi', description: 'Multi tool', requiredTools: ['Read', 'ghost-tool', 'Bash'], source: 'skills/', line: 3 },
    ];
    const tools: ToolEntry[] = [
      { name: 'Read', normalizedName: 'read', riskClass: 1, oboFlag: false, capabilities: ['read'], source: 'TOOLS.md', line: 3, denyConstraints: [] },
      { name: 'Bash', normalizedName: 'bash', riskClass: 2, oboFlag: false, capabilities: ['execute'], source: 'TOOLS.md', line: 5, denyConstraints: [] },
    ];
    const entries = detectSkillToolGhost(makeAST(), makeManifest({ skills, tools }));

    // Only ghost-tool should be reported
    expect(entries).toHaveLength(1);
    expect(entries[0]!.explanation).toContain('ghost-tool');
  });

  it('reports all tools as phantom when tools list is empty', () => {
    const skills: SkillEntry[] = [
      { name: 'test', description: 'Test skill', requiredTools: ['ToolA', 'ToolB'], source: 'skills/', line: 3 },
    ];
    const entries = detectSkillToolGhost(makeAST(), makeManifest({ skills }));

    expect(entries).toHaveLength(2);
    expect(entries[0]!.explanation).toContain('ToolA');
    expect(entries[1]!.explanation).toContain('ToolB');
  });
});
