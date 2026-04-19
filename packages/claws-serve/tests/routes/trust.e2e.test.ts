/**
 * L2 e2e test for /api/trust (Pulse 39 / S12).
 *
 * Full escalation flow T0 -> T1 (self-service) -> T2 (JWT-approved) over
 * the wire, including the GET snapshot between each hop so the history
 * projection is verified at every stage.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceIR } from '@bic/claws-sdk';
import {
  TrustManager,
  generateJti,
} from '@bic/claws-sdk/workspace';
import { createApp, type ServerState } from '../../src/server.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

const KEY = Buffer.from('e2e-test-signing-key-0123456789', 'utf-8');
const SOUL = '# Soul\n\n## Purpose\n\n- govern\n';
const HEARTBEAT = '# Heartbeat\n\n## On Start\n\n- Boot\n';

let root: string;
let server: Server | undefined;

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function request(
  server: Server,
  method: 'GET' | 'PATCH',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'content-type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`, init);
  return { status: res.status, body: await res.text() };
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'trust-e2e-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('Trust escalation e2e (Pulse 39)', () => {
  it('T0 -> T1 -> T2 full flow records history and advances currentTier', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, {
      compileFn,
      workspaceRoot: root,
      trustSigningKey: KEY,
    });
    server = await listenApp(app);

    // Snapshot at rest.
    const start = await request(server, 'GET', '/api/trust');
    expect(start.status).toBe(200);
    const startBody = JSON.parse(start.body) as {
      currentTier: string;
      history: unknown[];
    };
    expect(startBody.currentTier).toBe('T0');
    expect(startBody.history).toEqual([]);

    // Hop 1: T0 -> T1 self-service (no JWT).
    const hop1 = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T1',
      justification: 'onboarding',
    });
    expect(hop1.status).toBe(200);
    const hop1Body = JSON.parse(hop1.body) as {
      currentTier: string;
      transition: { from: string; to: string; approver: string };
    };
    expect(hop1Body.currentTier).toBe('T1');
    expect(hop1Body.transition.from).toBe('T0');
    expect(hop1Body.transition.to).toBe('T1');
    expect(hop1Body.transition.approver).toBe('self');

    // Hop 2: T1 -> T2 with a manager-signed JWT.
    const signer = new TrustManager({ workspaceRoot: root, signingKey: KEY });
    const nowSec = Math.floor(Date.now() / 1000);
    // Default aud derives from the signer's workspaceRoot (CISO W4);
    // same workspaceRoot as the server so the verifier accepts.
    const jwt = signer.signApprovalJwt({
      sub: 'manager-alice',
      exp: nowSec + 300,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'bob',
    });
    const hop2 = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T2',
      justification: 'broad access for migration',
      approvalJwt: jwt,
    });
    expect(hop2.status).toBe(200);
    const hop2Body = JSON.parse(hop2.body) as {
      currentTier: string;
      transition: { from: string; to: string; approver: string };
    };
    expect(hop2Body.currentTier).toBe('T2');
    expect(hop2Body.transition.approver).toBe('manager-alice');

    // Final GET: both transitions recorded in order.
    const final = await request(server, 'GET', '/api/trust');
    const finalBody = JSON.parse(final.body) as {
      currentTier: string;
      history: Array<{ from: string; to: string; approver: string; justification: string }>;
    };
    expect(finalBody.currentTier).toBe('T2');
    expect(finalBody.history).toHaveLength(2);
    expect(finalBody.history[0]!.from).toBe('T0');
    expect(finalBody.history[0]!.to).toBe('T1');
    expect(finalBody.history[0]!.approver).toBe('self');
    expect(finalBody.history[0]!.justification).toBe('onboarding');
    expect(finalBody.history[1]!.from).toBe('T1');
    expect(finalBody.history[1]!.to).toBe('T2');
    expect(finalBody.history[1]!.approver).toBe('manager-alice');
    expect(finalBody.history[1]!.justification).toBe('broad access for migration');
  });
});
