/**
 * L0 unit tests for `claws upgrade` CLI handler (pulse 47.5 D3).
 *
 * Asserts: the migrator-injection seam is preserved; the default migrator
 * performs a real on-disk inspection (not a hardcoded `already-current`);
 * needs-migration exits 1 and flags the pending library gap
 * (`atom:policy-artifact-migration`, pulse 47.5.5).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  handle,
  defaultMigrator,
  CURRENT_POLICY_SCHEMA_VERSION,
  type PolicyMigrator,
} from '../../src/cli-handlers/upgrade.js';

function seedArtifacts(root: string, irVersion: string, manifestVersion: string): void {
  const dir = join(root, '.openclaw', 'policy');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'policy-ir.json'), JSON.stringify({ version: irVersion }));
  writeFileSync(join(dir, 'audit-manifest.json'), JSON.stringify({ version: manifestVersion }));
}

describe('upgrade handler', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'upgrade-handler-'));
  });
  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  function argv(args: string[] = []) {
    return { binaryName: 'claws', args, cwd: workdir, env: {} };
  }

  it('both artifacts at current version → exit 0, already-current for each', async () => {
    seedArtifacts(workdir, CURRENT_POLICY_SCHEMA_VERSION, CURRENT_POLICY_SCHEMA_VERSION);
    const res = await handle(argv());
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('claws upgrade:');
    expect(res.stdout).toContain(`policy-ir.json: already-current (v${CURRENT_POLICY_SCHEMA_VERSION} -> v${CURRENT_POLICY_SCHEMA_VERSION})`);
    expect(res.stdout).toContain(`audit-manifest.json: already-current`);
    expect(res.stdout).not.toContain('migration library not yet available');
  });

  it('older IR version → exit 1 with needs-migration and 47.5.5 flag', async () => {
    seedArtifacts(workdir, '0.9.0', CURRENT_POLICY_SCHEMA_VERSION);
    const res = await handle(argv());
    expect(res.exitCode).toBe(1);
    expect(res.stdout).toContain('policy-ir.json: needs-migration (v0.9.0');
    expect(res.stdout).toContain('audit-manifest.json: already-current');
    expect(res.stdout).toContain('atom:policy-artifact-migration');
    expect(res.stdout).toContain('pulse 47.5.5');
  });

  it('missing artifacts → exit 0 with per-artifact missing status', async () => {
    // workdir exists but no .openclaw/policy subtree
    const res = await handle(argv());
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('policy-ir.json: missing (vn/a ->');
    expect(res.stdout).toContain('audit-manifest.json: missing');
  });

  it('custom migrator injection overrides the default inspector', async () => {
    const fake: PolicyMigrator = async () => [
      { artifact: 'policy-ir.json', fromVersion: '1.0.0', toVersion: '1.1.0', status: 'migrated' },
    ];
    const res = await handle(argv(), fake);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('policy-ir.json: migrated (v1.0.0 -> v1.1.0)');
  });

  it('missing workspace → exit 2 usage error', async () => {
    const res = await handle({ binaryName: 'claws', args: [], cwd: '', env: {} });
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toContain('workspace path required');
  });

  it('--workspace flag overrides argv.cwd', async () => {
    const other = mkdtempSync(join(tmpdir(), 'upgrade-other-'));
    try {
      seedArtifacts(other, CURRENT_POLICY_SCHEMA_VERSION, CURRENT_POLICY_SCHEMA_VERSION);
      const res = await handle(argv(['--workspace', other]));
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('already-current');
    } finally {
      rmSync(other, { recursive: true, force: true });
    }
  });

  it('corrupt JSON in policy-ir → needs-migration with unknown from-version', async () => {
    const dir = join(workdir, '.openclaw', 'policy');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'policy-ir.json'), '{not json');
    writeFileSync(join(dir, 'audit-manifest.json'), JSON.stringify({ version: CURRENT_POLICY_SCHEMA_VERSION }));
    const res = await handle(argv());
    expect(res.exitCode).toBe(1);
    expect(res.stdout).toContain('policy-ir.json: needs-migration (vunknown');
  });

  it('defaultMigrator reports two artifact entries', async () => {
    seedArtifacts(workdir, CURRENT_POLICY_SCHEMA_VERSION, CURRENT_POLICY_SCHEMA_VERSION);
    const steps = await defaultMigrator(workdir);
    expect(steps).toHaveLength(2);
    expect(steps.map((s) => s.artifact).sort()).toEqual(['audit-manifest.json', 'policy-ir.json']);
  });

  it('artifact missing version field → needs-migration with unknown from', async () => {
    const dir = join(workdir, '.openclaw', 'policy');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'policy-ir.json'), JSON.stringify({}));
    writeFileSync(join(dir, 'audit-manifest.json'), JSON.stringify({ version: CURRENT_POLICY_SCHEMA_VERSION }));
    const res = await handle(argv());
    expect(res.exitCode).toBe(1);
    expect(res.stdout).toContain('policy-ir.json: needs-migration (vunknown');
  });
});
