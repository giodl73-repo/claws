/**
 * GatewaySim L0 unit tests — 19 tests covering:
 * - Core (8): plugin loading, fire calls, block/allow/elicit, audit chain,
 *   reset, sequencing, error hooks, builder output
 * - SimReport (3): toString, toJSON with SIEM fields, diff with hasRegressions
 * - Timing (2): capture, timingBaseline p50/p95/p99
 * - Matchers (2): toBlock/toAllow pass/fail, toHaveValidAuditChain
 * - Degraded mode (3): GovernanceHost missing, throws, malformed
 * - Error propagation (3): R1 fail-open, R5 fail-closed, afterToolCall errors
 *
 * Note: 8+3+2+2+3 = 18, but the last error propagation test (afterToolCall
 * errors audit still written) makes 19.
 */

import { describe, it, expect } from 'vitest';
import {
  GatewaySim,
  MockGovernanceHost,
  toolCall,
  SimReport,
  hasRegressions,
  diffSeverity,
} from '@bic/claws-test';
import type { PluginHooks } from '@bic/claws-test/gateway-sim/plugin-loader';
import { toBlock, toAllow, toHaveValidAuditChain } from '@bic/claws-test/matchers/gateway';

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Create a mock beforeToolCall hook that uses the __governanceHost from context.
 */
function makeBeforeToolCallHook(riskMap: Map<string, number>) {
  return async (
    toolName: string | null | undefined,
    context: Record<string, unknown>,
  ) => {
    const host = context['__governanceHost'] as MockGovernanceHost | undefined;
    if (!host) {
      const risk = toolName ? (riskMap.get(toolName) ?? 5) : 5;
      if (risk >= 3) {
        return { allowed: false, blockReason: 'governance host not configured' };
      }
      return { allowed: true, blockReason: null };
    }

    if (toolName == null) {
      return { allowed: false, blockReason: 'Tool name is null' };
    }

    const result = await host.evaluatePolicy(toolName, context);
    host.emitAuditEvent({ event: 'policy-eval', toolName, allowed: result.allowed });
    return result;
  };
}

function makeRiskMap(...entries: [string, number][]): Map<string, number> {
  return new Map(entries);
}

// ── Core Tests (8) ──────────────────────────────────────────────────────

describe('GatewaySim — Core', () => {
  it('loads plugin hooks via fromHooks()', () => {
    const hooks: PluginHooks = {
      beforeToolCall: async () => ({ allowed: true, blockReason: null }),
    };
    const sim = GatewaySim.fromHooks(hooks, new Map());
    expect(sim).toBeDefined();
    expect(sim.getAuditChain()).toHaveLength(0);
  });

  it('fires a tool call and returns allowed result', async () => {
    const riskMap = makeRiskMap(['read-file', 1]);
    const hooks: PluginHooks = {
      beforeToolCall: makeBeforeToolCallHook(riskMap),
    };
    const host = new MockGovernanceHost({ defaultPolicy: { allowed: true, blockReason: null } });
    const sim = GatewaySim.fromHooks(hooks, riskMap, { host });

    const result = await sim.fireToolCall('read-file', { path: '/tmp/test' });

    expect(result.allowed).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.elicited).toBe(false);
  });

  it('fires a tool call and returns blocked result', async () => {
    const riskMap = makeRiskMap(['send-email', 5]);
    const hooks: PluginHooks = {
      beforeToolCall: makeBeforeToolCallHook(riskMap),
    };
    const host = new MockGovernanceHost({
      toolPolicies: {
        'send-email': { allowed: false, blockReason: 'G-OBO-GATE: OBO action requires approval' },
      },
    });
    const sim = GatewaySim.fromHooks(hooks, riskMap, { host });

    const result = await sim.fireToolCall('send-email', { to: 'user@example.com' });

    expect(result.allowed).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('G-OBO-GATE');
  });

  it('fires a tool call that triggers elicitation', async () => {
    const riskMap = makeRiskMap(['send-email', 5]);
    const hooks: PluginHooks = {
      beforeToolCall: makeBeforeToolCallHook(riskMap),
    };
    const host = new MockGovernanceHost({
      toolPolicies: {
        'send-email': { allowed: false, blockReason: 'G-ELICIT-GATE: elicitation required' },
      },
    });
    const sim = GatewaySim.fromHooks(hooks, riskMap, { host });

    const result = await sim.fireToolCall('send-email');

    expect(result.elicited).toBe(true);
  });

  it('accumulates audit chain entries', async () => {
    const riskMap = makeRiskMap(['read-file', 1], ['send-email', 5]);
    const hooks: PluginHooks = {
      beforeToolCall: makeBeforeToolCallHook(riskMap),
    };
    const host = new MockGovernanceHost({ defaultPolicy: { allowed: true, blockReason: null } });
    const sim = GatewaySim.fromHooks(hooks, riskMap, { host });

    await sim.fireToolCall('read-file');
    await sim.fireToolCall('send-email');

    const chain = sim.getAuditChain();
    expect(chain).toHaveLength(2);
    expect(chain[0]!.id).toBe(1);
    expect(chain[1]!.id).toBe(2);
    expect(chain[0]!.toolName).toBe('read-file');
    expect(chain[1]!.toolName).toBe('send-email');
  });

  it('reset() clears all state; reset({ auditOnly: true }) preserves host', async () => {
    const riskMap = makeRiskMap(['read-file', 1]);
    const hooks: PluginHooks = {
      beforeToolCall: makeBeforeToolCallHook(riskMap),
    };
    const host = new MockGovernanceHost();
    const sim = GatewaySim.fromHooks(hooks, riskMap, { host });

    await sim.fireToolCall('read-file');
    expect(sim.getAuditChain()).toHaveLength(1);

    // Partial reset: audit only
    sim.reset({ auditOnly: true });
    expect(sim.getAuditChain()).toHaveLength(0);
    expect(sim.getHost()).toBeDefined();

    // Full reset
    await sim.fireToolCall('read-file');
    sim.reset();
    expect(sim.getAuditChain()).toHaveLength(0);
    expect(sim.getHost()).toBeUndefined();
  });

  it('fireToolCallSequence executes calls in order', async () => {
    const riskMap = makeRiskMap(['tool-a', 1], ['tool-b', 2], ['tool-c', 5]);
    const hooks: PluginHooks = {
      beforeToolCall: makeBeforeToolCallHook(riskMap),
    };
    const host = new MockGovernanceHost({
      toolPolicies: {
        'tool-c': { allowed: false, blockReason: 'blocked-c' },
      },
      defaultPolicy: { allowed: true, blockReason: null },
    });
    const sim = GatewaySim.fromHooks(hooks, riskMap, { host });

    const results = await sim.fireToolCallSequence([
      { toolName: 'tool-a' },
      { toolName: 'tool-b' },
      { toolName: 'tool-c' },
    ]);

    expect(results).toHaveLength(3);
    expect(results[0]!.allowed).toBe(true);
    expect(results[1]!.allowed).toBe(true);
    expect(results[2]!.blocked).toBe(true);
    expect(sim.getAuditChain()).toHaveLength(3);
  });

  it('ToolCallBuilder produces correct payload', () => {
    const payload = toolCall('send-email')
      .withArgs({ to: 'user@example.com', subject: 'Test' })
      .asUser('sarah')
      .withContext({ source: 'test' })
      .build();

    expect(payload.toolName).toBe('send-email');
    expect(payload.args).toEqual({ to: 'user@example.com', subject: 'Test' });
    expect(payload.context).toEqual({ actor: 'sarah', source: 'test' });
  });
});

// ── SimReport Tests (3) ─────────────────────────────────────────────────

describe('GatewaySim — SimReport', () => {
  it('toString() produces human-readable summary', async () => {
    const riskMap = makeRiskMap(['read-file', 1], ['send-email', 5]);
    const hooks: PluginHooks = {
      beforeToolCall: makeBeforeToolCallHook(riskMap),
    };
    const host = new MockGovernanceHost({
      toolPolicies: {
        'send-email': { allowed: false, blockReason: 'G-OBO-GATE: blocked' },
      },
      defaultPolicy: { allowed: true, blockReason: null },
    });
    const sim = GatewaySim.fromHooks(hooks, riskMap, { host });

    await sim.fireToolCall('read-file');
    await sim.fireToolCall('send-email');

    const text = sim.report.toString();
    expect(text).toContain('read-file: ALLOWED');
    expect(text).toContain('send-email: BLOCKED');
    expect(text).toContain('Total: 2');
    expect(text).toContain('Blocked: 1');
    expect(text).toContain('Allowed: 1');
  });

  it('toJSON() includes SIEM fields and workspace metadata', async () => {
    const report = new SimReport({
      workspacePath: '/test/workspace',
      workspaceId: 'ws-123',
      policyVersion: '1.0.0',
      clawsVersion: '0.36.0',
    });
    report.addEntry({
      toolName: 'send-email',
      outcome: 'BLOCKED',
      ruleId: 'G-OBO-GATE',
      riskLevel: 5,
      timingMs: 2.3,
      reason: 'OBO blocked',
      actor: 'sarah',
      timestamp: '2026-04-13T00:00:00.000Z',
    });

    const json = report.toJSON();

    // Workspace metadata (PE-02)
    expect(json.workspace.workspacePath).toBe('/test/workspace');
    expect(json.workspace.policyVersion).toBe('1.0.0');

    // SIEM fields (CI-03)
    expect(json.entries).toHaveLength(1);
    const entry = json.entries[0]!;
    expect(entry.timestamp).toBe('2026-04-13T00:00:00.000Z');
    expect(entry.severity).toBe(5);
    expect(entry.source).toBe('claws-gateway-sim');
    expect(entry.action).toBe('tool-call:send-email');
    expect(entry.outcome).toBe('BLOCKED');
    expect(entry.actor).toBe('sarah');
    expect(entry.toolName).toBe('send-email');
    expect(entry.ruleId).toBe('G-OBO-GATE');
  });

  it('SimReport.diff() detects regressions with hasRegressions() + severity()', () => {
    const before = new SimReport();
    before.addEntry({
      toolName: 'send-email',
      outcome: 'BLOCKED',
      ruleId: 'G-OBO-GATE',
      riskLevel: 5,
      timingMs: 2.0,
      reason: 'blocked',
      actor: 'system',
      timestamp: '2026-04-13T00:00:00.000Z',
    });
    before.addEntry({
      toolName: 'read-file',
      outcome: 'ALLOWED',
      ruleId: 'default',
      riskLevel: 1,
      timingMs: 1.0,
      reason: '',
      actor: 'system',
      timestamp: '2026-04-13T00:00:01.000Z',
    });

    const after = new SimReport();
    after.addEntry({
      toolName: 'send-email',
      outcome: 'ALLOWED', // REGRESSION: was BLOCKED
      ruleId: 'default',
      riskLevel: 5,
      timingMs: 2.0,
      reason: '',
      actor: 'system',
      timestamp: '2026-04-13T00:01:00.000Z',
    });
    after.addEntry({
      toolName: 'read-file',
      outcome: 'BLOCKED', // IMPROVEMENT: was ALLOWED
      ruleId: 'G-INPUT-01',
      riskLevel: 1,
      timingMs: 1.0,
      reason: 'tightened',
      actor: 'system',
      timestamp: '2026-04-13T00:01:01.000Z',
    });

    const diff = SimReport.diff(before, after);

    expect(hasRegressions(diff)).toBe(true);
    expect(diff.regressions).toHaveLength(1);
    expect(diff.regressions[0]!.toolName).toBe('send-email');
    expect(diff.regressions[0]!.before).toBe('BLOCKED');
    expect(diff.regressions[0]!.after).toBe('ALLOWED');

    expect(diff.improvements).toHaveLength(1);
    expect(diff.improvements[0]!.toolName).toBe('read-file');

    // R5 regression = critical
    expect(diffSeverity(diff)).toBe('critical');
  });
});

// ── Timing Tests (2) ────────────────────────────────────────────────────

describe('GatewaySim — Timing', () => {
  it('captures per-hook timing data', async () => {
    const riskMap = makeRiskMap(['read-file', 1]);
    const hooks: PluginHooks = {
      beforeToolCall: async () => {
        // Simulate a tiny delay
        await new Promise(r => setTimeout(r, 1));
        return { allowed: true, blockReason: null };
      },
    };
    const sim = GatewaySim.fromHooks(hooks, riskMap);

    await sim.fireToolCall('read-file');

    const timings = sim.getTimings();
    expect(timings).toHaveLength(1);
    expect(timings[0]!.hookName).toBe('beforeToolCall');
    expect(timings[0]!.toolName).toBe('read-file');
    expect(timings[0]!.elapsedMs).toBeGreaterThan(0);
  });

  it('timingBaseline() returns p50/p95/p99', async () => {
    const riskMap = makeRiskMap(['tool-a', 1]);
    const hooks: PluginHooks = {
      beforeToolCall: async () => ({ allowed: true, blockReason: null }),
    };
    const sim = GatewaySim.fromHooks(hooks, riskMap);

    // Fire multiple calls for statistical baseline
    for (let i = 0; i < 10; i++) {
      await sim.fireToolCall('tool-a');
    }

    const baselines = sim.report.timingBaseline();
    expect(baselines).toHaveLength(1);

    const baseline = baselines[0]!;
    expect(baseline.hookName).toBe('beforeToolCall');
    expect(baseline.count).toBe(10);
    expect(baseline.p50).toBeGreaterThanOrEqual(0);
    expect(baseline.p95).toBeGreaterThanOrEqual(baseline.p50);
    expect(baseline.p99).toBeGreaterThanOrEqual(baseline.p95);
  });
});

// ── Matcher Tests (2) ───────────────────────────────────────────────────

describe('GatewaySim — Matchers', () => {
  it('toBlock/toAllow pass and fail correctly', async () => {
    const riskMap = makeRiskMap(['read-file', 1], ['send-email', 5]);
    const hooks: PluginHooks = {
      beforeToolCall: makeBeforeToolCallHook(riskMap),
    };
    const host = new MockGovernanceHost({
      toolPolicies: {
        'send-email': { allowed: false, blockReason: 'blocked' },
      },
      defaultPolicy: { allowed: true, blockReason: null },
    });
    const sim = GatewaySim.fromHooks(hooks, riskMap, { host });

    await sim.fireToolCall('read-file');
    await sim.fireToolCall('send-email');

    // toAllow passes for read-file
    const allowResult = toAllow(sim, 'read-file');
    expect(allowResult.pass).toBe(true);

    // toBlock passes for send-email
    const blockResult = toBlock(sim, 'send-email');
    expect(blockResult.pass).toBe(true);

    // toAllow fails for send-email
    const allowFailResult = toAllow(sim, 'send-email');
    expect(allowFailResult.pass).toBe(false);

    // toBlock fails for read-file
    const blockFailResult = toBlock(sim, 'read-file');
    expect(blockFailResult.pass).toBe(false);
  });

  it('toHaveValidAuditChain validates sequential IDs and monotonic timestamps', async () => {
    const riskMap = makeRiskMap(['tool-a', 1], ['tool-b', 2]);
    const hooks: PluginHooks = {
      beforeToolCall: async () => ({ allowed: true, blockReason: null }),
    };
    const sim = GatewaySim.fromHooks(hooks, riskMap);

    await sim.fireToolCall('tool-a');
    await sim.fireToolCall('tool-b');

    const result = toHaveValidAuditChain(sim);
    expect(result.pass).toBe(true);

    // Verify IDs are sequential
    const chain = sim.getAuditChain();
    expect(chain[0]!.id).toBe(1);
    expect(chain[1]!.id).toBe(2);
  });
});

// ── Degraded Mode Tests (CI-01) (3) ─────────────────────────────────────

describe('GatewaySim — Degraded Mode (CI-01)', () => {
  it('GovernanceHost missing: R5 blocked, R1 allowed', async () => {
    const riskMap = makeRiskMap(['read-file', 1], ['send-email', 5]);
    const hooks: PluginHooks = {
      beforeToolCall: makeBeforeToolCallHook(riskMap),
    };
    // No host provided
    const sim = GatewaySim.fromHooks(hooks, riskMap);

    const r1Result = await sim.fireToolCall('read-file');
    expect(r1Result.allowed).toBe(true);

    const r5Result = await sim.fireToolCall('send-email');
    expect(r5Result.blocked).toBe(true);
    expect(r5Result.reason).toContain('governance host not configured');
  });

  it('GovernanceHost throws: R5 blocked', async () => {
    const riskMap = makeRiskMap(['send-email', 5]);
    const hooks: PluginHooks = {
      beforeToolCall: async (toolName, context) => {
        const host = context['__governanceHost'] as MockGovernanceHost | undefined;
        if (!host) return { allowed: false, blockReason: 'no host' };
        // This will throw
        await host.evaluatePolicy(toolName!, context);
        return { allowed: true, blockReason: null };
      },
    };

    // Create a host that throws
    const throwingHost = new MockGovernanceHost();
    throwingHost.evaluatePolicy = async () => {
      throw new Error('Host crashed');
    };

    const sim = GatewaySim.fromHooks(hooks, riskMap, { host: throwingHost });
    const result = await sim.fireToolCall('send-email');

    // R5 fail-closed
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('fail-closed');
  });

  it('GovernanceHost returns malformed: R5 blocked', async () => {
    const riskMap = makeRiskMap(['send-email', 5]);
    const hooks: PluginHooks = {
      beforeToolCall: async (toolName, context) => {
        const host = context['__governanceHost'] as MockGovernanceHost | undefined;
        if (!host) return { allowed: false, blockReason: 'no host' };
        const result = await host.evaluatePolicy(toolName!, context);
        // Simulate malformed: if allowed is not boolean, treat as error
        if (typeof result.allowed !== 'boolean') {
          throw new Error('Malformed response from governance host');
        }
        return result;
      },
    };

    // Create a host that returns malformed data
    const malformedHost = new MockGovernanceHost();
    malformedHost.evaluatePolicy = async () => {
      return { allowed: 'yes' as unknown as boolean, blockReason: null };
    };

    const sim = GatewaySim.fromHooks(hooks, riskMap, { host: malformedHost });
    const result = await sim.fireToolCall('send-email');

    // R5 fail-closed on malformed
    expect(result.blocked).toBe(true);
  });
});

// ── Error Propagation Tests (GE-02) (3) ──────────────────────────────────

describe('GatewaySim — Error Propagation (GE-02)', () => {
  it('beforeToolCall throws on R1: allowed (fail-open)', async () => {
    const riskMap = makeRiskMap(['read-file', 1]);
    const hooks: PluginHooks = {
      beforeToolCall: async () => {
        throw new Error('Hook crashed');
      },
    };
    const sim = GatewaySim.fromHooks(hooks, riskMap);

    const result = await sim.fireToolCall('read-file');

    // R1 fail-open
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('fail-open');
  });

  it('beforeToolCall throws on R5: blocked (fail-closed)', async () => {
    const riskMap = makeRiskMap(['send-email', 5]);
    const hooks: PluginHooks = {
      beforeToolCall: async () => {
        throw new Error('Hook crashed');
      },
    };
    const sim = GatewaySim.fromHooks(hooks, riskMap);

    const result = await sim.fireToolCall('send-email');

    // R5 fail-closed
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('fail-closed');
  });

  it('afterToolCall throws: audit entry still written', async () => {
    const riskMap = makeRiskMap(['read-file', 1]);
    const hooks: PluginHooks = {
      beforeToolCall: async () => ({ allowed: true, blockReason: null }),
      afterToolCall: async () => {
        throw new Error('After hook crashed');
      },
    };
    const sim = GatewaySim.fromHooks(hooks, riskMap);

    const result = await sim.fireToolCall('read-file');

    // Allowed despite afterToolCall error
    expect(result.allowed).toBe(true);

    // Audit entry was still written
    const chain = sim.getAuditChain();
    expect(chain).toHaveLength(1);
    expect(chain[0]!.toolName).toBe('read-file');
    expect(chain[0]!.outcome).toBe('ALLOWED');
  });
});
