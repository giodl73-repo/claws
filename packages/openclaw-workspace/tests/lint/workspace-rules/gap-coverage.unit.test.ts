/**
 * Gap-coverage tests added during Phase 4 review fix-up. Cover:
 *   • Off-by-one line numbers in memory-dead-link / raw-candidate-leak
 *     / hook-too-long (regression-locked after fix)
 *   • Empty `model:` value silently skipped (separate concern)
 *   • Three-component provider/model/extra split-on-LAST-slash
 *   • Wrong-kind hygiene (memory rule shouldn't fire on SKILL.md)
 *   • Determinism — running lintWorkspace twice yields identical output
 *   • `..`-past-root in dead-link suppresses
 */

import { describe, expect, it } from 'vitest';
import { parse } from '../../../src/ast/parse.js';
import { lintWorkspace } from '../../../src/lint/workspace.js';
import type { DiscoveredWorkspaceFile } from '../../../src/staging/discover.js';
import type {
  MarkdownLintFinding,
  WorkspaceContext,
  WorkspaceLintFinding,
} from '../../../src/lint/workspace-types.js';
import type { LintSchema } from '../../../src/lint/types.js';

/** Type-narrow a finding to its markdown variant. Tests use this when they
 *  need to assert on `line` / `column` which only exist on the markdown
 *  half of the discriminated union. */
function asMarkdown(f: WorkspaceLintFinding | undefined): MarkdownLintFinding {
  expect(f).toBeDefined();
  expect(f!.source).toBe('markdown');
  return f as MarkdownLintFinding;
}

function memoryFile(raw: string, relPath = 'MEMORY.md'): DiscoveredWorkspaceFile {
  const { ast, diagnostics } = parse('memory', raw);
  return { relPath, kind: 'memory', raw, ast, diagnostics };
}
function skillFile(raw: string, relPath: string): DiscoveredWorkspaceFile {
  const { ast, diagnostics } = parse('skills', raw);
  return { relPath, kind: 'skills', raw, ast, diagnostics };
}
function agentsFile(raw: string, relPath = 'AGENTS.md'): DiscoveredWorkspaceFile {
  const { ast, diagnostics } = parse('agents', raw);
  return { relPath, kind: 'agents', raw, ast, diagnostics };
}

function makeSchema(approved: readonly string[] | null): LintSchema {
  return {
    kindOf: () => 'unknown',
    knownChildKeys: () => [],
    requiredChildKeys: () => [],
    deprecatedKeys: () => new Map(),
    legacyKeys: () => new Map(),
    pluginIdSources: () => [],
    approvedAgentModels: () => approved,
  };
}

describe('Phase 4 fix-up — line-number correctness', () => {
  it('OC_MEMORY_DEAD_LINK reports the actual line containing the bad link', () => {
    // Heading on line 1, blank on line 2, link on line 3.
    const raw = `## Test entry

See [missing](nope.md) for details.
`;
    const ctx: WorkspaceContext = { files: [memoryFile(raw)] };
    const findings = lintWorkspace(ctx);
    const f = asMarkdown(findings.find((x) => x.code === 'OC_MEMORY_DEAD_LINK'));
    expect(f.line).toBe(3); // line 3 is `See [missing](nope.md)...`
  });

  it('OC_MEMORY_RAW_CANDIDATE_LEAK reports the actual line containing the marker', () => {
    // Heading on line 1, normal content on line 2, marker on line 3.
    const raw = `## Test
distilled hook line.
Candidate: undistilled trace
`;
    const ctx: WorkspaceContext = { files: [memoryFile(raw)] };
    const findings = lintWorkspace(ctx);
    const f = asMarkdown(findings.find((x) => x.code === 'OC_MEMORY_RAW_CANDIDATE_LEAK'));
    expect(f.line).toBe(3);
  });

  it('OC_MEMORY_HOOK_TOO_LONG reports the hook line, even with leading blanks', () => {
    // Heading on line 1, blank on 2, blank on 3, long hook on 4.
    const longHook = 'x'.repeat(160);
    const raw = `## Test


${longHook}
`;
    const ctx: WorkspaceContext = { files: [memoryFile(raw)] };
    const findings = lintWorkspace(ctx);
    const f = asMarkdown(findings.find((x) => x.code === 'OC_MEMORY_HOOK_TOO_LONG'));
    expect(f.line).toBe(4);
  });
});

describe('Phase 4 fix-up — agents model edge cases', () => {
  it('skips empty model: value (not the rule\'s concern)', () => {
    const raw = `## A\n- description: x\n- model: \n`;
    const ctx: WorkspaceContext = { files: [agentsFile(raw)] };
    const schema = makeSchema(['claude-opus-4-7']);
    const findings = lintWorkspace(ctx, { schema });
    expect(findings.find((x) => x.code === 'OC_AGENTS_MODEL_NOT_APPROVED')).toBeUndefined();
  });

  it('three-component (litellm/anthropic/claude-opus-4-7) matches via last-slash split', () => {
    const raw = `## A\n- description: x\n- model: litellm/anthropic/claude-opus-4-7\n`;
    const ctx: WorkspaceContext = { files: [agentsFile(raw)] };
    const schema = makeSchema(['claude-opus-4-7']);
    const findings = lintWorkspace(ctx, { schema });
    // The rule splits on LAST `/`, so 'claude-opus-4-7' matches the
    // trailing component. Documented behavior.
    expect(findings.find((x) => x.code === 'OC_AGENTS_MODEL_NOT_APPROVED')).toBeUndefined();
  });

  it('reports the actual line of the model: bullet (parser tracks per-field line)', () => {
    const raw = `## A\n- description: x\n- model: gpt-4\n`;
    const ctx: WorkspaceContext = { files: [agentsFile(raw)] };
    const schema = makeSchema(['claude-opus-4-7']);
    const findings = lintWorkspace(ctx, { schema });
    const f = asMarkdown(findings.find((x) => x.code === 'OC_AGENTS_MODEL_NOT_APPROVED'));
    expect(f.line).toBe(3); // heading=1, description=2, model=3
  });
});

describe('Phase 4 fix-up — wrong-kind hygiene', () => {
  it('memory rules do not fire on SKILL.md content', () => {
    const skillRaw = `---
name: x
description: y
---
${'x'.repeat(160)}
Candidate: looks like a marker
`;
    const ctx: WorkspaceContext = {
      files: [skillFile(skillRaw, 'skills/x/SKILL.md')],
    };
    const findings = lintWorkspace(ctx);
    const memoryCodes = findings.filter((x) =>
      x.code.startsWith('OC_MEMORY_'),
    );
    expect(memoryCodes).toEqual([]);
  });

  it('skill rules do not fire on MEMORY.md content', () => {
    const memoryRaw = `## Big entry
${'x'.repeat(600)}
`;
    const ctx: WorkspaceContext = { files: [memoryFile(memoryRaw)] };
    const findings = lintWorkspace(ctx);
    const skillCodes = findings.filter((x) => x.code.startsWith('OC_SKILL_'));
    expect(skillCodes).toEqual([]);
  });
});

describe('Phase 4 fix-up — determinism', () => {
  it('lintWorkspace is deterministic — two calls on same input yield identical output', () => {
    const raw = `## A
${'x'.repeat(160)}

## B
short
`;
    const ctx: WorkspaceContext = { files: [memoryFile(raw)] };
    const a = lintWorkspace(ctx);
    const b = lintWorkspace(ctx);
    expect(a).toEqual(b);
  });
});

describe('Phase 4 fix-up — dead-link `..` past root suppression', () => {
  it('does NOT fire when relative target traverses past workspace root', () => {
    const raw = `## E1\n[escape](../../escaped.md)\n`;
    const ctx: WorkspaceContext = { files: [memoryFile(raw)] };
    const findings = lintWorkspace(ctx);
    expect(findings.find((x) => x.code === 'OC_MEMORY_DEAD_LINK')).toBeUndefined();
  });
});

describe('Phase 4 fix-up — skill-name-mismatch line', () => {
  it('reports the actual line of the name: key, not a hard-coded 2', () => {
    // name: is on line 4 (after description: + tier:)
    const raw = `---
description: y
tier: T1
name: wrong-name
---
body
`;
    const ctx: WorkspaceContext = {
      files: [skillFile(raw, 'skills/email-drafter/SKILL.md')],
    };
    const findings = lintWorkspace(ctx);
    const f = asMarkdown(findings.find((x) => x.code === 'OC_SKILL_NAME_MISMATCH'));
    expect(f.line).toBe(4);
  });
});
