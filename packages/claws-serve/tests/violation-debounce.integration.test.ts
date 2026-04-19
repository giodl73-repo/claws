/**
 * L1 integration test for CP-7 R2 RR2 — server-level ViolationStateMachine
 * debounce wiring.
 *
 * FIX-F landed the machine-side debounce coalescer with `debounceMs: 0`
 * default for back-compat. FIX-K wires `debounceMs: 200` in the serve
 * layer so the AC P2 criterion ("two violations arrive within 100ms,
 * both appear after one recompile") is structurally verifiable end-to-end.
 *
 * This test fires two recompiles with DIFFERENT violations inside the
 * debounce window; after flush, the machine must hold the UNION of both
 * violation sets.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createApp, type ServerState } from '../src/server.js';
import { governanceIRMixedRisk, MIXED_RISK_TOOLS_MD } from './fixtures/mixed-risk-workspace.js';
import { TEST_TRUST_SIGNING_KEY } from './fixtures/trust-key.js';
import { ViolationStateMachine } from '@bic/claws-sdk/workspace/violation-state.js';

const SOUL = '# Soul\n\nS03.\n\n## Purpose\n\n- debounce\n';

async function listen(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

function portOf(server: Server): number {
  const a = server.address();
  if (a === null || typeof a === 'string') throw new Error('no port');
  return a.port;
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'violation-debounce-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), MIXED_RISK_TOOLS_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});

describe('CP-7 R2 RR2 — ViolationStateMachine debounce wiring', () => {
  it('defaults violationDebounceMs to 200 on the machine exposed via app', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    const machine = app.get('violationMachine') as ViolationStateMachine;
    expect(machine).toBeInstanceOf(ViolationStateMachine);

    // Probe the debounce by firing two `applyRecompile` calls with distinct
    // violations inside a 100ms window. On a sync machine (debounceMs:0)
    // the second call would clobber the first's violation set; on a
    // debounced machine (debounceMs:200) the union survives the flush.
    const v1 = {
      path: 'oc://TOOLS.md#tool_a',
      rule: 'R5/transact',
      severity: 'error' as const,
      message: 'tool_a R5',
      scope: 'isolated' as const,
      source: 'compiler' as const,
    };
    const v2 = {
      path: 'oc://TOOLS.md#tool_b',
      rule: 'R5/share',
      severity: 'error' as const,
      message: 'tool_b R5',
      scope: 'isolated' as const,
      source: 'compiler' as const,
    };

    machine.applyRecompile({ violations: [v1], lastGoodVersion: 5 });
    await new Promise((r) => setTimeout(r, 50));
    machine.applyRecompile({ violations: [v2], lastGoodVersion: 5 });
    // During the 200ms window the committed state has NOT been updated
    // yet (either remains CLEAN, or whatever the prior state was).
    // Flush forces the coalesced commit so the assertion is deterministic.
    machine.flush();

    const paths = machine.getViolations().map((v) => v.path).sort();
    expect(paths).toEqual([
      'oc://TOOLS.md#tool_a',
      'oc://TOOLS.md#tool_b',
    ]);
  });

  it('honours violationDebounceMs override (0 = sync for legacy tests)', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      violationDebounceMs: 0,
    });
    const machine = app.get('violationMachine') as ViolationStateMachine;

    const v1 = {
      path: 'oc://TOOLS.md#tool_a',
      rule: 'R5/transact',
      severity: 'error' as const,
      message: 'tool_a R5',
      scope: 'isolated' as const,
      source: 'compiler' as const,
    };
    const v2 = {
      path: 'oc://TOOLS.md#tool_b',
      rule: 'R5/share',
      severity: 'error' as const,
      message: 'tool_b R5',
      scope: 'isolated' as const,
      source: 'compiler' as const,
    };

    machine.applyRecompile({ violations: [v1], lastGoodVersion: 5 });
    // Sync mode — v1 is committed immediately.
    expect(machine.getViolations().map((v) => v.path)).toEqual([
      'oc://TOOLS.md#tool_a',
    ]);

    machine.applyRecompile({ violations: [v2], lastGoodVersion: 5 });
    // Sync mode clobbers — the second call's set replaces the first.
    expect(machine.getViolations().map((v) => v.path)).toEqual([
      'oc://TOOLS.md#tool_b',
    ]);
  });

  it('union survives a real 100ms-apart pair of applyRecompile calls (P2 AC)', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    const machine = app.get('violationMachine') as ViolationStateMachine;

    const vA = {
      path: 'oc://SOUL.md#purpose',
      rule: 'parse/structural',
      severity: 'error' as const,
      message: 'purpose missing',
      scope: 'structural' as const,
      source: 'compiler' as const,
    };
    const vB = {
      path: 'oc://TOOLS.md#wire_transfer',
      rule: 'R5/transact',
      severity: 'error' as const,
      message: 'wire_transfer R5',
      scope: 'isolated' as const,
      source: 'compiler' as const,
    };

    const start = Date.now();
    machine.applyRecompile({ violations: [vA], lastGoodVersion: 10 });
    await new Promise((r) => setTimeout(r, 100));
    machine.applyRecompile({ violations: [vB], lastGoodVersion: 10 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(200);

    // Wait for the 200ms window to flush naturally.
    await new Promise((r) => setTimeout(r, 300));

    const violations = machine.getViolations();
    const rules = violations.map((v) => v.rule).sort();
    expect(rules).toEqual(['R5/transact', 'parse/structural']);
  });
});
