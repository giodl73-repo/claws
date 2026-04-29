/**
 * End-to-end integration test: `discoverWorkspaceFiles` →
 * `lintWorkspace` against a real fixture workspace on disk.
 *
 * Locks in the consumer-facing contract: a workspace dir with one of
 * each violation type produces exactly one finding per violation,
 * with the expected codes, relPaths, and severity. Without this test,
 * individual rule tests pass but the read+classify+parse+lint pipeline
 * isn't proven to wire correctly.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { discoverWorkspaceFiles } from '../../src/staging/discover.js';
import { lintWorkspace } from '../../src/lint/workspace.js';
import type { LintSchema } from '../../src/lint/types.js';

function makeRoot(): string {
  return mkdtempSync(join(tmpdir(), 'oc-workspace-e2e-'));
}

function approvedModelsSchema(approved: readonly string[]): LintSchema {
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

describe('lintWorkspace + discoverWorkspaceFiles — end-to-end', () => {
  it('a workspace with one of each violation produces the expected unified findings', async () => {
    // NB: this fixture only writes UNIQUE basenames so it works on
    // case-insensitive filesystems (Windows / macOS default). Phase 1
    // discover-diagnostic tests cover the case-variant + legacy-basename
    // surface separately with isolated fixtures.
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, 'SOUL.md'),
        '# soul\n\n## Boundaries\n- do not leak\n',
        'utf8',
      );
      writeFileSync(
        join(root, 'AGENTS.md'),
        `## Drafter\n- description: writes things\n- model: gpt-4-turbo\n`,
        'utf8',
      );
      writeFileSync(
        join(root, 'MEMORY.md'),
        `## E1\n${'x'.repeat(160)}\n\n## E2\nCandidate: undistilled marker\n`,
        'utf8',
      );
      mkdirSync(join(root, 'skills', 'email-drafter'), { recursive: true });
      writeFileSync(
        join(root, 'skills', 'email-drafter', 'SKILL.md'),
        `---\nname: wrong-name\ndescription: x\n---\nbody\n`,
        'utf8',
      );

      const discovery = await discoverWorkspaceFiles(root);
      const ctx = { files: discovery.files };
      const schema = approvedModelsSchema(['claude-opus-4-7', 'claude-sonnet-4-6']);
      const findings = lintWorkspace(ctx, { schema });

      const codes = findings.map((f) => f.code);

      // AGENTS unapproved model.
      expect(codes).toContain('OC_AGENTS_MODEL_NOT_APPROVED');
      const modelFinding = findings.find(
        (f) => f.code === 'OC_AGENTS_MODEL_NOT_APPROVED',
      )!;
      expect(modelFinding.relPath).toBe('AGENTS.md');
      expect(modelFinding.severity).toBe('error');

      // MEMORY hook-too-long on E1.
      const hookFinding = findings.find(
        (f) => f.code === 'OC_MEMORY_HOOK_TOO_LONG',
      );
      expect(hookFinding).toBeDefined();
      expect(hookFinding!.relPath).toBe('MEMORY.md');

      // MEMORY raw-candidate-leak — fires once on E2.
      const leakFindings = findings.filter(
        (f) => f.code === 'OC_MEMORY_RAW_CANDIDATE_LEAK',
      );
      expect(leakFindings).toHaveLength(1);
      expect(leakFindings[0]!.relPath).toBe('MEMORY.md');

      // SKILL name mismatch.
      const skillFinding = findings.find(
        (f) => f.code === 'OC_SKILL_NAME_MISMATCH',
      );
      expect(skillFinding).toBeDefined();
      expect(skillFinding!.relPath).toBe('skills/email-drafter/SKILL.md');

      // Ordering: findings sort by relPath alphabetical, then by line
      // within file. Verify the high-level ordering.
      const relPaths = findings.map((f) => f.relPath);
      const sorted = [...relPaths].sort();
      expect(relPaths).toEqual(sorted);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a clean canonical workspace produces zero findings and zero discovery diagnostics', async () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, 'SOUL.md'),
        '# soul\n\n## Boundaries\n- do not leak\n',
        'utf8',
      );
      writeFileSync(
        join(root, 'AGENTS.md'),
        `## Main\n- description: primary agent\n- model: claude-opus-4-7\n`,
        'utf8',
      );
      writeFileSync(
        join(root, 'MEMORY.md'),
        `## OK entry\nshort distilled hook\n`,
        'utf8',
      );

      const discovery = await discoverWorkspaceFiles(root);
      expect(discovery.diagnostics).toEqual([]);
      const findings = lintWorkspace(
        { files: discovery.files },
        { schema: approvedModelsSchema(['claude-opus-4-7']) },
      );
      expect(findings).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
