/**
 * Fleet drift severity classification.
 *
 * Classifies drift severity by semantic analysis of what changed:
 * - CRITICAL: trust tier lowered (e.g., T3→T1)
 * - HIGH: policy removed or deny constraint deleted
 * - LOW: minor configuration change (metadata, format, etc.)
 *
 * @module claws-sdk/fleet/severity
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { DriftSeverity } from './drift-types.js';

/**
 * Classify the severity of drift between a workspace and the baseline
 * reference workspace.
 *
 * Severity is determined by semantic analysis:
 * 1. CRITICAL — trust tier was lowered
 * 2. HIGH — a policy file was removed or a deny constraint was deleted
 * 3. LOW — minor config changes (format, metadata, suppressions, etc.)
 *
 * @param workspacePath - Absolute path to the drifted workspace
 * @param referenceWorkspacePath - Absolute path to the baseline reference workspace
 * @returns The severity classification
 */
export async function classifySeverity(
  workspacePath: string,
  referenceWorkspacePath: string,
): Promise<DriftSeverity> {
  // Check for trust tier downgrade → CRITICAL
  const tierChange = await detectTrustTierChange(workspacePath, referenceWorkspacePath);
  if (tierChange === 'downgraded') {
    return 'CRITICAL';
  }

  // Check for policy removal → HIGH
  const policyRemoved = await detectPolicyRemoval(workspacePath, referenceWorkspacePath);
  if (policyRemoved) {
    return 'HIGH';
  }

  // Check for deny constraint removal → HIGH
  const denyRemoved = await detectDenyConstraintRemoval(workspacePath, referenceWorkspacePath);
  if (denyRemoved) {
    return 'HIGH';
  }

  // Everything else is LOW
  return 'LOW';
}

/**
 * Detect trust tier changes between workspace and reference.
 * Returns 'downgraded' if the workspace tier is lower than the reference,
 * 'same' if unchanged, 'upgraded' if raised.
 */
async function detectTrustTierChange(
  workspacePath: string,
  referencePath: string,
): Promise<'downgraded' | 'upgraded' | 'same'> {
  const wsTier = await readTrustTier(workspacePath);
  const refTier = await readTrustTier(referencePath);

  // Fail-closed: if either tier is unreadable, assume worst case (downgraded)
  if (wsTier === null || refTier === null) {
    return 'downgraded';
  }

  if (wsTier < refTier) return 'downgraded';
  if (wsTier > refTier) return 'upgraded';
  return 'same';
}

/**
 * Read the trust tier from a workspace's claws.json.
 */
async function readTrustTier(workspacePath: string): Promise<number | null> {
  try {
    const raw = await readFile(join(workspacePath, 'claws.json'), 'utf-8');
    const config = JSON.parse(raw) as { trustTier?: number };
    return typeof config.trustTier === 'number' ? config.trustTier : null;
  } catch {
    return null;
  }
}

/**
 * Detect if any policy files were removed from the workspace
 * compared to the reference.
 */
async function detectPolicyRemoval(
  workspacePath: string,
  referencePath: string,
): Promise<boolean> {
  const wsPolicies = await listPolicies(workspacePath);
  const refPolicies = await listPolicies(referencePath);

  const wsSet = new Set(wsPolicies);
  for (const policy of refPolicies) {
    if (!wsSet.has(policy)) {
      return true;
    }
  }
  return false;
}

/**
 * List policy file names in a workspace's .claws/policies/ directory.
 */
async function listPolicies(workspacePath: string): Promise<string[]> {
  try {
    return await readdir(join(workspacePath, '.claws', 'policies'));
  } catch {
    return [];
  }
}

/**
 * Detect if any deny constraints were removed from policy files.
 * Compares deny rules across all policy files.
 */
async function detectDenyConstraintRemoval(
  workspacePath: string,
  referencePath: string,
): Promise<boolean> {
  const wsDenyRules = await collectDenyRules(workspacePath);
  const refDenyRules = await collectDenyRules(referencePath);

  // If reference has deny rules that workspace doesn't, it's a removal
  for (const rule of refDenyRules) {
    if (!wsDenyRules.has(rule)) {
      return true;
    }
  }
  return false;
}

/**
 * Collect all deny rules across a workspace's policy files.
 * Looks for lines matching "deny:" pattern in YAML policy files.
 */
async function collectDenyRules(workspacePath: string): Promise<Set<string>> {
  const rules = new Set<string>();
  const policiesDir = join(workspacePath, '.claws', 'policies');

  let files: string[];
  try {
    files = await readdir(policiesDir);
  } catch {
    return rules;
  }

  for (const file of files) {
    try {
      const content = await readFile(join(policiesDir, file), 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*-\s*deny:\s*(.+)/);
        if (match) {
          rules.add(match[1]!.trim());
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  return rules;
}
