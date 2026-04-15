/**
 * Snapshot diff — governance-aware semantic diffing between two named snapshots.
 *
 * Loads pre-compiled GovernanceIR from each snapshot (no recompilation),
 * compares the resulting governance posture, and produces a structured
 * SnapshotDiff with categorized changes: tool risk shifts, policy changes,
 * violations added/resolved, and trust tier shifts.
 *
 * @module claws-sdk/snapshot/diff
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GovernanceIR } from '../ir/governance-ir.js';
import type { ToolCapability, ToolRiskLevel } from '../ir/capability-manifest.js';
import type { GovViolation } from '../ir/gov-analysis.js';
import type { MechanicalIntent } from '../ir/mechanical-intent.js';
import type { DelegationEntry } from '../ir/governance-ir.js';
import { snapshotDir, readManifest } from './storage.js';
import { verifyManifest } from './integrity.js';
import { TamperError } from './integrity.js';

// ── Risk level numeric mapping ────────────────────────────────────────

const RISK_ORDER: Record<ToolRiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// ── Change categories ─────────────────────────────────────────────────

/** Direction of a governance change. */
export type ChangeDirection = 'regression' | 'improvement' | 'neutral';

/** A tool risk level change between snapshots. */
export interface ToolRiskChange {
  readonly toolName: string;
  readonly oldRisk: ToolRiskLevel;
  readonly newRisk: ToolRiskLevel;
  readonly direction: ChangeDirection;
}

/** A policy (enforcement rule) that was added or removed. */
export interface PolicyChange {
  readonly ruleId: string;
  readonly mechanism: string;
  readonly target: string;
  readonly action: 'added' | 'removed';
  readonly direction: ChangeDirection;
}

/** A violation that appeared or was resolved. */
export interface ViolationChange {
  readonly ruleId: string;
  readonly target: string;
  readonly message: string;
  readonly action: 'new' | 'resolved';
  readonly direction: ChangeDirection;
}

/** A trust tier shift (tool count or intent change). */
export interface TrustTierShift {
  readonly toolName: string;
  readonly field: string;
  readonly oldValue: string;
  readonly newValue: string;
  readonly direction: ChangeDirection;
}

/** Summary statistics for a SnapshotDiff. */
export interface DiffSummary {
  readonly totalChanges: number;
  readonly regressions: number;
  readonly improvements: number;
  readonly neutral: number;
}

/** The complete structured diff between two snapshots. */
export interface SnapshotDiff {
  readonly baseName: string;
  readonly targetName: string;
  readonly baseTimestamp: string;
  readonly targetTimestamp: string;
  readonly toolRiskChanges: readonly ToolRiskChange[];
  readonly policyChanges: readonly PolicyChange[];
  readonly violationChanges: readonly ViolationChange[];
  readonly trustTierShifts: readonly TrustTierShift[];
  readonly summary: DiffSummary;
  readonly empty: boolean;
}

// ── GovernanceIR loading ──────────────────────────────────────────────

/**
 * Load the pre-compiled GovernanceIR from a snapshot.
 *
 * Reads directly from the snapshot's files/ directory — no recompilation.
 * Returns null if the snapshot does not contain a governance-ir.json.
 */
async function loadGovernanceIR(
  workspaceRoot: string,
  name: string,
): Promise<GovernanceIR | null> {
  const irPath = join(
    snapshotDir(workspaceRoot, name),
    'files',
    '.claws/compiled/governance-ir.json',
  );
  try {
    const content = await readFile(irPath, 'utf-8');
    return JSON.parse(content) as GovernanceIR;
  } catch {
    return null;
  }
}

// ── Diff logic ────────────────────────────────────────────────────────

function diffToolRisks(
  baseTools: readonly ToolCapability[],
  targetTools: readonly ToolCapability[],
): ToolRiskChange[] {
  const changes: ToolRiskChange[] = [];
  const baseMap = new Map(baseTools.map((t) => [t.name, t]));
  const targetMap = new Map(targetTools.map((t) => [t.name, t]));

  // Check tools present in both or only in target
  for (const [name, target] of targetMap) {
    const base = baseMap.get(name);
    if (base && base.riskLevel !== target.riskLevel) {
      const baseOrder = RISK_ORDER[base.riskLevel];
      const targetOrder = RISK_ORDER[target.riskLevel];
      changes.push({
        toolName: name,
        oldRisk: base.riskLevel,
        newRisk: target.riskLevel,
        direction: targetOrder > baseOrder ? 'regression' : 'improvement',
      });
    }
  }

  return changes;
}

function diffPolicies(
  baseDelegation: readonly DelegationEntry[],
  targetDelegation: readonly DelegationEntry[],
): PolicyChange[] {
  const changes: PolicyChange[] = [];
  const baseSet = new Set(baseDelegation.map((d) => d.ruleId));
  const targetSet = new Set(targetDelegation.map((d) => d.ruleId));
  const baseMap = new Map(baseDelegation.map((d) => [d.ruleId, d]));
  const targetMap = new Map(targetDelegation.map((d) => [d.ruleId, d]));

  // Added policies
  for (const ruleId of targetSet) {
    if (!baseSet.has(ruleId)) {
      const entry = targetMap.get(ruleId)!;
      changes.push({
        ruleId,
        mechanism: entry.mechanism,
        target: entry.target,
        action: 'added',
        direction: 'neutral',
      });
    }
  }

  // Removed policies
  for (const ruleId of baseSet) {
    if (!targetSet.has(ruleId)) {
      const entry = baseMap.get(ruleId)!;
      changes.push({
        ruleId,
        mechanism: entry.mechanism,
        target: entry.target,
        action: 'removed',
        direction: 'neutral',
      });
    }
  }

  return changes;
}

function violationKey(v: GovViolation): string {
  return `${v.ruleId}::${v.target}`;
}

function diffViolations(
  baseViolations: readonly GovViolation[],
  targetViolations: readonly GovViolation[],
): ViolationChange[] {
  const changes: ViolationChange[] = [];
  const baseKeys = new Set(baseViolations.map(violationKey));
  const targetKeys = new Set(targetViolations.map(violationKey));
  const baseMap = new Map(baseViolations.map((v) => [violationKey(v), v]));
  const targetMap = new Map(targetViolations.map((v) => [violationKey(v), v]));

  // New violations
  for (const key of targetKeys) {
    if (!baseKeys.has(key)) {
      const v = targetMap.get(key)!;
      changes.push({
        ruleId: v.ruleId,
        target: v.target,
        message: v.message,
        action: 'new',
        direction: 'regression',
      });
    }
  }

  // Resolved violations
  for (const key of baseKeys) {
    if (!targetKeys.has(key)) {
      const v = baseMap.get(key)!;
      changes.push({
        ruleId: v.ruleId,
        target: v.target,
        message: v.message,
        action: 'resolved',
        direction: 'improvement',
      });
    }
  }

  return changes;
}

function diffTrustTiers(
  baseIR: GovernanceIR,
  targetIR: GovernanceIR,
): TrustTierShift[] {
  const shifts: TrustTierShift[] = [];
  const baseTools = new Map(baseIR.capabilities.tools.map((t) => [t.name, t]));
  const targetTools = new Map(targetIR.capabilities.tools.map((t) => [t.name, t]));

  for (const [name, target] of targetTools) {
    const base = baseTools.get(name);
    if (!base) continue;

    // Classification changes
    if (base.classification !== target.classification) {
      shifts.push({
        toolName: name,
        field: 'classification',
        oldValue: base.classification,
        newValue: target.classification,
        direction: 'neutral',
      });
    }

    // OBO flag changes
    if (base.oboFlag !== target.oboFlag) {
      shifts.push({
        toolName: name,
        field: 'oboFlag',
        oldValue: String(base.oboFlag),
        newValue: String(target.oboFlag),
        direction: target.oboFlag ? 'regression' : 'improvement',
      });
    }
  }

  // Enforcement plan changes
  const basePlan = baseIR.analysis.enforcementPlan;
  const targetPlan = targetIR.analysis.enforcementPlan;

  const baseBlocked = new Set(basePlan.blockedTools);
  const targetBlocked = new Set(targetPlan.blockedTools);

  for (const tool of targetBlocked) {
    if (!baseBlocked.has(tool)) {
      shifts.push({
        toolName: tool,
        field: 'blockedTools',
        oldValue: 'unblocked',
        newValue: 'blocked',
        direction: 'regression',
      });
    }
  }

  for (const tool of baseBlocked) {
    if (!targetBlocked.has(tool)) {
      shifts.push({
        toolName: tool,
        field: 'blockedTools',
        oldValue: 'blocked',
        newValue: 'unblocked',
        direction: 'improvement',
      });
    }
  }

  return shifts;
}

function computeSummary(diff: {
  toolRiskChanges: readonly ToolRiskChange[];
  policyChanges: readonly PolicyChange[];
  violationChanges: readonly ViolationChange[];
  trustTierShifts: readonly TrustTierShift[];
}): DiffSummary {
  const all: ChangeDirection[] = [
    ...diff.toolRiskChanges.map((c) => c.direction),
    ...diff.policyChanges.map((c) => c.direction),
    ...diff.violationChanges.map((c) => c.direction),
    ...diff.trustTierShifts.map((c) => c.direction),
  ];

  return {
    totalChanges: all.length,
    regressions: all.filter((d) => d === 'regression').length,
    improvements: all.filter((d) => d === 'improvement').length,
    neutral: all.filter((d) => d === 'neutral').length,
  };
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Compute a governance-aware semantic diff between two named snapshots.
 *
 * Loads pre-compiled GovernanceIR from each snapshot (no recompilation).
 * Compares tool risks, policies, violations, and trust tier fields.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param baseName - Name of the base (older) snapshot
 * @param targetName - Name of the target (newer) snapshot
 * @returns SnapshotDiff with categorized changes
 * @throws {Error} if either snapshot does not exist or lacks governance-ir.json
 * @throws {TamperError} if either snapshot fails integrity verification
 */
export async function diff(
  workspaceRoot: string,
  baseName: string,
  targetName: string,
): Promise<SnapshotDiff> {
  // Verify both snapshots exist and are intact
  for (const name of [baseName, targetName]) {
    const manifest = await readManifest(workspaceRoot, name);
    const snapDir = snapshotDir(workspaceRoot, name);
    const verification = await verifyManifest(manifest, snapDir);
    if (!verification.valid) {
      throw new TamperError(verification);
    }
  }

  // Load GovernanceIR from both snapshots
  const baseIR = await loadGovernanceIR(workspaceRoot, baseName);
  const targetIR = await loadGovernanceIR(workspaceRoot, targetName);

  if (!baseIR) {
    throw new Error(`Snapshot "${baseName}" does not contain governance-ir.json`);
  }
  if (!targetIR) {
    throw new Error(`Snapshot "${targetName}" does not contain governance-ir.json`);
  }

  // Read timestamps from manifests
  const baseManifest = await readManifest(workspaceRoot, baseName);
  const targetManifest = await readManifest(workspaceRoot, targetName);

  // Compute diffs
  const toolRiskChanges = diffToolRisks(
    baseIR.capabilities.tools,
    targetIR.capabilities.tools,
  );
  const policyChanges = diffPolicies(
    baseIR.delegationMap,
    targetIR.delegationMap,
  );
  const violationChanges = diffViolations(
    baseIR.analysis.violations,
    targetIR.analysis.violations,
  );
  const trustTierShifts = diffTrustTiers(baseIR, targetIR);

  const partial = { toolRiskChanges, policyChanges, violationChanges, trustTierShifts };
  const summary = computeSummary(partial);

  return {
    baseName,
    targetName,
    baseTimestamp: baseManifest.timestamp,
    targetTimestamp: targetManifest.timestamp,
    toolRiskChanges,
    policyChanges,
    violationChanges,
    trustTierShifts,
    summary,
    empty: summary.totalChanges === 0,
  };
}
