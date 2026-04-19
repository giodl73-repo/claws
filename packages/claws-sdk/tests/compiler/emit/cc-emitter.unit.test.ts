/**
 * L0: Claude Code emitter unit tests.
 *
 * 6 unit tests (acceptance gates):
 *   1. CLAUDE.md is produced with persona from SoulIR
 *   2. settings.json is produced with permissions from ToolsIR
 *   3. Command stubs are produced for every skill in SkillsIR
 *   4. emit calls compileGuard (throws on R5 violation)
 *   5. CLAUDE.md embeds principles and boundaries from governance
 *   6. settings.json splits trust levels into allow/ask/deny buckets
 *
 * Plus branch-coverage tests for the templates + registry helper.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ClaudeCodeEmitter } from '#src/compiler/emit/cc-emitter.js';
import { verifyNoCraftworksRefs } from '#src/compiler/emit/oc-emitter.js';
import {
  EmitterRegistry,
  createDefaultRegistry,
  FREE_TIER_TARGETS,
} from '#src/compiler/emit/registry.js';
import {
  formatClaudeMd,
  formatSettingsJson,
  formatCommandStub,
  formatSkillStubs,
  slugifySkillName,
  trustToPermission,
} from '#src/compiler/emit/cc-templates.js';
import type { EmittedFile } from '#src/compiler/emit/types.js';
import type { OCWorkspaceIR } from '#src/compiler/ir/workspace-ir.js';
import type { FileReference } from '#src/compiler/ir/field-types.js';
import type { GovAnalysis, GovViolation } from '#src/compiler/enforce/types.js';
import { CompilationDeniedError } from '#src/compiler/enforce/errors.js';

// ── Helpers ────────────────────────────────────────────────────────────

function fileRef(path: string): FileReference {
  return { path, hash: 'unit-hash', size: 50 };
}

function makeWorkspaceIR(): OCWorkspaceIR {
  return {
    soul: {
      persona: 'thoughtful code reviewer',
      principles: ['be-safe', 'be-honest'],
      voice: 'concise',
      boundaries: [{ text: 'never write secrets to disk', line: 4 }],
      source: fileRef('SOUL.md'),
    },
    tools: {
      tools: [
        { name: 'read-file', description: 'read', trustLevel: 1, oboFlag: false, line: 1 },
        { name: 'edit-file', description: 'edit', trustLevel: 2, oboFlag: false, line: 2 },
        { name: 'shell-exec', description: 'shell', trustLevel: 4, oboFlag: true, line: 3 },
      ],
      source: fileRef('TOOLS.md'),
    },
    agents: {
      agents: [
        { name: 'planner', description: 'plans work', tools: ['read-file'], line: 1 },
        { name: 'coder', description: 'writes code', tools: ['edit-file'], line: 2 },
      ],
      delegations: [
        { from: 'planner', to: 'coder', tools: ['read-file'], line: 5 },
      ],
      source: fileRef('AGENTS.md'),
    },
    memory: { entries: [], hasIndex: false, source: fileRef('MEMORY.md') },
    identity: {
      organization: 'acme',
      team: 'platform',
      authMethod: 'sso',
      ssoProvider: 'okta',
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
          name: 'review-pr',
          description: 'Review a pull request',
          requiredTools: ['read-file'],
          path: 'skills/review-pr',
        },
        {
          name: 'run-tests',
          description: 'Run package tests',
          requiredTools: ['shell-exec'],
          path: 'skills/run-tests',
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
      compilerVersion: '0.1.0',
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

function findFile(files: readonly EmittedFile[], path: string): EmittedFile | undefined {
  return files.find((f) => f.path === path);
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('ClaudeCodeEmitter.emit (unit) — acceptance gates', () => {
  it('produces CLAUDE.md containing the persona from SoulIR', async () => {
    const emitter = new ClaudeCodeEmitter({ outputDir: '/tmp/unused', dryRun: true });
    const result = await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
    const claude = findFile(result.files, 'CLAUDE.md');
    expect(claude).toBeDefined();
    expect(claude!.content).toContain('thoughtful code reviewer');
    // Formatter-resistant marker on first line.
    expect(claude!.content.split('\n')[0]).toMatch(
      /^<!-- claws-governance:claude-code:v\d+\.\d+\.\d+ -->$/,
    );
  });

  it('produces .claude/settings.json with permissions derived from ToolsIR', async () => {
    const emitter = new ClaudeCodeEmitter({ outputDir: '/tmp/unused', dryRun: true });
    const result = await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
    const settings = findFile(result.files, '.claude/settings.json');
    expect(settings).toBeDefined();
    const parsed = JSON.parse(settings!.content);
    // T1 read-file → allow, T2 edit-file → ask, T4 OBO shell-exec → ask (OBO override).
    expect(parsed.permissions.allow).toContain('read-file');
    expect(parsed.permissions.ask).toContain('edit-file');
    expect(parsed.permissions.ask).toContain('shell-exec');
  });

  it('produces a command stub for every skill in SkillsIR', async () => {
    const emitter = new ClaudeCodeEmitter({ outputDir: '/tmp/unused', dryRun: true });
    const result = await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
    const review = findFile(result.files, '.claude/commands/review-pr.md');
    const tests = findFile(result.files, '.claude/commands/run-tests.md');
    expect(review).toBeDefined();
    expect(tests).toBeDefined();
    expect(review!.content).toContain('# /review-pr');
    expect(review!.content).toContain('Review a pull request');
    expect(tests!.content).toContain('# /run-tests');
  });

  it('calls compileGuard — throws CompilationDeniedError on R5 violation', async () => {
    const emitter = new ClaudeCodeEmitter({ outputDir: '/tmp/unused', dryRun: true });
    const r5: GovViolation = {
      ruleId: 'R5-CRIT',
      level: 5,
      message: 'Critical',
      target: 'tool',
      diagnosticCode: 'V-001',
      fixSuggestions: [],
      toolFuzzyMatches: [],
    };
    const analysis: GovAnalysis = { ...cleanAnalysis(), violations: [r5] };
    await expect(emitter.emit(makeWorkspaceIR(), analysis)).rejects.toBeInstanceOf(
      CompilationDeniedError,
    );
  });

  it('CLAUDE.md contains principles and boundaries from governance', async () => {
    const emitter = new ClaudeCodeEmitter({ outputDir: '/tmp/unused', dryRun: true });
    const result = await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
    const claude = findFile(result.files, 'CLAUDE.md');
    expect(claude!.content).toContain('## Principles');
    expect(claude!.content).toContain('be-safe');
    expect(claude!.content).toContain('be-honest');
    expect(claude!.content).toContain('## Boundaries');
    expect(claude!.content).toContain('never write secrets to disk');
    // Voice section appears when present.
    expect(claude!.content).toContain('## Voice');
    expect(claude!.content).toContain('concise');
  });

  it('settings.json splits trust levels into allow/ask/deny buckets', async () => {
    const emitter = new ClaudeCodeEmitter({ outputDir: '/tmp/unused', dryRun: true });
    const ir = makeWorkspaceIR();
    // T0/T1 → allow, T2/T3 → ask, T4 → deny (and OBO also → ask).
    const extended: OCWorkspaceIR = {
      ...ir,
      tools: {
        source: ir.tools.source,
        tools: [
          { name: 'a', description: 'a', trustLevel: 0, oboFlag: false, line: 1 },
          { name: 'b', description: 'b', trustLevel: 2, oboFlag: false, line: 2 },
          { name: 'c', description: 'c', trustLevel: 4, oboFlag: false, line: 3 },
          { name: 'd', description: 'd', trustLevel: -1, oboFlag: false, line: 4 },
        ],
      },
    };
    const result = await emitter.emit(extended, cleanAnalysis());
    const settings = findFile(result.files, '.claude/settings.json');
    const parsed = JSON.parse(settings!.content);
    expect(parsed.permissions.allow).toEqual(['a']);
    expect(parsed.permissions.ask).toEqual(['b']);
    // Both T4 and trust<0 land in deny.
    expect(parsed.permissions.deny).toEqual(expect.arrayContaining(['c', 'd']));
  });
});

// ── Branch coverage ────────────────────────────────────────────────────

describe('cc-templates branch coverage', () => {
  it('formatClaudeMd handles empty principles, boundaries, tools, agents', () => {
    const empty: OCWorkspaceIR = makeWorkspaceIR();
    const md = formatClaudeMd(
      { persona: '', principles: [], boundaries: [], source: empty.soul.source },
      { tools: [], source: empty.tools.source },
      { agents: [], delegations: [], source: empty.agents.source },
      '0.0.1',
    );
    expect(md).toContain('_No persona declared._');
    expect(md).toContain('_No principles declared._');
    expect(md).toContain('_No tools declared._');
    expect(md).toContain('_No agents declared._');
    expect(md).toContain('_No boundaries declared._');
    // Voice section is absent when not provided.
    expect(md).not.toContain('## Voice');
  });

  it('formatClaudeMd omits Voice section when voice is empty string', () => {
    const ir = makeWorkspaceIR();
    const md = formatClaudeMd(
      { ...ir.soul, voice: '' },
      ir.tools,
      ir.agents,
      '0.0.1',
    );
    expect(md).not.toContain('## Voice');
  });

  it('formatClaudeMd sorts tools and delegations deterministically', () => {
    const ir = makeWorkspaceIR();
    const unsorted: OCWorkspaceIR = {
      ...ir,
      tools: {
        source: ir.tools.source,
        tools: [
          { name: 'zzz', description: '', trustLevel: 0, oboFlag: false, line: 1 },
          { name: 'aaa', description: '', trustLevel: 0, oboFlag: false, line: 2 },
        ],
      },
      agents: {
        source: ir.agents.source,
        agents: ir.agents.agents,
        delegations: [
          { from: 'zzz', to: 'yyy', tools: [], line: 1 },
          { from: 'aaa', to: 'bbb', tools: [], line: 2 },
          { from: 'aaa', to: 'aaa', tools: [], line: 3 },
        ],
      },
    };
    const md = formatClaudeMd(unsorted.soul, unsorted.tools, unsorted.agents, '0.0.1');
    expect(md.indexOf('aaa')).toBeLessThan(md.indexOf('zzz'));
  });

  it('formatClaudeMd collapses CR/LF control chars in principle text', () => {
    const ir = makeWorkspaceIR();
    const md = formatClaudeMd(
      { ...ir.soul, principles: ['line1\nline2\rline3'], boundaries: [] },
      ir.tools,
      ir.agents,
      '0.0.1',
    );
    // Collapsed to a single bullet line.
    expect(md).toContain('- line1 line2 line3');
  });

  it('formatSettingsJson deterministically orders permission buckets', () => {
    const ir = makeWorkspaceIR();
    const json = formatSettingsJson(ir.tools, ir.identity, '0.0.1');
    const parsed = JSON.parse(json);
    // allow/ask/deny are each sorted ascending.
    for (const bucket of ['allow', 'ask', 'deny'] as const) {
      const arr = parsed.permissions[bucket];
      expect([...arr]).toEqual([...arr].slice().sort());
    }
    expect(parsed.claws.version).toBe('0.0.1');
    expect(parsed.claws.organization).toBe('acme');
  });

  it('formatSettingsJson emits empty buckets when no tools', () => {
    const ir = makeWorkspaceIR();
    const json = formatSettingsJson({ tools: [], source: ir.tools.source }, ir.identity, '0.0.1');
    const parsed = JSON.parse(json);
    expect(parsed.permissions.allow).toEqual([]);
    expect(parsed.permissions.ask).toEqual([]);
    expect(parsed.permissions.deny).toEqual([]);
  });

  it('formatCommandStub omits Required Tools section when skill has none', () => {
    const stub = formatCommandStub(
      { name: 'noop', description: 'does nothing', requiredTools: [], path: 'skills/noop' },
      '0.0.1',
    );
    expect(stub).toContain('# /noop');
    expect(stub).not.toContain('## Required Tools');
    expect(stub).toContain('skills/noop');
  });

  it('formatSkillStubs disambiguates colliding slugs', () => {
    const ir = makeWorkspaceIR();
    const stubs = formatSkillStubs(
      {
        source: ir.skills.source,
        skills: [
          { name: 'Build Tests', description: 'a', requiredTools: [], path: 'skills/a' },
          { name: 'build-tests', description: 'b', requiredTools: [], path: 'skills/b' },
          { name: 'Build  Tests', description: 'c', requiredTools: [], path: 'skills/c' },
        ],
      },
      '0.0.1',
    );
    const paths = stubs.map(([p]) => p);
    // No duplicates.
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('slugifySkillName normalises punctuation and collapses to "skill" on empty', () => {
    expect(slugifySkillName('Run Tests!')).toBe('run-tests');
    expect(slugifySkillName('---')).toBe('skill');
    expect(slugifySkillName('UPPER')).toBe('upper');
  });

  it('trustToPermission covers every trust bucket', () => {
    expect(trustToPermission(-1)).toBe('deny');
    expect(trustToPermission(0)).toBe('allow');
    expect(trustToPermission(1)).toBe('allow');
    expect(trustToPermission(2)).toBe('ask');
    expect(trustToPermission(3)).toBe('ask');
    expect(trustToPermission(4)).toBe('deny');
    expect(trustToPermission(99)).toBe('deny');
  });
});

describe('ClaudeCodeEmitter disk and diagnostics', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir !== null) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('writes files to disk when dryRun is false', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'cc-emit-disk-'));
    const emitter = new ClaudeCodeEmitter({ outputDir: tempDir });
    await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
    expect(existsSync(join(tempDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'settings.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'commands', 'review-pr.md'))).toBe(true);
    const md = readFileSync(join(tempDir, 'CLAUDE.md'), 'utf-8');
    expect(md).toContain('thoughtful code reviewer');
  });

  it('verbose=true emits a single info diagnostic', async () => {
    const emitter = new ClaudeCodeEmitter({
      outputDir: '/unused',
      dryRun: true,
      verbose: true,
    });
    const result = await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
    const info = result.diagnostics.filter((d) => d.severity === 'info');
    expect(info).toHaveLength(1);
    expect(info[0]!.code).toBe('EMIT-INFO-002');
  });

  it('default (verbose=false) emits no diagnostics', async () => {
    const emitter = new ClaudeCodeEmitter({ outputDir: '/unused', dryRun: true });
    const result = await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
    expect(result.diagnostics).toHaveLength(0);
  });

  it('emitted output contains zero @craftworks/ references', async () => {
    const emitter = new ClaudeCodeEmitter({ outputDir: '/unused', dryRun: true });
    const result = await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
    for (const file of result.files) {
      expect(verifyNoCraftworksRefs(file.content)).toHaveLength(0);
    }
  });
});

describe('createDefaultRegistry', () => {
  it('pre-populates both free-tier emitters', () => {
    const registry = createDefaultRegistry({ outputDir: '/tmp', dryRun: true });
    expect(registry.list()).toEqual(
      expect.arrayContaining([...FREE_TIER_TARGETS]),
    );
    expect(registry.has('oc')).toBe(true);
    expect(registry.has('claude-code')).toBe(true);
  });

  it('registry enumerates exactly the free-tier targets', () => {
    const registry = new EmitterRegistry();
    const full = createDefaultRegistry({ outputDir: '/tmp', dryRun: true });
    expect(registry.list()).toHaveLength(0);
    expect(full.list().length).toBe(FREE_TIER_TARGETS.length);
  });
});
