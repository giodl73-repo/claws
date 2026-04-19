/**
 * L1 integration tests for the CP-2 compile pipeline gate.
 *
 * Exercises the public `compile()` entry against the 9-file e2e fixture and
 * verifies that every CP-1/CP-2 module (readers, sidecar, IR, enforce, both
 * emitters, validator, cache) is wired through the host with no manual glue
 * code living in tests. This is the wiring gate — if a module was missed
 * during the graduation, these assertions go red.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compile } from '#src/compiler/host/index.js';

const WORKSPACE = resolve(__dirname, 'fixtures/workspace');

describe('CP-2 pipeline integration (compile host)', () => {
  let outputDir: string;
  let cacheDir: string;

  beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), 'claws-pipeline-int-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'claws-pipeline-int-cache-'));
  });

  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
  });

  it('wires readers → sidecar → IR → enforce → emit → validate → cache without manual glue', async () => {
    const result = await compile(WORKSPACE, {
      targets: ['oc', 'claude-code'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);

    // Every declared stage produced at least one diagnostic-free signal:
    // emitResults keyed by both targets, validationReport present, duration ≥ 0.
    expect(Object.keys(result.emitResults).sort()).toEqual(['claude-code', 'oc']);
    expect(result.validationReport).toBeDefined();
    expect(result.validationReport?.checks.length).toBe(12);
    expect(result.duration).toBeGreaterThanOrEqual(0);

    // No stage emitted an error diagnostic — the pipeline ran clean end-to-end.
    const errorDiagnostics = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errorDiagnostics).toEqual([]);
  });

  it('both emit targets produce non-empty output from the parsed workspace state', async () => {
    const result = await compile(WORKSPACE, {
      targets: ['oc', 'claude-code'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });

    expect(result.success).toBe(true);

    const ocFiles = result.emitResults.oc?.files ?? [];
    const ccFiles = result.emitResults['claude-code']?.files ?? [];
    expect(ocFiles.length).toBeGreaterThan(0);
    expect(ccFiles.length).toBeGreaterThan(0);

    // OC plugin has the well-known root file; Claude Code workspace has CLAUDE.md.
    const ocPaths = ocFiles.map((f) => f.path);
    const ccPaths = ccFiles.map((f) => f.path);
    expect(ocPaths.some((p) => p.endsWith('package.json'))).toBe(true);
    expect(ccPaths.some((p) => p === 'CLAUDE.md')).toBe(true);
  });
});
