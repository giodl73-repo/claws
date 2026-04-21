import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handle } from '../../src/cli-handlers/check.js';
import { finalizeIR } from '../../src/generator.js';
import { waffles } from '../helpers/fixture.js';

describe('policy check handler — default IR loader (L1)', () => {
  let workspace = '';

  beforeEach(() => {
    workspace = mkdtempSync(path.join(tmpdir(), 'claws-check-'));
    const irDir = path.join(workspace, '.claws');
    mkdirSync(irDir, { recursive: true });
    writeFileSync(
      path.join(irDir, 'policy-ir.json'),
      JSON.stringify(finalizeIR(draftFromIR(waffles()))),
      'utf8',
    );
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it('reads .claws/policy-ir.json from the workspace and exits 0', async () => {
    const result = await handle({ binaryName: 'claws', args: ['--workspace', workspace], cwd: '/cwd' });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('claws policy check:');
  });

  it('exits 1 when .claws/policy-ir.json is missing from the workspace', async () => {
    rmSync(path.join(workspace, '.claws'), { recursive: true, force: true });
    const result = await handle({ binaryName: 'claws', args: ['--workspace', workspace], cwd: '/cwd' });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/ENOENT|no such file/i);
  });
});

function draftFromIR(ir: ReturnType<typeof waffles>) {
  const { policyId: _p, canonicalizerVersion: _v, version, ...rest } = ir;
  return { ...rest, version };
}
