/**
 * L2: Init workspace E2E — scaffold starter files then run check pipeline.
 *
 * Validates the first-run onboarding path:
 *   claws init (empty dir) → claws check → pipeline completes without errors
 *
 * The starter workspace files are designed so the parse + extract + analyze
 * pipeline runs to completion. Governance violations (G-CLASS-02, etc.) are
 * expected and acceptable — "zero errors" means the pipeline does not throw
 * and produces valid analysis output.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { initWorkspace } from '../../src/init/orchestrator.js';
import { parse } from '../../src/compile/parse.js';
import { extractAllIntents } from '../../src/compile/intent/index.js';
import { buildGovernanceAST } from '../../src/compile/governance-ast.js';
import { extract } from '../../src/compile/extract.js';
import { buildCapabilityManifest } from '../../src/compile/manifest.js';
import { analyze } from '../../src/compile/analyze.js';
import { createDefaultRegistry } from '../../src/governance/index.js';

// ── Cleanup ──────────────────────────────────────────────────────────

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }
  tempDirs.length = 0;
});

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'claws-e2e-init-ws-'));
  tempDirs.push(dir);
  return dir;
}

// ── Test ─────────────────────────────────────────────────────────────

describe('init workspace E2E — init then check', () => {
  it('init on empty dir creates starter workspace, check pipeline completes without errors', async () => {
    const tempDir = createTempDir();

    // Step 1: claws init — scaffold everything
    const initResult = await initWorkspace(tempDir, { scaffold: true });
    expect(initResult.exitCode).toBe(0);
    expect(initResult.status).toBe('initialized');
    expect(initResult.workspaceScaffold).toBeDefined();
    expect(initResult.workspaceScaffold!.created.length).toBeGreaterThan(0);

    // Step 2: claws check — parse workspace files
    const parseResult = await parse(tempDir);

    // Parse should not halt (we have files to process)
    expect(parseResult.shouldHalt).toBe(false);
    expect(parseResult.presentCount).toBeGreaterThan(0);

    // Parse diagnostics should have no errors (starter files are valid)
    const errorDiagnostics = parseResult.diagnostics.filter(
      (d) => d.level === 'error',
    );
    expect(errorDiagnostics).toHaveLength(0);

    // Step 3: Extract intents from parsed files
    const intentResults = extractAllIntents(parseResult);

    // Step 4: Build GovernanceAST
    const ast = buildGovernanceAST(intentResults);

    // Step 5: Extract manifest and build capabilities
    const manifest = extract(ast);
    const capabilityManifest = buildCapabilityManifest(manifest);

    // Starter TOOLS.md declares tools — they should appear in the manifest
    expect(capabilityManifest.tools.length).toBeGreaterThan(0);

    // Step 6: Run governance analysis
    const registry = createDefaultRegistry(capabilityManifest);
    const analysis = analyze(capabilityManifest, registry);

    // Analysis should complete and produce a result (violations are expected
    // for governance rules like G-CLASS-02, but the pipeline should not throw)
    expect(analysis).toBeDefined();
    expect(analysis.violations).toBeDefined();
    expect(Array.isArray(analysis.violations)).toBe(true);

    // Every violation should have proper WHAT/HOW/WHERE structure
    for (const v of analysis.violations) {
      expect(v.ruleId, 'violation should have ruleId').toBeTruthy();
      expect(v.message, 'violation should have message').toBeTruthy();
      expect(v.target, 'violation should have target').toBeTruthy();
    }
  }, 30_000);
});
