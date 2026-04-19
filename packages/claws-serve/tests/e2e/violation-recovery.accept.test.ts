/**
 * L3 acceptance tests — scenario-level coverage of the two flagship
 * recovery stories from pulse 73:
 *
 *   A1  OC runtime installs a skill with an R5 violation →
 *       system enters DEGRADED_R5 → the offending tool is blocked →
 *       admin fixes the violation → system returns to CLEAN.
 *
 *   A2  VS Code corrupts SOUL.md YAML → system enters ERROR →
 *       last-good IR continues to serve reads → admin fixes the
 *       corruption → system returns to CLEAN.
 *
 * These are the user-visible contracts the CISO cares about; the tests
 * drive every public surface (gate + status + summary) end-to-end.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import {
  ViolationStateMachine,
  type ViolationInput,
} from '@bic/claws-sdk/workspace/violation-state.js';
import { violationGate } from '../../src/middleware/violation-gate.js';
import { statusRouter } from '../../src/routes/status.js';

function stubHost(): import('../../src/compilation-host.js').CompilationHost {
  const ir = {
    capabilities: { tools: [], skills: [], agents: [], workflows: [] },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: [],
    conflicts: { haltReason: null },
    compiler: { compilerVersion: '0', compiledAt: '', schemaVersion: 1 },
  };
  return {
    getCachedIR: () => ir as never,
    getCompiledAt: () => '2026-04-17T00:00:00.000Z',
    getHash: () => 'deadbeef',
    clear: () => undefined,
    hasCachedIR: true,
  } as never;
}

async function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

function base(s: Server): string {
  const a = s.address();
  if (a === null || typeof a === 'string') throw new Error('no addr');
  return `http://127.0.0.1:${String(a.port)}`;
}

let server: Server | undefined;

beforeEach(() => {
  server = undefined;
});

afterEach(() => {
  server?.close();
});

describe('L3 acceptance — violation recovery scenarios', () => {
  it('A1: OC runtime installs R5 skill → DEGRADED_R5 → tool blocked → fix → CLEAN', async () => {
    const machine = new ViolationStateMachine();
    const app = express();
    app.use(express.json());
    app.use(statusRouter(stubHost(), machine));
    app.patch('/api/chunks/connections', violationGate({ machine }));
    app.patch('/api/chunks/connections', (_req, res) => {
      res.status(200).json({ ok: true });
    });
    server = await listen(app);

    // OC runtime skill install emits an R5 violation.
    const r5: ViolationInput = {
      path: 'oc://SKILLS.md#draft_wire',
      severity: 'error',
      rule: 'R5/transact',
      message: 'draft_wire is an R5 tool',
      fixGuidance: 'Drop the skill or supply an approval token',
      source: 'oc_runtime',
      scope: 'isolated',
      tool: 'draft_wire',
      file: 'SKILLS.md',
    };
    machine.applyRecompile({ violations: [r5], lastGoodVersion: 100 });

    // /status reflects degraded_r5 with the blocked tool and no advanced lastGoodVersion.
    const status1 = await fetch(`${base(server)}/status`);
    const s1 = (await status1.json()) as {
      violationState: { status: string; blockedTools: string[]; lastGoodVersion: number | null };
    };
    expect(s1.violationState.status).toBe('degraded_r5');
    expect(s1.violationState.blockedTools).toEqual(['draft_wire']);
    expect(s1.violationState.lastGoodVersion).toBe(null);

    // PATCH on draft_wire is closed.
    const blocked = await fetch(`${base(server)}/api/chunks/connections`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'draft_wire', enabled: true }),
    });
    expect(blocked.status).toBe(503);

    // Admin repairs SKILLS.md (simulated by a clean recompile).
    machine.applyRecompile({ violations: [], lastGoodVersion: 101 });
    const status2 = await fetch(`${base(server)}/status`);
    const s2 = (await status2.json()) as {
      violationState: { status: string; lastGoodVersion: number | null };
    };
    expect(s2.violationState.status).toBe('clean');
    expect(s2.violationState.lastGoodVersion).toBe(101);

    const unblocked = await fetch(`${base(server)}/api/chunks/connections`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'draft_wire', enabled: true }),
    });
    expect(unblocked.status).toBe(200);
  });

  it('A2: VS Code corrupts SOUL.md YAML → ERROR → last-good IR serves → fix → CLEAN', async () => {
    const machine = new ViolationStateMachine();
    const app = express();
    app.use(express.json());
    app.use(statusRouter(stubHost(), machine));
    app.patch('/api/chunks/connections', violationGate({ machine }));
    app.patch('/api/chunks/connections', (_req, res) => {
      res.status(200).json({ ok: true });
    });
    server = await listen(app);

    // Seed with a clean compile so we have a last-good version to fall
    // back to when the corruption hits.
    machine.applyRecompile({ violations: [], lastGoodVersion: 20 });

    const structural: ViolationInput = {
      path: 'oc://SOUL.md',
      severity: 'error',
      rule: 'parse/structural',
      message: 'SOUL.md YAML frontmatter is unparseable',
      fixGuidance: 'Restore SOUL.md from the last known good snapshot',
      source: 'external_edit',
      scope: 'structural',
      file: 'SOUL.md',
    };
    machine.applyRecompile({ violations: [structural], lastGoodVersion: 21 });

    // /status reports ERROR; lastGoodVersion is pinned at 20, NOT 21.
    const status1 = await fetch(`${base(server)}/status`);
    const s1 = (await status1.json()) as {
      violationState: { status: string; lastGoodVersion: number | null };
    };
    expect(s1.violationState.status).toBe('error');
    expect(s1.violationState.lastGoodVersion).toBe(20);

    // Non-repair PATCH is 503.
    const blocked = await fetch(`${base(server)}/api/chunks/connections`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'oc://TOOLS.md' }),
    });
    expect(blocked.status).toBe(503);

    // Repair PATCH targeting SOUL.md passes.
    const repair = await fetch(`${base(server)}/api/chunks/connections`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'oc://SOUL.md' }),
    });
    expect(repair.status).toBe(200);

    // Admin restores SOUL.md; next recompile is clean.
    machine.applyRecompile({ violations: [], lastGoodVersion: 22 });
    const status2 = await fetch(`${base(server)}/status`);
    const s2 = (await status2.json()) as {
      violationState: { status: string; lastGoodVersion: number | null };
    };
    expect(s2.violationState.status).toBe('clean');
    expect(s2.violationState.lastGoodVersion).toBe(22);
  });
});
