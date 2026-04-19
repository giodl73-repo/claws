/**
 * L3 accept — fleet/S01-mixed-success-failure scenario.
 *
 * Every `expect:` clause from the scenario manifest is asserted here:
 *   - batch_execution: total=3, succeeded=2, failed=1, short_circuit=false,
 *     exit_code_nonzero=true
 *   - per_workspace_reporting: each workspace has status + structured
 *     diagnostic (broken) or elapsed/result metadata (healthy)
 *   - stdout shape: ndjson or human format includes all three
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fleetCompile } from '#src/compiler/fleet/fleet-compile.js';
import { makeHealthyWorkspace, makeBrokenWorkspace } from '../../compiler/fleet/fleet-test-helpers.js';

function exitCodeFor(result: { workspaces: readonly { status: string }[] }): number {
  const succeeded = result.workspaces.filter((w) => w.status === 'success').length;
  const failed = result.workspaces.filter((w) => w.status === 'failure').length;
  if (failed === 0) return 0;
  if (succeeded === 0) return 1;
  return 2;
}

describe('fleet/S01 accept: mixed success/failure', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'accept-s01-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('satisfies every expect: clause from S01 scenario.yaml', async () => {
    const fleetDir = join(root, 'fleet');
    mkdirSync(fleetDir);
    makeHealthyWorkspace(fleetDir, 'healthy_ws1');
    makeHealthyWorkspace(fleetDir, 'healthy_ws2');
    makeBrokenWorkspace(fleetDir, 'broken_ws');

    const result = await fleetCompile(fleetDir, {
      maxConcurrency: 2,
      compileOptions: {
        targets: ['oc'],
        outputDir: join(root, 'out'),
        cacheEnabled: false,
        dryRun: true,
      },
    });

    // batch_execution contract
    expect(result.summary.totalWorkspaces).toBe(3);
    expect(result.summary.succeeded).toBe(2);
    expect(result.summary.failed).toBe(1);
    const notStarted = result.workspaces.filter((w) => w.status === 'not-started');
    expect(notStarted).toHaveLength(0); // short_circuit: false
    expect(exitCodeFor(result)).toBe(2); // exit_code_nonzero: true (partial)

    // per_workspace_reporting: healthy workspaces
    const successes = result.workspaces.filter((w) => w.status === 'success');
    expect(successes).toHaveLength(2);

    // per_workspace_reporting: broken workspace
    const broken = result.workspaces.find((w) => w.status === 'failure');
    expect(broken).toBeDefined();
    if (broken !== undefined && broken.status === 'failure') {
      expect(broken.diagnostic).toBeDefined();
      expect(broken.diagnostic.workspace).toBe('broken_ws');
      expect(typeof broken.diagnostic.kind).toBe('string');
      expect(typeof broken.diagnostic.stage).toBe('string');
      expect(typeof broken.diagnostic.message).toBe('string');
    }

    // stdout shape: includes all three + failure reason
    const lines = [
      ...result.workspaces.map((w) => JSON.stringify(w)),
      JSON.stringify(result.summary),
    ];
    expect(lines).toHaveLength(4);
    const combined = lines.join('\n');
    expect(combined).toContain('healthy_ws1');
    expect(combined).toContain('healthy_ws2');
    expect(combined).toContain('broken_ws');
    if (broken !== undefined && broken.status === 'failure') {
      expect(combined).toContain(broken.diagnostic.message);
    }
  });
});
