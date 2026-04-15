/**
 * L0: Gateway matchers — comprehensive coverage for all 6 matchers,
 * including pass/fail branches and message() strings.
 */

import { describe, it, expect } from 'vitest';
import {
  GatewaySim,
  MockGovernanceHost,
} from '@bic/claws-test';
import type { PluginHooks } from '@bic/claws-test/gateway-sim/plugin-loader';
import {
  toBlock,
  toAllow,
  toElicit,
  toHaveAuditEntries,
  toEnforceWithin,
  toHaveValidAuditChain,
} from '@bic/claws-test/matchers/gateway';

// ── Helpers ────────────────────────────────────────────────────────────

function makeSimWithEntries(
  entries: { toolName: string; outcome: 'ALLOWED' | 'BLOCKED' | 'ELICITED' }[],
): GatewaySim {
  const riskMap = new Map<string, number>();
  const hooks: PluginHooks = {};

  // We create a sim with hooks that produce specific outcomes based on
  // the host's tool policies. We set up the host accordingly.
  const toolPolicies: Record<string, { allowed: boolean; blockReason: string | null }> = {};
  for (const e of entries) {
    riskMap.set(e.toolName, 5);
    if (e.outcome === 'BLOCKED') {
      toolPolicies[e.toolName] = { allowed: false, blockReason: 'blocked by policy' };
    } else if (e.outcome === 'ELICITED') {
      toolPolicies[e.toolName] = { allowed: false, blockReason: 'G-ELICIT-GATE: elicitation required' };
    } else {
      toolPolicies[e.toolName] = { allowed: true, blockReason: null };
    }
  }

  const beforeToolCall: PluginHooks['beforeToolCall'] = async (toolName, ctx) => {
    const host = ctx['__governanceHost'] as MockGovernanceHost | undefined;
    if (!host || !toolName) return { allowed: false, blockReason: 'no host' };
    return host.evaluatePolicy(toolName, ctx);
  };

  const host = new MockGovernanceHost({ toolPolicies });
  return GatewaySim.fromHooks({ beforeToolCall }, riskMap, { host });
}

async function prepSim(
  entries: { toolName: string; outcome: 'ALLOWED' | 'BLOCKED' | 'ELICITED' }[],
): Promise<GatewaySim> {
  const sim = makeSimWithEntries(entries);
  for (const e of entries) {
    await sim.fireToolCall(e.toolName);
  }
  return sim;
}

// ── toBlock ────────────────────────────────────────────────────────────

describe('toBlock matcher', () => {
  it('passes when tool is blocked', async () => {
    const sim = await prepSim([{ toolName: 'send-email', outcome: 'BLOCKED' }]);
    const result = toBlock(sim, 'send-email');
    expect(result.pass).toBe(true);
    // Negated message
    expect(result.message()).toContain('NOT to be blocked');
  });

  it('fails when tool is allowed', async () => {
    const sim = await prepSim([{ toolName: 'read-file', outcome: 'ALLOWED' }]);
    const result = toBlock(sim, 'read-file');
    expect(result.pass).toBe(false);
    expect(result.message()).toContain('to be BLOCKED');
    expect(result.message()).toContain('ALLOWED');
  });

  it('fails when tool not found in chain', async () => {
    const sim = await prepSim([{ toolName: 'read-file', outcome: 'ALLOWED' }]);
    const result = toBlock(sim, 'nonexistent');
    expect(result.pass).toBe(false);
    expect(result.message()).toContain('no entry found');
    expect(result.message()).toContain('read-file'); // lists available tools
  });

  it('reports (none) when audit chain is empty', () => {
    const sim = GatewaySim.fromHooks({}, new Map());
    const result = toBlock(sim, 'any-tool');
    expect(result.pass).toBe(false);
    expect(result.message()).toContain('(none)');
  });
});

// ── toAllow ────────────────────────────────────────────────────────────

describe('toAllow matcher', () => {
  it('passes when tool is allowed', async () => {
    const sim = await prepSim([{ toolName: 'read-file', outcome: 'ALLOWED' }]);
    const result = toAllow(sim, 'read-file');
    expect(result.pass).toBe(true);
    expect(result.message()).toContain('NOT to be allowed');
  });

  it('fails when tool is blocked', async () => {
    const sim = await prepSim([{ toolName: 'send-email', outcome: 'BLOCKED' }]);
    const result = toAllow(sim, 'send-email');
    expect(result.pass).toBe(false);
    expect(result.message()).toContain('to be ALLOWED');
    expect(result.message()).toContain('BLOCKED');
  });

  it('fails when tool not found', async () => {
    const sim = await prepSim([{ toolName: 'read-file', outcome: 'ALLOWED' }]);
    const result = toAllow(sim, 'missing');
    expect(result.pass).toBe(false);
    expect(result.message()).toContain('no entry found');
  });
});

// ── toElicit ───────────────────────────────────────────────────────────

describe('toElicit matcher', () => {
  it('passes when tool triggered elicitation', async () => {
    const sim = await prepSim([{ toolName: 'send-email', outcome: 'ELICITED' }]);
    const result = toElicit(sim, 'send-email');
    expect(result.pass).toBe(true);
    expect(result.message()).toContain('NOT to trigger elicitation');
  });

  it('fails when tool was allowed instead of elicited', async () => {
    const sim = await prepSim([{ toolName: 'read-file', outcome: 'ALLOWED' }]);
    const result = toElicit(sim, 'read-file');
    expect(result.pass).toBe(false);
    expect(result.message()).toContain('to trigger ELICITATION');
    expect(result.message()).toContain('ALLOWED');
  });

  it('fails when tool not found', async () => {
    const sim = await prepSim([{ toolName: 'read-file', outcome: 'ALLOWED' }]);
    const result = toElicit(sim, 'missing');
    expect(result.pass).toBe(false);
    expect(result.message()).toContain('no entry found');
  });
});

// ── toHaveAuditEntries ─────────────────────────────────────────────────

describe('toHaveAuditEntries matcher', () => {
  it('passes when count matches', async () => {
    const sim = await prepSim([
      { toolName: 'a', outcome: 'ALLOWED' },
      { toolName: 'b', outcome: 'BLOCKED' },
    ]);
    const result = toHaveAuditEntries(sim, 2);
    expect(result.pass).toBe(true);
    expect(result.message()).toContain('NOT to have 2 entries');
  });

  it('fails when count does not match', async () => {
    const sim = await prepSim([{ toolName: 'a', outcome: 'ALLOWED' }]);
    const result = toHaveAuditEntries(sim, 5);
    expect(result.pass).toBe(false);
    expect(result.message()).toContain('to have 5 entries');
    expect(result.message()).toContain('found 1');
  });

  it('passes for zero entries on empty chain', () => {
    const sim = GatewaySim.fromHooks({}, new Map());
    const result = toHaveAuditEntries(sim, 0);
    expect(result.pass).toBe(true);
  });
});

// ── toEnforceWithin ────────────────────────────────────────────────────

describe('toEnforceWithin matcher', () => {
  it('passes when timing is within budget', async () => {
    const hooks: PluginHooks = {
      beforeToolCall: async () => ({ allowed: true, blockReason: null }),
    };
    const sim = GatewaySim.fromHooks(hooks, new Map([['tool-a', 1]]));
    await sim.fireToolCall('tool-a');

    const result = toEnforceWithin(sim, 'tool-a', 1000);
    expect(result.pass).toBe(true);
    expect(result.message()).toContain('to exceed');
  });

  it('fails when timing exceeds budget', async () => {
    const hooks: PluginHooks = {
      beforeToolCall: async () => {
        await new Promise(r => setTimeout(r, 20));
        return { allowed: true, blockReason: null };
      },
    };
    const sim = GatewaySim.fromHooks(hooks, new Map([['slow-tool', 1]]));
    await sim.fireToolCall('slow-tool');

    const result = toEnforceWithin(sim, 'slow-tool', 0.01); // absurdly low
    expect(result.pass).toBe(false);
    expect(result.message()).toContain('to complete within');
    expect(result.message()).toContain('ms');
  });

  it('fails when tool not found in timings', () => {
    const sim = GatewaySim.fromHooks({}, new Map());
    const result = toEnforceWithin(sim, 'missing', 100);
    expect(result.pass).toBe(false);
    expect(result.message()).toContain('no entry found');
  });
});

// ── toHaveValidAuditChain ──────────────────────────────────────────────

describe('toHaveValidAuditChain matcher', () => {
  it('passes on empty chain (trivially valid)', () => {
    const sim = GatewaySim.fromHooks({}, new Map());
    const result = toHaveValidAuditChain(sim);
    expect(result.pass).toBe(true);
    expect(result.message()).toContain('trivially valid');
  });

  it('passes on well-ordered chain', async () => {
    const hooks: PluginHooks = {
      beforeToolCall: async () => ({ allowed: true, blockReason: null }),
    };
    const sim = GatewaySim.fromHooks(hooks, new Map([['a', 1], ['b', 2]]));
    await sim.fireToolCall('a');
    await sim.fireToolCall('b');

    const result = toHaveValidAuditChain(sim);
    expect(result.pass).toBe(true);
    expect(result.message()).toContain('sequential IDs');
    expect(result.message()).toContain('monotonic timestamps');
  });

  it('fails on non-sequential IDs', () => {
    // Create a mock object that mimics GatewaySim with bad audit chain
    const fakeSim = {
      getAuditChain: () => [
        { id: 1, timestamp: '2026-04-13T00:00:00.000Z', toolName: 'a', outcome: 'ALLOWED', ruleId: 'x', riskLevel: 1, actor: 's', reason: '' },
        { id: 5, timestamp: '2026-04-13T00:00:01.000Z', toolName: 'b', outcome: 'ALLOWED', ruleId: 'x', riskLevel: 1, actor: 's', reason: '' },
      ],
    } as unknown as GatewaySim;

    const result = toHaveValidAuditChain(fakeSim);
    expect(result.pass).toBe(false);
    expect(result.message()).toContain('non-sequential ID');
    expect(result.message()).toContain('expected 2');
    expect(result.message()).toContain('got 5');
  });

  it('fails on non-monotonic timestamps', () => {
    const fakeSim = {
      getAuditChain: () => [
        { id: 1, timestamp: '2026-04-13T00:00:02.000Z', toolName: 'a', outcome: 'ALLOWED', ruleId: 'x', riskLevel: 1, actor: 's', reason: '' },
        { id: 2, timestamp: '2026-04-13T00:00:00.000Z', toolName: 'b', outcome: 'ALLOWED', ruleId: 'x', riskLevel: 1, actor: 's', reason: '' },
      ],
    } as unknown as GatewaySim;

    const result = toHaveValidAuditChain(fakeSim);
    expect(result.pass).toBe(false);
    expect(result.message()).toContain('non-monotonic timestamp');
  });

  it('fails on partial HMAC coverage', () => {
    const fakeSim = {
      getAuditChain: () => [
        { id: 1, timestamp: '2026-04-13T00:00:00.000Z', toolName: 'a', outcome: 'ALLOWED', ruleId: 'x', riskLevel: 1, actor: 's', reason: '', hmacSignature: 'abc' },
        { id: 2, timestamp: '2026-04-13T00:00:01.000Z', toolName: 'b', outcome: 'ALLOWED', ruleId: 'x', riskLevel: 1, actor: 's', reason: '' },
      ],
    } as unknown as GatewaySim;

    const result = toHaveValidAuditChain(fakeSim);
    expect(result.pass).toBe(false);
    expect(result.message()).toContain('partial HMAC coverage');
    expect(result.message()).toContain('1/2');
  });
});
