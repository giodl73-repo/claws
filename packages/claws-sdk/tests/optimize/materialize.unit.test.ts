/**
 * DataFrame materialization unit tests.
 *
 * L0: DataFrame to const serialization (1 test)
 */

import { describe, it, expect } from 'vitest';
import {
  materializeDataFrames,
  serializeDataFrame,
} from '../../src/optimize/materialize.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

describe('materializeDataFrames', () => {
  it('materializes tool classifications to const-ready entries', () => {
    const ir = minimalGovernanceIR();
    const result = materializeDataFrames(ir);

    // Should have entries for all 5 tools
    expect(result.toolClassifications.name).toBe('toolClassifications');
    expect(result.toolClassifications.entries).toHaveLength(5);

    // Verify first tool entry
    const readFile = result.toolClassifications.entries.find(
      (e) => e.key === 'read_file',
    );
    expect(readFile).toBeDefined();
    expect(readFile!.value).toEqual({
      riskLevel: 'low',
      classification: 'filesystem',
      oboFlag: false,
    });

    // Verify OBO tool entry
    const sendEmail = result.toolClassifications.entries.find(
      (e) => e.key === 'send_email',
    );
    expect(sendEmail).toBeDefined();
    expect(sendEmail!.value).toEqual({
      riskLevel: 'critical',
      classification: 'communication',
      oboFlag: true,
    });
  });

  it('materializes delegation map to const-ready entries', () => {
    const ir = minimalGovernanceIR();
    const result = materializeDataFrames(ir);

    expect(result.delegationMap.name).toBe('delegationMap');
    expect(result.delegationMap.entries).toHaveLength(3);

    const sec001 = result.delegationMap.entries.find(
      (e) => e.key === 'SEC-001',
    );
    expect(sec001).toBeDefined();
    expect(sec001!.value).toEqual({
      mechanism: 'hook',
      target: 'before_tool_call',
    });
  });

  it('reports correct total entry count', () => {
    const ir = minimalGovernanceIR();
    const result = materializeDataFrames(ir);

    // 5 tools + 3 delegation entries = 8 total
    expect(result.totalEntries).toBe(8);
  });

  it('handles empty capabilities gracefully', () => {
    const ir = minimalGovernanceIR();
    const emptyIR = {
      ...ir,
      capabilities: {
        tools: [],
        skills: [],
        agents: [],
        workflows: [],
      },
      delegationMap: [],
    };

    const result = materializeDataFrames(emptyIR);
    expect(result.toolClassifications.entries).toHaveLength(0);
    expect(result.delegationMap.entries).toHaveLength(0);
    expect(result.totalEntries).toBe(0);
  });
});

describe('serializeDataFrame', () => {
  it('serializes a DataFrame to a TypeScript const declaration', () => {
    const ir = minimalGovernanceIR();
    const result = materializeDataFrames(ir);
    const output = serializeDataFrame(result.toolClassifications);

    // Should be valid TypeScript const declaration
    expect(output).toContain('export const toolClassifications = {');
    expect(output).toContain('"read_file"');
    expect(output).toContain('"send_email"');
    expect(output).toContain('} as const;');
    expect(output).toContain('"riskLevel"');
  });

  it('serializes empty DataFrame correctly', () => {
    const output = serializeDataFrame({
      name: 'empty',
      entries: [],
    });

    expect(output).toBe('export const empty = {\n\n} as const;');
  });
});
