/**
 * Doctor check: artifact-compat — verify .claws/compiled/ artifacts
 * match the current compiler version.
 *
 * Reads GovernanceIR JSON files from .claws/compiled/ and checks their
 * embedded compilerVersion against COMPILER_VERSION.
 *
 * @module claws-sdk/doctor/checks/artifact-compat
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { CLAWS_SIDECAR_LAYOUT } from '../../types/sidecar.js';
import { COMPILER_VERSION } from '../../compile/version.js';
import type { CheckResult, Diagnostic } from '../orchestrator.js';

const CHECK_ID = 'artifact-compat';
const CHECK_NAME = 'Artifact Compatibility';

/**
 * Minimal shape of a compiled artifact to extract version.
 */
interface ArtifactMeta {
  readonly meta?: {
    readonly compilerVersion?: string;
  };
}

/**
 * Verify compiled artifacts match the current compiler version.
 */
export async function checkArtifactCompat(workspaceRoot: string): Promise<CheckResult> {
  const start = Date.now();
  const diagnostics: Diagnostic[] = [];
  const compiledDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.compiled);

  let files: string[];
  try {
    const entries = await readdir(compiledDir);
    files = entries.filter((f) => f.endsWith('.json'));
  } catch {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'info',
      message: 'No .claws/compiled/ directory found — skipping artifact check',
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

  if (files.length === 0) {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'info',
      message: 'No compiled artifacts found — run `claws compile` first',
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

  for (const file of files) {
    const filePath = join(compiledDir, file);
    try {
      const raw = await readFile(filePath, 'utf-8');
      const artifact = JSON.parse(raw) as ArtifactMeta;
      const artifactVersion = artifact.meta?.compilerVersion;

      if (!artifactVersion) {
        diagnostics.push({
          checkId: CHECK_ID,
          severity: 'warning',
          message: `Artifact ${file} has no compilerVersion metadata`,
          file: filePath,
          fixable: true,
        });
      } else if (artifactVersion !== COMPILER_VERSION) {
        diagnostics.push({
          checkId: CHECK_ID,
          severity: 'error',
          message: `Artifact ${file} was compiled with v${artifactVersion}, current is v${COMPILER_VERSION} — recompile needed`,
          file: filePath,
          fixable: true,
        });
      }
    } catch {
      diagnostics.push({
        checkId: CHECK_ID,
        severity: 'warning',
        message: `Could not parse artifact ${file}`,
        file: filePath,
        fixable: false,
      });
    }
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'info',
      message: `All ${files.length} artifact(s) match compiler v${COMPILER_VERSION}`,
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
