/**
 * Doctor check: dependency-check — verify @bic/claws-skill-kit version alignment
 * across the workspace.
 *
 * Reads package.json to check that the declared @bic/claws-skill-kit version
 * matches the expected range for the current claws compiler version.
 *
 * @module claws-sdk/doctor/checks/dependency-check
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { COMPILER_VERSION } from '../../compile/version.js';
import type { CheckResult, Diagnostic } from '../orchestrator.js';

const CHECK_ID = 'dependency-check';
const CHECK_NAME = 'Dependency Alignment';

const SKILL_KIT_PACKAGE = '@bic/claws-skill-kit';

/**
 * Minimal package.json shape for dependency extraction.
 */
interface PackageJson {
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

/**
 * Extract the major.minor from a semver string (strips pre-release, range prefixes).
 */
function majorMinor(version: string): string {
  const clean = version.replace(/^[\^~>=<]*/, '');
  const parts = clean.split('.');
  return `${parts[0]}.${parts[1]}`;
}

/**
 * Check @bic/claws-skill-kit version alignment with the current compiler version.
 */
export async function checkDependencyAlignment(workspaceRoot: string): Promise<CheckResult> {
  const start = Date.now();
  const diagnostics: Diagnostic[] = [];
  const pkgPath = join(workspaceRoot, 'package.json');

  let raw: string;
  try {
    raw = await readFile(pkgPath, 'utf-8');
  } catch {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'info',
      message: 'No package.json found — skipping dependency check',
      fixable: false,
    });
    return {
      checkId: CHECK_ID,
      name: CHECK_NAME,
      passed: true,
      diagnostics,
      durationMs: Date.now() - start,
    };
  }

  let pkg: PackageJson;
  try {
    pkg = JSON.parse(raw) as PackageJson;
  } catch {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'warning',
      message: 'Could not parse package.json',
      file: pkgPath,
      fixable: false,
    });
    return {
      checkId: CHECK_ID,
      name: CHECK_NAME,
      passed: true,
      diagnostics,
      durationMs: Date.now() - start,
    };
  }

  const declaredVersion =
    pkg.dependencies?.[SKILL_KIT_PACKAGE] ??
    pkg.devDependencies?.[SKILL_KIT_PACKAGE];

  if (!declaredVersion) {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'info',
      message: `${SKILL_KIT_PACKAGE} not found in package.json — no alignment check needed`,
      fixable: false,
    });
    return {
      checkId: CHECK_ID,
      name: CHECK_NAME,
      passed: true,
      diagnostics,
      durationMs: Date.now() - start,
    };
  }

  const compilerMajorMinor = majorMinor(COMPILER_VERSION);
  const declaredMajorMinor = majorMinor(declaredVersion);

  if (declaredMajorMinor !== compilerMajorMinor) {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'error',
      message: `${SKILL_KIT_PACKAGE}@${declaredVersion} does not align with compiler v${COMPILER_VERSION} — expected ${compilerMajorMinor}.x`,
      file: pkgPath,
      fixable: true,
    });
  } else {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'info',
      message: `${SKILL_KIT_PACKAGE}@${declaredVersion} aligns with compiler v${COMPILER_VERSION}`,
      fixable: false,
    });
  }

  return {
    checkId: CHECK_ID,
    name: CHECK_NAME,
    passed: diagnostics.every((d) => d.severity !== 'error'),
    diagnostics,
    durationMs: Date.now() - start,
  };
}
