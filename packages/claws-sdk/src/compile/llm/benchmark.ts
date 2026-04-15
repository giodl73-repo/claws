/**
 * Benchmark metric types and calculation functions for LLM extraction quality.
 *
 * Used by benchmark tests to compare regex-only vs LLM-enhanced extraction
 * across five governance dimensions: tools classified, deny constraints,
 * delegation edges, OBO boundaries, and risk accuracy.
 *
 * @module claws-sdk/compile/llm/benchmark
 */

import type { GovernanceAST, ParsedManifest } from '../types.js';

// -- Benchmark Metric Types -------------------------------------------------

export interface BenchmarkMetrics {
  readonly toolsClassified: number;
  readonly denyConstraints: number;
  readonly delegationEdges: number;
  readonly oboBoundaries: number;
  readonly riskAccuracy: number;
}

export interface BenchmarkDelta {
  readonly toolsClassified: number;
  readonly denyConstraints: number;
  readonly delegationEdges: number;
  readonly oboBoundaries: number;
  readonly riskAccuracy: number;
  readonly positiveCount: number;
  readonly negativeCount: number;
}

// -- Metric Calculation Functions -------------------------------------------

export function calculateMetrics(
  manifest: ParsedManifest,
  ast: GovernanceAST,
  violationCodes: readonly string[],
  expectedViolationCodes: readonly string[],
): BenchmarkMetrics {
  const toolsClassified = manifest.tools.filter(t => t.riskClass >= 1).length;
  const denyConstraints = ast.deny.reduce((sum, g) => sum + g.intents.length, 0);
  const delegationEdges = ast.delegation.reduce((sum, g) => sum + g.intents.length, 0);
  const oboBoundaries = manifest.tools.filter(t => t.oboFlag).length;

  const actualSet = new Set(violationCodes);
  const riskAccuracy = expectedViolationCodes.filter(code => actualSet.has(code)).length;

  return { toolsClassified, denyConstraints, delegationEdges, oboBoundaries, riskAccuracy };
}

export function calculateDelta(baseline: BenchmarkMetrics, enhanced: BenchmarkMetrics): BenchmarkDelta {
  const deltas = {
    toolsClassified: enhanced.toolsClassified - baseline.toolsClassified,
    denyConstraints: enhanced.denyConstraints - baseline.denyConstraints,
    delegationEdges: enhanced.delegationEdges - baseline.delegationEdges,
    oboBoundaries: enhanced.oboBoundaries - baseline.oboBoundaries,
    riskAccuracy: enhanced.riskAccuracy - baseline.riskAccuracy,
  };

  const values = Object.values(deltas);
  const positiveCount = values.filter(v => v > 0).length;
  const negativeCount = values.filter(v => v < 0).length;

  return { ...deltas, positiveCount, negativeCount };
}
