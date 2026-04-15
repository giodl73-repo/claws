/**
 * L0: Ceremony audit events — CEREMONY_INITIATED, SHARE_DISTRIBUTED,
 * KEY_RECONSTRUCTED recorded to audit chain.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readAuditChain } from '../../src/compliance/audit-chain.js';
import { recordParticipant } from '../../src/keys/ceremony.js';
import {
  recordCeremonyInitiated,
  recordShareDistributed,
  recordKeyReconstructed,
} from '../../src/keys/ceremony-audit.js';

describe('ceremony audit events', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('records CEREMONY_INITIATED event', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cer-'));

    await recordCeremonyInitiated(tempDir, 'cer-001', 5, 3);

    const chain = await readAuditChain(tempDir);
    const event = chain.find((e) => e.eventType === 'CEREMONY_INITIATED');
    expect(event).toBeDefined();
    expect(event!.target).toBe('cer-001');
    expect(event!.action).toBe('ceremony-init');
    expect(event!.outcome).toContain('5 shares');
    expect(event!.outcome).toContain('threshold 3');
  });

  it('records SHARE_DISTRIBUTED event with participant identity', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cer-'));

    const participant = recordParticipant('alice@example.com', 2);
    await recordShareDistributed(tempDir, 'cer-002', participant);

    const chain = await readAuditChain(tempDir);
    const event = chain.find((e) => e.eventType === 'SHARE_DISTRIBUTED');
    expect(event).toBeDefined();
    expect(event!.target).toBe('cer-002');
    expect(event!.action).toBe('share-distribute');
    expect(event!.outcome).toContain('alice@example.com');
    expect(event!.actor).toBe('alice@example.com');
  });

  it('records KEY_RECONSTRUCTED event', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cer-'));

    await recordKeyReconstructed(tempDir, 'cer-003', 3, true);

    const chain = await readAuditChain(tempDir);
    const event = chain.find((e) => e.eventType === 'KEY_RECONSTRUCTED');
    expect(event).toBeDefined();
    expect(event!.target).toBe('cer-003');
    expect(event!.action).toBe('ceremony-reconstruct');
    expect(event!.outcome).toContain('3 shares');
    expect(event!.outcome).toContain('verified=true');
  });

  it('records all ceremony phases in sequence', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cer-'));

    await recordCeremonyInitiated(tempDir, 'cer-full', 3, 2);

    const p1 = recordParticipant('alice', 1);
    const p2 = recordParticipant('bob', 2);
    const p3 = recordParticipant('carol', 3);
    await recordShareDistributed(tempDir, 'cer-full', p1);
    await recordShareDistributed(tempDir, 'cer-full', p2);
    await recordShareDistributed(tempDir, 'cer-full', p3);

    await recordKeyReconstructed(tempDir, 'cer-full', 2, true);

    const chain = await readAuditChain(tempDir);
    const ceremonyEvents = chain.filter((e) => e.target === 'cer-full');

    expect(ceremonyEvents).toHaveLength(5);
    expect(ceremonyEvents[0]!.eventType).toBe('CEREMONY_INITIATED');
    expect(ceremonyEvents[1]!.eventType).toBe('SHARE_DISTRIBUTED');
    expect(ceremonyEvents[2]!.eventType).toBe('SHARE_DISTRIBUTED');
    expect(ceremonyEvents[3]!.eventType).toBe('SHARE_DISTRIBUTED');
    expect(ceremonyEvents[4]!.eventType).toBe('KEY_RECONSTRUCTED');
  });
});
