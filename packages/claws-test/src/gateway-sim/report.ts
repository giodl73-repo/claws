/**
 * SimReport — human + machine readable enforcement summary.
 *
 * toString(): per-tool enforcement summary
 * toJSON(): SIEM-mappable machine-readable fields
 * diff(): regression detection between two reports
 *
 * @module @bic/claws-test/gateway-sim/report
 */

import type { TimingBaseline } from './timing.js';

/**
 * Outcome of a single tool enforcement.
 */
export type EnforcementOutcome = 'BLOCKED' | 'ALLOWED' | 'ELICITED' | 'ERROR';

/**
 * A single enforcement entry in the report.
 */
export interface EnforcementEntry {
  readonly toolName: string;
  readonly outcome: EnforcementOutcome;
  readonly ruleId: string;
  readonly riskLevel: number;
  readonly timingMs: number;
  readonly reason: string;
  readonly actor: string;
  readonly timestamp: string;
}

/**
 * Workspace metadata embedded in the JSON report.
 */
export interface WorkspaceMetadata {
  readonly workspacePath: string;
  readonly workspaceId: string;
  readonly policyVersion: string;
  readonly clawsVersion: string;
}

/**
 * SIEM-mappable JSON entry.
 */
export interface SiemEntry {
  readonly timestamp: string;
  readonly severity: number;
  readonly source: string;
  readonly action: string;
  readonly outcome: EnforcementOutcome;
  readonly actor: string;
  readonly toolName: string;
  readonly ruleId: string;
}

/**
 * JSON report shape.
 */
export interface SimReportJSON {
  readonly workspace: WorkspaceMetadata;
  readonly entries: readonly SiemEntry[];
  readonly stats: {
    readonly total: number;
    readonly blocked: number;
    readonly allowed: number;
    readonly elicited: number;
    readonly errors: number;
  };
}

/**
 * Diff between two tool enforcement outcomes.
 */
export interface ToolDiff {
  readonly toolName: string;
  readonly before: EnforcementOutcome;
  readonly after: EnforcementOutcome;
  readonly riskLevel: number;
}

/**
 * SimDiff — regression detection between two SimReports.
 */
export interface SimDiff {
  readonly regressions: readonly ToolDiff[];
  readonly improvements: readonly ToolDiff[];
  readonly unchanged: readonly string[];
}

/**
 * Severity tiers for diff results.
 */
export type DiffSeverity = 'critical' | 'warning' | 'clean';

/**
 * Check if a diff has regressions.
 */
export function hasRegressions(diff: SimDiff): boolean {
  return diff.regressions.length > 0;
}

/**
 * Compute severity of a diff: critical if any R5 regression,
 * warning for R3-R4 regressions, clean otherwise.
 */
export function diffSeverity(diff: SimDiff): DiffSeverity {
  if (diff.regressions.length === 0) return 'clean';
  const hasR5 = diff.regressions.some(r => r.riskLevel >= 5);
  if (hasR5) return 'critical';
  const hasR3R4 = diff.regressions.some(r => r.riskLevel >= 3);
  if (hasR3R4) return 'warning';
  return 'clean';
}

/**
 * Whether a transition represents a regression (enforcement weakening).
 */
function isRegression(before: EnforcementOutcome, after: EnforcementOutcome): boolean {
  const strength: Record<EnforcementOutcome, number> = {
    BLOCKED: 3,
    ELICITED: 2,
    ALLOWED: 1,
    ERROR: 0,
  };
  return strength[after] < strength[before];
}

/**
 * Whether a transition represents an improvement (enforcement tightening).
 */
function isImprovement(before: EnforcementOutcome, after: EnforcementOutcome): boolean {
  const strength: Record<EnforcementOutcome, number> = {
    BLOCKED: 3,
    ELICITED: 2,
    ALLOWED: 1,
    ERROR: 0,
  };
  return strength[after] > strength[before];
}

/**
 * SimReport — accumulated enforcement results from GatewaySim.
 */
export class SimReport {
  private readonly _entries: EnforcementEntry[] = [];
  private readonly _workspace: WorkspaceMetadata;
  private _timingBaselines: readonly TimingBaseline[] = [];

  constructor(workspace?: Partial<WorkspaceMetadata>) {
    this._workspace = {
      workspacePath: workspace?.workspacePath ?? '',
      workspaceId: workspace?.workspaceId ?? '',
      policyVersion: workspace?.policyVersion ?? '0.0.0',
      clawsVersion: workspace?.clawsVersion ?? '0.36.0',
    };
  }

  /** Add an enforcement entry to the report. */
  addEntry(entry: EnforcementEntry): void {
    this._entries.push(entry);
  }

  /** Set timing baselines from the timing collector. */
  setTimingBaselines(baselines: readonly TimingBaseline[]): void {
    this._timingBaselines = baselines;
  }

  /** Get timing baselines. */
  timingBaseline(): readonly TimingBaseline[] {
    return this._timingBaselines;
  }

  /** Get all entries (copy). */
  getEntries(): readonly EnforcementEntry[] {
    return [...this._entries];
  }

  /**
   * Human-readable enforcement summary.
   */
  toString(): string {
    if (this._entries.length === 0) return 'No enforcement entries.';

    const lines: string[] = [];
    for (const e of this._entries) {
      lines.push(
        `${e.toolName}: ${e.outcome} (${e.ruleId}, R${e.riskLevel}, ${e.timingMs.toFixed(1)}ms)${e.reason ? ` \u2014 ${e.reason}` : ''}`,
      );
    }

    const stats = this._computeStats();
    lines.push('');
    lines.push(
      `Total: ${stats.total} | Blocked: ${stats.blocked} | Allowed: ${stats.allowed} | Elicited: ${stats.elicited} | Errors: ${stats.errors}`,
    );

    if (this._timingBaselines.length > 0) {
      lines.push('');
      lines.push('Timing baselines:');
      for (const b of this._timingBaselines) {
        lines.push(`  ${b.hookName}: p50=${b.p50.toFixed(1)}ms p95=${b.p95.toFixed(1)}ms p99=${b.p99.toFixed(1)}ms (n=${b.count})`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Machine-readable JSON with SIEM-mappable fields.
   */
  toJSON(): SimReportJSON {
    const siemEntries: SiemEntry[] = this._entries.map(e => ({
      timestamp: e.timestamp,
      severity: e.riskLevel,
      source: 'claws-gateway-sim',
      action: `tool-call:${e.toolName}`,
      outcome: e.outcome,
      actor: e.actor,
      toolName: e.toolName,
      ruleId: e.ruleId,
    }));

    return {
      workspace: this._workspace,
      entries: siemEntries,
      stats: this._computeStats(),
    };
  }

  /**
   * Diff two SimReports for regression detection.
   */
  static diff(a: SimReport, b: SimReport): SimDiff {
    const aMap = new Map<string, EnforcementEntry>();
    const bMap = new Map<string, EnforcementEntry>();

    for (const entry of a._entries) {
      // Use latest entry per tool
      aMap.set(entry.toolName, entry);
    }
    for (const entry of b._entries) {
      bMap.set(entry.toolName, entry);
    }

    const regressions: ToolDiff[] = [];
    const improvements: ToolDiff[] = [];
    const unchanged: string[] = [];

    const allTools = new Set([...aMap.keys(), ...bMap.keys()]);

    for (const tool of allTools) {
      const aEntry = aMap.get(tool);
      const bEntry = bMap.get(tool);

      if (!aEntry || !bEntry) continue; // tool only in one report

      if (aEntry.outcome === bEntry.outcome) {
        unchanged.push(tool);
      } else if (isRegression(aEntry.outcome, bEntry.outcome)) {
        regressions.push({
          toolName: tool,
          before: aEntry.outcome,
          after: bEntry.outcome,
          riskLevel: Math.max(aEntry.riskLevel, bEntry.riskLevel),
        });
      } else if (isImprovement(aEntry.outcome, bEntry.outcome)) {
        improvements.push({
          toolName: tool,
          before: aEntry.outcome,
          after: bEntry.outcome,
          riskLevel: Math.max(aEntry.riskLevel, bEntry.riskLevel),
        });
      }
    }

    return { regressions, improvements, unchanged };
  }

  private _computeStats() {
    let blocked = 0;
    let allowed = 0;
    let elicited = 0;
    let errors = 0;

    for (const e of this._entries) {
      switch (e.outcome) {
        case 'BLOCKED': blocked++; break;
        case 'ALLOWED': allowed++; break;
        case 'ELICITED': elicited++; break;
        case 'ERROR': errors++; break;
      }
    }

    return {
      total: this._entries.length,
      blocked,
      allowed,
      elicited,
      errors,
    };
  }
}
