/**
 * L1: Claude Code emitter integration tests.
 *
 * 3 integration tests:
 *   1. full emit from fixture IR produces valid Claude Code workspace on disk
 *   2. emit output contains zero @craftworks/ references
 *   3. registry returns the claude-code emitter by target enum
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ClaudeCodeEmitter } from '#src/compiler/emit/cc-emitter.js';
import { verifyNoCraftworksRefs } from '#src/compiler/emit/oc-emitter.js';
import {
  EmitterRegistry,
  createDefaultRegistry,
} from '#src/compiler/emit/registry.js';
import type { EmitTarget } from '#src/compiler/emit/types.js';
import type { OCWorkspaceIR } from '#src/compiler/ir/workspace-ir.js';
import type { FileReference } from '#src/compiler/ir/field-types.js';
import type { GovAnalysis } from '#src/compiler/enforce/types.js';

// ── Helpers ────────────────────────────────────────────────────────────

function fileRef(path: string): FileReference {
  return { path, hash: 'int-hash', size: 100 };
}

function richWorkspaceIR(): OCWorkspaceIR {
  return {
    soul: {
      persona: 'security-first research assistant',
      principles: ['cite-sources', 'no-secrets'],
      voice: 'formal and precise',
      boundaries: [
        { text: 'never exfiltrate credentials', line: 3 },
        { text: 'never write to /etc', line: 4 },
      ],
      source: fileRef('SOUL.md'),
    },
    tools: {
      tools: [
        { name: 'search', description: 's', trustLevel: 0, oboFlag: false, line: 1 },
        { name: 'read-file', description: 'r', trustLevel: 1, oboFlag: false, line: 2 },
        { name: 'edit-file', description: 'e', trustLevel: 3, oboFlag: false, line: 3 },
        { name: 'shell-exec', description: 'sh', trustLevel: 4, oboFlag: true, line: 4 },
      ],
      source: fileRef('TOOLS.md'),
    },
    agents: {
      agents: [
        { name: 'lead', description: 'lead', tools: ['search', 'shell-exec'], line: 1 },
        { name: 'worker', description: 'w', tools: ['read-file'], line: 2 },
      ],
      delegations: [
        { from: 'lead', to: 'worker', tools: ['read-file'], line: 5 },
      ],
      source: fileRef('AGENTS.md'),
    },
    memory: { entries: [], hasIndex: false, source: fileRef('MEMORY.md') },
    identity: {
      organization: 'integration-org',
      team: 'integration-team',
      authMethod: 'sso',
      ssoProvider: 'azure-ad',
      roles: [{ role: 'admin', permissions: ['read', 'write'] }],
      source: fileRef('IDENTITY.md'),
    },
    user: {
      role: 'engineer',
      bounds: ['no-prod'],
      platform: 'claude-code',
      environment: { NODE_ENV: 'test' },
      source: fileRef('USER.md'),
    },
    heartbeat: { schedules: [], source: fileRef('HEARTBEAT.md') },
    skills: {
      skills: [
        {
          name: 'lookup',
          description: 'Search across indexes',
          requiredTools: ['search', 'read-file'],
          path: 'skills/lookup',
        },
        {
          name: 'smoke-test',
          description: 'Run smoke tests',
          requiredTools: ['shell-exec'],
          path: 'skills/smoke-test',
        },
      ],
      source: fileRef('skills/'),
    },
    lobster: {
      name: 'wf',
      description: 'workflow',
      steps: [{ name: 'build', command: 'npm run build' }],
      dependencies: {},
      source: fileRef('lobster.yaml'),
    },
    compiler: {
      compilerVersion: '0.3.0',
      compiledAt: '2026-04-16T12:00:00Z',
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

// ── Tests ──────────────────────────────────────────────────────────────

describe('ClaudeCodeEmitter integration', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir !== null) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('full emit from fixture IR produces valid Claude Code workspace', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'cc-emit-int-'));
    const emitter = new ClaudeCodeEmitter({ outputDir: tempDir });
    const result = await emitter.emit(richWorkspaceIR(), cleanAnalysis());

    expect(result.target).toBe('claude-code');
    // 1 CLAUDE.md + 1 settings.json + 2 skill stubs = 4.
    expect(result.files.length).toBe(4);

    // Files exist on disk.
    expect(existsSync(join(tempDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'settings.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'commands', 'lookup.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'commands', 'smoke-test.md'))).toBe(true);

    // CLAUDE.md round-trips with persona + principles + boundaries.
    const mdContents = readFileSync(join(tempDir, 'CLAUDE.md'), 'utf-8');
    expect(mdContents).toContain('security-first research assistant');
    expect(mdContents).toContain('cite-sources');
    expect(mdContents).toContain('never exfiltrate credentials');
    expect(mdContents).toContain('claws-governance:claude-code:v0.3.0');

    // settings.json is valid JSON with the expected shape.
    const settingsRaw = readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8');
    const settings = JSON.parse(settingsRaw);
    expect(settings.claws.organization).toBe('integration-org');
    expect(settings.claws.team).toBe('integration-team');
    expect(settings.claws.version).toBe('0.3.0');
    expect(settings.permissions.allow).toEqual(expect.arrayContaining(['search', 'read-file']));
    expect(settings.permissions.ask).toEqual(expect.arrayContaining(['edit-file', 'shell-exec']));

    // Command stubs include their skill description.
    const lookupStub = readFileSync(
      join(tempDir, '.claude', 'commands', 'lookup.md'),
      'utf-8',
    );
    expect(lookupStub).toContain('Search across indexes');
  });

  it('emit output contains no @craftworks/ references', async () => {
    const emitter = new ClaudeCodeEmitter({ outputDir: '/tmp/unused', dryRun: true });
    const result = await emitter.emit(richWorkspaceIR(), cleanAnalysis());
    for (const file of result.files) {
      const matches = verifyNoCraftworksRefs(file.content);
      expect(matches, `file ${file.path} leaked refs: ${matches.join(', ')}`).toHaveLength(0);
    }
  });

  it('registry returns claude-code emitter by target enum', () => {
    const registry = new EmitterRegistry();
    const emitter = new ClaudeCodeEmitter({ outputDir: '/tmp', dryRun: true });
    const target: EmitTarget = 'claude-code';

    expect(registry.list()).toHaveLength(0);
    registry.register(target, emitter);
    expect(registry.list()).toContain('claude-code');
    expect(registry.has('claude-code')).toBe(true);
    expect(registry.get('claude-code')).toBe(emitter);

    // createDefaultRegistry populates both targets side-by-side.
    const full = createDefaultRegistry({ outputDir: '/tmp', dryRun: true });
    expect(full.list().sort()).toEqual(['claude-code', 'oc']);
  });
});
