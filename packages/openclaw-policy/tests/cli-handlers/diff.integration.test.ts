import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handle } from '../../src/cli-handlers/diff.js';
import { finalizeIR } from '../../src/generator.js';
import { waffles } from '../helpers/fixture.js';

describe('policy diff handler — default snapshot loader (L1)', () => {
  let workspace = '';

  beforeEach(() => {
    workspace = mkdtempSync(path.join(tmpdir(), 'claws-diff-'));
    writeSnap('snap-a', waffles());
    writeSnap(
      'snap-b',
      waffles({
        tools: [
          ...waffles().tools.slice(0, 2),
          { name: 'new-tool', riskLevel: 1, capabilities: ['READ'] },
        ],
      }),
    );
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  function writeSnap(id: string, ir: ReturnType<typeof waffles>): void {
    const snapDir = path.join(workspace, '.claws', 'snapshots', id);
    mkdirSync(snapDir, { recursive: true });
    writeFileSync(path.join(snapDir, 'policy-ir.json'), JSON.stringify(finalizeIR(draftFromIR(ir))), 'utf8');
  }

  it('loads two real snapshots from .claws/snapshots/<id>/policy-ir.json', async () => {
    const result = await handle({
      binaryName: 'claws',
      args: ['snap-a', 'snap-b', '--workspace', workspace],
      cwd: '/cwd',
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/added:.*new-tool/);
  });

  it('exits 1 when a snapshot id is missing from the local store', async () => {
    const result = await handle({
      binaryName: 'claws',
      args: ['snap-a', 'not-a-snap', '--workspace', workspace],
      cwd: '/cwd',
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/ENOENT|no such file/i);
  });
});

function draftFromIR(ir: ReturnType<typeof waffles>) {
  const { policyId: _p, canonicalizerVersion: _v, version, ...rest } = ir;
  return { ...rest, version };
}
