/**
 * L0 unit tests for TrustManager (Pulse 39 / S12 / S26).
 *
 * Every test exercises a fail-closed path so the HTTP adapter has a stable
 * mapping to 401/403/409.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  TrustManager,
  deriveWorkspaceId,
  generateJti,
  scopedTrustAudience,
  DEFAULT_JWT_LEEWAY_MS,
  JWT_NONCE_STORE_FILE,
  TRUST_JWT_AUDIENCE,
} from '../../src/workspace/trust-manager.js';

const KEY = Buffer.from('0123456789abcdef0123456789abcdef', 'utf-8');
const OTHER_KEY = Buffer.from('ffffffffffffffffffffffffffffffff', 'utf-8');

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'trust-mgr-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function makeManager(opts: { key?: Buffer; now?: () => Date } = {}): TrustManager {
  return new TrustManager({
    workspaceRoot: root,
    signingKey: opts.key ?? KEY,
    now: opts.now,
  });
}

describe('TrustManager — L0 unit (P39)', () => {
  it('T0 -> T1 promotion is self-service and records the transition', async () => {
    const mgr = makeManager();
    const result = await mgr.escalate({
      targetTier: 'T1',
      justification: 'new feature',
      requester: 'alice',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.record.from).toBe('T0');
    expect(result.record.to).toBe('T1');
    expect(result.record.approver).toBe('self');
    expect(mgr.getState().currentTier).toBe('T1');
    expect(mgr.getState().history).toHaveLength(1);
  });

  it('T1 -> T2 requires a manager-signed approval JWT (missing => JWT_MISSING)', async () => {
    const mgr = makeManager();
    await mgr.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });
    const result = await mgr.escalate({
      targetTier: 'T2',
      justification: 'needs broad access',
      requester: 'alice',
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe('JWT_MISSING');
    // Tier must not have changed.
    expect(mgr.getState().currentTier).toBe('T1');
  });

  it('JWT signature tamper rejected with JWT_BAD_SIGNATURE', async () => {
    const mgr = makeManager();
    await mgr.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });

    const now = mgr['options'].now();
    const jwt = mgr.signApprovalJwt({
      sub: 'manager-1',
      exp: Math.floor(now.getTime() / 1000) + 300,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    // Re-sign with a different key to produce a guaranteed-bad signature
    // without disturbing payload parsing.
    const impostor = new TrustManager({ workspaceRoot: root, signingKey: OTHER_KEY });
    const [h, p] = jwt.split('.') as [string, string, string];
    const forged = impostor.signApprovalJwt({
      sub: 'manager-1',
      exp: Math.floor(now.getTime() / 1000) + 300,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const [, , badSig] = forged.split('.') as [string, string, string];
    const tampered = `${h}.${p}.${badSig}`;

    const result = await mgr.escalate({
      targetTier: 'T2',
      justification: 'broad',
      requester: 'alice',
      jwt: tampered,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe('JWT_BAD_SIGNATURE');
  });

  it('JWT audience mismatch rejected with JWT_BAD_AUDIENCE', async () => {
    const mgr = makeManager();
    await mgr.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });
    const nowSec = Math.floor(Date.now() / 1000);
    const jwt = mgr.signApprovalJwt({
      aud: 'claws/trust/wrong',
      sub: 'manager-1',
      exp: nowSec + 300,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const result = await mgr.escalate({
      targetTier: 'T2',
      justification: 'broad',
      requester: 'alice',
      jwt,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe('JWT_BAD_AUDIENCE');
    expect(result.error.message).toContain(TRUST_JWT_AUDIENCE);
  });

  it('JWT subject empty rejected with JWT_BAD_SUBJECT', async () => {
    const mgr = makeManager();
    await mgr.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });
    const nowSec = Math.floor(Date.now() / 1000);
    const jwt = mgr.signApprovalJwt({
      sub: '',
      exp: nowSec + 300,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const result = await mgr.escalate({
      targetTier: 'T2',
      justification: 'broad',
      requester: 'alice',
      jwt,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe('JWT_BAD_SUBJECT');
  });

  it('expired JWT rejected with JWT_EXPIRED', async () => {
    // Manager "now" is 2026-04-17T12:00:00Z.
    const clock = new Date('2026-04-17T12:00:00Z');
    const mgr = makeManager({ now: (): Date => clock });
    await mgr.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });
    // Token exp is 2026-04-17T11:55:00Z (5 minutes in the past).
    const expSec = Math.floor(clock.getTime() / 1000) - 300;
    const jwt = mgr.signApprovalJwt({
      sub: 'manager-1',
      exp: expSec,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const result = await mgr.escalate({
      targetTier: 'T2',
      justification: 'broad',
      requester: 'alice',
      jwt,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe('JWT_EXPIRED');
  });

  it('one-time nonce prevents replay and persists across restart', async () => {
    const clock = new Date('2026-04-17T12:00:00Z');
    const mgr = makeManager({ now: (): Date => clock });
    await mgr.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });

    const jti = generateJti();
    const jwt = mgr.signApprovalJwt({
      sub: 'manager-1',
      exp: Math.floor(clock.getTime() / 1000) + 300,
      jti,
      targetTier: 'T2',
      requester: 'alice',
    });
    const first = await mgr.escalate({
      targetTier: 'T2',
      justification: 'first',
      requester: 'alice',
      jwt,
    });
    expect(first.ok).toBe(true);

    // Replay against the same manager -> cannot re-escalate (already T2) but
    // nonce replay also fires. Use a NEW manager instance targeting T1 -> T2
    // again from a clean slate so we isolate the replay signal.
    const mgr2 = makeManager({ now: (): Date => clock });
    await mgr2.escalate({ targetTier: 'T1', justification: 'y', requester: 'bob' });
    const replay = await mgr2.escalate({
      targetTier: 'T2',
      justification: 'replay',
      requester: 'bob',
      jwt,
    });
    expect(replay.ok).toBe(false);
    if (replay.ok) throw new Error('unreachable');
    expect(replay.error.code).toBe('JWT_REPLAYED');

    // Nonce store must be on disk so a process restart also rejects replay.
    const stored = JSON.parse(
      await readFile(join(root, JWT_NONCE_STORE_FILE), 'utf-8'),
    ) as { nonces: Array<{ jti: string }> };
    expect(stored.nonces.some((n) => n.jti === jti)).toBe(true);
  });

  it('rejects malformed tokens (wrong segment count, bad alg, missing jti) and mismatched targetTier', async () => {
    const mgr = makeManager();
    await mgr.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });

    // Not three parts → JWT_MALFORMED.
    const r1 = await mgr.escalate({
      targetTier: 'T2',
      justification: 'x',
      requester: 'alice',
      jwt: 'abc.def',
    });
    expect(r1.ok).toBe(false);
    if (r1.ok) throw new Error('unreachable');
    expect(r1.error.code).toBe('JWT_MALFORMED');

    // Header is valid base64url of junk → JSON.parse throws → JWT_MALFORMED.
    const gibberish = 'bm90LWpzb24.bm90LWpzb24.c2ln';
    const r2 = await mgr.escalate({
      targetTier: 'T2',
      justification: 'x',
      requester: 'alice',
      jwt: gibberish,
    });
    expect(r2.ok).toBe(false);
    if (r2.ok) throw new Error('unreachable');
    expect(r2.error.code).toBe('JWT_MALFORMED');

    // Bad alg in header (RS256) → JWT_MALFORMED.
    const rsHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const rsPayload = Buffer.from(
      JSON.stringify({
        aud: TRUST_JWT_AUDIENCE,
        sub: 'm',
        exp: Math.floor(Date.now() / 1000) + 300,
        jti: generateJti(),
        targetTier: 'T2',
        requester: 'alice',
      }),
    ).toString('base64url');
    const r3 = await mgr.escalate({
      targetTier: 'T2',
      justification: 'x',
      requester: 'alice',
      jwt: `${rsHeader}.${rsPayload}.sig`,
    });
    expect(r3.ok).toBe(false);
    if (r3.ok) throw new Error('unreachable');
    expect(r3.error.code).toBe('JWT_MALFORMED');

    // Empty jti → JWT_MALFORMED (distinct from missing-sub check).
    const clock = new Date('2026-04-18T12:00:00Z');
    const mgr2 = makeManager({ now: (): Date => clock });
    await mgr2.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });
    const noJti = mgr2.signApprovalJwt({
      sub: 'manager-1',
      exp: Math.floor(clock.getTime() / 1000) + 300,
      jti: '',
      targetTier: 'T2',
      requester: 'alice',
    });
    const r4 = await mgr2.escalate({
      targetTier: 'T2',
      justification: 'x',
      requester: 'alice',
      jwt: noJti,
    });
    expect(r4.ok).toBe(false);
    if (r4.ok) throw new Error('unreachable');
    expect(r4.error.code).toBe('JWT_MALFORMED');

    // JWT targetTier != requested → JWT_BAD_SUBJECT.
    const mgr3 = makeManager({ now: (): Date => clock });
    await mgr3.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });
    const mismatched = mgr3.signApprovalJwt({
      sub: 'manager-1',
      exp: Math.floor(clock.getTime() / 1000) + 300,
      jti: generateJti(),
      targetTier: 'T3',
      requester: 'alice',
    });
    const r5 = await mgr3.escalate({
      targetTier: 'T2',
      justification: 'x',
      requester: 'alice',
      jwt: mismatched,
    });
    expect(r5.ok).toBe(false);
    if (r5.ok) throw new Error('unreachable');
    expect(r5.error.code).toBe('JWT_BAD_SUBJECT');
  });

  it('rejects tier-shape errors (unknown tier, non-promotion)', async () => {
    const mgr = makeManager();
    const r1 = await mgr.escalate({
      targetTier: 'T9' as unknown as 'T4',
      justification: 'x',
      requester: 'alice',
    });
    expect(r1.ok).toBe(false);
    if (r1.ok) throw new Error('unreachable');
    expect(r1.error.code).toBe('TIER_INVALID');

    // Same-tier request → TIER_NOT_PROMOTION.
    const r2 = await mgr.escalate({
      targetTier: 'T0',
      justification: 'x',
      requester: 'alice',
    });
    expect(r2.ok).toBe(false);
    if (r2.ok) throw new Error('unreachable');
    expect(r2.error.code).toBe('TIER_NOT_PROMOTION');
  });

  it('hydrate loads persisted nonces and tolerates missing/malformed/corrupt files', async () => {
    // (a) Missing file — hydrate is a no-op, no crash.
    const mgr1 = makeManager();
    await mgr1.hydrate();
    expect(mgr1.getState().history).toEqual([]);

    // (b) Wrong-version envelope — treated as empty (silent skip).
    const storePath = join(root, JWT_NONCE_STORE_FILE);
    await mkdir(dirname(storePath), { recursive: true });
    await writeFile(
      storePath,
      JSON.stringify({ version: 99, nonces: [{ jti: 'x', expMs: Date.now() + 60000 }] }),
      'utf-8',
    );
    const mgr2 = makeManager();
    await mgr2.hydrate();
    // hydrate is idempotent — second call returns immediately without re-reading.
    await mgr2.hydrate();

    // (c) Valid envelope with expired + live nonces — only live ones are retained.
    const clock = new Date('2026-04-18T12:00:00Z');
    const nowMs = clock.getTime();
    await writeFile(
      storePath,
      JSON.stringify({
        version: 1,
        nonces: [
          { jti: 'expired', expMs: nowMs - 1 },
          { jti: 'live', expMs: nowMs + 60000 },
        ],
      }),
      'utf-8',
    );
    const mgr3 = makeManager({ now: (): Date => clock });
    await mgr3.hydrate();
    // A JWT with jti=live should replay (JWT_REPLAYED). A JWT with jti=expired
    // is not in the store, so it proceeds past the nonce check.
    await mgr3.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });
    const liveJwt = mgr3.signApprovalJwt({
      sub: 'manager-1',
      exp: Math.floor(nowMs / 1000) + 300,
      jti: 'live',
      targetTier: 'T2',
      requester: 'alice',
    });
    const replayResult = await mgr3.escalate({
      targetTier: 'T2',
      justification: 'x',
      requester: 'alice',
      jwt: liveJwt,
    });
    expect(replayResult.ok).toBe(false);
    if (replayResult.ok) throw new Error('unreachable');
    expect(replayResult.error.code).toBe('JWT_REPLAYED');

    // (d) Corrupt file — hydrate logs but does not crash.
    await writeFile(storePath, '{ not valid json', 'utf-8');
    const mgr4 = makeManager();
    await mgr4.hydrate();
    expect(mgr4.getState().currentTier).toBe('T0');
  });

  it('pruneExpiredNonces drops stale entries', async () => {
    const clock = { value: new Date('2026-04-18T12:00:00Z') };
    const mgr = makeManager({ now: (): Date => clock.value });
    await mgr.recordNonce('a', clock.value.getTime() + 60_000);
    await mgr.recordNonce('b', clock.value.getTime() + 120_000);
    // Jump clock past the first nonce's expiry.
    clock.value = new Date('2026-04-18T12:01:30Z');
    mgr.pruneExpiredNonces();
    // Re-record 'a' must now succeed (proves it was dropped).
    await mgr.recordNonce('a', clock.value.getTime() + 60_000);
  });

  it('tier history records every transition with timestamp, justification, approver', async () => {
    const clock = new Date('2026-04-17T12:00:00Z');
    const mgr = makeManager({ now: (): Date => clock });
    await mgr.escalate({ targetTier: 'T1', justification: 'self', requester: 'alice' });

    const jwt = mgr.signApprovalJwt({
      sub: 'manager-42',
      exp: Math.floor(clock.getTime() / 1000) + 300,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    await mgr.escalate({
      targetTier: 'T2',
      justification: 'needed',
      requester: 'alice',
      jwt,
    });

    const history = mgr.getState().history;
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      from: 'T0',
      to: 'T1',
      justification: 'self',
      approver: 'self',
    });
    expect(history[0]!.at).toBe('2026-04-17T12:00:00.000Z');
    expect(history[1]).toMatchObject({
      from: 'T1',
      to: 'T2',
      justification: 'needed',
      approver: 'manager-42',
    });
  });

  // CP-7 R1 FIX-E — ciso M4: nonce consume-on-verify.
  it('consumes the nonce even when tier-shape check fails (ciso M4)', async () => {
    const clock = new Date('2026-04-18T12:00:00Z');
    const mgr = makeManager({ now: (): Date => clock });
    await mgr.escalate({ targetTier: 'T1', justification: 'self', requester: 'alice' });

    // Attacker mints a valid T1→T2 JWT but probes T3 first.
    const jti = generateJti();
    const jwt = mgr.signApprovalJwt({
      sub: 'manager-1',
      exp: Math.floor(clock.getTime() / 1000) + 300,
      jti,
      targetTier: 'T2',
      requester: 'alice',
    });

    // First use with mismatched tier — must fail but still burn the nonce.
    const probe = await mgr.escalate({
      targetTier: 'T3',
      justification: 'probe',
      requester: 'alice',
      jwt,
    });
    expect(probe.ok).toBe(false);
    if (probe.ok) throw new Error('unreachable');
    expect(probe.error.code).toBe('JWT_BAD_SUBJECT');

    // Second use with the matching tier — must now be rejected as replay.
    const replay = await mgr.escalate({
      targetTier: 'T2',
      justification: 'follow-up',
      requester: 'alice',
      jwt,
    });
    expect(replay.ok).toBe(false);
    if (replay.ok) throw new Error('unreachable');
    expect(replay.error.code).toBe('JWT_REPLAYED');

    // Tier must still be T1 — nothing promoted during the probe.
    expect(mgr.getState().currentTier).toBe('T1');
  });

  it('nonce is persisted on verify-ok even when subsequent tier check fails', async () => {
    const clock = new Date('2026-04-18T12:00:00Z');
    const mgr = makeManager({ now: (): Date => clock });
    await mgr.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });

    const jti = generateJti();
    const jwt = mgr.signApprovalJwt({
      sub: 'manager-1',
      exp: Math.floor(clock.getTime() / 1000) + 300,
      jti,
      targetTier: 'T2',
      requester: 'alice',
    });

    // Burn the token via a mismatched request.
    const probe = await mgr.escalate({
      targetTier: 'T3',
      justification: 'probe',
      requester: 'alice',
      jwt,
    });
    expect(probe.ok).toBe(false);

    // The on-disk nonce store must reflect the burned jti so a process
    // restart cannot replay either.
    const stored = JSON.parse(
      await readFile(join(root, JWT_NONCE_STORE_FILE), 'utf-8'),
    ) as { nonces: Array<{ jti: string }> };
    expect(stored.nonces.some((n) => n.jti === jti)).toBe(true);
  });

  // CP-7 R1 FIX-E — platform-eng W1: clock-skew leeway.
  it('accepts tokens expired within the default 30s leeway window', async () => {
    const clock = new Date('2026-04-18T12:00:00Z');
    const mgr = makeManager({ now: (): Date => clock });
    await mgr.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });

    // Token exp is 10 seconds in the PAST — strict check would reject,
    // leeway-aware check accepts.
    const expSec = Math.floor(clock.getTime() / 1000) - 10;
    const jwt = mgr.signApprovalJwt({
      sub: 'manager-1',
      exp: expSec,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const result = await mgr.escalate({
      targetTier: 'T2',
      justification: 'drifted',
      requester: 'alice',
      jwt,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.record.to).toBe('T2');
  });

  it('rejects tokens expired beyond the leeway window', async () => {
    const clock = new Date('2026-04-18T12:00:00Z');
    const mgr = makeManager({ now: (): Date => clock });
    await mgr.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });

    // Token exp is 60 seconds in the past — beyond 30s default leeway.
    const expSec = Math.floor(clock.getTime() / 1000) - 60;
    const jwt = mgr.signApprovalJwt({
      sub: 'manager-1',
      exp: expSec,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const result = await mgr.escalate({
      targetTier: 'T2',
      justification: 'expired',
      requester: 'alice',
      jwt,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe('JWT_EXPIRED');
  });

  it('custom leewayMs overrides the default', async () => {
    const clock = new Date('2026-04-18T12:00:00Z');
    const mgr = new TrustManager({
      workspaceRoot: root,
      signingKey: KEY,
      now: (): Date => clock,
      leewayMs: 0, // strict
    });
    await mgr.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });

    // Token expired 1 second ago — rejected with leewayMs: 0.
    const expSec = Math.floor(clock.getTime() / 1000) - 1;
    const jwt = mgr.signApprovalJwt({
      sub: 'manager-1',
      exp: expSec,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const result = await mgr.escalate({
      targetTier: 'T2',
      justification: 'strict',
      requester: 'alice',
      jwt,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe('JWT_EXPIRED');
    // Verify default constant is exported and reasonable.
    expect(DEFAULT_JWT_LEEWAY_MS).toBe(30_000);
  });

  it('rejects tokens whose iat is in the future beyond leeway', async () => {
    const clock = new Date('2026-04-18T12:00:00Z');
    const mgr = makeManager({ now: (): Date => clock });
    await mgr.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });

    // Token iat is 2 minutes in the FUTURE — beyond 30s default leeway.
    const iatSec = Math.floor(clock.getTime() / 1000) + 120;
    const jwt = mgr.signApprovalJwt({
      sub: 'manager-1',
      iat: iatSec,
      exp: iatSec + 300,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const result = await mgr.escalate({
      targetTier: 'T2',
      justification: 'future-iat',
      requester: 'alice',
      jwt,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe('JWT_MALFORMED');
    expect(result.error.message).toContain('iat');
  });

  it('accepts iat slightly in the future within the leeway window', async () => {
    const clock = new Date('2026-04-18T12:00:00Z');
    const mgr = makeManager({ now: (): Date => clock });
    await mgr.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });

    // iat is 10 seconds in the future — within the 30s default leeway.
    const iatSec = Math.floor(clock.getTime() / 1000) + 10;
    const jwt = mgr.signApprovalJwt({
      sub: 'manager-1',
      iat: iatSec,
      exp: iatSec + 300,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const result = await mgr.escalate({
      targetTier: 'T2',
      justification: 'small-drift',
      requester: 'alice',
      jwt,
    });
    expect(result.ok).toBe(true);
  });

  // CP-7 R1 FIX-E — ciso W4: workspace-scoped audience.
  it('default aud is workspace-scoped (claws/trust/escalate:<workspaceId>)', async () => {
    const mgr = makeManager();
    const workspaceId = deriveWorkspaceId(root);
    const expected = scopedTrustAudience(workspaceId);
    expect(mgr.getExpectedAudience()).toBe(expected);
    expect(expected).toMatch(/^claws\/trust\/escalate:[0-9a-f]{16}$/);
  });

  it('bare aud (unscoped) is rejected — tokens must carry the workspace binding', async () => {
    const mgr = makeManager();
    await mgr.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });
    const nowSec = Math.floor(Date.now() / 1000);
    const jwt = mgr.signApprovalJwt({
      // Explicit override to the pre-CISO-W4 unscoped audience.
      aud: TRUST_JWT_AUDIENCE,
      sub: 'manager-1',
      exp: nowSec + 300,
      jti: generateJti(),
      targetTier: 'T2',
      requester: 'alice',
    });
    const result = await mgr.escalate({
      targetTier: 'T2',
      justification: 'cross-workspace',
      requester: 'alice',
      jwt,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe('JWT_BAD_AUDIENCE');
  });

  it('JWT minted for workspace A cannot replay against workspace B', async () => {
    // Two managers on different workspace roots sharing the same key
    // (realistic fleet deployment — a single manager secret covers many
    // workspaces but each TrustManager rejects cross-workspace tokens).
    const rootA = root;
    const rootB = await mkdtemp(join(tmpdir(), 'trust-mgr-b-'));
    try {
      const clock = new Date('2026-04-18T12:00:00Z');
      const mgrA = new TrustManager({
        workspaceRoot: rootA,
        signingKey: KEY,
        now: (): Date => clock,
      });
      const mgrB = new TrustManager({
        workspaceRoot: rootB,
        signingKey: KEY,
        now: (): Date => clock,
      });
      await mgrA.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });
      await mgrB.escalate({ targetTier: 'T1', justification: 'x', requester: 'alice' });

      // Token minted by A's manager (aud: claws/trust/escalate:<idA>).
      const jwt = mgrA.signApprovalJwt({
        sub: 'manager-1',
        exp: Math.floor(clock.getTime() / 1000) + 300,
        jti: generateJti(),
        targetTier: 'T2',
        requester: 'alice',
      });

      // Replay against B — audience mismatch.
      const replay = await mgrB.escalate({
        targetTier: 'T2',
        justification: 'cross-ws',
        requester: 'alice',
        jwt,
      });
      expect(replay.ok).toBe(false);
      if (replay.ok) throw new Error('unreachable');
      expect(replay.error.code).toBe('JWT_BAD_AUDIENCE');

      // Use against A — succeeds.
      const self = await mgrA.escalate({
        targetTier: 'T2',
        justification: 'legit',
        requester: 'alice',
        jwt,
      });
      expect(self.ok).toBe(true);
    } finally {
      await rm(rootB, { recursive: true, force: true });
    }
  });

  it('workspaceId option overrides the default derivation', async () => {
    const mgr = new TrustManager({
      workspaceRoot: root,
      signingKey: KEY,
      workspaceId: 'deadbeefcafe0000',
    });
    expect(mgr.getExpectedAudience()).toBe('claws/trust/escalate:deadbeefcafe0000');
  });

  it('deriveWorkspaceId is deterministic and 16 hex chars', () => {
    const id1 = deriveWorkspaceId('/home/alice/ws');
    const id2 = deriveWorkspaceId('/home/alice/ws');
    const id3 = deriveWorkspaceId('/home/alice/other-ws');
    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1).toMatch(/^[0-9a-f]{16}$/);
  });
});
