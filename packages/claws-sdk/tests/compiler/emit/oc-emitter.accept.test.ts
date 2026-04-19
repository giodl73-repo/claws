/**
 * L3: OC emitter acceptance tests.
 *
 * Verifies that emit-oc/codegen scenario findings are honored.
 * Each test maps directly to a scenario finding:
 *
 *   emit-oc/S01 F03 -- emitter creates output directories (mkdir -p)
 *   emit-oc/S01 F04 -- overwrite semantics (index.ts is replaced cleanly)
 *   emit-oc/S02 F01/F02 -- zero @craftworks/ refs, incl. in comments
 *   emit-oc/S03 F02 -- single-line marker survives formatter scan
 *   codegen/S03 F02 -- missing emitter surfaces as a diagnostic, not a crash
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { OCEmitter, verifyNoCraftworksRefs } from '#src/compiler/emit/oc-emitter.js';
import {
  EmitterRegistry,
  UnsupportedEmitTargetError,
} from '#src/compiler/emit/registry.js';
import type { OCWorkspaceIR } from '#src/compiler/ir/workspace-ir.js';
import type { FileReference } from '#src/compiler/ir/field-types.js';
import type { GovAnalysis } from '#src/compiler/enforce/types.js';

// ── Helpers ────────────────────────────────────────────────────────────

function fileRef(path: string): FileReference {
  return { path, hash: 'accept-hash', size: 100 };
}

function baselineIR(): OCWorkspaceIR {
  return {
    soul: { persona: 'a', principles: [], boundaries: [], source: fileRef('SOUL.md') },
    tools: {
      tools: [{ name: 'read-file', description: 'r', trustLevel: 1, oboFlag: false, line: 1 }],
      source: fileRef('TOOLS.md'),
    },
    agents: { agents: [], delegations: [], source: fileRef('AGENTS.md') },
    memory: { entries: [], hasIndex: false, source: fileRef('MEMORY.md') },
    identity: {
      organization: 'accept-org',
      team: 'accept-team',
      authMethod: 'none',
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

// ── Tests ──────────────────────────────────────────────────────────────

describe('OC emitter scenario acceptance', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir !== null) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('emit-oc/S01 F03: creates plugin output directory when missing (mkdir -p)', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'accept-mkdir-'));
    // Use a nested subdirectory that does not yet exist.
    const nested = join(tempDir, 'deep', 'deeper');
    const emitter = new OCEmitter({ outputDir: nested });
    await emitter.emit(baselineIR(), cleanAnalysis());
    expect(existsSync(join(nested, 'plugins', 'claws-governance', 'index.ts'))).toBe(true);
  });

  it('emit-oc/S01 F04: overwrites an existing index.ts cleanly', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'accept-overwrite-'));
    const pluginDir = join(tempDir, 'plugins', 'claws-governance');
    // Pre-seed a stale index.ts.
    const { mkdirSync } = await import('node:fs');
    mkdirSync(pluginDir, { recursive: true });
    const stale = '// stale content from a previous build\n';
    writeFileSync(join(pluginDir, 'index.ts'), stale, 'utf-8');

    const emitter = new OCEmitter({ outputDir: tempDir });
    await emitter.emit(baselineIR(), cleanAnalysis());

    const fresh = readFileSync(join(pluginDir, 'index.ts'), 'utf-8');
    expect(fresh).not.toBe(stale);
    expect(fresh).toContain('claws-governance:oc-gateway:v2.0.0');
  });

  it('emit-oc/S02 F01+F02: output has zero @craftworks/ refs including comments', async () => {
    const emitter = new OCEmitter({ outputDir: '/unused', dryRun: true });
    const result = await emitter.emit(baselineIR(), cleanAnalysis());
    for (const file of result.files) {
      // The verifier scans the full file contents -- comments, imports,
      // strings all count. No @craftworks/ substring must remain.
      expect(verifyNoCraftworksRefs(file.content)).toHaveLength(0);
      expect(file.content).not.toContain('@craftworks/');
    }
  });

  it('emit-oc/S03 F02: marker is a single-line comment (formatter-resistant)', async () => {
    const emitter = new OCEmitter({ outputDir: '/unused', dryRun: true });
    const result = await emitter.emit(baselineIR(), cleanAnalysis());
    const index = result.files.find((f) => f.path.endsWith('index.ts'));
    expect(index).toBeDefined();
    // Marker lives on the first line as a single-line // comment.
    const firstLine = index!.content.split('\n')[0];
    expect(firstLine).toMatch(/^\/\/ claws-governance:oc-gateway:v\d+\.\d+\.\d+$/);
  });

  it('codegen/S03 F02: registry surfaces missing emitter without crashing', () => {
    const registry = new EmitterRegistry();
    // Empty registry -- list is empty, get is undefined for supported targets.
    expect(registry.list()).toHaveLength(0);
    expect(registry.get('oc')).toBeUndefined();
    expect(registry.get('claude-code')).toBeUndefined();
    // Unsupported targets are surfaced as a typed error with a readable message.
    try {
      registry.get('langgraph');
      throw new Error('expected UnsupportedEmitTargetError');
    } catch (err) {
      expect(err).toBeInstanceOf(UnsupportedEmitTargetError);
      expect((err as UnsupportedEmitTargetError).message).toContain('Free tier supports');
    }
  });
});
