/**
 * L1: Doctor orchestrator — integration tests that run the full
 * doctor pipeline across a realistic workspace fixture.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runDoctor, createDefaultChecks } from '../../src/doctor/index.js';
import { COMPILER_VERSION } from '../../src/compile/version.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'claws-doctor-int-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('runDoctor() — full orchestration', () => {
  it('reports healthy on a reference workspace with no issues', async () => {
    // Set up a healthy workspace
    await writeFile(
      join(tmpDir, 'claws.json'),
      JSON.stringify({ trustTier: 2 }),
    );
    const compiledDir = join(tmpDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    await writeFile(
      join(compiledDir, 'governance.json'),
      JSON.stringify({ meta: { compilerVersion: COMPILER_VERSION } }),
    );
    const policiesDir = join(tmpDir, '.claws', 'policies');
    await mkdir(policiesDir, { recursive: true });
    await writeFile(
      join(policiesDir, 'default.yaml'),
      'policy: default\nlevel: error\nrules:\n  - deny: exec\n',
    );

    const checks = createDefaultChecks();
    const report = await runDoctor(tmpDir, checks);

    expect(report.healthy).toBe(true);
    expect(report.summary.errors).toBe(0);
    expect(report.checks).toHaveLength(6);
    expect(report.checks.every((c) => c.passed)).toBe(true);
  });

  it('reports version mismatch when compiled artifacts are stale', async () => {
    // Set up a workspace with stale artifacts
    await writeFile(
      join(tmpDir, 'claws.json'),
      JSON.stringify({ trustTier: 2 }),
    );
    const compiledDir = join(tmpDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    await writeFile(
      join(compiledDir, 'governance.json'),
      JSON.stringify({ meta: { compilerVersion: '0.1.0' } }),
    );

    const checks = createDefaultChecks();
    const report = await runDoctor(tmpDir, checks);

    expect(report.healthy).toBe(false);
    expect(report.summary.errors).toBeGreaterThan(0);
    expect(
      report.diagnostics.some((d) =>
        d.severity === 'error' && d.message.includes('recompile'),
      ),
    ).toBe(true);
  });
});
