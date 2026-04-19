/**
 * L0: OC emitter unit tests.
 *
 * 6 unit tests:
 *   1. emit produces manifest file (package.json)
 *   2. emit produces config file (claws-governance.config.json)
 *   3. emit produces handler files (before-tool-call, a2a-firewall, elicitation-gate)
 *   4. emit calls compileGuard (throws on R5 violation)
 *   5. emit respects dryRun flag (no disk writes, files returned)
 *   6. registry rejects unsupported platform
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { OCEmitter, verifyNoCraftworksRefs } from '#src/compiler/emit/oc-emitter.js';
import {
  EmitterRegistry,
  UnsupportedEmitTargetError,
  FREE_TIER_TARGETS,
} from '#src/compiler/emit/registry.js';
import type { EmitTarget, EmittedFile } from '#src/compiler/emit/types.js';
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
    soul: { persona: 'unit', principles: [], boundaries: [], source: fileRef('SOUL.md') },
    tools: {
      tools: [
        { name: 'read-file', description: 'read', trustLevel: 1, oboFlag: false, line: 1 },
        { name: 'write-file', description: 'write', trustLevel: 3, oboFlag: true, line: 2 },
      ],
      source: fileRef('TOOLS.md'),
    },
    agents: {
      agents: [{ name: 'coder', description: 'c', tools: ['read-file'], line: 1 }],
      delegations: [{ from: 'coder', to: 'reviewer', tools: ['read-file'], line: 3 }],
      source: fileRef('AGENTS.md'),
    },
    memory: { entries: [], hasIndex: false, source: fileRef('MEMORY.md') },
    identity: {
      organization: 'acme',
      team: 'plat',
      authMethod: 'sso',
      ssoProvider: 'okta',
      roles: [],
      source: fileRef('IDENTITY.md'),
    },
    user: { role: 'dev', bounds: [], platform: 'oc', environment: {}, source: fileRef('USER.md') },
    heartbeat: { schedules: [], source: fileRef('HEARTBEAT.md') },
    skills: { skills: [], source: fileRef('skills/') },
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

function findFile(files: readonly EmittedFile[], suffix: string): EmittedFile | undefined {
  return files.find((f) => f.path.endsWith(suffix));
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('OCEmitter.emit (unit)', () => {
  it('produces manifest (package.json) with compiler version', async () => {
    const emitter = new OCEmitter({ outputDir: '/tmp/unused', dryRun: true });
    const result = await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
    const manifest = findFile(result.files, 'package.json');
    expect(manifest).toBeDefined();
    expect(manifest!.path).toBe('plugins/claws-governance/package.json');
    const parsed = JSON.parse(manifest!.content);
    expect(parsed.name).toBe('claws-governance');
    expect(parsed.version).toBe('0.1.0');
    expect(parsed.dependencies).toEqual({});
  });

  it('produces config (claws-governance.config.json) with org + compiler meta', async () => {
    const emitter = new OCEmitter({ outputDir: '/tmp/unused', dryRun: true });
    const analysis: GovAnalysis = {
      ...cleanAnalysis(),
      enforcementPlan: {
        blockedTools: ['danger-tool'],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
    };
    const result = await emitter.emit(makeWorkspaceIR(), analysis);
    const config = findFile(result.files, 'claws-governance.config.json');
    expect(config).toBeDefined();
    const parsed = JSON.parse(config!.content);
    expect(parsed.org).toBe('acme');
    expect(parsed.team).toBe('plat');
    expect(parsed.blockedTools).toContain('danger-tool');
    expect(parsed.compiler.version).toBe('0.1.0');
  });

  it('produces handler files (before-tool-call, a2a-firewall, elicitation-gate)', async () => {
    const emitter = new OCEmitter({ outputDir: '/tmp/unused', dryRun: true });
    const result = await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
    const before = findFile(result.files, 'handlers/before-tool-call.ts');
    const a2a = findFile(result.files, 'handlers/a2a-firewall.ts');
    const elicit = findFile(result.files, 'handlers/elicitation-gate.ts');
    expect(before).toBeDefined();
    expect(a2a).toBeDefined();
    expect(elicit).toBeDefined();
    // Risk map is embedded in the before handler.
    expect(before!.content).toContain('RISK_MAP');
    // A2A includes a delegation map.
    expect(a2a!.content).toContain('ALLOWED');
    // Elicitation lists the OBO tool explicitly.
    expect(elicit!.content).toContain('write-file');
    // Every handler uses the compiler version in the header.
    expect(before!.content).toContain('0.1.0');
  });

  it('calls compileGuard -- throws CompilationDeniedError on R5 violation', async () => {
    const emitter = new OCEmitter({ outputDir: '/tmp/unused', dryRun: true });
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

  it('respects dryRun flag -- no disk writes, files returned in result', async () => {
    // outputDir points at a path that does NOT exist. dryRun=true must
    // not attempt to mkdir or writeFile, so this should succeed.
    const emitter = new OCEmitter({
      outputDir: '/does/not/exist/at/all/nope',
      dryRun: true,
    });
    const result = await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
    expect(result.target).toBe('oc');
    expect(result.files.length).toBeGreaterThan(0);
    // Marker is in the index.ts content (scenario emit-oc/S03).
    const index = findFile(result.files, 'plugins/claws-governance/index.ts');
    expect(index).toBeDefined();
    expect(index!.content).toContain('claws-governance:oc-gateway:v0.1.0');
    // Emitted content is platform-native.
    for (const file of result.files) {
      expect(verifyNoCraftworksRefs(file.content)).toHaveLength(0);
    }
  });

  it('registry rejects unsupported platform targets', () => {
    const registry = new EmitterRegistry();
    const ocEmitter = new OCEmitter({ outputDir: '/tmp', dryRun: true });
    registry.register('oc', ocEmitter);
    expect(registry.has('oc')).toBe(true);
    expect(registry.list()).toContain('oc');
    // Unsupported target throws on both register and get.
    expect(() => registry.register('cursor' as EmitTarget, ocEmitter)).toThrow(
      UnsupportedEmitTargetError,
    );
    expect(() => registry.get('bedrock')).toThrow(UnsupportedEmitTargetError);
    // Supported-but-unregistered target returns undefined.
    expect(registry.get('claude-code')).toBeUndefined();
    // Free tier enumerates exactly two targets.
    expect(FREE_TIER_TARGETS).toEqual(['oc', 'claude-code']);
  });
});

// ── Branch coverage for internal generators ───────────────────────────

describe('OCEmitter branch coverage', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir !== null) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('empty IR (no tools, no delegations, no OBO) produces empty map literals', async () => {
    const emitter = new OCEmitter({ outputDir: '/unused', dryRun: true });
    const ir = makeWorkspaceIR();
    const empty: OCWorkspaceIR = {
      ...ir,
      tools: { tools: [], source: ir.tools.source },
      agents: { agents: [], delegations: [], source: ir.agents.source },
    };
    const result = await emitter.emit(empty, cleanAnalysis());
    const before = findFile(result.files, 'handlers/before-tool-call.ts');
    const a2a = findFile(result.files, 'handlers/a2a-firewall.ts');
    const elicit = findFile(result.files, 'handlers/elicitation-gate.ts');
    // AST output: typed Map/Set constructors with empty array literals.
    // Semantic contract: empty lookup tables with preserved generic type args.
    expect(before!.content).toMatch(/new Map<string, number>\(\s*\[\s*\]\s*\)/);
    expect(a2a!.content).toMatch(/new Map\(\s*\[\s*\]\s*\)/);
    expect(elicit!.content).toMatch(/new Set<string>\(\s*\[\s*\]\s*\)/);
  });

  it('trust levels <=0 map to risk 1 and >=4 map to risk 5', async () => {
    const emitter = new OCEmitter({ outputDir: '/unused', dryRun: true });
    const ir = makeWorkspaceIR();
    const bounded: OCWorkspaceIR = {
      ...ir,
      tools: {
        source: ir.tools.source,
        tools: [
          { name: 'low', description: 'l', trustLevel: 0, oboFlag: false, line: 1 },
          { name: 'mid', description: 'm', trustLevel: 2, oboFlag: false, line: 2 },
          { name: 'hi', description: 'h', trustLevel: 4, oboFlag: false, line: 3 },
          { name: 'neg', description: 'n', trustLevel: -1, oboFlag: false, line: 4 },
        ],
      },
    };
    const result = await emitter.emit(bounded, cleanAnalysis());
    const index = findFile(result.files, 'plugins/claws-governance/index.ts');
    // "low" and "neg" → 1, "mid" → 3, "hi" → 5
    expect(index!.content).toContain('["low", 1]');
    expect(index!.content).toContain('["neg", 1]');
    expect(index!.content).toContain('["mid", 3]');
    expect(index!.content).toContain('["hi", 5]');
  });

  it('blocked tools from analysis are merged in at R5', async () => {
    const emitter = new OCEmitter({ outputDir: '/unused', dryRun: true });
    const ir = makeWorkspaceIR();
    const analysis: GovAnalysis = {
      ...cleanAnalysis(),
      enforcementPlan: {
        blockedTools: ['dangerous', 'read-file'],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
    };
    const result = await emitter.emit(ir, analysis);
    const index = findFile(result.files, 'plugins/claws-governance/index.ts');
    // "dangerous" is new → risk 5; "read-file" existed at risk 2 → raised to 5.
    expect(index!.content).toContain('["dangerous", 5]');
    expect(index!.content).toContain('["read-file", 5]');
  });

  it('multiple delegations from same agent are merged into one Set entry', async () => {
    const emitter = new OCEmitter({ outputDir: '/unused', dryRun: true });
    const ir = makeWorkspaceIR();
    const withDelegs: OCWorkspaceIR = {
      ...ir,
      agents: {
        source: ir.agents.source,
        agents: ir.agents.agents,
        delegations: [
          { from: 'coder', to: 'reviewer', tools: ['read-file'], line: 1 },
          { from: 'coder', to: 'tester', tools: ['read-file'], line: 2 },
          { from: 'pm', to: 'reviewer', tools: ['read-file'], line: 3 },
        ],
      },
    };
    const result = await emitter.emit(withDelegs, cleanAnalysis());
    const a2a = findFile(result.files, 'handlers/a2a-firewall.ts');
    expect(a2a!.content).toContain('"coder"');
    expect(a2a!.content).toContain('"reviewer"');
    expect(a2a!.content).toContain('"tester"');
    expect(a2a!.content).toContain('"pm"');
  });

  it('verbose=true surfaces an info-level diagnostic', async () => {
    const emitter = new OCEmitter({ outputDir: '/unused', dryRun: true, verbose: true });
    const result = await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
    expect(result.diagnostics.some((d) => d.severity === 'info')).toBe(true);
    expect(result.diagnostics[0]!.code).toBe('EMIT-INFO-001');
  });

  it('writeFile path writes to disk when dryRun is false', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'oc-emit-unit-disk-'));
    const emitter = new OCEmitter({ outputDir: tempDir });
    await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
    expect(existsSync(join(tempDir, 'plugins', 'claws-governance', 'index.ts'))).toBe(true);
  });

  it('verifyNoCraftworksRefs surfaces every match (including duplicates)', () => {
    const src = 'import X from "@craftworks/foo"; import Y from "@craftworks/bar";';
    const refs = verifyNoCraftworksRefs(src);
    expect(refs).toContain('@craftworks/foo');
    expect(refs).toContain('@craftworks/bar');
    expect(verifyNoCraftworksRefs('no references here')).toEqual([]);
  });

  it('UnsupportedEmitTargetError records the offending target string', () => {
    const err = new UnsupportedEmitTargetError('cursor');
    expect(err.target).toBe('cursor');
    expect(err.name).toBe('UnsupportedEmitTargetError');
    expect(err.message).toContain('cursor');
  });
});

// ── BaseEmitter method coverage ────────────────────────────────────────

import { BaseEmitter } from '#src/compiler/emit/base-emitter.js';
import type { EmitResult, EmitterOptions } from '#src/compiler/emit/types.js';

/** Test subclass exposing protected helpers for direct verification. */
class TestEmitter extends BaseEmitter {
  constructor(options: EmitterOptions) {
    super(options);
  }
  async emit(): Promise<EmitResult> {
    return { target: 'oc', files: [], diagnostics: [] };
  }
  async callEnsureDir(path: string): Promise<void> {
    await this.ensureDir(path);
  }
  async callWriteFile(file: EmittedFile): Promise<void> {
    await this.writeFile(file);
  }
  callFinalizeFiles(
    target: EmitResult['target'],
    files: readonly EmittedFile[],
    diagnostics: readonly EmitResult['diagnostics'][number][] = [],
  ): EmitResult {
    return this.finalizeFiles(target, files, diagnostics);
  }
  callFormatDiagnostic(code: string, message: string, target?: string): unknown {
    return target === undefined
      ? this.formatDiagnostic(code, message, 'info')
      : this.formatDiagnostic(code, message, 'warning', target);
  }
}

describe('BaseEmitter helpers', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir !== null) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('ensureDir is a no-op under dryRun and creates a dir otherwise', async () => {
    // Dry run: no filesystem touch even when the path is bogus.
    const dry = new TestEmitter({ outputDir: '/unused', dryRun: true });
    await dry.callEnsureDir('/nowhere/at/all');

    // Real run: directory is created recursively.
    tempDir = mkdtempSync(join(tmpdir(), 'base-ensuredir-'));
    const live = new TestEmitter({ outputDir: tempDir });
    const nested = join(tempDir, 'a', 'b', 'c');
    await live.callEnsureDir(nested);
    expect(existsSync(nested)).toBe(true);
  });

  it('writeFile is a no-op under dryRun and writes otherwise', async () => {
    const dry = new TestEmitter({ outputDir: '/unused', dryRun: true });
    await dry.callWriteFile({ path: 'x.txt', content: 'hi', overwrite: true });

    tempDir = mkdtempSync(join(tmpdir(), 'base-writefile-'));
    const live = new TestEmitter({ outputDir: tempDir });
    await live.callWriteFile({ path: 'nested/x.txt', content: 'hello', overwrite: true });
    expect(existsSync(join(tempDir, 'nested', 'x.txt'))).toBe(true);
  });

  it('formatDiagnostic omits target when not provided and includes it when provided', () => {
    const e = new TestEmitter({ outputDir: '/unused', dryRun: true });
    const without = e.callFormatDiagnostic('C1', 'm') as { code: string; target?: string };
    const withIt = e.callFormatDiagnostic('C2', 'm', 'x.ts') as { code: string; target?: string };
    expect(without.code).toBe('C1');
    expect(without.target).toBeUndefined();
    expect(withIt.target).toBe('x.ts');
  });

  // CL-14 §1.6 — the fail-closed invariant enforcement point.
  describe('finalizeFiles (CL-14 §1.6)', () => {
    it('passes through unchanged when no .ts file references @craftworks/*', () => {
      const e = new TestEmitter({ outputDir: '/unused', dryRun: true });
      const files: EmittedFile[] = [
        { path: 'plugin/index.ts', content: '// marker\nconst X = 1;\n', overwrite: true },
        { path: 'plugin/package.json', content: '{ "name": "x" }\n', overwrite: true },
      ];
      const result = e.callFinalizeFiles('oc', files);
      expect(result.files).toEqual(files);
      expect(result.diagnostics).toEqual([]);
    });

    it('fails closed with zero files + error diagnostic on @craftworks leak', () => {
      const e = new TestEmitter({ outputDir: '/unused', dryRun: true });
      const poisoned: EmittedFile[] = [
        { path: 'plugin/index.ts', content: '// marker\nconst X = 1;\n', overwrite: true },
        {
          path: 'plugin/handlers/leak.ts',
          content: 'import foo from "@craftworks/agent-sdk";\n',
          overwrite: true,
        },
      ];
      const result = e.callFinalizeFiles('oc', poisoned);
      // Zero files — not "all files except the broken one" (§1.6 explicit).
      expect(result.files).toEqual([]);
      // Error diagnostic surfaces the offending reference and file path.
      expect(result.diagnostics.length).toBe(1);
      const diag = result.diagnostics[0]!;
      expect(diag.severity).toBe('error');
      expect(diag.code).toBe('EMIT-CW-REF-001');
      expect(diag.message).toContain('@craftworks/agent-sdk');
      expect(diag.target).toBe('plugin/handlers/leak.ts');
    });

    it('does not scan non-.ts files (JSON, markdown are out of scope)', () => {
      const e = new TestEmitter({ outputDir: '/unused', dryRun: true });
      // A package.json that legitimately lists a dependency it is being
      // generated to REPLACE should not trip the invariant — §1.6 is
      // scoped to generated TypeScript source.
      const files: EmittedFile[] = [
        {
          path: 'plugin/package.json',
          content: '{ "name": "x", "dependencies": { "@craftworks/legacy": "1.0.0" } }\n',
          overwrite: true,
        },
      ];
      const result = e.callFinalizeFiles('oc', files);
      expect(result.files).toEqual(files);
      expect(result.diagnostics).toEqual([]);
    });

    it('merges pre-existing diagnostics into the fail-closed result', () => {
      const e = new TestEmitter({ outputDir: '/unused', dryRun: true });
      const pre = [{ code: 'PRE', message: 'prior', severity: 'info' as const }];
      const poisoned: EmittedFile[] = [
        {
          path: 'plugin/index.ts',
          content: 'import x from "@craftworks/foo";',
          overwrite: true,
        },
      ];
      const result = e.callFinalizeFiles('oc', poisoned, pre);
      expect(result.files).toEqual([]);
      // Pre-existing info diagnostic + new error diagnostic both present.
      expect(result.diagnostics.length).toBe(2);
      expect(result.diagnostics[0]!.code).toBe('PRE');
      expect(result.diagnostics[1]!.severity).toBe('error');
    });

    it('deduplicates repeated @craftworks references in the message', () => {
      const e = new TestEmitter({ outputDir: '/unused', dryRun: true });
      const poisoned: EmittedFile[] = [
        {
          path: 'x.ts',
          content: 'import a from "@craftworks/foo"; import b from "@craftworks/foo";',
          overwrite: true,
        },
      ];
      const result = e.callFinalizeFiles('oc', poisoned);
      // Message mentions @craftworks/foo once, not twice.
      const firstOccurrence = result.diagnostics[0]!.message.indexOf('@craftworks/foo');
      const lastOccurrence = result.diagnostics[0]!.message.lastIndexOf('@craftworks/foo');
      expect(firstOccurrence).toBe(lastOccurrence);
    });
  });

  // CC-2 (CL-14 §1.6) — proof that OCEmitter.emit wires finalizeFiles
  // into its return path. We poison the generated output by subclassing
  // OCEmitter and having the subclass inject a synthetic @craftworks
  // leak, then assert fail-closed at the real emit() call site.
  describe('OCEmitter fail-closed on @craftworks leak', () => {
    class LeakingOCEmitter extends OCEmitter {
      protected override finalizeFiles(
        target: EmitResult['target'],
        files: readonly EmittedFile[],
        diagnostics: readonly EmitResult['diagnostics'][number][],
      ): EmitResult {
        const poisoned = files.map((f) =>
          f.path.endsWith('handlers/before-tool-call.ts')
            ? { ...f, content: `${f.content}\n// leak: @craftworks/agent-sdk\n` }
            : f,
        );
        return super.finalizeFiles(target, poisoned, diagnostics);
      }
    }

    it('zero files returned + error diagnostic when a handler leaks @craftworks', async () => {
      const emitter = new LeakingOCEmitter({ outputDir: '/unused', dryRun: true });
      const result = await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
      expect(result.files).toEqual([]);
      expect(
        result.diagnostics.some(
          (d) => d.severity === 'error' && d.code === 'EMIT-CW-REF-001',
        ),
      ).toBe(true);
    });

    it('never writes to disk when fail-closed — disk target stays empty', async () => {
      const target = mkdtempSync(join(tmpdir(), 'oc-emit-failclosed-'));
      try {
        const emitter = new LeakingOCEmitter({ outputDir: target });
        const result = await emitter.emit(makeWorkspaceIR(), cleanAnalysis());
        expect(result.files).toEqual([]);
        // No handler files written — fail-closed is "zero files", not
        // "partial + diagnostic".
        expect(existsSync(join(target, 'plugins', 'claws-governance', 'index.ts'))).toBe(false);
      } finally {
        rmSync(target, { recursive: true, force: true });
      }
    });
  });
});
