/**
 * L2 e2e — ndjson output shape (fleet/S01 AC-14/17).
 *
 * Validates that the FleetCompileResult produced by fleetCompile() can be
 * rendered to a newline-delimited JSON stream: one FleetWorkspaceResult
 * per workspace line + a final FleetSummary line. Each line is standalone
 * valid JSON. This is the contract the CLI --json renderer preserves.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fleetCompile } from '#src/compiler/fleet/fleet-compile.js';
import { makeHealthyWorkspace } from './fleet-test-helpers.js';

function renderNdjson(result: { workspaces: readonly unknown[]; summary: unknown }): string {
  const lines: string[] = [];
  for (const ws of result.workspaces) lines.push(JSON.stringify(ws));
  lines.push(JSON.stringify(result.summary));
  return lines.join('\n') + '\n';
}

describe('fleet compile: ndjson stream shape (e2e)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fleet-ndjson-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('ndjson stream has N workspace lines + 1 summary line with required fields', async () => {
    const fleetDir = join(root, 'fleet');
    mkdirSync(fleetDir);
    for (const name of ['alpha', 'bravo', 'charlie']) {
      makeHealthyWorkspace(fleetDir, name);
    }

    const result = await fleetCompile(fleetDir, {
      maxConcurrency: 2,
      compileOptions: {
        targets: ['oc'],
        outputDir: join(root, 'out'),
        cacheEnabled: false,
        dryRun: true,
      },
    });

    const stream = renderNdjson(result);
    const lines = stream.trim().split('\n');
    expect(lines).toHaveLength(4); // 3 workspaces + 1 summary

    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }

    const summary = JSON.parse(lines[3]!);
    expect(summary).toMatchObject({
      totalWorkspaces: 3,
      maxConcurrency: 2,
    });
    expect(typeof summary.wallClockMs).toBe('number');
    expect(typeof summary.peakConcurrency).toBe('number');
    expect(typeof summary.parallelismRatio).toBe('number');
    expect(typeof summary.succeeded).toBe('number');
    expect(typeof summary.failed).toBe('number');
    expect(typeof summary.skipped).toBe('number');

    for (let i = 0; i < 3; i++) {
      const ws = JSON.parse(lines[i]!);
      expect(['success', 'failure', 'cancelled', 'not-started']).toContain(ws.status);
    }
  });
});
