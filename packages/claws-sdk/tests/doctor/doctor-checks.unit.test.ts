/**
 * L0: Doctor checks — unit tests for each individual check module.
 *
 * Each check is tested with a minimal in-memory fixture using tmp dirs.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { checkConfigSchema } from '../../src/doctor/checks/config-schema.js';
import { checkArtifactCompat } from '../../src/doctor/checks/artifact-compat.js';
import { checkDependencyAlignment } from '../../src/doctor/checks/dependency-check.js';
import { checkPolicySyntax } from '../../src/doctor/checks/policy-syntax.js';
import { COMPILER_VERSION } from '../../src/compile/version.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'claws-doctor-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ── config-schema ─────────────────────────────────────────────────────

describe('checkConfigSchema', () => {
  it('passes on a valid claws.json', async () => {
    await writeFile(
      join(tmpDir, 'claws.json'),
      JSON.stringify({ trustTier: 3 }),
    );

    const result = await checkConfigSchema(tmpDir);
    expect(result.checkId).toBe('config-schema');
    expect(result.passed).toBe(true);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.severity).toBe('info');
  });

  it('fails on an invalid field value', async () => {
    await writeFile(
      join(tmpDir, 'claws.json'),
      JSON.stringify({ trustTier: 99 }),
    );

    const result = await checkConfigSchema(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    expect(result.diagnostics.some((d) => d.message.includes('trustTier'))).toBe(true);
  });

  it('fails when claws.json is missing', async () => {
    const result = await checkConfigSchema(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.diagnostics[0]!.severity).toBe('error');
    expect(result.diagnostics[0]!.message).toContain('not found');
  });

  it('fails on invalid JSON syntax', async () => {
    await writeFile(join(tmpDir, 'claws.json'), '{ broken json }');

    const result = await checkConfigSchema(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.diagnostics[0]!.severity).toBe('error');
    expect(result.diagnostics[0]!.message).toContain('Invalid JSON');
  });
});

// ── artifact-compat ───────────────────────────────────────────────────

describe('checkArtifactCompat', () => {
  it('passes when all artifacts match the current compiler version', async () => {
    const compiledDir = join(tmpDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    await writeFile(
      join(compiledDir, 'governance.json'),
      JSON.stringify({ meta: { compilerVersion: COMPILER_VERSION } }),
    );

    const result = await checkArtifactCompat(tmpDir);
    expect(result.checkId).toBe('artifact-compat');
    expect(result.passed).toBe(true);
    expect(result.diagnostics.some((d) => d.severity === 'info')).toBe(true);
  });

  it('fails when an artifact has a version mismatch', async () => {
    const compiledDir = join(tmpDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    await writeFile(
      join(compiledDir, 'governance.json'),
      JSON.stringify({ meta: { compilerVersion: '0.1.0' } }),
    );

    const result = await checkArtifactCompat(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    expect(result.diagnostics.some((d) => d.message.includes('recompile'))).toBe(true);
  });

  it('returns info when no compiled directory exists', async () => {
    const result = await checkArtifactCompat(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.diagnostics[0]!.severity).toBe('info');
    expect(result.diagnostics[0]!.message).toContain('No .claws/compiled/');
  });

  it('returns info when compiled directory is empty', async () => {
    await mkdir(join(tmpDir, '.claws', 'compiled'), { recursive: true });
    const result = await checkArtifactCompat(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.diagnostics[0]!.message).toContain('No compiled artifacts');
  });

  it('warns when an artifact has no compilerVersion metadata', async () => {
    const compiledDir = join(tmpDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    await writeFile(
      join(compiledDir, 'governance.json'),
      JSON.stringify({ meta: {} }),
    );

    const result = await checkArtifactCompat(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.diagnostics.some((d) => d.severity === 'warning')).toBe(true);
    expect(result.diagnostics.some((d) => d.message.includes('no compilerVersion'))).toBe(true);
  });

  it('warns when an artifact contains invalid JSON', async () => {
    const compiledDir = join(tmpDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    await writeFile(join(compiledDir, 'broken.json'), 'not json');

    const result = await checkArtifactCompat(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.diagnostics.some((d) => d.severity === 'warning')).toBe(true);
    expect(result.diagnostics.some((d) => d.message.includes('Could not parse'))).toBe(true);
  });
});

// ── dependency-check ──────────────────────────────────────────────────

describe('checkDependencyAlignment', () => {
  it('passes when @bic/claws-skill-kit version aligns with compiler', async () => {
    await writeFile(
      join(tmpDir, 'package.json'),
      JSON.stringify({
        dependencies: { '@bic/claws-skill-kit': `^${COMPILER_VERSION}` },
      }),
    );

    const result = await checkDependencyAlignment(tmpDir);
    expect(result.checkId).toBe('dependency-check');
    expect(result.passed).toBe(true);
    expect(result.diagnostics.some((d) => d.severity === 'info')).toBe(true);
  });

  it('fails when @bic/claws-skill-kit version does not align', async () => {
    await writeFile(
      join(tmpDir, 'package.json'),
      JSON.stringify({
        dependencies: { '@bic/claws-skill-kit': '^1.0.0' },
      }),
    );

    const result = await checkDependencyAlignment(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    expect(result.diagnostics.some((d) => d.message.includes('does not align'))).toBe(true);
  });

  it('returns info when no package.json exists', async () => {
    const result = await checkDependencyAlignment(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.diagnostics[0]!.severity).toBe('info');
    expect(result.diagnostics[0]!.message).toContain('No package.json');
  });

  it('returns info when @bic/claws-skill-kit is not in dependencies', async () => {
    await writeFile(
      join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { 'other-pkg': '1.0.0' } }),
    );

    const result = await checkDependencyAlignment(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.diagnostics[0]!.severity).toBe('info');
    expect(result.diagnostics[0]!.message).toContain('not found in package.json');
  });

  it('warns when package.json is invalid JSON', async () => {
    await writeFile(join(tmpDir, 'package.json'), '{ broken }');

    const result = await checkDependencyAlignment(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.diagnostics.some((d) => d.severity === 'warning')).toBe(true);
    expect(result.diagnostics.some((d) => d.message.includes('Could not parse'))).toBe(true);
  });

  it('passes when @bic/claws-skill-kit is in devDependencies', async () => {
    await writeFile(
      join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: { '@bic/claws-skill-kit': `^${COMPILER_VERSION}` },
      }),
    );

    const result = await checkDependencyAlignment(tmpDir);
    expect(result.passed).toBe(true);
  });
});

// ── policy-syntax ─────────────────────────────────────────────────────

describe('checkPolicySyntax', () => {
  it('passes on a valid policy file', async () => {
    const policiesDir = join(tmpDir, '.claws', 'policies');
    await mkdir(policiesDir, { recursive: true });
    await writeFile(
      join(policiesDir, 'default.yaml'),
      'policy: default\nlevel: error\nrules:\n  - deny: exec\n',
    );

    const result = await checkPolicySyntax(tmpDir);
    expect(result.checkId).toBe('policy-syntax');
    expect(result.passed).toBe(true);
    expect(result.diagnostics.some((d) => d.severity === 'info')).toBe(true);
  });

  it('fails on a policy file missing required fields', async () => {
    const policiesDir = join(tmpDir, '.claws', 'policies');
    await mkdir(policiesDir, { recursive: true });
    await writeFile(
      join(policiesDir, 'bad.yaml'),
      'name: bad\ndescription: missing policy level and rules\n',
    );

    const result = await checkPolicySyntax(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    expect(result.diagnostics.some((d) => d.message.includes('missing required fields'))).toBe(true);
  });

  it('returns info when no policies directory exists', async () => {
    const result = await checkPolicySyntax(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.diagnostics[0]!.severity).toBe('info');
    expect(result.diagnostics[0]!.message).toContain('No .claws/policies/');
  });

  it('returns info when policies directory is empty', async () => {
    await mkdir(join(tmpDir, '.claws', 'policies'), { recursive: true });
    const result = await checkPolicySyntax(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.diagnostics[0]!.message).toContain('No policy files');
  });

  it('fails on an empty policy file', async () => {
    const policiesDir = join(tmpDir, '.claws', 'policies');
    await mkdir(policiesDir, { recursive: true });
    await writeFile(join(policiesDir, 'empty.yaml'), '');

    const result = await checkPolicySyntax(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    expect(result.diagnostics.some((d) => d.message.includes('empty'))).toBe(true);
  });

  it('passes on a valid .yml policy file', async () => {
    const policiesDir = join(tmpDir, '.claws', 'policies');
    await mkdir(policiesDir, { recursive: true });
    await writeFile(
      join(policiesDir, 'alt.yml'),
      'policy: alt\nlevel: warn\nrules:\n  - allow: read\n',
    );

    const result = await checkPolicySyntax(tmpDir);
    expect(result.passed).toBe(true);
  });

  it('fails when a policy file cannot be read', async () => {
    const policiesDir = join(tmpDir, '.claws', 'policies');
    await mkdir(policiesDir, { recursive: true });
    // Create a subdirectory with .yaml extension — readFile will fail
    await mkdir(join(policiesDir, 'dir.yaml'));

    const result = await checkPolicySyntax(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    expect(result.diagnostics.some((d) => d.message.includes('Could not read'))).toBe(true);
  });
});
