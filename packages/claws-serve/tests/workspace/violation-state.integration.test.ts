/**
 * L1 integration tests for the violation-state wiring.
 *
 * These tests exercise the ViolationStateMachine + violation-gate
 * middleware + status route together, without booting a full Express
 * daemon (that's the L2 tier). A real Express app is constructed in-
 * memory and driven via `supertest`-style fetch against a transient
 * port.
 *
 * The 6 scenarios mirror the AC list in pulse 73:
 *   1. External edit creates an R5 violation → DEGRADED_R5 → tool blocked
 *   2. Structural error → ERROR → 503 on non-repair → CLEAN after fix
 *   3. OC runtime skill install with R5 → auto-attribution preserved
 *   4. Chunk response envelope includes governance.violations
 *   5. Transition listener fires `governance_violation` / `governance_resolved`
 *   6. /status endpoint reflects state across transitions
 */

import { describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import {
  ViolationStateMachine,
  type ViolationInput,
} from '@bic/claws-sdk/workspace/violation-state.js';
import { violationGate } from '../../src/middleware/violation-gate.js';
import { statusRouter } from '../../src/routes/status.js';

// Minimal CompilationHost stub — statusRouter only calls getCachedIR() and
// getCompiledAt(); we return a synthetic IR so the route reaches the
// violation-state branch we care about.
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
    getHash: () => 'abc',
    clear: () => undefined,
    hasCachedIR: true,
  } as never;
}

function r5(): ViolationInput {
  return {
    path: 'oc://TOOLS.md#send_email',
    severity: 'error',
    rule: 'R5/transact',
    message: 'R5 tool requires approval',
    fixGuidance: 'Remove or attach approval',
    source: 'external_edit',
    scope: 'isolated',
    tool: 'send_email',
    file: 'TOOLS.md',
  };
}

function structural(): ViolationInput {
  return {
    path: 'oc://SOUL.md',
    severity: 'error',
    rule: 'parse/structural',
    message: 'SOUL.md is corrupt',
    fixGuidance: 'Restore SOUL.md',
    source: 'external_edit',
    scope: 'structural',
    file: 'SOUL.md',
  };
}

async function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

function addr(s: Server): string {
  const a = s.address();
  if (a === null || typeof a === 'string') throw new Error('no addr');
  return `http://127.0.0.1:${String(a.port)}`;
}

describe('violation-state wiring', () => {
  it('external R5 violation → DEGRADED_R5 → target tool 503; other tools pass', async () => {
    const machine = new ViolationStateMachine();
    const app = express();
    app.use(express.json());
    app.patch('/api/chunks/connections', violationGate({ machine }));
    app.patch('/api/chunks/connections', (_req, res) => {
      res.status(200).json({ ok: true });
    });

    machine.applyRecompile({ violations: [r5()], lastGoodVersion: 10 });

    const s = await listen(app);
    try {
      const blocked = await fetch(`${addr(s)}/api/chunks/connections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'send_email', enabled: false }),
      });
      expect(blocked.status).toBe(503);
      const body = (await blocked.json()) as { error: { code: string; state: string } };
      expect(body.error.code).toBe('GOVERNANCE_DEGRADED');
      expect(body.error.state).toBe('degraded_r5');

      const allowed = await fetch(`${addr(s)}/api/chunks/connections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'read_inbox', enabled: true }),
      });
      expect(allowed.status).toBe(200);
    } finally {
      s.close();
    }
  });

  it('structural error → ERROR → non-repair 503 → repair passes → CLEAN', async () => {
    const machine = new ViolationStateMachine();
    const app = express();
    app.use(express.json());
    app.patch('/api/chunks/connections', violationGate({ machine }));
    app.patch('/api/chunks/connections', (_req, res) => {
      res.status(200).json({ ok: true });
    });

    machine.applyRecompile({ violations: [structural()], lastGoodVersion: 4 });

    const s = await listen(app);
    try {
      const blocked = await fetch(`${addr(s)}/api/chunks/connections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'oc://TOOLS.md' }),
      });
      expect(blocked.status).toBe(503);

      const repaired = await fetch(`${addr(s)}/api/chunks/connections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'oc://SOUL.md' }),
      });
      expect(repaired.status).toBe(200);

      machine.applyRecompile({ violations: [], lastGoodVersion: 5 });
      const afterClean = await fetch(`${addr(s)}/api/chunks/connections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'oc://TOOLS.md' }),
      });
      expect(afterClean.status).toBe(200);
    } finally {
      s.close();
    }
  });

  it('OC runtime skill install with R5 violation preserves source attribution', () => {
    const machine = new ViolationStateMachine();
    machine.applyRecompile({
      violations: [{ ...r5(), source: 'oc_runtime' }],
      lastGoodVersion: 1,
    });
    const summary = machine.summary();
    expect(summary.state).toBe('degraded_r5');
    expect(summary.violations[0]!.source).toBe('oc_runtime');
    expect(summary.blockedTools).toEqual(['send_email']);
  });

  it('DEGRADED_WARN stamps res.locals.governanceWarnings on the chunk response', async () => {
    const machine = new ViolationStateMachine();
    const app = express();
    app.use(express.json());
    app.patch('/api/chunks/preferences', violationGate({ machine }));
    app.patch('/api/chunks/preferences', (_req, res) => {
      const warnings = res.locals['governanceWarnings'] as
        | ReadonlyArray<{ rule: string; path: string }>
        | undefined;
      res.status(200).json({ warnings: warnings ?? [] });
    });

    machine.applyRecompile({
      violations: [{
        path: 'oc://PREFS.md',
        severity: 'warning',
        rule: 'style/reflow',
        message: 'style drift',
        fixGuidance: 'Reflow',
        source: 'external_edit',
        scope: 'isolated',
      }],
      lastGoodVersion: 1,
    });

    const s = await listen(app);
    try {
      const res = await fetch(`${addr(s)}/api/chunks/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { warnings: readonly { rule: string }[] };
      expect(body.warnings).toHaveLength(1);
      expect(body.warnings[0]!.rule).toBe('style/reflow');
    } finally {
      s.close();
    }
  });

  it('transition listener fires on entry and resolution', () => {
    const events: Array<{ from: string; to: string }> = [];
    const machine = new ViolationStateMachine({
      onTransition: (from, to) => events.push({ from, to }),
    });
    machine.applyRecompile({ violations: [r5()], lastGoodVersion: 1 });
    machine.applyRecompile({ violations: [], lastGoodVersion: 2 });
    expect(events).toEqual([
      { from: 'clean', to: 'degraded_r5' },
      { from: 'degraded_r5', to: 'clean' },
    ]);
  });

  it('/status endpoint reflects violation state across transitions', async () => {
    const machine = new ViolationStateMachine();
    const app = express();
    app.use(statusRouter(stubHost(), machine));

    machine.applyRecompile({ violations: [r5()], lastGoodVersion: 10 });

    const s = await listen(app);
    try {
      const degraded = await fetch(`${addr(s)}/status`);
      const body1 = (await degraded.json()) as {
        violationState: { status: string; lastGoodVersion: number | null; blockedTools: string[] };
      };
      expect(body1.violationState.status).toBe('degraded_r5');
      expect(body1.violationState.lastGoodVersion).toBe(null);
      expect(body1.violationState.blockedTools).toEqual(['send_email']);

      machine.applyRecompile({ violations: [], lastGoodVersion: 11 });
      const clean = await fetch(`${addr(s)}/status`);
      const body2 = (await clean.json()) as {
        violationState: { status: string; lastGoodVersion: number | null };
      };
      expect(body2.violationState.status).toBe('clean');
      expect(body2.violationState.lastGoodVersion).toBe(11);
    } finally {
      s.close();
    }
  });
});

describe('violation-gate — probe + extract edge cases', () => {
  it('machine supplied as a probe function — resolved on every request', async () => {
    const machine = new ViolationStateMachine();
    const probed: number[] = [];
    const probe = (): ViolationStateMachine => {
      probed.push(1);
      return machine;
    };
    const app = express();
    app.use(express.json());
    app.patch('/x', violationGate({ machine: probe }));
    app.patch('/x', (_req, res) => res.status(200).json({ ok: true }));

    machine.applyRecompile({ violations: [r5()], lastGoodVersion: 1 });

    const s = await listen(app);
    try {
      const res = await fetch(`${addr(s)}/x`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'send_email' }),
      });
      expect(res.status).toBe(503);
      expect(probed.length).toBeGreaterThan(0);
    } finally {
      s.close();
    }
  });

  it('probe returns undefined → middleware passes through', async () => {
    const app = express();
    app.use(express.json());
    app.patch('/x', violationGate({ machine: () => undefined }));
    app.patch('/x', (_req, res) => res.status(200).json({ ok: true }));
    const s = await listen(app);
    try {
      const res = await fetch(`${addr(s)}/x`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
    } finally {
      s.close();
    }
  });

  it('DEGRADED_FLEET passes through', async () => {
    const machine = new ViolationStateMachine();
    machine.applyRecompile({
      violations: [{
        path: 'oc://fleet.yaml',
        severity: 'info',
        rule: 'fleet/drift',
        message: 'drift',
        fixGuidance: 'sync',
        source: 'external_edit',
        scope: 'isolated',
      }],
      lastGoodVersion: 1,
    });
    const app = express();
    app.use(express.json());
    app.patch('/x', violationGate({ machine }));
    app.patch('/x', (_req, res) => res.status(200).json({ ok: true }));
    const s = await listen(app);
    try {
      const res = await fetch(`${addr(s)}/x`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
    } finally {
      s.close();
    }
  });

  it('custom extractTarget overrides default body/path heuristic', async () => {
    const machine = new ViolationStateMachine();
    machine.applyRecompile({ violations: [r5()], lastGoodVersion: 1 });
    const app = express();
    app.use(express.json());
    app.patch(
      '/x',
      violationGate({
        machine,
        extractTarget: (_req) => ({ tool: 'send_email' }),
      }),
    );
    app.patch('/x', (_req, res) => res.status(200).json({ ok: true }));
    const s = await listen(app);
    try {
      const res = await fetch(`${addr(s)}/x`, { method: 'PATCH' });
      expect(res.status).toBe(503);
    } finally {
      s.close();
    }
  });

  it('oc:// path is extracted from request path when body lacks fields', async () => {
    const machine = new ViolationStateMachine();
    machine.applyRecompile({ violations: [structural()], lastGoodVersion: 1 });
    const app = express();
    app.use(express.json());
    app.patch('/api/oc/:file', violationGate({ machine }));
    app.patch('/api/oc/:file', (_req, res) => res.status(200).json({ ok: true }));
    const s = await listen(app);
    try {
      // Request path contains SOUL.md — repair path matches.
      const repair = await fetch(`${addr(s)}/api/oc/SOUL.md`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(repair.status).toBe(200);

      // Different file → blocked.
      const blocked = await fetch(`${addr(s)}/api/oc/TOOLS.md`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(blocked.status).toBe(503);
    } finally {
      s.close();
    }
  });

  it('body is null / non-object — extractor returns empty target', async () => {
    const machine = new ViolationStateMachine();
    machine.applyRecompile({ violations: [structural()], lastGoodVersion: 1 });
    const app = express();
    app.use(express.json());
    // Intentionally no path params, no body — extraction yields {}.
    app.patch('/bare', violationGate({ machine }));
    app.patch('/bare', (_req, res) => res.status(200).json({ ok: true }));
    const s = await listen(app);
    try {
      const res = await fetch(`${addr(s)}/bare`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      // ERROR + no target path → 503 (fail-closed).
      expect(res.status).toBe(503);
    } finally {
      s.close();
    }
  });

  it('URL param :tool is extracted when body lacks tool (M-4 URL fallback)', async () => {
    // Chunks routes like /api/chunks/connections/:server encode the tool
    // identity in the URL, not the body. The gate must pull that param so
    // DEGRADED_R5 denial still matches the right tool.
    const machine = new ViolationStateMachine();
    machine.applyRecompile({ violations: [r5()], lastGoodVersion: 1 });
    const app = express();
    app.use(express.json());
    app.patch('/servers/:server', violationGate({ machine }));
    app.patch('/servers/:server', (_req, res) => res.status(200).json({ ok: true }));
    const s = await listen(app);
    try {
      // URL param matches the blocked tool — 503.
      const blocked = await fetch(`${addr(s)}/servers/send_email`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(blocked.status).toBe(503);

      // URL param names a different tool — pass through.
      const allowed = await fetch(`${addr(s)}/servers/read_inbox`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(allowed.status).toBe(200);
    } finally {
      s.close();
    }
  });

  it('URL param :name is extracted when neither body nor :tool/:server present', async () => {
    const machine = new ViolationStateMachine();
    machine.applyRecompile({ violations: [r5()], lastGoodVersion: 1 });
    const app = express();
    app.use(express.json());
    app.patch('/items/:name', violationGate({ machine }));
    app.patch('/items/:name', (_req, res) => res.status(200).json({ ok: true }));
    const s = await listen(app);
    try {
      const blocked = await fetch(`${addr(s)}/items/send_email`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(blocked.status).toBe(503);
    } finally {
      s.close();
    }
  });

  it('body carries a non-string tool — ignored, DEGRADED_R5 fails closed (M-4)', async () => {
    // CP-7 R1 dragon M-4: when the gate cannot identify the target tool
    // the middleware must fail closed — otherwise a PATCH that omits
    // `tool` or supplies a malformed value would slip through to the
    // locked tool's URL.
    const machine = new ViolationStateMachine();
    machine.applyRecompile({ violations: [r5()], lastGoodVersion: 1 });
    const app = express();
    app.use(express.json());
    app.patch('/x', violationGate({ machine }));
    app.patch('/x', (_req, res) => res.status(200).json({ ok: true }));
    const s = await listen(app);
    try {
      const res = await fetch(`${addr(s)}/x`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 42 }),
      });
      expect(res.status).toBe(503);
      const body = (await res.json()) as { error: { code: string; state: string } };
      expect(body.error.code).toBe('GOVERNANCE_DEGRADED');
      expect(body.error.state).toBe('degraded_r5');
    } finally {
      s.close();
    }
  });
});

describe('status route — edge cases', () => {
  it('returns 501 when host is undefined', async () => {
    const app = express();
    app.use(statusRouter());
    const s = await listen(app);
    try {
      const res = await fetch(`${addr(s)}/status`);
      expect(res.status).toBe(501);
    } finally {
      s.close();
    }
  });

  it('returns zeros + violationState when IR is undefined but machine is wired', async () => {
    const machine = new ViolationStateMachine();
    machine.applyRecompile({ violations: [r5()], lastGoodVersion: 1 });
    const emptyHost = {
      getCachedIR: () => undefined,
      getCompiledAt: () => undefined,
      getHash: () => undefined,
      clear: () => undefined,
      hasCachedIR: false,
    } as unknown as import('../../src/compilation-host.js').CompilationHost;
    const app = express();
    app.use(statusRouter(emptyHost, machine));
    const s = await listen(app);
    try {
      const res = await fetch(`${addr(s)}/status`);
      const body = (await res.json()) as {
        fileCount: number;
        violationState: { status: string };
      };
      expect(body.fileCount).toBe(0);
      expect(body.violationState.status).toBe('degraded_r5');
    } finally {
      s.close();
    }
  });

  it('no machine wired → violationState absent', async () => {
    const app = express();
    app.use(statusRouter(stubHost()));
    const s = await listen(app);
    try {
      const res = await fetch(`${addr(s)}/status`);
      const body = (await res.json()) as { violationState?: unknown };
      expect(body.violationState).toBeUndefined();
    } finally {
      s.close();
    }
  });

  it('no machine + no IR → 200 without violationState block', async () => {
    const emptyHost = {
      getCachedIR: () => undefined,
      getCompiledAt: () => undefined,
      getHash: () => undefined,
      clear: () => undefined,
      hasCachedIR: false,
    } as unknown as import('../../src/compilation-host.js').CompilationHost;
    const app = express();
    app.use(statusRouter(emptyHost));
    const s = await listen(app);
    try {
      const res = await fetch(`${addr(s)}/status`);
      const body = (await res.json()) as {
        fileCount: number;
        violationState?: unknown;
      };
      expect(res.status).toBe(200);
      expect(body.fileCount).toBe(0);
      expect(body.violationState).toBeUndefined();
    } finally {
      s.close();
    }
  });
});
