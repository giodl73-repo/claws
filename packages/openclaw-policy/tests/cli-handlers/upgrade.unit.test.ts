/**
 * L0 unit tests for `claws upgrade` CLI handler (pulse 47.5 → 47.5.5).
 *
 * 47.5.5 shipped the real `migratePolicyArtifacts` library; the handler
 * now performs actual on-disk migrations rather than surfacing
 * "needs-migration" + a pending-library note. These tests assert the
 * live behavior: older versions → `migrated` + exit 0; already-current
 * → `already-current` + exit 0; parse errors → `error` + exit 1.
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

  it('older IR version → migrator bumps to current, exit 0', async () => {
    seedArtifacts(workdir, '0.9.0', CURRENT_POLICY_SCHEMA_VERSION);
    const res = await handle(argv());
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('policy-ir.json: migrated (v0.9.0');
    expect(res.stdout).toContain('audit-manifest.json: already-current');
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

  it('corrupt JSON in policy-ir → error with parse detail, exit 1', async () => {
    const dir = join(workdir, '.openclaw', 'policy');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'policy-ir.json'), '{not json');
    writeFileSync(join(dir, 'audit-manifest.json'), JSON.stringify({ version: CURRENT_POLICY_SCHEMA_VERSION }));
    const res = await handle(argv());
    expect(res.exitCode).toBe(1);
    expect(res.stdout).toContain('policy-ir.json: error');
    expect(res.stdout).toContain('parse failed');
  });

  it('defaultMigrator reports two artifact entries', async () => {
    seedArtifacts(workdir, CURRENT_POLICY_SCHEMA_VERSION, CURRENT_POLICY_SCHEMA_VERSION);
    const steps = await defaultMigrator(workdir);
    expect(steps).toHaveLength(2);
    expect(steps.map((s) => s.artifact).sort()).toEqual(['audit-manifest.json', 'policy-ir.json']);
  });

  it('artifact missing version field → migrated from unknown to current, exit 0', async () => {
    const dir = join(workdir, '.openclaw', 'policy');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'policy-ir.json'), JSON.stringify({}));
    writeFileSync(join(dir, 'audit-manifest.json'), JSON.stringify({ version: CURRENT_POLICY_SCHEMA_VERSION }));
    const res = await handle(argv());
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('policy-ir.json: migrated (vunknown');
  });

  it('--dry-run inspects without writing; file bytes are unchanged', async () => {
    const { readFileSync } = await import('node:fs');
    seedArtifacts(workdir, '0.9.0', CURRENT_POLICY_SCHEMA_VERSION);
    const irPath = join(workdir, '.openclaw', 'policy', 'policy-ir.json');
    const before = readFileSync(irPath, 'utf8');
    const res = await handle(argv(['--dry-run']));
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('policy-ir.json: migrated');
    const after = readFileSync(irPath, 'utf8');
    expect(after).toBe(before);
  });
});
