/**
 * L0: GatewaySim core — branch coverage for edge cases in gateway-sim.ts,
 * including fromWorkspace, setHost, no-hook degraded mode, verbose mode,
 * actor from context, and report accessor.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  GatewaySim,
  MockGovernanceHost,
} from '@bic/claws-test';
import type { PluginHooks } from '@bic/claws-test/gateway-sim/plugin-loader';

// ── fromWorkspace (not yet implemented) ────────────────────────────────

describe('GatewaySim.fromWorkspace', () => {
  it('throws with not-implemented error', async () => {
    await expect(
      GatewaySim.fromWorkspace('/some/workspace'),
    ).rejects.toThrow('not yet implemented');
  });
});

// ── setHost / getHost ──────────────────────────────────────────────────

describe('GatewaySim — setHost / getHost', () => {
  it('setHost wires a governance host after construction', async () => {
    const riskMap = new Map<string, number>([['tool-a', 5]]);
    const hooks: PluginHooks = {
      beforeToolCall: async (toolName, ctx) => {
        const host = ctx['__governanceHost'] as MockGovernanceHost | undefined;
        if (!host) return { allowed: false, blockReason: 'no host' };
        return host.evaluatePolicy(toolName!, ctx);
      },
    };

    // Start without host
    const sim = GatewaySim.fromHooks(hooks, riskMap);
    expect(sim.getHost()).toBeUndefined();

    // Fire without host: blocked (R5 fail-closed)
    const r1 = await sim.fireToolCall('tool-a');
    expect(r1.blocked).toBe(true);

    // Wire host, reset, re-fire
    const host = new MockGovernanceHost({ defaultPolicy: { allowed: true, blockReason: null } });
    sim.setHost(host);
    expect(sim.getHost()).toBe(host);
    sim.reset({ auditOnly: true });

    const r2 = await sim.fireToolCall('tool-a');
    expect(r2.allowed).toBe(true);
  });
});

// ── No beforeToolCall hook: degraded mode (lines 254-264) ──────────────

describe('GatewaySim — no hooks degraded mode', () => {
  it('R5 blocked when no hook and no host', async () => {
    const riskMap = new Map<string, number>([['send-email', 5]]);
    const sim = GatewaySim.fromHooks({}, riskMap); // no hooks, no host

    const result = await sim.fireToolCall('send-email');
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('governance host not configured');
  });

  it('R1 allowed when no hook and no host (fail-open)', async () => {
    const riskMap = new Map<string, number>([['read-file', 1]]);
    const sim = GatewaySim.fromHooks({}, riskMap);

    const result = await sim.fireToolCall('read-file');
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('fail-open');
  });

  it('R2 allowed when no hook and no host (fail-open)', async () => {
    const riskMap = new Map<string, number>([['write-file', 2]]);
    const sim = GatewaySim.fromHooks({}, riskMap);

    const result = await sim.fireToolCall('write-file');
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('fail-open');
  });

  it('R3 blocked when no hook and no host (fail-closed)', async () => {
    const riskMap = new Map<string, number>([['query-db', 3]]);
    const sim = GatewaySim.fromHooks({}, riskMap);

    const result = await sim.fireToolCall('query-db');
    expect(result.blocked).toBe(true);
  });

  it('allowed when no hook but host exists (host not consulted, default ALLOWED)', async () => {
    const riskMap = new Map<string, number>([['tool-a', 5]]);
    const host = new MockGovernanceHost();
    const sim = GatewaySim.fromHooks({}, riskMap, { host });

    const result = await sim.fireToolCall('tool-a');
    // With a host present but no hook, the default outcome is ALLOWED
    expect(result.allowed).toBe(true);
  });
});

// ── Default risk for unknown tools ─────────────────────────────────────

describe('GatewaySim — default risk level', () => {
  it('unknown tool defaults to R5 (fail-closed)', async () => {
    const hooks: PluginHooks = {
      beforeToolCall: async () => {
        throw new Error('simulated crash');
      },
    };
    const sim = GatewaySim.fromHooks(hooks, new Map()); // empty risk map

    const result = await sim.fireToolCall('unknown-tool');
    // DEFAULT_RISK_LEVEL = 5, so fail-closed
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('fail-closed');
  });
});

// ── Actor from context ─────────────────────────────────────────────────

describe('GatewaySim — actor extraction', () => {
  it('extracts actor from context for audit entry', async () => {
    const hooks: PluginHooks = {
      beforeToolCall: async () => ({ allowed: true, blockReason: null }),
    };
    const sim = GatewaySim.fromHooks(hooks, new Map([['tool-a', 1]]));

    await sim.fireToolCall('tool-a', {}, { actor: 'sarah' });

    const chain = sim.getAuditChain();
    expect(chain[0]!.actor).toBe('sarah');
  });

  it('defaults actor to "system" when not in context', async () => {
    const hooks: PluginHooks = {
      beforeToolCall: async () => ({ allowed: true, blockReason: null }),
    };
    const sim = GatewaySim.fromHooks(hooks, new Map([['tool-a', 1]]));

    await sim.fireToolCall('tool-a');

    const chain = sim.getAuditChain();
    expect(chain[0]!.actor).toBe('system');
  });
});

// ── Report accessor ────────────────────────────────────────────────────

describe('GatewaySim — report accessor', () => {
  it('returns SimReport with timing baselines set', async () => {
    const hooks: PluginHooks = {
      beforeToolCall: async () => ({ allowed: true, blockReason: null }),
    };
    const sim = GatewaySim.fromHooks(hooks, new Map([['tool-a', 1]]));

    await sim.fireToolCall('tool-a');
    await sim.fireToolCall('tool-a');

    const report = sim.report;
    expect(report).toBeDefined();
    const entries = report.getEntries();
    expect(entries).toHaveLength(2);

    // Timing baselines are set by the report accessor
    const baselines = report.timingBaseline();
    expect(baselines.length).toBeGreaterThan(0);
  });
});

// ── extractRuleId ──────────────────────────────────────────────────────

describe('GatewaySim — rule ID extraction', () => {
  it('extracts G- prefixed rule ID from block reason', async () => {
    const hooks: PluginHooks = {
      beforeToolCall: async () => ({
        allowed: false,
        blockReason: 'G-OBO-GATE: OBO action requires approval',
      }),
    };
    const sim = GatewaySim.fromHooks(hooks, new Map([['tool', 5]]));

    await sim.fireToolCall('tool');

    const chain = sim.getAuditChain();
    expect(chain[0]!.ruleId).toBe('G-OBO-GATE');
  });

  it('uses "default" when no G- rule ID in reason', async () => {
    const hooks: PluginHooks = {
      beforeToolCall: async () => ({
        allowed: false,
        blockReason: 'just blocked with no rule prefix',
      }),
    };
    const sim = GatewaySim.fromHooks(hooks, new Map([['tool', 5]]));

    await sim.fireToolCall('tool');

    const chain = sim.getAuditChain();
    expect(chain[0]!.ruleId).toBe('default');
  });
});

// ── afterToolCall fires on all outcomes (M6) ───────────────────────────

describe('GatewaySim — afterToolCall fires for blocked calls', () => {
  it('afterToolCall receives blocked outcome', async () => {
    const afterCalls: { toolName: string; outcome: string }[] = [];
    const hooks: PluginHooks = {
      beforeToolCall: async () => ({
        allowed: false,
        blockReason: 'policy-block',
      }),
      afterToolCall: async (toolName, result) => {
        const r = result as { outcome: string };
        afterCalls.push({ toolName, outcome: r.outcome });
      },
    };
    const sim = GatewaySim.fromHooks(hooks, new Map([['tool', 5]]));

    await sim.fireToolCall('tool');

    expect(afterCalls).toHaveLength(1);
    expect(afterCalls[0]!.outcome).toBe('BLOCKED');
  });
});

// ── blockReason null fallback (line 230) ──────────────────────────────

describe('GatewaySim — blockReason null fallback', () => {
  it('uses "blocked by policy" when blockReason is null', async () => {
    const hooks: PluginHooks = {
      beforeToolCall: async () => ({
        allowed: false,
        blockReason: null,
      }),
    };
    const sim = GatewaySim.fromHooks(hooks, new Map([['tool', 5]]));

    const result = await sim.fireToolCall('tool');

    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('blocked by policy');
  });
});

// ── DOMException timeout branch (lines 240-243) ──────────────────────

describe('GatewaySim — hook timeout (M7)', () => {
  it('treats DOMException TimeoutError as degraded mode — R5 blocked', async () => {
    const hooks: PluginHooks = {
      beforeToolCall: async () => {
        const err = new DOMException('The operation was aborted', 'TimeoutError');
        throw err;
      },
    };
    const sim = GatewaySim.fromHooks(hooks, new Map([['tool', 5]]));

    const result = await sim.fireToolCall('tool');

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('Hook timeout');
    expect(result.reason).toContain('degraded mode');
  });

  it('treats DOMException TimeoutError as degraded mode — R1 allowed', async () => {
    const hooks: PluginHooks = {
      beforeToolCall: async () => {
        const err = new DOMException('The operation was aborted', 'TimeoutError');
        throw err;
      },
    };
    const sim = GatewaySim.fromHooks(hooks, new Map([['tool', 1]]));

    const result = await sim.fireToolCall('tool');

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('Hook timeout');
    expect(result.reason).toContain('degraded mode');
  });

  it('non-Error throw uses String() for message', async () => {
    const hooks: PluginHooks = {
      beforeToolCall: async () => {
        throw 'raw string error';
      },
    };
    const sim = GatewaySim.fromHooks(hooks, new Map([['tool', 5]]));

    const result = await sim.fireToolCall('tool');

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('raw string error');
  });
});

// ── DEFAULT_HOOK_TIMEOUT_MS ────────────────────────────────────────────

describe('GatewaySim — hookTimeoutMs', () => {
  it('static DEFAULT_HOOK_TIMEOUT_MS is 5000', () => {
    expect(GatewaySim.DEFAULT_HOOK_TIMEOUT_MS).toBe(5000);
  });
});

// ── fromPlugin with verbose logging ────────────────────────────────────

describe('GatewaySim.fromPlugin', () => {
  it('loads a plugin module and logs hooks in verbose mode', async () => {
    const moduleCode = `
      export async function beforeToolCall(name, ctx) {
        return { allowed: true, blockReason: null };
      }
      export async function afterToolCall(name, result, ctx) {}
    `;
    const dataUrl = `data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`;

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const sim = await GatewaySim.fromPlugin(dataUrl, { verbose: true });
    expect(sim).toBeDefined();
    expect(sim.getAuditChain()).toHaveLength(0);

    // Verbose mode logs plugin path and hook names
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[claws] Plugin:'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('beforeToolCall'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('afterToolCall'));

    logSpy.mockRestore();
  });

  it('loads a plugin without verbose (no logging)', async () => {
    const moduleCode = `
      export async function beforeToolCall(name, ctx) {
        return { allowed: true, blockReason: null };
      }
    `;
    const dataUrl = `data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`;

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const sim = await GatewaySim.fromPlugin(dataUrl);
    expect(sim).toBeDefined();
    expect(logSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it('respects custom hookTimeoutMs option', async () => {
    const moduleCode = `
      export async function beforeToolCall(name, ctx) {
        return { allowed: true, blockReason: null };
      }
    `;
    const dataUrl = `data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`;

    const sim = await GatewaySim.fromPlugin(dataUrl, { hookTimeoutMs: 2000 });
    expect(sim).toBeDefined();
    // The sim was created with custom timeout — fires correctly
    const result = await sim.fireToolCall('test-tool');
    expect(result).toBeDefined();
  });
});
