/**
 * L2 e2e tests for the full external-write → violation → recovery cycle.
 *
 * Each scenario boots the violation-gate against a live HTTP server and
 * simulates the OC runtime / external editor flow:
 *   1. R5 violation cycle
 *   2. R3 (warning) cycle
 *   3. Structural error cycle
 *
 * No CompilationHost is wired — we drive the state machine directly from
 * the test body, which models "an external process just updated the
 * violation set" more faithfully than re-invoking the compiler.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express, { type Express } from 'express';
import type { Server } from 'node:http';
import {
  ViolationStateMachine,
  type ViolationInput,
} from '@bic/claws-sdk/workspace/violation-state.js';
import { violationGate } from '../../src/middleware/violation-gate.js';

function bootApp(machine: ViolationStateMachine): Express {
  const app = express();
  app.use(express.json());
  app.patch('/api/chunks/connections', violationGate({ machine }));
  app.patch('/api/chunks/connections', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

async function listen(app: Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function patch(s: Server, body: unknown): Promise<{ status: number; json: unknown }> {
  const a = s.address();
  if (a === null || typeof a === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(a.port)}/api/chunks/connections`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

let server: Server | undefined;

beforeEach(() => {
  server = undefined;
});

afterEach(() => {
  server?.close();
});

describe('violation-recovery e2e', () => {
  it('R5 cycle: external write → DEGRADED_R5 → tool blocked → fix → CLEAN', async () => {
    const machine = new ViolationStateMachine();
    server = await listen(bootApp(machine));

    // Step 1: external write installs a skill that trips R5.
    const r5: ViolationInput = {
      path: 'oc://TOOLS.md#wire_transfer',
      severity: 'error',
      rule: 'R5/transact',
      message: 'wire_transfer is R5',
      fixGuidance: 'Drop the skill or supply an approval',
      source: 'oc_runtime',
      scope: 'isolated',
      tool: 'wire_transfer',
      file: 'TOOLS.md',
    };
    machine.applyRecompile({ violations: [r5], lastGoodVersion: 10 });
    expect(machine.getState()).toBe('degraded_r5');

    // Step 2: PATCH on wire_transfer is blocked; other tools pass.
    const blocked = await patch(server, { tool: 'wire_transfer', enabled: true });
    expect(blocked.status).toBe(503);
    const other = await patch(server, { tool: 'read_inbox', enabled: true });
    expect(other.status).toBe(200);

    // Step 3: admin removes the offending skill; recompile is clean.
    machine.applyRecompile({ violations: [], lastGoodVersion: 11 });
    expect(machine.getState()).toBe('clean');

    const unblocked = await patch(server, { tool: 'wire_transfer', enabled: true });
    expect(unblocked.status).toBe(200);
  });

  it('R3 cycle: warning → DEGRADED_WARN → all PATCHes pass with warnings → CLEAN', async () => {
    const machine = new ViolationStateMachine();
    server = await listen(bootApp(machine));

    const warn: ViolationInput = {
      path: 'oc://PREFS.md',
      severity: 'warning',
      rule: 'G-INPUT-03',
      message: 'advisory: prefer fenced code blocks',
      fixGuidance: 'Fence the code block',
      source: 'external_edit',
      scope: 'isolated',
    };
    machine.applyRecompile({ violations: [warn], lastGoodVersion: 3 });
    expect(machine.getState()).toBe('degraded_warn');

    const stillAllowed = await patch(server, { tool: 'any_tool', enabled: true });
    expect(stillAllowed.status).toBe(200);

    machine.applyRecompile({ violations: [], lastGoodVersion: 4 });
    expect(machine.getState()).toBe('clean');
  });

  it('Structural cycle: corrupt SOUL.md → ERROR → non-repair 503 → repair passes → CLEAN', async () => {
    const machine = new ViolationStateMachine();
    server = await listen(bootApp(machine));

    const structural: ViolationInput = {
      path: 'oc://SOUL.md',
      severity: 'error',
      rule: 'parse/structural',
      message: 'SOUL.md YAML broke',
      fixGuidance: 'Restore SOUL.md from last known good snapshot',
      source: 'onedrive_sync',
      scope: 'structural',
      file: 'SOUL.md',
    };
    machine.applyRecompile({ violations: [structural], lastGoodVersion: 42 });
    expect(machine.getState()).toBe('error');

    // PATCH on a non-repair target is 503.
    const blocked = await patch(server, { path: 'oc://TOOLS.md' });
    expect(blocked.status).toBe(503);
    const blockedBody = blocked.json as { error: { state: string; lastGoodVersion: number } };
    expect(blockedBody.error.state).toBe('error');
    expect(blockedBody.error.lastGoodVersion).toBe(null);

    // PATCH targeting the repair path passes.
    const repair = await patch(server, { path: 'oc://SOUL.md' });
    expect(repair.status).toBe(200);

    // After fix, all writes resume.
    machine.applyRecompile({ violations: [], lastGoodVersion: 43 });
    expect(machine.getState()).toBe('clean');
    const resumed = await patch(server, { path: 'oc://TOOLS.md' });
    expect(resumed.status).toBe(200);
  });
});
