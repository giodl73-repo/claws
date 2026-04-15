/**
 * Fleet-level compliance reporting — aggregate governance statistics,
 * drift status, broadcast history, and compliance state across all
 * discovered workspaces into a structured report.
 *
 * @module claws-sdk/fleet/report
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { WorkspaceInfo, ScanResult } from './types.js';
import type { DriftResult, DriftStatus, FleetBaseline, FleetException } from './drift-types.js';
import type { BroadcastManifest } from './broadcast.js';
import { detectDrift } from './drift.js';
import { loadBaseline, loadAllBaselines } from './baseline.js';
import { loadExceptions } from './exception.js';
import { readSentinel } from './kill.js';

/**
 * Compliance status for a workspace against a specific framework.
 */
export type ComplianceStatus = 'pass' | 'fail' | 'missing';

/**
 * A single cell in the compliance matrix.
 */
export interface ComplianceCell {
  readonly framework: string;
  readonly status: ComplianceStatus;
}

/**
 * One row of the compliance matrix — a workspace and its framework statuses.
 */
export interface ComplianceRow {
  readonly workspace: string;
  readonly classification: string;
  readonly trustTier: number | null;
  readonly cells: readonly ComplianceCell[];
}

/**
 * 2D compliance matrix: workspace rows x framework columns.
 */
export interface ComplianceMatrix {
  readonly frameworks: readonly string[];
  readonly rows: readonly ComplianceRow[];
}

/**
 * Per-workspace detail in the fleet report.
 */
export interface WorkspaceDetail {
  readonly path: string;
  readonly classification: string;
  readonly driftStatus: DriftStatus | 'unknown';
  readonly killStatus: 'active' | 'killed' | 'unknown';
  readonly lastBroadcast: string | null;
  readonly trustTier: number | null;
  readonly policyCount: number;
}

/**
 * Summary statistics for the fleet report.
 */
export interface FleetReportSummary {
  readonly totalWorkspaces: number;
  readonly governed: number;
  readonly ungoverned: number;
  readonly misconfigured: number;
  readonly driftClean: number;
  readonly driftDrifted: number;
  readonly driftSuppressed: number;
  readonly driftNoBaseline: number;
  readonly driftUnknown: number;
  readonly killed: number;
}

/**
 * Complete fleet report returned by generateFleetReport.
 */
export interface FleetReport {
  readonly timestamp: string;
  readonly fleetRoot: string;
  readonly summary: FleetReportSummary;
  readonly workspaces: readonly WorkspaceDetail[];
  readonly complianceMatrix: ComplianceMatrix;
}

/**
 * Options for fleet report generation.
 */
export interface FleetReportOptions {
  /** Baseline name for drift detection. Defaults to first available. */
  readonly baseline?: string | undefined;
  /** Policy framework names to check. Auto-detected from policy files if omitted. */
  readonly frameworks?: readonly string[] | undefined;
}

/**
 * Read the trust tier from a workspace's claws.json.
 * Returns null if unreadable or missing.
 */
async function readTrustTier(workspacePath: string): Promise<number | null> {
  try {
    const raw = await readFile(join(workspacePath, 'claws.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    const tier = parsed?.trustTier;
    return typeof tier === 'number' ? tier : null;
  } catch {
    return null;
  }
}

/**
 * Count policy files in a workspace's .claws/policies/ directory.
 */
async function countPolicies(workspacePath: string): Promise<number> {
  try {
    const entries = await readdir(join(workspacePath, '.claws', 'policies'));
    return entries.length;
  } catch {
    return 0;
  }
}

/**
 * Read the last broadcast timestamp from the workspace's broadcast manifest.
 */
async function readLastBroadcast(workspacePath: string): Promise<string | null> {
  try {
    const manifestPath = join(workspacePath, '.claws', 'fleet', 'broadcast-manifest.json');
    const raw = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as BroadcastManifest;
    return manifest.timestamp ?? null;
  } catch {
    return null;
  }
}

/**
 * Read kill status from a workspace. Uses readSentinel() from kill.ts
 * to check for the `.claws/KILL` sentinel file.
 * Returns 'killed' if present, 'active' if governed, 'unknown' otherwise.
 */
async function readKillStatus(
  workspacePath: string,
  classification: string,
): Promise<'active' | 'killed' | 'unknown'> {
  const sentinel = await readSentinel(workspacePath);
  if (sentinel !== null) {
    return 'killed';
  }
  return classification === 'GOVERNED' ? 'active' : 'unknown';
}

/**
 * Detect policy frameworks applied to a workspace by reading policy file names.
 * Convention: policy files named like `soc2.yaml`, `iso27001.yaml`, `hipaa.yaml`
 * indicate the framework. Returns the set of framework names found.
 */
async function detectFrameworks(workspacePath: string): Promise<string[]> {
  try {
    const entries = await readdir(join(workspacePath, '.claws', 'policies'));
    return entries
      .filter((e) => e.endsWith('.yaml') || e.endsWith('.yml'))
      .map((e) => e.replace(/\.ya?ml$/, ''));
  } catch {
    return [];
  }
}

/**
 * Build the compliance matrix for all workspaces against a set of frameworks.
 */
export async function buildComplianceMatrix(
  workspaces: readonly WorkspaceInfo[],
  driftResults: ReadonlyMap<string, DriftResult>,
  frameworks: readonly string[],
): Promise<ComplianceMatrix> {
  const rows: ComplianceRow[] = [];

  for (const ws of workspaces) {
    const trustTier = await readTrustTier(ws.path);
    const wsFrameworks = await detectFrameworks(ws.path);
    const wsFrameworkSet = new Set(wsFrameworks);
    const drift = driftResults.get(ws.path);

    const cells: ComplianceCell[] = frameworks.map((fw) => {
      if (ws.classification !== 'GOVERNED') {
        return { framework: fw, status: 'missing' as const };
      }
      if (!wsFrameworkSet.has(fw)) {
        return { framework: fw, status: 'missing' as const };
      }
      // If there's drift, the framework is applied but failing
      if (drift && drift.driftDetected && !drift.suppressed) {
        return { framework: fw, status: 'fail' as const };
      }
      return { framework: fw, status: 'pass' as const };
    });

    rows.push({
      workspace: ws.path,
      classification: ws.classification,
      trustTier,
      cells,
    });
  }

  return { frameworks, rows };
}

/**
 * Collect all unique framework names across all workspaces.
 */
async function collectFrameworks(workspaces: readonly WorkspaceInfo[]): Promise<string[]> {
  const all = new Set<string>();
  for (const ws of workspaces) {
    if (ws.classification === 'GOVERNED') {
      const frameworks = await detectFrameworks(ws.path);
      for (const fw of frameworks) {
        all.add(fw);
      }
    }
  }
  return [...all].sort();
}

/**
 * Generate a fleet-wide compliance report.
 *
 * Aggregates governance statistics, drift status, broadcast history,
 * compliance matrix, and kill status across all discovered workspaces.
 *
 * @param scanResult - Result from scanFleet
 * @param fleetRoot - Absolute path to the fleet root directory
 * @param options - Report generation options
 */
export async function generateFleetReport(
  scanResult: ScanResult,
  fleetRoot: string,
  options: FleetReportOptions = {},
): Promise<FleetReport> {
  const { workspaces } = scanResult;

  // Load baseline for drift detection
  let baseline: FleetBaseline | null = null;
  if (options.baseline) {
    baseline = await loadBaseline(options.baseline, fleetRoot);
  } else {
    // Use the first available baseline
    const all = await loadAllBaselines(fleetRoot);
    const names = Object.keys(all);
    if (names.length > 0) {
      baseline = all[names[0]!]!;
    }
  }

  // Load exceptions
  const exceptions = await loadExceptions(fleetRoot);

  // Detect drift for governed workspaces
  const governedPaths = workspaces
    .filter((ws) => ws.classification === 'GOVERNED')
    .map((ws) => ws.path);

  const driftResults = governedPaths.length > 0
    ? await detectDrift(governedPaths, baseline, exceptions)
    : [];

  const driftMap = new Map<string, DriftResult>();
  for (const dr of driftResults) {
    driftMap.set(dr.workspacePath, dr);
  }

  // Build per-workspace details
  const workspaceDetails: WorkspaceDetail[] = [];
  for (const ws of workspaces) {
    const trustTier = await readTrustTier(ws.path);
    const policyCount = await countPolicies(ws.path);
    const lastBroadcast = await readLastBroadcast(ws.path);
    const killStatus = await readKillStatus(ws.path, ws.classification);

    const drift = driftMap.get(ws.path);
    const driftStatus: DriftStatus | 'unknown' = drift ? drift.status : 'unknown';

    workspaceDetails.push({
      path: ws.path,
      classification: ws.classification,
      driftStatus,
      killStatus,
      lastBroadcast,
      trustTier,
      policyCount,
    });
  }

  // Collect frameworks
  const frameworks = options.frameworks
    ? [...options.frameworks]
    : await collectFrameworks(workspaces);

  // Build compliance matrix
  const complianceMatrix = await buildComplianceMatrix(workspaces, driftMap, frameworks);

  // Compute summary
  const summary: FleetReportSummary = {
    totalWorkspaces: workspaces.length,
    governed: workspaces.filter((ws) => ws.classification === 'GOVERNED').length,
    ungoverned: workspaces.filter((ws) => ws.classification === 'UNGOVERNED').length,
    misconfigured: workspaces.filter((ws) => ws.classification === 'MISCONFIGURED').length,
    driftClean: driftResults.filter((r) => r.status === 'clean').length,
    driftDrifted: driftResults.filter((r) => r.status === 'drifted').length,
    driftSuppressed: driftResults.filter((r) => r.status === 'suppressed').length,
    driftNoBaseline: driftResults.filter((r) => r.status === 'no-baseline').length,
    driftUnknown: workspaces.length - driftResults.length,
    killed: workspaceDetails.filter((d) => d.killStatus === 'killed').length,
  };

  return {
    timestamp: new Date().toISOString(),
    fleetRoot,
    summary,
    workspaces: workspaceDetails,
    complianceMatrix,
  };
}
