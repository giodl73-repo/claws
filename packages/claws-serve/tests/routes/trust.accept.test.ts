/**
 * L3 acceptance tests — Pulse 39 scenarios S12 + S26.
 *
 * S12: trust tier escalation with manager approval flow.
 *   - Self-service T0 -> T1.
 *   - Manager-approved T1 -> T2 -> T3 progression.
 *   - History records every transition with approver identity.
 *   - Replay of a consumed JWT is rejected (409).
 *
 * S26: JWT verification enforces all 5 checks.
 *   - Signature, audience, subject, expiry, one-time nonce.
 *   - Every individual check fails closed with a distinct error code
 *     so the CISO's playbook can map each to a response.
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

const KEY = Buffer.from('accept-signing-key-0123456789abcd', 'utf-8');
const WRONG_KEY = Buffer.from('attacker-signing-key-aaaaaaaaaaaa', 'utf-8');
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

async function bootServer(): Promise<Server> {
  const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
  const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
  const app = createApp(state, {
    compileFn,
    workspaceRoot: root,
    trustSigningKey: KEY,
  });
  return listenApp(app);
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'trust-accept-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('S12 — trust tier escalation with manager approval flow', () => {
  it('walks T0 -> T1 -> T2 -> T3, records history, and blocks replay', async () => {
    server = await bootServer();
    const signer = new TrustManager({ workspaceRoot: root, signingKey: KEY });
    const nowSec = Math.floor(Date.now() / 1000);

    // T0 -> T1 self-service
    const h1 = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T1',
      justification: 'initial onboarding',
    });
    expect(h1.status).toBe(200);

    // T1 -> T2 (manager-approved)
    const jwt12 = signer.signApprovalJwt({
      sub: 'manager-1',
      exp: nowSec + 300,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const h2 = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T2',
      justification: 'broad tool access',
      approvalJwt: jwt12,
    });
    expect(h2.status).toBe(200);

    // T2 -> T3 (manager-approved; different manager)
    const jwt23 = signer.signApprovalJwt({
      sub: 'manager-2',
      exp: nowSec + 300,
      jti: generateJti(),
      targetTier: 'T3',
      requester: 'alice',
    });
    const h3 = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T3',
      justification: 'fleet-wide admin',
      approvalJwt: jwt23,
    });
    expect(h3.status).toBe(200);

    // Replay of the already-consumed T1->T2 JWT is rejected.
    const replay = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T4',
      justification: 'replay-attack',
      approvalJwt: jwt12,
    });
    expect(replay.status).toBe(409);

    // Final state: T3, history has three transitions, approvers correct.
    const final = await request(server, 'GET', '/api/trust');
    const body = JSON.parse(final.body) as {
      currentTier: string;
      history: Array<{ from: string; to: string; approver: string }>;
    };
    expect(body.currentTier).toBe('T3');
    expect(body.history).toHaveLength(3);
    expect(body.history.map((h) => h.approver)).toEqual([
      'self',
      'manager-1',
      'manager-2',
    ]);
  });
});

describe('S26 — JWT verification enforces all 5 checks', () => {
  it('fails closed on each of signature/audience/subject/expiry/nonce independently', async () => {
    server = await bootServer();
    const goodSigner = new TrustManager({ workspaceRoot: root, signingKey: KEY });
    const badSigner = new TrustManager({ workspaceRoot: root, signingKey: WRONG_KEY });
    const nowSec = Math.floor(Date.now() / 1000);

    // Advance to T1 so every test below probes the T1+ approval path.
    await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T1',
      justification: 'self',
    });

    // (1) Signature: token signed with attacker key -> 401 JWT_BAD_SIGNATURE.
    const badSig = badSigner.signApprovalJwt({
      sub: 'manager-1',
      exp: nowSec + 300,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const sigRes = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T2',
      justification: 'x',
      approvalJwt: badSig,
    });
    expect(sigRes.status).toBe(401);
    expect(
      (JSON.parse(sigRes.body) as { error: { code: string } }).error.code,
    ).toBe('JWT_BAD_SIGNATURE');

    // (2) Audience: wrong aud -> 403 JWT_BAD_AUDIENCE.
    const badAud = goodSigner.signApprovalJwt({
      aud: 'claws/some-other-surface',
      sub: 'manager-1',
      exp: nowSec + 300,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const audRes = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T2',
      justification: 'x',
      approvalJwt: badAud,
    });
    expect(audRes.status).toBe(403);
    expect(
      (JSON.parse(audRes.body) as { error: { code: string } }).error.code,
    ).toBe('JWT_BAD_AUDIENCE');

    // (3) Subject: empty sub -> 403 JWT_BAD_SUBJECT. Default aud is
    // the workspace-scoped audience that the server expects.
    const badSub = goodSigner.signApprovalJwt({
      sub: '',
      exp: nowSec + 300,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const subRes = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T2',
      justification: 'x',
      approvalJwt: badSub,
    });
    expect(subRes.status).toBe(403);
    expect(
      (JSON.parse(subRes.body) as { error: { code: string } }).error.code,
    ).toBe('JWT_BAD_SUBJECT');

    // (4) Expiry: exp 60 seconds in the past — beyond the 30s default
    // clock-skew leeway (platform-eng W1) — rejected 401 JWT_EXPIRED.
    const expired = goodSigner.signApprovalJwt({
      sub: 'manager-1',
      exp: nowSec - 60,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const expRes = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T2',
      justification: 'x',
      approvalJwt: expired,
    });
    expect(expRes.status).toBe(401);
    expect(
      (JSON.parse(expRes.body) as { error: { code: string } }).error.code,
    ).toBe('JWT_EXPIRED');

    // (5) Nonce replay: first token succeeds, second time the SAME jti -> 409.
    const jti = generateJti();
    const good = goodSigner.signApprovalJwt({
      sub: 'manager-1',
      exp: nowSec + 300,
      jti,
      targetTier: 'T2',
      requester: 'alice',
    });
    const firstUse = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T2',
      justification: 'first',
      approvalJwt: good,
    });
    expect(firstUse.status).toBe(200);
    const replayUse = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T3',
      justification: 'replay',
      approvalJwt: good,
    });
    expect(replayUse.status).toBe(409);
    expect(
      (JSON.parse(replayUse.body) as { error: { code: string } }).error.code,
    ).toBe('JWT_REPLAYED');
  });
});
