/**
 * Auto-analyze — run governance analysis after incremental parse, diff violations.
 *
 * After each incremental parse, runs the full analyze pass (all registered
 * governance rules) against the updated workspace state. Compares the new
 * violation set against the previous snapshot to identify new, resolved,
 * and unchanged violations. Emits a ViolationDiff so the CLI can display
 * meaningful deltas rather than a full re-dump.
 *
 * @module claws-sdk/watch/auto-analyze
 */

import type { ParseResult } from '../compile/types.js';
import type { GovAnalysis, GovViolation } from '../ir/gov-analysis.js';
import { extractAllIntents } from '../compile/intent/index.js';
import { buildGovernanceAST } from '../compile/governance-ast.js';
import { extract } from '../compile/extract.js';
import { buildCapabilityManifest } from '../compile/manifest.js';
import { analyze } from '../compile/analyze.js';
import { createDefaultRegistry } from '../governance/index.js';

/**
 * A fingerprint for a single violation, used for diffing.
 * Combines ruleId + target + message to identify unique violations.
 */
function violationKey(v: GovViolation): string {
  return `${v.ruleId}::${v.target}::${v.message}`;
}

/**
 * The result of diffing two violation sets.
 */
export interface ViolationDiff {
  /** Violations present in new set but not in previous. */
  readonly added: readonly GovViolation[];
  /** Violations present in previous set but not in new. */
  readonly resolved: readonly GovViolation[];
  /** Violations present in both sets (unchanged). */
  readonly unchanged: readonly GovViolation[];
  /** Total violation count in the new set. */
  readonly totalCount: number;
  /** Delta from previous count (positive = more violations). */
  readonly delta: number;
}

/**
 * Diff two violation arrays by fingerprint.
 */
export function diffViolations(
  previous: readonly GovViolation[],
  current: readonly GovViolation[],
): ViolationDiff {
  const prevKeys = new Set(previous.map(violationKey));
  const currKeys = new Set(current.map(violationKey));

  const added = current.filter(v => !prevKeys.has(violationKey(v)));
  const resolved = previous.filter(v => !currKeys.has(violationKey(v)));
  const unchanged = current.filter(v => prevKeys.has(violationKey(v)));

  return {
    added,
    resolved,
    unchanged,
    totalCount: current.length,
    delta: current.length - previous.length,
  };
}

/**
 * Result of an auto-analyze cycle.
 */
export interface AutoAnalyzeResult {
  /** The full governance analysis result. */
  readonly analysis: GovAnalysis;
  /** Diff against the previous violation set. */
  readonly diff: ViolationDiff;
  /** Duration of the analyze pass in milliseconds. */
  readonly durationMs: number;
}

/**
 * Auto-analyzer — runs governance analysis after incremental parse and tracks
 * violation state across runs.
 */
export class AutoAnalyzer {
  private previousViolations: readonly GovViolation[] = [];

  /**
   * Run governance analysis on the parse result and diff against previous state.
   *
   * Pipeline: ParseResult → extractAllIntents → buildGovernanceAST →
   * extract → buildCapabilityManifest → createDefaultRegistry → analyze
   *
   * @param parseResult - The latest incremental parse result
   * @returns AutoAnalyzeResult with analysis, diff, and timing
   */
  run(parseResult: ParseResult): AutoAnalyzeResult {
    const start = Date.now();

    const intentResults = extractAllIntents(parseResult);
    const ast = buildGovernanceAST(intentResults);
    const parsed = extract(ast);
    const capManifest = buildCapabilityManifest(parsed);
    const registry = createDefaultRegistry(capManifest);
    const analysis = analyze(capManifest, registry);

    const diff = diffViolations(this.previousViolations, analysis.violations);
    this.previousViolations = analysis.violations;

    return {
      analysis,
      diff,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Reset the previous violation state (e.g., on watcher restart).
   */
  reset(): void {
    this.previousViolations = [];
  }

  /**
   * Get the current violation count from the last run.
   */
  get violationCount(): number {
    return this.previousViolations.length;
  }
}
