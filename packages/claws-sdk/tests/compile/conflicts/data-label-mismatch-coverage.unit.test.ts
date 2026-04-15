/**
 * L0: DATA-LABEL-MISMATCH conflict detector branch coverage.
 *
 * Covers:
 * - Empty manifest agents/dataLabels (early return)
 * - No sensitive labels (early return)
 * - Delegation reachability with data ceiling
 * - Missing data ceiling (undefined → Warning)
 */

import { describe, it, expect } from 'vitest';
import { detectDataLabelMismatch } from '../../../src/compile/conflicts/data-label-mismatch.js';
import type { GovernanceAST, ParsedManifest, DataSensitivity } from '../../../src/compile/types.js';

function emptyAST(): GovernanceAST {
  return {
    deny: [], tool: [], context: [], permission: [], memory: [], obo: [],
    schedule: [], data: [], agents: [], output: [], elicit: [], input: [],
    user: [], activity: [], workflow: [], supply: [], boundary: [], skill: [],
  };
}

function makeManifest(overrides: Partial<ParsedManifest> = {}): ParsedManifest {
  return {
    agents: [],
    dataLabels: [],
    ...overrides,
  } as ParsedManifest;
}

describe('detectDataLabelMismatch', () => {
  it('returns empty for no data labels', () => {
    const result = detectDataLabelMismatch(emptyAST(), makeManifest({
      agents: [{ name: 'a', source: 'AGENTS.md', line: 1, tools: ['Bash'], delegatesTo: [] }],
    }));
    expect(result).toEqual([]);
  });

  it('returns empty for no agents', () => {
    const result = detectDataLabelMismatch(emptyAST(), makeManifest({
      dataLabels: [{ label: 'pii', sensitivity: 'restricted' as DataSensitivity, source: 'MEMORY.md', line: 1 }],
    }));
    expect(result).toEqual([]);
  });

  it('returns empty for only public/internal labels (non-sensitive)', () => {
    const result = detectDataLabelMismatch(emptyAST(), makeManifest({
      agents: [{ name: 'a', source: 'AGENTS.md', line: 1, tools: ['Bash'], delegatesTo: [] }],
      dataLabels: [
        { label: 'pub', sensitivity: 'public' as DataSensitivity, source: 'MEMORY.md', line: 1 },
        { label: 'int', sensitivity: 'internal' as DataSensitivity, source: 'MEMORY.md', line: 2 },
      ],
    }));
    expect(result).toEqual([]);
  });

  it('detects conflict when delegation chain exposes sensitive data', () => {
    const ast = emptyAST();
    ast.memory = [{
      source: 'MEMORY.md',
      intents: [
        { sensitivity: 'restricted' as DataSensitivity, label: 'pii', line: 1, rawLine: 'pii: restricted' },
      ],
    }];

    const manifest = makeManifest({
      agents: [
        { name: 'coordinator', source: 'AGENTS.md', line: 1, tools: ['Read'], delegatesTo: ['worker'] },
        { name: 'worker', source: 'AGENTS.md', line: 5, tools: ['Read'], delegatesTo: [] },
      ],
      dataLabels: [
        { label: 'pii', sensitivity: 'restricted' as DataSensitivity, source: 'MEMORY.md', line: 1 },
      ],
    });

    const result = detectDataLabelMismatch(ast, manifest);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.code).toBe('CLAWS-C004');
  });

  it('returns Warning severity when data ceiling is undefined', () => {
    const ast = emptyAST();
    // No memory intents → ceiling is undefined

    const manifest = makeManifest({
      agents: [
        { name: 'coordinator', source: 'AGENTS.md', line: 1, tools: [], delegatesTo: ['worker'] },
        { name: 'worker', source: 'AGENTS.md', line: 5, tools: ['Bash'], delegatesTo: [] },
      ],
      dataLabels: [
        { label: 'pii', sensitivity: 'confidential' as DataSensitivity, source: 'MEMORY.md', line: 1 },
      ],
    });

    const result = detectDataLabelMismatch(ast, manifest);
    const warnings = result.filter(r => r.severity === 'Warning');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]!.explanation).toContain('data ceiling unknown');
  });

  it('deduplicates entries by locationA/locationB lines', () => {
    const ast = emptyAST();
    ast.memory = [{
      source: 'MEMORY.md',
      intents: [
        { sensitivity: 'restricted' as DataSensitivity, label: 'pii', line: 1, rawLine: 'pii' },
        { sensitivity: 'restricted' as DataSensitivity, label: 'ssn', line: 1, rawLine: 'ssn' },
      ],
    }];

    const manifest = makeManifest({
      agents: [
        { name: 'coordinator', source: 'AGENTS.md', line: 1, tools: [], delegatesTo: ['worker'] },
        { name: 'worker', source: 'AGENTS.md', line: 5, tools: ['Read'], delegatesTo: [] },
      ],
      dataLabels: [
        { label: 'pii', sensitivity: 'restricted' as DataSensitivity, source: 'MEMORY.md', line: 1 },
        { label: 'ssn', sensitivity: 'restricted' as DataSensitivity, source: 'MEMORY.md', line: 1 },
      ],
    });

    const result = detectDataLabelMismatch(ast, manifest);
    // Should deduplicate since both labels have the same line:line pair
    const uniqueKeys = new Set(result.map(r => `${r.locationA.line}:${r.locationB.line}`));
    expect(uniqueKeys.size).toBe(result.length);
  });
});
