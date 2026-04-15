/**
 * L0 unit tests for scaffold dependency checker.
 *
 * 2 tests:
 *  1. Detects missing @bic/claws-skill-kit
 *  2. Detects version mismatch
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { checkSkillKitDependency, extractMajor } from '@bic/claws-sdk/scaffold';
import { COMPILER_VERSION } from '#src/compile/version.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-scaffold-dep-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('extractMajor', () => {
  it('extracts major from semver', () => {
    expect(extractMajor('0.36.0')).toBe(0);
    expect(extractMajor('1.2.3')).toBe(1);
    expect(extractMajor('12.0.0-beta.1')).toBe(12);
  });

  it('returns NaN for non-version strings', () => {
    expect(extractMajor('abc')).toBeNaN();
  });
});

describe('checkSkillKitDependency', () => {
  it('detects missing @bic/claws-skill-kit', async () => {
    const result = await checkSkillKitDependency(tempDir);

    expect(result.installed).toBe(false);
    expect(result.version).toBeUndefined();
    expect(result.versionAligned).toBe(false);
    expect(result.instruction).toContain('npm install @bic/claws-skill-kit');
  });

  it('detects version mismatch', async () => {
    const pkgDir = join(tempDir, 'node_modules', '@claws', 'skill-kit');
    await mkdir(pkgDir, { recursive: true });
    // Write a package.json with a different major version
    const mismatchMajor = extractMajor(COMPILER_VERSION) + 1;
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: '@bic/claws-skill-kit', version: `${mismatchMajor}.0.0` }),
      'utf-8',
    );

    const result = await checkSkillKitDependency(tempDir);

    expect(result.installed).toBe(true);
    expect(result.version).toBe(`${mismatchMajor}.0.0`);
    expect(result.versionAligned).toBe(false);
    expect(result.instruction).toContain('version mismatch');
  });

  it('handles malformed package.json (invalid JSON)', async () => {
    const pkgDir = join(tempDir, 'node_modules', '@claws', 'skill-kit');
    await mkdir(pkgDir, { recursive: true });
    await writeFile(join(pkgDir, 'package.json'), 'not-valid-json', 'utf-8');

    const result = await checkSkillKitDependency(tempDir);

    expect(result.installed).toBe(true);
    expect(result.version).toBeUndefined();
    expect(result.versionAligned).toBe(false);
    expect(result.instruction).toContain('malformed');
  });

  it('handles package.json missing version field', async () => {
    const pkgDir = join(tempDir, 'node_modules', '@claws', 'skill-kit');
    await mkdir(pkgDir, { recursive: true });
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: '@bic/claws-skill-kit' }),
      'utf-8',
    );

    const result = await checkSkillKitDependency(tempDir);

    expect(result.installed).toBe(true);
    expect(result.version).toBeUndefined();
    expect(result.versionAligned).toBe(false);
    expect(result.instruction).toContain('malformed');
  });

  it('reports aligned when versions match', async () => {
    const pkgDir = join(tempDir, 'node_modules', '@claws', 'skill-kit');
    await mkdir(pkgDir, { recursive: true });
    const major = extractMajor(COMPILER_VERSION);
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: '@bic/claws-skill-kit', version: `${major}.1.0` }),
      'utf-8',
    );

    const result = await checkSkillKitDependency(tempDir);

    expect(result.installed).toBe(true);
    expect(result.versionAligned).toBe(true);
    expect(result.instruction).toBeUndefined();
  });
});
