/**
 * L3: Claude Code emitter scenario acceptance tests.
 *
 * Verifies that emit-cc/* and codegen/* scenario findings are honored.
 * Each test maps to a scenario-level finding drawn from the pulse plan:
 *
 *   emit-cc/S01 — CLAUDE.md is well-formed markdown with marker + persona
 *   emit-cc/S02 — settings.json is strict JSON that Claude Code can accept
 *   emit-cc/S03 — skill stubs round-trip through disk and include marker
 *   codegen/S01 — zero @craftworks/ refs including inside comments
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ClaudeCodeEmitter } from '#src/compiler/emit/cc-emitter.js';
import { verifyNoCraftworksRefs } from '#src/compiler/emit/oc-emitter.js';
import type { OCWorkspaceIR } from '#src/compiler/ir/workspace-ir.js';
import type { FileReference } from '#src/compiler/ir/field-types.js';
import type { GovAnalysis } from '#src/compiler/enforce/types.js';

function fileRef(path: string): FileReference {
  return { path, hash: 'accept-hash', size: 100 };
}

function baselineIR(): OCWorkspaceIR {
  return {
    soul: {
      persona: 'governed engineering assistant',
      principles: ['be-safe', 'cite-sources'],
      boundaries: [{ text: 'no secrets in logs', line: 1 }],
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
      agents: [{ name: 'main', description: 'primary agent', tools: ['read-file'], line: 1 }],
      delegations: [],
      source: fileRef('AGENTS.md'),
    },
    memory: { entries: [], hasIndex: false, source: fileRef('MEMORY.md') },
    identity: {
      organization: 'accept-org',
      team: 'accept-team',
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
          name: 'lookup',
          description: 'Look up indexed records',
          requiredTools: ['read-file'],
          path: 'skills/lookup',
        },
      ],
      source: fileRef('skills/'),
    },
    lobster: {
      name: 'wf',
      description: '',
      steps: [],
      dependencies: {},
      source: fileRef('lobster.yaml'),
    },
    compiler: {
      compilerVersion: '2.0.0',
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

describe('Claude Code emitter scenario acceptance', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir !== null) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('emit-cc/S01: CLAUDE.md is well-formed markdown with marker + persona on disk', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'accept-cc-claude-'));
    const emitter = new ClaudeCodeEmitter({ outputDir: tempDir });
    await emitter.emit(baselineIR(), cleanAnalysis());

    const md = readFileSync(join(tempDir, 'CLAUDE.md'), 'utf-8');
    // Marker is on the first line as a single-line HTML comment.
    const firstLine = md.split('\n')[0];
    expect(firstLine).toMatch(
      /^<!-- claws-governance:claude-code:v\d+\.\d+\.\d+ -->$/,
    );
    // Required headings.
    expect(md).toContain('# Project Instructions');
    expect(md).toContain('## Persona');
    expect(md).toContain('## Principles');
    expect(md).toContain('## Tools');
    expect(md).toContain('## Agents');
    expect(md).toContain('## Boundaries');
    // Persona propagated.
    expect(md).toContain('governed engineering assistant');
  });

  it('emit-cc/S02: settings.json is strict JSON accepted by standard parsers', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'accept-cc-settings-'));
    const emitter = new ClaudeCodeEmitter({ outputDir: tempDir });
    await emitter.emit(baselineIR(), cleanAnalysis());

    const raw = readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8');
    // JSON.parse must succeed (no trailing commas, no comments).
    expect(() => JSON.parse(raw)).not.toThrow();
    // Output ends with a newline (POSIX convention, git-friendly).
    expect(raw.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(raw);
    // Permission buckets are always present, even when empty.
    expect(Array.isArray(parsed.permissions.allow)).toBe(true);
    expect(Array.isArray(parsed.permissions.ask)).toBe(true);
    expect(Array.isArray(parsed.permissions.deny)).toBe(true);
    // Identity fields survive the round-trip.
    expect(parsed.claws.organization).toBe('accept-org');
    expect(parsed.claws.team).toBe('accept-team');
  });

  it('emit-cc/S03: skill stubs round-trip through disk with marker + description', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'accept-cc-stubs-'));
    const emitter = new ClaudeCodeEmitter({ outputDir: tempDir });
    await emitter.emit(baselineIR(), cleanAnalysis());

    const stubPath = join(tempDir, '.claude', 'commands', 'lookup.md');
    expect(existsSync(stubPath)).toBe(true);
    const stub = readFileSync(stubPath, 'utf-8');
    // Marker on the first line.
    expect(stub.split('\n')[0]).toMatch(
      /^<!-- claws-governance:claude-code:v\d+\.\d+\.\d+ -->$/,
    );
    // Slash-command title, description, and source path.
    expect(stub).toContain('# /lookup');
    expect(stub).toContain('Look up indexed records');
    expect(stub).toContain('skills/lookup');
  });

  it('codegen/S01: emitted output has zero @craftworks/ references (incl. in comments)', async () => {
    const emitter = new ClaudeCodeEmitter({ outputDir: '/unused', dryRun: true });
    const result = await emitter.emit(baselineIR(), cleanAnalysis());
    for (const file of result.files) {
      const matches = verifyNoCraftworksRefs(file.content);
      expect(
        matches,
        `file ${file.path} leaked refs: ${matches.join(', ')}`,
      ).toHaveLength(0);
      expect(file.content).not.toContain('@craftworks/');
    }
  });
});
