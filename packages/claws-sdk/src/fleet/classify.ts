/**
 * Fleet workspace classification — 3-state governance classifier.
 *
 * Classifies each discovered workspace into one of three states:
 * - GOVERNED: valid .claws/ directory with claws.json and at least one policy
 * - UNGOVERNED: OC markers present but no .claws/ directory
 * - MISCONFIGURED: .claws/ directory exists but claws.json missing or invalid
 *
 * @module claws-sdk/fleet/classify
 */

import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ClassificationState, WorkspaceInfo } from './types.js';
import { ClawsConfigSchema } from '../config/types.js';
import { CLAWS_CONFIG_FILE } from '../types/sidecar.js';

/**
 * Check whether a path exists on disk.
 */
async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check whether .claws/policies/ contains at least one file.
 */
async function hasPolicy(workspacePath: string): Promise<boolean> {
  const policiesDir = join(workspacePath, '.claws', 'policies');
  try {
    const entries = await readdir(policiesDir);
    return entries.length > 0;
  } catch {
    return false;
  }
}

/**
 * Validate claws.json at the workspace root.
 * Returns { valid: true } or { valid: false, error: string }.
 */
async function validateConfig(
  workspacePath: string,
): Promise<{ valid: true } | { valid: false; error: string }> {
  const configPath = join(workspacePath, CLAWS_CONFIG_FILE);
  let raw: string;
  try {
    raw = await readFile(configPath, 'utf-8');
  } catch {
    return { valid: false, error: `${CLAWS_CONFIG_FILE} not found` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { valid: false, error: `${CLAWS_CONFIG_FILE} contains invalid JSON` };
  }

  const result = ClawsConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    return { valid: false, error: `${CLAWS_CONFIG_FILE} schema validation failed: ${issues}` };
  }

  return { valid: true };
}

/**
 * Classify a workspace into GOVERNED, UNGOVERNED, or MISCONFIGURED.
 *
 * Decision tree:
 * 1. No .claws/ directory → UNGOVERNED
 * 2. .claws/ exists but claws.json missing or invalid → MISCONFIGURED
 * 3. .claws/ exists + valid claws.json + at least one policy → GOVERNED
 * 4. .claws/ exists + valid claws.json + no policies → MISCONFIGURED (incomplete setup)
 *
 * @param workspacePath - Absolute path to the workspace root
 * @param markers - OC marker file names found in this workspace
 */
export async function classifyWorkspace(
  workspacePath: string,
  markers: readonly string[],
): Promise<WorkspaceInfo> {
  const clawsDir = join(workspacePath, '.claws');
  const hasClawsDir = await pathExists(clawsDir);

  // No .claws/ directory → UNGOVERNED
  if (!hasClawsDir) {
    return makeResult(workspacePath, markers, 'UNGOVERNED',
      'OC workspace detected but no .claws/ directory — run `claws init` to govern');
  }

  // .claws/ exists — validate config
  const configResult = await validateConfig(workspacePath);
  if (!configResult.valid) {
    return makeResult(workspacePath, markers, 'MISCONFIGURED',
      `.claws/ directory exists but ${configResult.error}`,
      { configError: configResult.error });
  }

  // Valid config — check for policies
  const hasPolicies = await hasPolicy(workspacePath);
  if (!hasPolicies) {
    return makeResult(workspacePath, markers, 'MISCONFIGURED',
      '.claws/ directory and valid claws.json but no policies in .claws/policies/',
      { configError: 'no policies found' });
  }

  // All checks pass → GOVERNED
  return makeResult(workspacePath, markers, 'GOVERNED',
    'Valid .claws/ directory with claws.json and policies');
}

/**
 * Build a WorkspaceInfo result.
 */
function makeResult(
  path: string,
  markers: readonly string[],
  classification: ClassificationState,
  rationale: string,
  metadata?: Record<string, unknown>,
): WorkspaceInfo {
  return { path, markers, classification, rationale, ...(metadata !== undefined ? { metadata } : {}) };
}
