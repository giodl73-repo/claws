/**
 * Dependency checker for @bic/claws-skill-kit.
 *
 * Verifies that @bic/claws-skill-kit is installed in the workspace's
 * node_modules and that its major version aligns with the claws
 * binary major version.
 *
 * @module claws-sdk/scaffold/dependency
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { COMPILER_VERSION } from '../compile/version.js';

/**
 * Result of a dependency check.
 */
export interface DependencyCheckResult {
  /** Whether @bic/claws-skill-kit is installed. */
  readonly installed: boolean;
  /** The installed version string, if found. */
  readonly version: string | undefined;
  /** Whether the major version aligns with the claws binary. */
  readonly versionAligned: boolean;
  /** The claws binary major version used for comparison. */
  readonly expectedMajor: number;
  /** Human-readable instruction if the dependency is missing or mismatched. */
  readonly instruction: string | undefined;
}

/**
 * Extract the major version from a semver-like string.
 * Returns NaN if the string doesn't start with a number.
 */
export function extractMajor(version: string): number {
  const match = /^(\d+)/.exec(version);
  return match ? Number(match[1]) : NaN;
}

/**
 * Check whether @bic/claws-skill-kit is installed and version-aligned.
 *
 * Reads node_modules/@bic/claws-skill-kit/package.json to determine
 * installation status and version. Compares the major version against
 * the claws binary's major version (from COMPILER_VERSION).
 *
 * Does NOT throw on missing dependency — returns a structured result
 * with an install instruction instead.
 *
 * @param workspaceRoot - Absolute path to the workspace root
 * @returns DependencyCheckResult with installation status and instructions
 */
export async function checkSkillKitDependency(
  workspaceRoot: string,
): Promise<DependencyCheckResult> {
  const expectedMajor = extractMajor(COMPILER_VERSION);
  const pkgPath = join(workspaceRoot, 'node_modules', '@claws', 'skill-kit', 'package.json');

  let raw: string;
  try {
    raw = await readFile(pkgPath, 'utf-8');
  } catch {
    return {
      installed: false,
      version: undefined,
      versionAligned: false,
      expectedMajor,
      instruction: `@bic/claws-skill-kit is not installed (optional). Scaffolding will use plain TypeScript. To enable decorator syntax later: npm install @bic/claws-skill-kit@${expectedMajor} && claws upgrade`,
    };
  }

  let version: string;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || !('version' in parsed)) {
      throw new Error('missing version field');
    }
    version = String((parsed as { version: unknown }).version);
  } catch {
    return {
      installed: true,
      version: undefined,
      versionAligned: false,
      expectedMajor,
      instruction: `@bic/claws-skill-kit package.json is malformed (optional). To fix: npm install @bic/claws-skill-kit@${expectedMajor}`,
    };
  }

  const installedMajor = extractMajor(version);
  const aligned = installedMajor === expectedMajor;

  return {
    installed: true,
    version,
    versionAligned: aligned,
    expectedMajor,
    instruction: aligned
      ? undefined
      : `@bic/claws-skill-kit version mismatch: installed v${version}, expected major v${expectedMajor}. Run: npm install @bic/claws-skill-kit@${expectedMajor}`,
  };
}
