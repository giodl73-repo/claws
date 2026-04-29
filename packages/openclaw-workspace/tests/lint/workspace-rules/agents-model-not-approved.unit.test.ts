/**
 * Tests for `OC_AGENTS_MODEL_NOT_APPROVED` (#73715, #39811).
 *
 * Schema-DI'd: rule no-ops when no schema or no `approvedAgentModels`
 * function is provided. Fires when an agent declares a model not in
 * the allow-list. Case-sensitive (per #73715, case mismatch IS the
 * bug). Provider/ prefix is stripped before comparison.
 */

import { describe, expect, it } from 'vitest';
import { parse } from '../../../src/ast/parse.js';
import { lintWorkspace } from '../../../src/lint/workspace.js';
import type { DiscoveredWorkspaceFile } from '../../../src/staging/discover.js';
import type { WorkspaceContext } from '../../../src/lint/workspace-types.js';
import type { LintSchema } from '../../../src/lint/types.js';

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

describe('OC_AGENTS_MODEL_NOT_APPROVED', () => {
  it('fires on a model not in the approved list', () => {
    const raw = `## Drafter\n- description: writer\n- model: gpt-4-turbo\n`;
    const ctx: WorkspaceContext = { files: [agentsFile(raw)] };
    const schema = makeSchema(['claude-opus-4-7', 'claude-sonnet-4-6']);
    const findings = lintWorkspace(ctx, { schema });
    const f = findings.find((x) => x.code === 'OC_AGENTS_MODEL_NOT_APPROVED');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('error');
    expect(f!.message).toContain("'gpt-4-turbo'");
  });

  it('does NOT fire when the model matches the allow-list exactly', () => {
    const raw = `## Drafter\n- description: writer\n- model: claude-opus-4-7\n`;
    const ctx: WorkspaceContext = { files: [agentsFile(raw)] };
    const schema = makeSchema(['claude-opus-4-7']);
    const findings = lintWorkspace(ctx, { schema });
    expect(findings.find((x) => x.code === 'OC_AGENTS_MODEL_NOT_APPROVED')).toBeUndefined();
  });

  it('treats provider/ prefix transparently (anthropic/claude-opus-4-7 matches claude-opus-4-7)', () => {
    const raw = `## Drafter\n- description: w\n- model: anthropic/claude-opus-4-7\n`;
    const ctx: WorkspaceContext = { files: [agentsFile(raw)] };
    const schema = makeSchema(['claude-opus-4-7']);
    const findings = lintWorkspace(ctx, { schema });
    expect(findings.find((x) => x.code === 'OC_AGENTS_MODEL_NOT_APPROVED')).toBeUndefined();
  });

  it('case-sensitive: CLAUDE-OPUS-4-7 is rejected even if claude-opus-4-7 is approved (per #73715)', () => {
    const raw = `## Drafter\n- description: w\n- model: anthropic/CLAUDE-OPUS-4-7\n`;
    const ctx: WorkspaceContext = { files: [agentsFile(raw)] };
    const schema = makeSchema(['claude-opus-4-7']);
    const findings = lintWorkspace(ctx, { schema });
    expect(findings.find((x) => x.code === 'OC_AGENTS_MODEL_NOT_APPROVED')).toBeDefined();
  });

  it('no-ops when no schema is provided (rule is opt-in)', () => {
    const raw = `## Drafter\n- description: w\n- model: anything-goes\n`;
    const ctx: WorkspaceContext = { files: [agentsFile(raw)] };
    const findings = lintWorkspace(ctx);
    expect(findings.find((x) => x.code === 'OC_AGENTS_MODEL_NOT_APPROVED')).toBeUndefined();
  });

  it('no-ops when schema returns null from approvedAgentModels (no policy)', () => {
    const raw = `## Drafter\n- description: w\n- model: anything-goes\n`;
    const ctx: WorkspaceContext = { files: [agentsFile(raw)] };
    const schema = makeSchema(null);
    const findings = lintWorkspace(ctx, { schema });
    expect(findings.find((x) => x.code === 'OC_AGENTS_MODEL_NOT_APPROVED')).toBeUndefined();
  });

  it('fires once per offending agent (multiple agents handled independently)', () => {
    const raw = `## A
- description: ok
- model: claude-opus-4-7

## B
- description: bad
- model: gpt-4
`;
    const ctx: WorkspaceContext = { files: [agentsFile(raw)] };
    const schema = makeSchema(['claude-opus-4-7']);
    const findings = lintWorkspace(ctx, { schema });
    const fs = findings.filter((x) => x.code === 'OC_AGENTS_MODEL_NOT_APPROVED');
    expect(fs).toHaveLength(1);
    expect(fs[0]!.message).toContain("'gpt-4'");
  });
});
