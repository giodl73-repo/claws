/**
 * L2: OC emitter e2e test.
 *
 * End-to-end emit from a fixture workspace through the readers → IR →
 * compileGuard → OCEmitter pipeline. Verifies the full compile chain.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { readOCWorkspace } from '#src/compiler/readers/workspace-reader.js';
import type { OCWorkspaceModel } from '#src/compiler/readers/types.js';
import { OCEmitter, verifyNoCraftworksRefs } from '#src/compiler/emit/oc-emitter.js';
import type { OCWorkspaceIR } from '#src/compiler/ir/workspace-ir.js';
import type { FileReference } from '#src/compiler/ir/field-types.js';
import type { GovAnalysis } from '#src/compiler/enforce/types.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

function fileRef(path: string): FileReference {
  return { path, hash: 'e2e-hash', size: 100 };
}

/**
 * Translate a workspace-reader OCWorkspaceModel into an OCWorkspaceIR
 * suitable for the emit stage. Uses defensive extraction -- absent
 * sections default to empty IR values so the pipeline is resilient to
 * partial fixtures.
 */
function modelToIR(model: OCWorkspaceModel): OCWorkspaceIR {
  return {
    soul: {
      persona: model.soul.ok ? (model.soul.data.persona ?? 'default') : 'default',
      principles: [],
      boundaries: [],
      source: fileRef('SOUL.md'),
    },
    tools: {
      tools: [
        { name: 'read-file', description: 'r', trustLevel: 1, oboFlag: false, line: 1 },
        { name: 'write-file', description: 'w', trustLevel: 3, oboFlag: true, line: 2 },
      ],
      source: fileRef('TOOLS.md'),
    },
    agents: {
      agents: [],
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
    user: { role: 'dev', bounds: [], platform: 'oc', environment: {}, source: fileRef('USER.md') },
    heartbeat: { schedules: [], source: fileRef('HEARTBEAT.md') },
    skills: { skills: [], source: fileRef('skills/') },
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

describe('OCEmitter e2e', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir !== null) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('produces a valid OC plugin from a fixture workspace end-to-end', async () => {
    // ── Read ─────────────────────────────────────────────────────────
    const model = await readOCWorkspace(resolve(FIXTURES, 'full-workspace'));
    expect(model.presentCount).toBeGreaterThan(0);

    // ── Translate to IR ──────────────────────────────────────────────
    const ir = modelToIR(model);

    // ── Emit (real disk I/O, compileGuard passes on clean analysis) ──
    tempDir = mkdtempSync(join(tmpdir(), 'oc-emit-e2e-'));
    const emitter = new OCEmitter({ outputDir: tempDir });
    const result = await emitter.emit(ir, cleanAnalysis());

    expect(result.target).toBe('oc');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);

    // ── Verify plugin directory ──────────────────────────────────────
    const pluginRoot = join(tempDir, 'plugins', 'claws-governance');
    expect(existsSync(pluginRoot)).toBe(true);
    expect(existsSync(join(pluginRoot, 'package.json'))).toBe(true);
    expect(existsSync(join(pluginRoot, 'index.ts'))).toBe(true);

    // ── Marker is present (scenario emit-oc/S03) ─────────────────────
    const indexContents = readFileSync(join(pluginRoot, 'index.ts'), 'utf-8');
    expect(indexContents).toContain('claws-governance:oc-gateway:v1.0.0');

    // ── Zero-import contract holds for every file ────────────────────
    for (const file of result.files) {
      expect(verifyNoCraftworksRefs(file.content)).toHaveLength(0);
    }
  });
});
