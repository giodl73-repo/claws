/**
 * Doctor check: config-schema — validate claws.json against the current
 * schema version, report field errors.
 *
 * @module claws-sdk/doctor/checks/config-schema
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ClawsConfigSchema } from '../../config/types.js';
import { CLAWS_CONFIG_FILE } from '../../types/sidecar.js';
import type { CheckResult, Diagnostic } from '../orchestrator.js';

const CHECK_ID = 'config-schema';
const CHECK_NAME = 'Config Schema Validation';

/**
 * Validate claws.json against the current Zod schema.
 * Reports missing file, invalid JSON, or schema violations.
 */
export async function checkConfigSchema(workspaceRoot: string): Promise<CheckResult> {
  const start = Date.now();
  const diagnostics: Diagnostic[] = [];
  const configPath = join(workspaceRoot, CLAWS_CONFIG_FILE);

  let raw: string;
  try {
    raw = await readFile(configPath, 'utf-8');
  } catch {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'error',
      message: `${CLAWS_CONFIG_FILE} not found at ${configPath}`,
      file: configPath,
      fixable: false,
    });
    return {
      checkId: CHECK_ID,
      name: CHECK_NAME,
      passed: false,
      diagnostics,
      durationMs: Date.now() - start,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err: unknown) {
    const detail = (err as Error).message;
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'error',
      message: `Invalid JSON in ${CLAWS_CONFIG_FILE}: ${detail}`,
      file: configPath,
      fixable: false,
    });
    return {
      checkId: CHECK_ID,
      name: CHECK_NAME,
      passed: false,
      diagnostics,
      durationMs: Date.now() - start,
    };
  }

  const result = ClawsConfigSchema.safeParse(parsed);
  if (!result.success) {
    for (const issue of result.error.issues) {
      diagnostics.push({
        checkId: CHECK_ID,
        severity: 'error',
        message: `Field "${issue.path.join('.')}": ${issue.message}`,
        file: configPath,
        fixable: false,
      });
    }
  } else {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'info',
      message: `${CLAWS_CONFIG_FILE} validates against current schema`,
      file: configPath,
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
