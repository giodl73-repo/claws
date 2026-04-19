/**
 * L1 integration — mixed success/failure batch does not short-circuit
 * (fleet/S01 AC-01/02/03/04/07).
 *
 * 3-workspace fixture (2 healthy clones of full-workspace, 1 with malformed
 * lobster.yaml). Assert batch attempts all three, surfaces a
 * CompileDiagnostic on the broken one, and the summary reports
 * 2 succeeded + 1 failed.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fleetCompile } from '#src/compiler/fleet/fleet-compile.js';
import { makeHealthyWorkspace, makeBrokenWorkspace } from './fleet-test-helpers.js';

describe('fleet compile: mixed success/failure (integration)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fleet-mix-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('attempts all 3 workspaces; 2 succeed, 1 fails with a structured diagnostic', async () => {
    const fleetDir = join(root, 'fleet');
    mkdirSync(fleetDir);
    makeHealthyWorkspace(fleetDir, 'alpha');
    makeBrokenWorkspace(fleetDir, 'broken');
    makeHealthyWorkspace(fleetDir, 'charlie');

    const result = await fleetCompile(fleetDir, {
      maxConcurrency: 2,
      compileOptions: {
        targets: ['oc'],
        outputDir: join(root, 'out'),
        cacheEnabled: false,
        dryRun: true,
      },
    });

    expect(result.workspaces).toHaveLength(3);
    expect(result.summary.totalWorkspaces).toBe(3);

    const statuses = result.workspaces.map((w) => w.status);
    expect(statuses).not.toContain('not-started');

    // Broken workspace surfaces a structured CompileDiagnostic.
    const failure = result.workspaces.find((w) => w.status === 'failure');
    expect(failure).toBeDefined();
    if (failure !== undefined && failure.status === 'failure') {
      expect(failure.diagnostic.workspace).toBe('broken');
      expect(typeof failure.diagnostic.message).toBe('string');
      expect(['parse', 'enforce', 'emit', 'validate']).toContain(failure.diagnostic.stage);
      expect([
        'MissingSoulFile',
        'MalformedLobsterYaml',
        'MissingFrontmatterField',
        'PermissionDenied',
        'CompileFailed',
        'EmitFailed',
        'ValidationFailed',
      ]).toContain(failure.diagnostic.kind);
    }

    // Healthy workspaces completed.
    const successes = result.workspaces.filter((w) => w.status === 'success');
    expect(successes).toHaveLength(2);
    expect(result.summary.succeeded).toBe(2);
    expect(result.summary.failed).toBe(1);

    // Lexicographic order of the result list.
    const ids = result.workspaces.map((w) =>
      w.status === 'failure' ? w.diagnostic.workspace : w.workspace.split(/[\\/]/).pop(),
    );
    expect(ids).toEqual(['alpha', 'broken', 'charlie']);
  });
});
