/**
 * L0: host-approval-policies.json performance — pre-indexed O(1) lookup.
 *
 * 2 unit tests:
 * 1. 200+ entry resolution completes in <5ms
 * 2. O(1) lookup verification — time is constant regardless of index size
 */

import { describe, it, expect } from 'vitest';
import {
  emitHostApprovalPolicies,
  resolvePolicy,
} from '../../src/emit/emit-host-approval-policies.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { ToolCapability, ToolRiskLevel } from '../../src/ir/capability-manifest.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

/**
 * Create a GovernanceIR with N tools across multiple MCP servers.
 */
function createLargeIR(toolCount: number): GovernanceIR {
  const base = minimalGovernanceIR();
  const riskLevels: ToolRiskLevel[] = ['low', 'medium', 'high', 'critical'];
  const tools: ToolCapability[] = [];

  for (let i = 0; i < toolCount; i++) {
    const serverIndex = Math.floor(i / 20); // 20 tools per server
    tools.push({
      name: `tool-${i}`,
      description: `Test tool ${i}`,
      riskLevel: riskLevels[i % riskLevels.length]!,
      oboFlag: false,
      classification: 'custom',
      mcpServer: `server-${serverIndex}`,
    });
  }

  return {
    ...base,
    capabilities: {
      ...base.capabilities,
      tools,
    },
  };
}

describe('emitHostApprovalPolicies performance', () => {
  it('200+ entry resolution completes in <5ms', () => {
    const ir = createLargeIR(250);
    const result = emitHostApprovalPolicies(ir);

    // Verify we have 250 policies
    const doc = JSON.parse(result.content);
    expect(doc.policies).toHaveLength(250);

    // Time 250 lookups using the pre-indexed map
    const start = performance.now();
    for (let i = 0; i < 250; i++) {
      const server = `server-${Math.floor(i / 20)}`;
      resolvePolicy(result.policyIndex, server, `tool-${i}`);
    }
    const elapsed = performance.now() - start;

    // All 250 resolutions must complete in <5ms
    expect(elapsed).toBeLessThan(5);
  });

  it('O(1) lookup — time does not scale with index size', () => {
    // Create two indexes: 50 entries vs 500 entries
    const smallIR = createLargeIR(50);
    const largeIR = createLargeIR(500);

    const smallResult = emitHostApprovalPolicies(smallIR);
    const largeResult = emitHostApprovalPolicies(largeIR);

    // Warm up
    resolvePolicy(smallResult.policyIndex, 'server-0', 'tool-0');
    resolvePolicy(largeResult.policyIndex, 'server-0', 'tool-0');

    // Time 1000 lookups on each
    const iterations = 1000;

    const startSmall = performance.now();
    for (let i = 0; i < iterations; i++) {
      resolvePolicy(smallResult.policyIndex, 'server-0', 'tool-0');
    }
    const smallTime = performance.now() - startSmall;

    const startLarge = performance.now();
    for (let i = 0; i < iterations; i++) {
      resolvePolicy(largeResult.policyIndex, 'server-0', 'tool-0');
    }
    const largeTime = performance.now() - startLarge;

    // O(1) means large index lookup should NOT be significantly slower.
    // Allow 3x tolerance for system jitter.
    expect(largeTime).toBeLessThan(smallTime * 3 + 1);
  });
});
