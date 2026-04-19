/**
 * L1: OC emitter integration tests.
 *
 * 3 integration tests:
 *   1. full emit from fixture IR produces valid OC plugin directory on disk
 *   2. emit output contains zero @craftworks/ references
 *   3. registry round-trip: register + get + list by EmitTarget enum
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { OCEmitter, verifyNoCraftworksRefs } from '#src/compiler/emit/oc-emitter.js';
import { EmitterRegistry } from '#src/compiler/emit/registry.js';
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
      persona: 'helpful assistant',
      principles: ['be-safe'],
      boundaries: [{ text: 'no secrets', line: 3 }],
      source: fileRef('SOUL.md'),
    },
    tools: {
      tools: [
        { name: 'search', description: 's', trustLevel: 0, oboFlag: false, line: 1 },
        { name: 'read-file', description: 'r', trustLevel: 1, oboFlag: false, line: 2 },
        { name: 'shell-exec', description: 'sh', trustLevel: 4, oboFlag: true, line: 3 },
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
        { from: 'lead', to: 'worker', tools: ['search'], line: 6 },
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
      platform: 'oc',
      environment: { NODE_ENV: 'test' },
      source: fileRef('USER.md'),
    },
    heartbeat: { schedules: [], source: fileRef('HEARTBEAT.md') },
    skills: { skills: [], source: fileRef('skills/') },
    lobster: {
      name: 'wf',
      description: 'workflow',
      steps: [{ name: 'build', command: 'npm run build' }],
      dependencies: {},
      source: fileRef('lobster.yaml'),
    },
    compiler: {
      compilerVersion: '0.2.1',
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

describe('OCEmitter integration', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir !== null) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('full emit from fixture IR produces valid OC plugin directory', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'oc-emit-int-'));
    const emitter = new OCEmitter({ outputDir: tempDir });
    const result = await emitter.emit(richWorkspaceIR(), cleanAnalysis());

    expect(result.target).toBe('oc');
    expect(result.files.length).toBeGreaterThanOrEqual(6);

    // Every declared file exists on disk under the plugin root.
    const pluginRoot = join(tempDir, 'plugins', 'claws-governance');
    expect(existsSync(join(pluginRoot, 'package.json'))).toBe(true);
    expect(existsSync(join(pluginRoot, 'claws-governance.config.json'))).toBe(true);
    expect(existsSync(join(pluginRoot, 'index.ts'))).toBe(true);
    expect(existsSync(join(pluginRoot, 'handlers', 'before-tool-call.ts'))).toBe(true);
    expect(existsSync(join(pluginRoot, 'handlers', 'a2a-firewall.ts'))).toBe(true);
    expect(existsSync(join(pluginRoot, 'handlers', 'elicitation-gate.ts'))).toBe(true);

    // Marker is preserved through disk round-trip.
    const indexContents = readFileSync(join(pluginRoot, 'index.ts'), 'utf-8');
    expect(indexContents).toContain('claws-governance:oc-gateway:v0.2.1');

    // Risk map is derived from ToolsIR trust levels.
    const beforeContents = readFileSync(
      join(pluginRoot, 'handlers', 'before-tool-call.ts'),
      'utf-8',
    );
    expect(beforeContents).toContain('"search"');
    expect(beforeContents).toContain('"shell-exec"');

    // Config is valid JSON with the expected shape.
    const configContents = readFileSync(
      join(pluginRoot, 'claws-governance.config.json'),
      'utf-8',
    );
    const parsed = JSON.parse(configContents);
    expect(parsed.org).toBe('integration-org');
    expect(parsed.team).toBe('integration-team');
  });

  it('emit output contains no @craftworks/ references', async () => {
    const emitter = new OCEmitter({ outputDir: '/tmp/unused', dryRun: true });
    const result = await emitter.emit(richWorkspaceIR(), cleanAnalysis());
    for (const file of result.files) {
      const matches = verifyNoCraftworksRefs(file.content);
      expect(matches, `file ${file.path} leaked refs: ${matches.join(', ')}`).toHaveLength(0);
    }
  });

  it('registry returns OC emitter by target enum', () => {
    const registry = new EmitterRegistry();
    const emitter = new OCEmitter({ outputDir: '/tmp', dryRun: true });
    const target: EmitTarget = 'oc';

    expect(registry.list()).toHaveLength(0);
    registry.register(target, emitter);
    expect(registry.list()).toContain('oc');
    expect(registry.has('oc')).toBe(true);
    expect(registry.get('oc')).toBe(emitter);
    // Supported-but-unregistered target returns undefined (not an error).
    expect(registry.get('claude-code')).toBeUndefined();
  });
});
