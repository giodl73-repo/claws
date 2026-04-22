/**
 * `migratePolicyArtifacts` — migrate on-disk policy artifacts at
 * `<workspace>/.openclaw/policy/` to the current schema version.
 *
 * Today the only known-upgradeable shape is `version: "0.1.0"` → `"1.0.0"`,
 * which is a simple field bump (no structural change). Future schema
 * breaks will land discrete migration functions here keyed on a
 * `from→to` registry.
 *
 * This module is the library body that `claws upgrade` dispatches to
 * when a `needs-migration` artifact is detected. Keeping it separate
 * from `src/cli-handlers/upgrade.ts` lets other consumers (SDK callers,
 * batch tooling) migrate without running the CLI.
 *
 * @module @bic/openclaw-policy/migrate
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { writeAtomic } from '@bic/openclaw-workspace/staging';

import { emitPolicyIR } from './emit/emit-policy-ir.js';
import {
  serializeAuditChain,
  type AuditChainManifest,
} from './emit/emit-audit-chain.js';
import type { PolicyIR } from './types/index.js';

export const CURRENT_POLICY_SCHEMA_VERSION = '1.0.0';

export type MigrationArtifactStatus =
  | 'migrated'
  | 'already-current'
  | 'needs-migration'
  | 'missing'
  | 'error';

export interface MigrationArtifactResult {
  readonly artifact: string;
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly status: MigrationArtifactStatus;
  readonly detail?: string;
}

export interface MigratePolicyArtifactsOptions {
  readonly workspace: string;
  /** Dry-run — inspect + report without writing to disk. */
  readonly dryRun?: boolean;
}

export interface MigratePolicyArtifactsResult {
  readonly workspace: string;
  readonly steps: readonly MigrationArtifactResult[];
  readonly migrated: number;
}

const POLICY_IR_REL = join('.openclaw', 'policy', 'policy-ir.json');
const AUDIT_MANIFEST_REL = join('.openclaw', 'policy', 'audit-manifest.json');

/**
 * Migrate policy artifacts in `workspace/.openclaw/policy/` to the current
 * schema version. Safe to call repeatedly: if everything is already at
 * current, returns a report with zero migrations.
 */
export async function migratePolicyArtifacts(
  options: MigratePolicyArtifactsOptions,
): Promise<MigratePolicyArtifactsResult> {
  const { workspace, dryRun = false } = options;
  const steps: MigrationArtifactResult[] = [];
  let migrated = 0;

  const irStep = await migratePolicyIR(join(workspace, POLICY_IR_REL), dryRun);
  steps.push(irStep);
  if (irStep.status === 'migrated') migrated++;

  const manifestStep = await migrateAuditManifest(
    join(workspace, AUDIT_MANIFEST_REL),
    dryRun,
  );
  steps.push(manifestStep);
  if (manifestStep.status === 'migrated') migrated++;

  return { workspace, steps, migrated };
}

async function migratePolicyIR(
  path: string,
  dryRun: boolean,
): Promise<MigrationArtifactResult> {
  const raw = await readFileOrUndefined(path);
  if (raw === undefined) {
    return missing('policy-ir.json');
  }
  let parsed: PolicyIR;
  try {
    parsed = JSON.parse(raw) as PolicyIR;
  } catch (err) {
    return {
      artifact: 'policy-ir.json',
      fromVersion: 'unknown',
      toVersion: CURRENT_POLICY_SCHEMA_VERSION,
      status: 'error',
      detail: `parse failed: ${(err as Error).message}`,
    };
  }
  const fromVersion = typeof parsed.version === 'string' ? parsed.version : 'unknown';
  if (fromVersion === CURRENT_POLICY_SCHEMA_VERSION) {
    return {
      artifact: 'policy-ir.json',
      fromVersion,
      toVersion: CURRENT_POLICY_SCHEMA_VERSION,
      status: 'already-current',
    };
  }
  const migrated: PolicyIR = { ...parsed, version: CURRENT_POLICY_SCHEMA_VERSION };
  if (!dryRun) {
    await writeAtomic(path, emitPolicyIR(migrated));
  }
  return {
    artifact: 'policy-ir.json',
    fromVersion,
    toVersion: CURRENT_POLICY_SCHEMA_VERSION,
    status: 'migrated',
  };
}

async function migrateAuditManifest(
  path: string,
  dryRun: boolean,
): Promise<MigrationArtifactResult> {
  const raw = await readFileOrUndefined(path);
  if (raw === undefined) {
    return missing('audit-manifest.json');
  }
  let manifest: AuditChainManifest & { version?: string };
  try {
    manifest = JSON.parse(raw) as AuditChainManifest & { version?: string };
  } catch (err) {
    return {
      artifact: 'audit-manifest.json',
      fromVersion: 'unknown',
      toVersion: CURRENT_POLICY_SCHEMA_VERSION,
      status: 'error',
      detail: `parse failed: ${(err as Error).message}`,
    };
  }
  const fromVersion = typeof manifest.version === 'string' ? manifest.version : 'unknown';
  if (fromVersion === CURRENT_POLICY_SCHEMA_VERSION) {
    return {
      artifact: 'audit-manifest.json',
      fromVersion,
      toVersion: CURRENT_POLICY_SCHEMA_VERSION,
      status: 'already-current',
    };
  }
  // Rewrite the manifest with the current version tag. We intentionally do
  // NOT re-emit a fresh chain — that would break existing downstream chain
  // references. Only the envelope `version` field changes.
  const migrated: AuditChainManifest = {
    ...manifest,
    version: CURRENT_POLICY_SCHEMA_VERSION,
  };
  if (!dryRun) {
    await writeAtomic(path, serializeAuditChain(migrated));
  }
  return {
    artifact: 'audit-manifest.json',
    fromVersion,
    toVersion: CURRENT_POLICY_SCHEMA_VERSION,
    status: 'migrated',
  };
}

function missing(artifact: string): MigrationArtifactResult {
  return {
    artifact,
    fromVersion: 'n/a',
    toVersion: CURRENT_POLICY_SCHEMA_VERSION,
    status: 'missing',
  };
}

async function readFileOrUndefined(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
}
