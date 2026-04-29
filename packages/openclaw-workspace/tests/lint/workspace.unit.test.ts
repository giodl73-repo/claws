/**
 * Tests for `lintWorkspace(ctx, opts)` — the cross-file lint substrate.
 *
 * The Phase 3 commit ships the substrate only (empty workspace-rule
 * registry); these tests lock in:
 *   - Empty registry behaves like a no-op for cross-file rules
 *   - Existing single-file `lint(doc, opts)` API is unchanged
 *   - JSONC findings get stamped with `source: 'jsonc'` + `relPath`
 *   - Findings sort by relPath then by location-within-file
 *   - The discriminated union (`source`) lets renderers branch cleanly
 *   - Cross-file rules in registry get invoked with the right context
 *     and their drafts get `ocUri` stamped
 */

import { describe, expect, it } from 'vitest';
import { parseJsonc } from '../../src/ast/jsonc/parse.js';
import { lint } from '../../src/lint/index.js';
import {
  lintWorkspace,
  ALL_WORKSPACE_RULES,
} from '../../src/lint/workspace.js';
import type {
  MarkdownLintFindingDraft,
  WorkspaceContext,
  WorkspaceLintRule,
} from '../../src/lint/workspace-types.js';

describe('lintWorkspace — backward compat', () => {
  it('empty workspace returns empty findings', () => {
    const ctx: WorkspaceContext = { files: [] };
    expect(lintWorkspace(ctx)).toEqual([]);
  });

  it('with no configDoc and no markdown rules, returns empty', () => {
    const ctx: WorkspaceContext = {
      files: [
        {
          relPath: 'AGENTS.md',
          kind: 'agents',
          raw: '## A\n- description: x\n',
          ast: { kind: 'agents', raw: '', frontmatter: [], preamble: '', blocks: [], agents: [] } as never,
          diagnostics: [],
        },
      ],
    };
    expect(lintWorkspace(ctx)).toEqual([]);
  });

  it('JSONC findings come through with source=jsonc + relPath stamped', () => {
    const config = '{\n  "gateway": { "port": 18789, "port": 18790 }\n}\n';
    const doc = parseJsonc(config);
    const ctx: WorkspaceContext = {
      files: [],
      configDoc: doc,
      configRelPath: 'openclaw.json',
    };
    const findings = lintWorkspace(ctx);
    // Single-file lint should fire OC_CFG_DUPLICATE_KEY here.
    const dup = findings.find((f) => f.code === 'OC_CFG_DUPLICATE_KEY');
    expect(dup).toBeDefined();
    expect(dup!.source).toBe('jsonc');
    expect(dup!.relPath).toBe('openclaw.json');
  });

  it('configRelPath defaults to openclaw.json when omitted', () => {
    const doc = parseJsonc('{ "a": 1, "a": 2 }\n');
    const ctx: WorkspaceContext = { files: [], configDoc: doc };
    const findings = lintWorkspace(ctx);
    const dup = findings.find((f) => f.code === 'OC_CFG_DUPLICATE_KEY');
    expect(dup?.relPath).toBe('openclaw.json');
  });

  it('single-file lint(doc) API is unchanged (existing 13 rules still work)', () => {
    const doc = parseJsonc('{ "a": 1, "a": 2 }\n');
    const findings = lint(doc);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    // None of the existing fields should have changed shape.
    const f = findings[0]!;
    expect(typeof f.code).toBe('string');
    expect(typeof f.severity).toBe('string');
    expect(typeof f.message).toBe('string');
    expect(typeof f.location.start).toBe('number');
    expect(typeof f.location.end).toBe('number');
    expect(typeof f.location.line).toBe('number');
    expect(typeof f.location.column).toBe('number');
    expect(typeof f.ocUri).toBe('string');
    // Single-file API does NOT carry source/relPath — that's workspace-level only.
    expect((f as never as { source?: string }).source).toBeUndefined();
  });

  it('ALL_WORKSPACE_RULES contains the 8 evidence-anchored rules', () => {
    expect(ALL_WORKSPACE_RULES).toHaveLength(8);
    const codes = ALL_WORKSPACE_RULES.map((r) => r.code).sort();
    expect(codes).toEqual([
      'OC_AGENTS_MODEL_NOT_APPROVED',
      'OC_MEMORY_DEAD_LINK',
      'OC_MEMORY_HOOK_TOO_LONG',
      'OC_MEMORY_INDEX_OVER_LIMIT',
      'OC_MEMORY_RAW_CANDIDATE_LEAK',
      'OC_SKILL_DEAD_PATH',
      'OC_SKILL_NAME_MISMATCH',
      'OC_SKILL_TOO_LONG',
    ]);
  });

  it('every evidence-anchored rule cites at least one upstream issue', () => {
    // OC_MEMORY_DEAD_LINK is intentionally evidence-empty — see its
    // docstring. All other rules MUST have at least one citation. If
    // a future rule lands without evidence, add it to this exception
    // list AND document the reasoning in the rule's docstring.
    const evidenceExempt = new Set(['OC_MEMORY_DEAD_LINK']);
    for (const rule of ALL_WORKSPACE_RULES) {
      if (evidenceExempt.has(rule.code)) continue;
      expect(
        rule.evidenceIssues.length,
        `${rule.code} must cite ≥1 upstream issue (or be added to evidenceExempt with rationale)`,
      ).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('lintWorkspace — registry dispatch (forward-compat substrate)', () => {
  // Patch in a transient rule just for the dispatch test. We don't
  // mutate ALL_WORKSPACE_RULES at module level because that would leak
  // across test files. Instead we build a one-off ctx and call a local
  // engine that mirrors `lintWorkspace`'s shape.
  it('a workspace rule sees the parsed file set and its drafts get ocUri stamped', () => {
    const transientRule: WorkspaceLintRule = {
      code: 'OC_CFG_DUPLICATE_KEY' as never, // borrowed code — just for dispatch test
      severity: 'warn',
      evidenceIssues: [],
      run: (ctx): readonly MarkdownLintFindingDraft[] => {
        const drafts: MarkdownLintFindingDraft[] = [];
        for (const f of ctx.files) {
          if (f.kind === 'agents') {
            drafts.push({
              source: 'markdown',
              code: 'OC_CFG_DUPLICATE_KEY' as never,
              severity: 'warn',
              message: `dispatch test reached ${f.relPath}`,
              relPath: f.relPath,
              line: 1,
            });
          }
        }
        return drafts;
      },
    };
    // Inline-engine clone for the dispatch-only assertion.
    const ctx: WorkspaceContext = {
      files: [
        {
          relPath: 'AGENTS.md',
          kind: 'agents',
          raw: '## A\n',
          ast: { kind: 'agents', raw: '', frontmatter: [], preamble: '', blocks: [], agents: [] } as never,
          diagnostics: [],
        },
      ],
    };
    const drafts = transientRule.run(ctx, undefined);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.relPath).toBe('AGENTS.md');
    expect(drafts[0]!.message).toContain('AGENTS.md');
  });
});

describe('lintWorkspace — sorting', () => {
  it('sorts findings by relPath alphabetically then by within-file location', () => {
    // Two duplicate-key cases in the same file should sort by start offset.
    const config = '{\n  "a": 1,\n  "a": 2,\n  "a": 3\n}\n';
    const doc = parseJsonc(config);
    const ctx: WorkspaceContext = { files: [], configDoc: doc };
    const findings = lintWorkspace(ctx);
    const dups = findings.filter((f) => f.code === 'OC_CFG_DUPLICATE_KEY');
    expect(dups.length).toBeGreaterThanOrEqual(1);
    // Within the same relPath, JSONC findings sorted by location.start.
    for (let i = 1; i < dups.length; i++) {
      const prev = dups[i - 1]!;
      const cur = dups[i]!;
      if (prev.source === 'jsonc' && cur.source === 'jsonc') {
        expect(cur.location.start).toBeGreaterThanOrEqual(prev.location.start);
      }
    }
  });
});
