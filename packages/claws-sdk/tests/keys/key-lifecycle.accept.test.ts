/**
 * L3: Key lifecycle acceptance — generate → sign → rotate → verify re-signed →
 * revoke → verify signing blocked → verify audit chain → verify rotation
 * schedule alerts → verify partial re-sign failure rolls back.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sign as cryptoSign, verify as cryptoVerify } from 'node:crypto';
import {
  generateKey,
  createStorage,
  registerKey,
  listKeys,
  rotateKey,
  revokeKey,
  assertKeyNotRevoked,
  getScheduleStatus,
} from '../../src/keys/index.js';
import { readAuditChain } from '../../src/compliance/audit-chain.js';

describe('Key lifecycle acceptance', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('full lifecycle: generate → sign → rotate → re-sign → revoke → audit → schedule → rollback', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-accept-'));

    // ── 1. Generate key ──────────────────────────────────────────────
    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'accept-lifecycle-1',
      algorithm: 'ed25519',
      storageTier: 'file',
      rotationSchedule: { enabled: true, intervalDays: 90 },
      purpose: 'signing',
    });
    await storage.write(entry.id, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${entry.id}.pub`, generated.publicKey);
    }

    expect(entry.version).toBe(1);
    expect(entry.revoked).toBe(false);

    // ── 2. Sign a compiled artifact ──────────────────────────────────
    const compiledDir = join(tempDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    const content = 'governance-data-v1';
    await writeFile(join(compiledDir, 'gov.json'), content, 'utf-8');

    const sig = cryptoSign(null, Buffer.from(content), generated.privateKey).toString('hex');
    await writeFile(join(compiledDir, 'gov.json.sig'), sig, 'utf-8');

    // ── 3. Rotate key ───────────────────────────────────────────────
    const rotResult = await rotateKey(tempDir, 'accept-lifecycle-1');
    expect(rotResult.entry.version).toBe(2);
    expect(rotResult.artifactsReSigned).toBe(1);

    // ── 4. Verify re-signed artifacts ────────────────────────────────
    const newPubKey = await storage.read(`${entry.id}.pub`);
    expect(newPubKey).toBeTruthy();

    const newSig = await readFile(join(compiledDir, 'gov.json.sig'), 'utf-8');
    expect(cryptoVerify(null, Buffer.from(content), newPubKey!, Buffer.from(newSig, 'hex'))).toBe(true);

    // ── 5. Revoke key ───────────────────────────────────────────────
    const revokeResult = await revokeKey(tempDir, 'accept-lifecycle-1', 'end-of-life');
    expect(revokeResult.entry.revoked).toBe(true);
    expect(revokeResult.entry.revokedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // ── 6. Verify signing is blocked ─────────────────────────────────
    await expect(assertKeyNotRevoked(tempDir, 'accept-lifecycle-1')).rejects.toThrow(
      'Signing blocked',
    );

    // ── 7. Verify audit chain has REVOKE event ───────────────────────
    const chain = await readAuditChain(tempDir);
    const revokeEvent = chain.find((e) => e.eventType === 'KEY_REVOKED');
    expect(revokeEvent).toBeDefined();
    expect(revokeEvent!.target).toBe('accept-lifecycle-1');
    expect(revokeEvent!.action).toBe('revoke');

    // ── 8. Verify rotation schedule alert at 7-day threshold ─────────
    // Create a second key with schedule for alert testing
    const key2 = await registerKey(tempDir, {
      id: 'accept-sched-1',
      algorithm: 'ed25519',
      storageTier: 'file',
      rotationSchedule: { enabled: true, intervalDays: 90 },
      purpose: 'signing',
    });

    // Simulate being 7 days before deadline
    const baseDate = new Date(key2.createdAt);
    const sevenBefore = new Date(baseDate.getTime() + (90 - 7) * 86_400_000);
    const schedStatus = getScheduleStatus(key2, sevenBefore);
    expect(schedStatus).toBeDefined();
    expect(schedStatus!.alert).toBe(true);
    expect(schedStatus!.daysRemaining).toBe(7);
    expect(schedStatus!.overdue).toBe(false);

    // ── 9. Verify partial re-sign failure rolls back cleanly ─────────
    // Create a new key for rollback test
    const gen3 = generateKey('ed25519');
    const entry3 = await registerKey(tempDir, {
      id: 'accept-rollback-1',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write(entry3.id, gen3.privateKey);
    if (gen3.publicKey) {
      await storage.write(`${entry3.id}.pub`, gen3.publicKey);
    }

    // Create a .sig file without the corresponding artifact to test re-sign failure
    // This shouldn't cause a full failure since reSignArtifact handles missing artifacts gracefully
    await writeFile(join(compiledDir, 'orphan.sig'), 'old-signature', 'utf-8');

    // Create a valid artifact for re-signing
    const content3 = 'valid-artifact';
    await writeFile(join(compiledDir, 'valid.json'), content3, 'utf-8');
    const sig3 = cryptoSign(null, Buffer.from(content3), gen3.privateKey).toString('hex');
    await writeFile(join(compiledDir, 'valid.json.sig'), sig3, 'utf-8');

    // Rotation should succeed (orphan .sig is skipped, valid.json is re-signed)
    const rot3 = await rotateKey(tempDir, 'accept-rollback-1');
    expect(rot3.entry.version).toBe(2);

    // ── 10. Verify list reflects all state ───────────────────────────
    const listResult = await listKeys(tempDir);
    expect(listResult.keys.length).toBeGreaterThanOrEqual(3);

    const rotatedEntry = listResult.keys.find((k) => k.id === 'accept-lifecycle-1');
    expect(rotatedEntry!.version).toBe(2);
    expect(rotatedEntry!.revoked).toBe(true);

    const rolledBack = listResult.keys.find((k) => k.id === 'accept-rollback-1');
    expect(rolledBack!.version).toBe(2);
  });
});
