/**
 * L1 integration tests for /api/trust (Pulse 39 / S12 / S26).
 *
 * Boots createApp end-to-end and asserts the HTTP contract:
 *  - GET returns tier + history + pending escalations.
 *  - PATCH with a valid JWT escalates to the target tier.
 *  - PATCH with an invalid JWT returns 401.
 *  - PATCH with a replayed nonce returns 409.
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

const KEY = Buffer.from('integration-test-key-0123456789abcdef', 'utf-8');
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

function signWith(
  mgr: TrustManager,
  overrides: {
    targetTier: 'T1' | 'T2' | 'T3' | 'T4';
    jti?: string;
    exp?: number;
    sub?: string;
  },
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  // Let the manager default the `aud` claim to its workspace-scoped value
  // (CISO W4 — `claws/trust/escalate:<workspaceId>`). Both the test signer
  // and the server mount derive the same workspaceId from the shared
  // workspaceRoot, so the verifier accepts the token.
  return mgr.signApprovalJwt({
    sub: overrides.sub ?? 'manager-1',
    exp: overrides.exp ?? nowSec + 300,
    jti: overrides.jti ?? generateJti(),
    targetTier: overrides.targetTier,
    requester: 'alice',
  });
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'trust-int-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('/api/trust (Pulse 39)', () => {
  it('GET returns the current tier and empty history at start', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, {
      compileFn,
      workspaceRoot: root,
      trustSigningKey: KEY,
    });
    server = await listenApp(app);

    const res = await request(server, 'GET', '/api/trust');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      currentTier: string;
      history: unknown[];
      pendingEscalations: unknown[];
    };
    expect(body.currentTier).toBe('T0');
    expect(body.history).toEqual([]);
    expect(body.pendingEscalations).toEqual([]);
  });

  it('PATCH /api/trust/escalate succeeds with a valid JWT for T1 -> T2', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, {
      compileFn,
      workspaceRoot: root,
      trustSigningKey: KEY,
    });
    server = await listenApp(app);

    // First hop: T0 -> T1 self-service so the target JWT flow isn't skipped.
    const first = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T1',
      justification: 'self-service',
    });
    expect(first.status).toBe(200);

    // Sign the T1 -> T2 JWT using the same key the server was booted with.
    const signer = new TrustManager({ workspaceRoot: root, signingKey: KEY });
    const jwt = signWith(signer, { targetTier: 'T2' });
    const res = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T2',
      justification: 'legit promotion',
      approvalJwt: jwt,
    });
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      currentTier: string;
      transition: { from: string; to: string; approver: string };
    };
    expect(body.currentTier).toBe('T2');
    expect(body.transition.from).toBe('T1');
    expect(body.transition.to).toBe('T2');
    expect(body.transition.approver).toBe('manager-1');
  });

  it('PATCH with a JWT signed by the wrong key returns 401', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, {
      compileFn,
      workspaceRoot: root,
      trustSigningKey: KEY,
    });
    server = await listenApp(app);

    await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T1',
      justification: 'self',
    });

    const impostor = new TrustManager({
      workspaceRoot: root,
      signingKey: Buffer.from('wrong-key', 'utf-8'),
    });
    const jwt = signWith(impostor, { targetTier: 'T2' });
    const res = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T2',
      justification: 'attack',
      approvalJwt: jwt,
    });
    expect(res.status).toBe(401);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('JWT_BAD_SIGNATURE');
  });

  it('PATCH returns 400 for missing/invalid targetTier and missing justification', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, {
      compileFn,
      workspaceRoot: root,
      trustSigningKey: KEY,
    });
    server = await listenApp(app);

    // (a) unknown tier string
    const noTier = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T99',
      justification: 'x',
    });
    expect(noTier.status).toBe(400);
    expect((JSON.parse(noTier.body) as { error: { code: string } }).error.code).toBe(
      'TIER_INVALID',
    );

    // (b) missing justification
    const noJust = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T1',
    });
    expect(noJust.status).toBe(400);
    expect(
      (JSON.parse(noJust.body) as { error: { code: string } }).error.code,
    ).toBe('JUSTIFICATION_REQUIRED');

    // (c) TIER_NOT_PROMOTION from the SDK surfaces as 400
    // (request T0 from initial state T0)
    const samePath = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T0',
      justification: 'noop',
    });
    expect(samePath.status).toBe(400);
    expect(
      (JSON.parse(samePath.body) as { error: { code: string } }).error.code,
    ).toBe('TIER_NOT_PROMOTION');
  });

  it('PATCH with a replayed nonce returns 409', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, {
      compileFn,
      workspaceRoot: root,
      trustSigningKey: KEY,
    });
    server = await listenApp(app);

    await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T1',
      justification: 'self',
    });

    const signer = new TrustManager({ workspaceRoot: root, signingKey: KEY });
    const jti = generateJti();
    const jwt = signWith(signer, { targetTier: 'T2', jti });
    const first = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T2',
      justification: 'first',
      approvalJwt: jwt,
    });
    expect(first.status).toBe(200);

    // Replay the SAME token — the server's nonce store rejects it. The
    // tier is already T2 so we request T3 with the same (already-consumed)
    // jti payload, which fails at the nonce check before the tier check.
    const replay = await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T3',
      justification: 'replay',
      approvalJwt: jwt,
    });
    expect(replay.status).toBe(409);
    const body = JSON.parse(replay.body) as { error: { code: string } };
    expect(body.error.code).toBe('JWT_REPLAYED');
  });

  // CP-7 R1 FIX-E — C6 / dragon M-2 / ciso M3: trust signing key required.
  it('createApp throws when compileFn is set but trustSigningKey is omitted', () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    expect(() =>
      createApp(state, {
        compileFn,
        workspaceRoot: root,
        // deliberately omit trustSigningKey
      }),
    ).toThrowError(/trust\.signingKey is required/);
  });

  it('createApp without compileFn does NOT require trustSigningKey', () => {
    // Read-only health harness path — no trust router is mounted so the
    // boot check must not fire.
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    expect(() => createApp(state, { workspaceRoot: root })).not.toThrow();
  });

  // CP-7 R1 FIX-D — C5 / gateway-eng K / dragon M-3: trust/escalate now
  // rides the commitOnSuccess stack so VersionStore advances on each
  // successful tier transition and `/api/diff` surfaces the escalation as
  // a version bump. Two assertions are interleaved: (1) the response ETag
  // header carries the new version, (2) a second GET observes a bigger
  // counter than the first.
  it('successful escalate advances the VersionStore counter', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, {
      compileFn,
      workspaceRoot: root,
      trustSigningKey: KEY,
    });
    server = await listenApp(app);

    // Prime the compile cache so commitOnSuccess can record a snapshot
    // against a populated IR (the wrapper short-circuits when the host
    // has no cached IR).
    await fetch(`http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    // Baseline ETag from the GET surface.
    const addr = server.address() as import('node:net').AddressInfo;
    const getRes = await fetch(`http://127.0.0.1:${String(addr.port)}/api/trust`);
    expect(getRes.status).toBe(200);
    const baseEtag = getRes.headers.get('etag');
    expect(baseEtag).toBeTruthy();
    const baseVersion = Number(baseEtag!.replace(/"/g, ''));

    // T0 → T1 self-service. No JWT required — the commit path still runs.
    const escalateRes = await fetch(
      `http://127.0.0.1:${String(addr.port)}/api/trust/escalate`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetTier: 'T1', justification: 'self' }),
      },
    );
    expect(escalateRes.status).toBe(200);
    const postEtag = escalateRes.headers.get('etag');
    expect(postEtag).toBeTruthy();
    const postVersion = Number(postEtag!.replace(/"/g, ''));
    expect(postVersion).toBeGreaterThan(baseVersion);

    // Second GET observes the advanced counter.
    const get2 = await fetch(`http://127.0.0.1:${String(addr.port)}/api/trust`);
    const get2Version = Number((get2.headers.get('etag') ?? '"0"').replace(/"/g, ''));
    expect(get2Version).toBeGreaterThanOrEqual(postVersion);
  });

  it('diff endpoint shows the escalation as a version transition', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, {
      compileFn,
      workspaceRoot: root,
      trustSigningKey: KEY,
    });
    server = await listenApp(app);

    const addr = server.address() as import('node:net').AddressInfo;
    // Prime the compile cache — commitOnSuccess only records a snapshot
    // when the host has a populated IR.
    await fetch(`http://127.0.0.1:${String(addr.port)}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    // First self-service escalate — records a VersionStore snapshot at
    // version N via commitOnSuccess.
    const escalate1 = await fetch(
      `http://127.0.0.1:${String(addr.port)}/api/trust/escalate`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetTier: 'T1', justification: 'self' }),
      },
    );
    expect(escalate1.status).toBe(200);
    const afterFirst = Number(escalate1.headers.get('etag')!.replace(/"/g, ''));

    // Second escalate (T1 → T2 with a JWT) advances to version N+1 with
    // a second recorded snapshot. Now `/api/diff?from=v<N>&to=v<N+1>`
    // has both endpoints resolvable via the VersionStore — a 200 proves
    // the escalation chain left durable snapshot evidence.
    const signer = new TrustManager({ workspaceRoot: root, signingKey: KEY });
    const jwt = signWith(signer, { targetTier: 'T2' });
    const escalate2 = await fetch(
      `http://127.0.0.1:${String(addr.port)}/api/trust/escalate`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetTier: 'T2',
          justification: 'promote',
          approvalJwt: jwt,
        }),
      },
    );
    expect(escalate2.status).toBe(200);
    const afterSecond = Number(escalate2.headers.get('etag')!.replace(/"/g, ''));
    expect(afterSecond).toBeGreaterThan(afterFirst);

    const diff = await fetch(
      `http://127.0.0.1:${String(addr.port)}/api/diff?from=v${String(afterFirst)}&to=v${String(afterSecond)}`,
    );
    expect(diff.status).toBe(200);
    const body = (await diff.json()) as {
      from: { version: number };
      to: { version: number };
    };
    expect(body.from.version).toBe(afterFirst);
    expect(body.to.version).toBe(afterSecond);
  });

  // CP-7 R1 FIX-E — ciso W4: workspace-scoped JWT audience.
  it('rejects a JWT minted for a different workspace (cross-workspace replay)', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, {
      compileFn,
      workspaceRoot: root,
      trustSigningKey: KEY,
    });
    server = await listenApp(app);

    await request(server, 'PATCH', '/api/trust/escalate', {
      targetTier: 'T1',
      justification: 'self',
    });

    // Signer bound to a DIFFERENT workspace root (different workspaceId).
    // The token it mints will carry `aud: claws/trust/escalate:<otherId>`
    // and must be rejected by the server's verifier.
    const otherRoot = await mkdtemp(join(tmpdir(), 'trust-other-'));
    try {
      const otherSigner = new TrustManager({
        workspaceRoot: otherRoot,
        signingKey: KEY,
      });
      const jwt = signWith(otherSigner, { targetTier: 'T2' });
      const res = await request(server, 'PATCH', '/api/trust/escalate', {
        targetTier: 'T2',
        justification: 'cross-workspace',
        approvalJwt: jwt,
      });
      expect(res.status).toBe(403);
      const body = JSON.parse(res.body) as { error: { code: string } };
      expect(body.error.code).toBe('JWT_BAD_AUDIENCE');
    } finally {
      await rm(otherRoot, { recursive: true, force: true });
    }
  });
});
