/**
 * L0: Benchmark metric calculation unit tests.
 *
 * 4 L0 unit tests verifying the pure metric calculation functions:
 *   1. calculateMetrics counts tools, deny, delegation, OBO, risk accuracy
 *   2. calculateDelta computes positive/negative counts
 *   3. calculateDelta detects regressions (negative delta)
 *   4. calculateMetrics handles empty workspace (zero across all metrics)
 *
 * @module claws-sdk/tests/benchmark/llm-quality.unit
 */

import { describe, it, expect } from 'vitest';

import type { GovernanceAST, ParsedManifest } from '../../src/compile/types.js';
import {
  calculateMetrics,
  calculateDelta,
  type BenchmarkMetrics,
} from '../../src/compile/llm/benchmark.js';

// Re-export for downstream test consumers
export {
  calculateMetrics,
  calculateDelta,
  type BenchmarkMetrics,
} from '../../src/compile/llm/benchmark.js';
export type { BenchmarkDelta } from '../../src/compile/llm/benchmark.js';

// -- L0 Unit Tests ----------------------------------------------------------

describe('L0: benchmark metric calculations', () => {
  it('calculateMetrics counts tools, deny, delegation, OBO, and risk accuracy', () => {
    const manifest: ParsedManifest = {
      tools: [
        { name: 'a', normalizedName: 'a', riskClass: 1, oboFlag: false, capabilities: [], source: 'TOOLS.md', line: 1, denyConstraints: [] },
        { name: 'b', normalizedName: 'b', riskClass: 5, oboFlag: true, capabilities: [], source: 'TOOLS.md', line: 2, denyConstraints: [] },
        { name: 'c', normalizedName: 'c', riskClass: 3, oboFlag: false, capabilities: [], source: 'TOOLS.md', line: 3, denyConstraints: [] },
      ],
      skills: [],
      agents: [],
      dataLabels: [],
      diagnostics: [],
    };

    const ast: GovernanceAST = {
      deny: [{
        source: 'SOUL.md',
        intents: [{
          keyword: 'never', confidence: 0.95, scope: 'tool',
          pattern: 'bash', rawLine: 'Never use Bash', line: 1,
          autoExtracted: true, intentKind: 'deny',
        }],
      }],
      tool: [],
      delegation: [{
        source: 'AGENTS.md',
        intents: [{ from: 'a', to: 'b', tools: ['x'], line: 1 }],
      }],
      identity: [],
      authority: [],
      memory: [],
      schedule: [],
      skill: [],
      workflow: [],
      crossReferences: [],
      diagnostics: [],
    };

    const metrics = calculateMetrics(
      manifest, ast,
      ['DENY-TOOL-CONFLICT'],
      ['DENY-TOOL-CONFLICT', 'TRUST-TIER-EXCEEDED'],
    );

    expect(metrics.toolsClassified).toBe(3);
    expect(metrics.denyConstraints).toBe(1);
    expect(metrics.delegationEdges).toBe(1);
    expect(metrics.oboBoundaries).toBe(1);
    expect(metrics.riskAccuracy).toBe(1);
  });

  it('calculateDelta computes positive/negative counts correctly', () => {
    const baseline: BenchmarkMetrics = {
      toolsClassified: 10,
      denyConstraints: 3,
      delegationEdges: 2,
      oboBoundaries: 1,
      riskAccuracy: 4,
    };

    const enhanced: BenchmarkMetrics = {
      toolsClassified: 12,
      denyConstraints: 5,
      delegationEdges: 2,
      oboBoundaries: 2,
      riskAccuracy: 4,
    };

    const delta = calculateDelta(baseline, enhanced);
    expect(delta.toolsClassified).toBe(2);
    expect(delta.denyConstraints).toBe(2);
    expect(delta.delegationEdges).toBe(0);
    expect(delta.oboBoundaries).toBe(1);
    expect(delta.riskAccuracy).toBe(0);
    expect(delta.positiveCount).toBe(3);
    expect(delta.negativeCount).toBe(0);
  });

  it('calculateDelta detects regressions (negative delta)', () => {
    const baseline: BenchmarkMetrics = {
      toolsClassified: 10,
      denyConstraints: 5,
      delegationEdges: 3,
      oboBoundaries: 2,
      riskAccuracy: 7,
    };

    const regressed: BenchmarkMetrics = {
      toolsClassified: 10,
      denyConstraints: 4,
      delegationEdges: 3,
      oboBoundaries: 2,
      riskAccuracy: 7,
    };

    const delta = calculateDelta(baseline, regressed);
    expect(delta.negativeCount).toBe(1);
    expect(delta.positiveCount).toBe(0);
    expect(delta.denyConstraints).toBe(-1);
  });

  it('calculateMetrics handles empty workspace (zero across all metrics)', () => {
    const emptyManifest: ParsedManifest = {
      tools: [],
      skills: [],
      agents: [],
      dataLabels: [],
      diagnostics: [],
    };

    const emptyAst: GovernanceAST = {
      deny: [],
      tool: [],
      delegation: [],
      identity: [],
      authority: [],
      memory: [],
      schedule: [],
      skill: [],
      workflow: [],
      crossReferences: [],
      diagnostics: [],
    };

    const metrics = calculateMetrics(emptyManifest, emptyAst, [], ['DENY-TOOL-CONFLICT']);
    expect(metrics.toolsClassified).toBe(0);
    expect(metrics.denyConstraints).toBe(0);
    expect(metrics.delegationEdges).toBe(0);
    expect(metrics.oboBoundaries).toBe(0);
    expect(metrics.riskAccuracy).toBe(0);
  });
});
