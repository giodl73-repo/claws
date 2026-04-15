/**
 * GatewaySim L1 integration tests — 4 tests:
 * 1. Real compiled plugin + matchers
 * 2. Before-claws baseline comparison: all tools allowed
 * 3. Timing under 50ms per hook
 * 4. Degraded integration: real compiled plugin, no host, R5 blocked
 *
 * These tests use a realistic plugin that mirrors the emit-plugin.ts
 * generated output structure, loaded via GatewaySim.fromHooks()
 * (avoiding filesystem for L1 tests).
 */

import { describe, it, expect } from 'vitest';
import {
  GatewaySim,
  MockGovernanceHost,
  SimReport,
  hasRegressions,
} from '@bic/claws-test';
import { registerMatchers } from '@bic/claws-test/matchers';
import type { PluginHooks } from '@bic/claws-test/gateway-sim/plugin-loader';

// Register custom matchers
registerMatchers();

// ── Realistic Plugin Hooks ──────────────────────────────────────────────

/**
 * Simulates the generated plugin's beforeToolCall behavior:
 * - Uses a pre-computed risk map
 * - Consults governance host
 * - Fail-open for R1-R2, fail-closed for R3+
 */
function createRealisticPlugin(
  riskEntries: [string, number][],
): PluginHooks {
  const riskMap = new Map(riskEntries);

  return {
    beforeToolCall: async (
      toolName: string | null | undefined,
      context: Record<string, unknown>,
    ) => {
      const host = context['__governanceHost'] as MockGovernanceHost | undefined;

      if (toolName == null) {
        return { allowed: false, blockReason: 'Tool name is null or undefined' };
      }

      const riskLevel = riskMap.get(toolName) ?? 5;

      if (!host) {
        if (riskLevel <= 2) return { allowed: true, blockReason: null };
        return { allowed: false, blockReason: 'governance host not configured' };
      }

      try {
        const result = await host.evaluatePolicy(toolName, context);
        host.emitAuditEvent({ event: 'policy-eval', toolName, allowed: result.allowed });
        return result;
      } catch {
        if (riskLevel <= 2) return { allowed: true, blockReason: null };
        return { allowed: false, blockReason: `Governance error — R${riskLevel} fail-closed` };
      }
    },
    afterToolCall: async (
      toolName: string,
      _result: unknown,
      context: Record<string, unknown>,
    ) => {
      const host = context['__governanceHost'] as MockGovernanceHost | undefined;
      if (host) {
        host.emitAuditEvent({ event: 'after-tool-call', toolName });
      }
    },
    onError: async (
      toolName: string,
      error: unknown,
      context: Record<string, unknown>,
    ) => {
      const host = context['__governanceHost'] as MockGovernanceHost | undefined;
      if (host) {
        host.emitAuditEvent({
          event: 'on-error',
          toolName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  };
}

// ── Test fixtures ───────────────────────────────────────────────────────

const TOOLS: [string, number][] = [
  ['read-file', 1],
  ['write-file', 2],
  ['search-code', 1],
  ['send-email', 5],
  ['delete-resource', 4],
  ['query-db', 3],
];

// ── Integration Tests (4) ───────────────────────────────────────────────

describe('GatewaySim — Integration', () => {
  it('real compiled plugin + matchers: block/allow/elicit', async () => {
    const hooks = createRealisticPlugin(TOOLS);
    const riskMap = new Map(TOOLS);

    const host = new MockGovernanceHost({
      toolPolicies: {
        'send-email': { allowed: false, blockReason: 'G-ELICIT-GATE: elicitation required' },
        'delete-resource': { allowed: false, blockReason: 'G-OBO-GATE: admin approval required' },
      },
      defaultPolicy: { allowed: true, blockReason: null },
    });

    const sim = GatewaySim.fromHooks(hooks, riskMap, { host });

    await sim.fireToolCall('read-file');
    await sim.fireToolCall('send-email');
    await sim.fireToolCall('delete-resource');

    // Use custom matchers
    expect(sim).toAllow('read-file');
    expect(sim).toElicit('send-email');
    expect(sim).toBlock('delete-resource');
    expect(sim).toHaveAuditEntries(3);
    expect(sim).toHaveValidAuditChain();
  });

  it('before-claws baseline: all tools allowed without governance', async () => {
    // Before claws: no governance hooks, everything is allowed
    const noGovernanceHooks: PluginHooks = {
      beforeToolCall: async () => ({ allowed: true, blockReason: null }),
    };
    const riskMap = new Map(TOOLS);
    const beforeSim = GatewaySim.fromHooks(noGovernanceHooks, riskMap);

    // After claws: governance enforced
    const governedHooks = createRealisticPlugin(TOOLS);
    const host = new MockGovernanceHost({
      toolPolicies: {
        'send-email': { allowed: false, blockReason: 'blocked' },
        'delete-resource': { allowed: false, blockReason: 'blocked' },
      },
      defaultPolicy: { allowed: true, blockReason: null },
    });
    const afterSim = GatewaySim.fromHooks(governedHooks, riskMap, { host });

    // Fire same tools through both
    for (const [toolName] of TOOLS) {
      await beforeSim.fireToolCall(toolName);
      await afterSim.fireToolCall(toolName);
    }

    // Before: all allowed
    const beforeChain = beforeSim.getAuditChain();
    expect(beforeChain.every(e => e.outcome === 'ALLOWED')).toBe(true);

    // After: some blocked
    const afterChain = afterSim.getAuditChain();
    const blocked = afterChain.filter(e => e.outcome === 'BLOCKED');
    expect(blocked.length).toBeGreaterThan(0);

    // Diff shows improvements (allowed -> blocked = tighter enforcement)
    const diff = SimReport.diff(beforeSim.report, afterSim.report);
    expect(diff.improvements.length).toBeGreaterThan(0);
    expect(hasRegressions(diff)).toBe(false);
  });

  it('timing under 50ms per hook', async () => {
    const hooks = createRealisticPlugin(TOOLS);
    const riskMap = new Map(TOOLS);
    const host = new MockGovernanceHost();
    const sim = GatewaySim.fromHooks(hooks, riskMap, { host });

    // Fire all tools
    for (const [toolName] of TOOLS) {
      await sim.fireToolCall(toolName);
    }

    // All hook timings should be under 50ms (gateway-eng: 50ms budget)
    const timings = sim.getTimings();
    for (const t of timings) {
      expect(t.elapsedMs).toBeLessThan(50);
    }

    // Also check via matcher
    for (const [toolName] of TOOLS) {
      expect(sim).toEnforceWithin(toolName, 50);
    }
  });

  it('degraded integration: real plugin, no host, R5 blocked (CI-01)', async () => {
    const hooks = createRealisticPlugin(TOOLS);
    const riskMap = new Map(TOOLS);

    // No host — degraded mode
    const sim = GatewaySim.fromHooks(hooks, riskMap);

    // R1 tool: allowed (fail-open)
    const r1Result = await sim.fireToolCall('read-file');
    expect(r1Result.allowed).toBe(true);

    // R5 tool: blocked (fail-closed)
    const r5Result = await sim.fireToolCall('send-email');
    expect(r5Result.blocked).toBe(true);
    expect(r5Result.reason).toContain('governance host not configured');

    // R3 tool: blocked (fail-closed)
    const r3Result = await sim.fireToolCall('query-db');
    expect(r3Result.blocked).toBe(true);

    // R2 tool: allowed (fail-open)
    const r2Result = await sim.fireToolCall('write-file');
    expect(r2Result.allowed).toBe(true);
  });
});
