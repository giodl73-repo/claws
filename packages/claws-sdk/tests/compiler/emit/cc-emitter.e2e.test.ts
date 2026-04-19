/**
 * L2: Claude Code emitter e2e test.
 *
 * End-to-end emit from a fixture workspace through readers → IR →
 * compileGuard → ClaudeCodeEmitter pipeline. Verifies the full compile
 * chain produces a Claude Code workspace that a downstream Claude Code
 * installation could consume without further transformation.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { readOCWorkspace } from '#src/compiler/readers/workspace-reader.js';
import type { OCWorkspaceModel } from '#src/compiler/readers/types.js';
import { ClaudeCodeEmitter } from '#src/compiler/emit/cc-emitter.js';
import { verifyNoCraftworksRefs } from '#src/compiler/emit/oc-emitter.js';
import type { OCWorkspaceIR } from '#src/compiler/ir/workspace-ir.js';
import type { FileReference } from '#src/compiler/ir/field-types.js';
import type { GovAnalysis } from '#src/compiler/enforce/types.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

function fileRef(path: string): FileReference {
  return { path, hash: 'e2e-hash', size: 100 };
}

function modelToIR(model: OCWorkspaceModel): OCWorkspaceIR {
  return {
    soul: {
      persona: model.soul.ok ? (model.soul.data.persona ?? 'default') : 'default',
      principles: ['be-safe'],
      boundaries: [{ text: 'never write secrets', line: 1 }],
      source: fileRef('SOUL.md'),
    },
    tools: {
      tools: [
        { name: 'read-file', description: 'r', trustLevel: 1, oboFlag: false, line: 1 },
        { name: 'edit-file', description: 'e', trustLevel: 3, oboFlag: false, line: 2 },
      ],
      source: fileRef('TOOLS.md'),
    },
    agents: {
      agents: [{ name: 'main', description: 'main agent', tools: ['read-file'], line: 1 }],
      delegations: [],
      source: fileRef('AGENTS.md'),
    },
    memory: { entries: [], hasIndex: false, source: fileRef('MEMORY.md') },
    identity: {
      organization: 'e2e-org',
      team: 'e2e-team',
      authMethod: 'none',
      roles: [],
      source: fileRef('IDENTITY.md'),
    },
    user: {
      role: 'dev',
      bounds: [],
      platform: 'claude-code',
      environment: {},
      source: fileRef('USER.md'),
    },
    heartbeat: { schedules: [], source: fileRef('HEARTBEAT.md') },
    skills: {
      skills: [
        {
          name: 'e2e-skill',
          description: 'End-to-end skill generated from fixture',
          requiredTools: ['read-file'],
          path: 'skills/e2e-skill',
        },
      ],
      source: fileRef('skills/'),
    },
    lobster: {
      name: 'default',
      description: 'wf',
      steps: [],
      dependencies: {},
      source: fileRef('lobster.yaml'),
    },
    compiler: {
      compilerVersion: '1.0.0',
      compiledAt: '2026-04-16T00:00:00Z',
      schemaVersion: 1,
    },
    diagnostics: [],
  };
}

function cleanAnalysis(): GovAnalysis {
  return {
    violations: [],
    warnings: [],
    enforcementPlan: {
      blockedTools: [],
      requiredApprovals: [],
      auditOnlyRules: [],
      channelRedactions: [],
      ruleSuppressions: [],
    },
    reclassificationTable: [],
    effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
  };
}

describe('ClaudeCodeEmitter e2e', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir !== null) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('produces a valid Claude Code workspace from a fixture workspace end-to-end', async () => {
    // ── Read ─────────────────────────────────────────────────────────
    const model = await readOCWorkspace(resolve(FIXTURES, 'full-workspace'));
    expect(model.presentCount).toBeGreaterThan(0);

    // ── Translate to IR ──────────────────────────────────────────────
    const ir = modelToIR(model);

    // ── Emit (real disk I/O, compileGuard passes on clean analysis) ──
    tempDir = mkdtempSync(join(tmpdir(), 'cc-emit-e2e-'));
    const emitter = new ClaudeCodeEmitter({ outputDir: tempDir });
    const result = await emitter.emit(ir, cleanAnalysis());

    expect(result.target).toBe('claude-code');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);

    // ── Verify workspace layout ──────────────────────────────────────
    expect(existsSync(join(tempDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'settings.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'commands', 'e2e-skill.md'))).toBe(true);

    // ── Marker present on CLAUDE.md and command stubs ────────────────
    const mdContents = readFileSync(join(tempDir, 'CLAUDE.md'), 'utf-8');
    expect(mdContents).toContain('claws-governance:claude-code:v1.0.0');
    const stubContents = readFileSync(
      join(tempDir, '.claude', 'commands', 'e2e-skill.md'),
      'utf-8',
    );
    expect(stubContents).toContain('claws-governance:claude-code:v1.0.0');
    expect(stubContents).toContain('End-to-end skill generated from fixture');

    // ── settings.json is valid JSON ──────────────────────────────────
    const settingsRaw = readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8');
    const settings = JSON.parse(settingsRaw);
    expect(settings.claws.version).toBe('1.0.0');

    // ── Zero-import contract holds for every file ────────────────────
    for (const file of result.files) {
      expect(verifyNoCraftworksRefs(file.content)).toHaveLength(0);
    }
  });
});
