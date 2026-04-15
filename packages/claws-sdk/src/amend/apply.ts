/**
 * Amendment apply — write amendment state to `.claws/` files and `claws.json` ONLY.
 *
 * **Lossless OC fidelity**: this module NEVER modifies original OC workspace files
 * (SOUL.md, TOOLS.md, AGENTS.md, IDENTITY.md, USER.md, MEMORY.md, HEARTBEAT.md,
 * skills/SKILL.md, lobster.yaml). All changes go to `.claws/` sidecar files
 * and `claws.json` exclusively.
 *
 * After applying the amendment, triggers a recompilation pass and verifies
 * the post-state is consistent.
 *
 * @module claws-sdk/amend/apply
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { Amendment } from './validate.js';
import { appendAuditEvent, readPolicyVersion, resolveActor } from '../compliance/audit-chain.js';

/**
 * Files that must NEVER be modified by the amend pipeline.
 * These are the original OC workspace files — byte-identical before and after.
 */
const OC_PROTECTED_FILES: readonly string[] = [
  'SOUL.md',
  'TOOLS.md',
  'AGENTS.md',
  'IDENTITY.md',
  'USER.md',
  'MEMORY.md',
  'HEARTBEAT.md',
  'skills/',
  'lobster.yaml',
];

/**
 * Result of applying an amendment.
 */
export interface AmendApplyResult {
  /** Whether the apply succeeded. */
  readonly success: boolean;
  /** Files that were modified (all within .claws/ or claws.json). */
  readonly modifiedFiles: readonly string[];
  /** Error message if apply failed. */
  readonly error?: string;
}

/**
 * Compile callback type — re-runs the compile pipeline after amendment.
 * The caller provides this to avoid circular dependency with the compile module.
 */
export type RecompileFn = (workspaceRoot: string) => Promise<{ success: boolean; error?: string }>;

/**
 * Apply an amendment to the workspace sidecar files.
 *
 * Writes ONLY to `.claws/` files and `claws.json`. Never touches OC source files.
 * After writing, invokes the recompile callback to ensure GovernanceIR stays in sync.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param amendment - The validated amendment to apply
 * @param recompile - Callback to re-run the compile pipeline
 * @returns Apply result with modified file list
 */
export async function applyAmendment(
  workspaceRoot: string,
  amendment: Amendment,
  recompile: RecompileFn,
): Promise<AmendApplyResult> {
  const modifiedFiles: string[] = [];

  try {
    switch (amendment.type) {
      case 'add-skill': {
        // Write skill amendment to .claws/staging/amendments.json
        const stagingDir = join(workspaceRoot, '.claws', 'staging');
        await mkdir(stagingDir, { recursive: true });

        const amendmentsPath = join(stagingDir, 'amendments.json');
        const existing = await readAmendmentsFile(amendmentsPath);
        existing.push({
          type: amendment.type,
          target: amendment.target,
          value: amendment.value,
          appliedAt: new Date().toISOString(),
        });
        await writeFile(amendmentsPath, JSON.stringify(existing, null, 2), 'utf-8');
        modifiedFiles.push('.claws/staging/amendments.json');
        break;
      }

      case 'remove-tool': {
        // Write tool removal to .claws/staging/amendments.json
        const stagingDir = join(workspaceRoot, '.claws', 'staging');
        await mkdir(stagingDir, { recursive: true });

        const amendmentsPath = join(stagingDir, 'amendments.json');
        const existing = await readAmendmentsFile(amendmentsPath);
        existing.push({
          type: amendment.type,
          target: amendment.target,
          value: amendment.value,
          appliedAt: new Date().toISOString(),
        });
        await writeFile(amendmentsPath, JSON.stringify(existing, null, 2), 'utf-8');
        modifiedFiles.push('.claws/staging/amendments.json');
        break;
      }

      case 'update-policy': {
        // Update claws.json with the policy change
        const configPath = join(workspaceRoot, 'claws.json');
        const raw = await readFile(configPath, 'utf-8').catch(() => '{}');
        const config = JSON.parse(raw) as Record<string, unknown>;
        config[amendment.target] = amendment.value[amendment.target];
        await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
        modifiedFiles.push('claws.json');
        break;
      }
    }

    // Record AMENDMENT_APPLIED event to signed audit chain
    const policyVersion = await readPolicyVersion(workspaceRoot);
    await appendAuditEvent(workspaceRoot, {
      eventType: 'AMENDMENT_APPLIED',
      actor: resolveActor(),
      target: amendment.target,
      action: amendment.type,
      outcome: 'allow',
      ruleId: `AMEND-${amendment.type.toUpperCase()}`,
      severity: 3,
      policyVersion,
    });

    // Trigger recompilation
    const recompileResult = await recompile(workspaceRoot);
    if (!recompileResult.success) {
      return {
        success: false,
        modifiedFiles,
        error: `Recompilation failed after amendment: ${recompileResult.error ?? 'unknown error'}`,
      };
    }

    return { success: true, modifiedFiles };
  } catch (err) {
    return {
      success: false,
      modifiedFiles,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Read the amendments file, returning an empty array if it doesn't exist.
 */
async function readAmendmentsFile(path: string): Promise<AmendmentRecord[]> {
  try {
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as AmendmentRecord[] : [];
  } catch {
    return [];
  }
}

/**
 * A persisted amendment record in the staging file.
 */
interface AmendmentRecord {
  readonly type: string;
  readonly target: string;
  readonly value: Record<string, unknown>;
  readonly appliedAt: string;
}

export { OC_PROTECTED_FILES };
