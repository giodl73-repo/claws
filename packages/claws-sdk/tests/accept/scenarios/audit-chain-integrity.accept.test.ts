/**
 * Acceptance tests: audit chain integrity scenario (S04).
 *
 * Validates audit chain INTEGRITY across key management operations:
 * - GENERATE audit event with HMAC signature
 * - ROTATE event records with correct sequential ordering
 * - CEREMONY_INITIATED + SHARE_DISTRIBUTED events chain correctly
 * - REVOKE event links to full chain
 * - Tamper detection catches modified entries
 * - Full chain integrity from genesis to latest
 *
 * @module claws-sdk/tests/accept/scenarios/audit-chain-integrity
 */

import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

// ── Audit chain ─────────────────────────────────────────────────────
import {
  appendAuditEvent,
  readAuditChain,
  CHAIN_FILE,
} from '../../../src/compliance/audit-chain.js';
import {
  verifyAuditEntry,
  type AuditChainEntry,
} from '../../../src/compliance/artifact-signer.js';
import { CLAWS_SIDECAR_LAYOUT } from '../../../src/types/sidecar.js';

// ── Key operations ──────────────────────────────────────────────────
import { registerKey } from '../../../src/keys/registry.js';
import { createStorage } from '../../../src/keys/storage.js';
import { generateKey } from '../../../src/keys/generate.js';
import { rotateKey } from '../../../src/keys/rotate.js';
import { revokeKey } from '../../../src/keys/revoke.js';

// ── Ceremony ────────────────────────────────────────────────────────
import { initCeremony, recordParticipant } from '../../../src/keys/ceremony.js';
import {
  recordCeremonyInitiated,
  recordShareDistributed,
} from '../../../src/keys/ceremony-audit.js';

// ── Cleanup ─────────────────────────────────────────────────────────

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best-effort
    }
  }
  tempDirs.length = 0;
});

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `claws-accept-audit-${prefix}-`));
  tempDirs.push(dir);
  return dir;
}

/**
 * Read the HMAC signing key from the workspace (same logic as audit-chain.ts).
 */
async function readSigningKey(workspaceRoot: string): Promise<Buffer> {
  const keyPath = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.keys, 'hmac.key');
  const hex = readFileSync(keyPath, 'utf-8');
  return Buffer.from(hex.trim(), 'hex');
}

// ── Audit Chain Integrity Acceptance Tests ──────────────────────────

describe('accept: audit chain integrity (S04)', () => {

  // ── 1. Generate key → GENERATE audit event with valid HMAC ────────

  it('S04-01: appendAuditEvent records a KEY_GENERATED event with valid HMAC signature', async () => {
    const ws = createTempDir('s04-01');

    // Append a KEY_GENERATED event (simulating what a generate command does)
    const entry = await appendAuditEvent(ws, {
      eventType: 'KEY_GENERATED',
      target: 'test-key-001',
      action: 'generate',
      outcome: 'ed25519 keypair created',
      ruleId: 'key-lifecycle',
      severity: 3,
      policyVersion: '1.0.0',
    });

    // Entry must have HMAC metadata
    expect(entry.hmacSignature).toBeTruthy();
    expect(entry.hmacSignature).toMatch(/^[0-9a-f]+$/);
    expect(entry.keyId).toBe('claws-default-v1');
    expect(entry.algorithm).toBe('sha256');
    expect(entry.seq).toBe(0);

    // Verify the signature against the signing key
    const signingKey = await readSigningKey(ws);
    expect(verifyAuditEntry(entry, signingKey)).toBe(true);

    // Chain on disk matches
    const chain = await readAuditChain(ws);
    expect(chain).toHaveLength(1);
    expect(chain[0]!.eventType).toBe('KEY_GENERATED');
  }, 15_000);

  // ── 2. Rotate key → ROTATE event links via sequential ordering ────

  it('S04-02: sequential events have incrementing seq and all verify independently', async () => {
    const ws = createTempDir('s04-02');

    // Register and persist a key so rotateKey can find it
    const keyEntry = await registerKey(ws, {
      id: 'ed25519-rotate-test',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    const generated = generateKey('ed25519');
    const storage = createStorage('file', ws);
    await storage.write(keyEntry.id, generated.privateKey);
    await storage.write(`${keyEntry.id}.pub`, generated.publicKey!);

    // Append GENERATE event
    await appendAuditEvent(ws, {
      eventType: 'KEY_GENERATED',
      target: keyEntry.id,
      action: 'generate',
      outcome: 'ed25519 keypair created',
      ruleId: 'key-lifecycle',
      severity: 3,
      policyVersion: '1.0.0',
    });

    // Rotate the key (this does NOT append an audit event itself,
    // but we record the rotation event explicitly)
    await rotateKey(ws, keyEntry.id);
    await appendAuditEvent(ws, {
      eventType: 'KEY_ROTATED',
      target: keyEntry.id,
      action: 'rotate',
      outcome: 'rotated to version 2',
      ruleId: 'key-lifecycle',
      severity: 3,
      policyVersion: '1.0.0',
    });

    // Read chain and verify sequential ordering
    const chain = await readAuditChain(ws);
    expect(chain).toHaveLength(2);
    expect(chain[0]!.seq).toBe(0);
    expect(chain[1]!.seq).toBe(1);
    expect(chain[0]!.eventType).toBe('KEY_GENERATED');
    expect(chain[1]!.eventType).toBe('KEY_ROTATED');

    // Both entries verify independently
    const signingKey = await readSigningKey(ws);
    for (const entry of chain) {
      expect(verifyAuditEntry(entry, signingKey)).toBe(true);
    }
  }, 15_000);

  // ── 3. Ceremony → CEREMONY_INITIATED + SHARE_DISTRIBUTED chain ────

  it('S04-03: ceremony init + share distribution produce correctly sequenced audit events', async () => {
    const ws = createTempDir('s04-03');

    // Initialize a ceremony (generates key, registers, splits)
    const ceremony = await initCeremony(ws, {
      totalShares: 3,
      threshold: 2,
    });

    // Record ceremony audit events
    await recordCeremonyInitiated(ws, ceremony.ceremonyId, 3, 2);

    const participants = ['alice', 'bob', 'charlie'];
    for (let i = 0; i < participants.length; i++) {
      const participant = recordParticipant(participants[i]!, ceremony.shares[i]!.index);
      await recordShareDistributed(ws, ceremony.ceremonyId, participant);
    }

    // Read chain
    const chain = await readAuditChain(ws);
    expect(chain).toHaveLength(4); // 1 CEREMONY_INITIATED + 3 SHARE_DISTRIBUTED

    // Verify event types in order
    expect(chain[0]!.eventType).toBe('CEREMONY_INITIATED');
    expect(chain[1]!.eventType).toBe('SHARE_DISTRIBUTED');
    expect(chain[2]!.eventType).toBe('SHARE_DISTRIBUTED');
    expect(chain[3]!.eventType).toBe('SHARE_DISTRIBUTED');

    // Verify sequential numbering
    for (let i = 0; i < chain.length; i++) {
      expect(chain[i]!.seq).toBe(i);
    }

    // Verify ceremony target consistency
    for (const entry of chain) {
      expect(entry.target).toBe(ceremony.ceremonyId);
    }

    // Share distribution actors match participants
    expect(chain[1]!.actor).toBe('alice');
    expect(chain[2]!.actor).toBe('bob');
    expect(chain[3]!.actor).toBe('charlie');

    // All entries verify with signing key
    const signingKey = await readSigningKey(ws);
    for (const entry of chain) {
      expect(verifyAuditEntry(entry, signingKey)).toBe(true);
    }
  }, 15_000);

  // ── 4. Revoke key → KEY_REVOKED event added to chain ──────────────

  it('S04-04: revokeKey appends KEY_REVOKED audit event that verifies', async () => {
    const ws = createTempDir('s04-04');

    // Register and persist a key
    const keyEntry = await registerKey(ws, {
      id: 'hmac-revoke-test',
      algorithm: 'hmac-sha256',
      storageTier: 'file',
    });
    const generated = generateKey('hmac-sha256');
    const storage = createStorage('file', ws);
    await storage.write(keyEntry.id, generated.privateKey);

    // Append a GENERATE event first
    await appendAuditEvent(ws, {
      eventType: 'KEY_GENERATED',
      target: keyEntry.id,
      action: 'generate',
      outcome: 'hmac-sha256 secret created',
      ruleId: 'key-lifecycle',
      severity: 3,
      policyVersion: '1.0.0',
    });

    // Revoke the key (this automatically appends KEY_REVOKED to audit chain)
    await revokeKey(ws, keyEntry.id, 'compromised in test');

    // Read chain
    const chain = await readAuditChain(ws);
    expect(chain).toHaveLength(2);
    expect(chain[0]!.eventType).toBe('KEY_GENERATED');
    expect(chain[1]!.eventType).toBe('KEY_REVOKED');
    expect(chain[1]!.seq).toBe(1);
    expect(chain[1]!.target).toBe(keyEntry.id);
    expect(chain[1]!.outcome).toBe('compromised in test');

    // Both entries verify
    const signingKey = await readSigningKey(ws);
    for (const entry of chain) {
      expect(verifyAuditEntry(entry, signingKey)).toBe(true);
    }
  }, 15_000);

  // ── 5. Tamper detection — modified hash caught ────────────────────

  it('S04-05: tampering with an event HMAC is detected by verifyAuditEntry', async () => {
    const ws = createTempDir('s04-05');

    // Build a chain of 3 events
    await appendAuditEvent(ws, {
      eventType: 'KEY_GENERATED',
      target: 'key-tamper-test',
      action: 'generate',
      outcome: 'created',
      ruleId: 'key-lifecycle',
      severity: 3,
      policyVersion: '1.0.0',
    });
    await appendAuditEvent(ws, {
      eventType: 'KEY_ROTATED',
      target: 'key-tamper-test',
      action: 'rotate',
      outcome: 'rotated',
      ruleId: 'key-lifecycle',
      severity: 3,
      policyVersion: '1.0.0',
    });
    await appendAuditEvent(ws, {
      eventType: 'KEY_REVOKED',
      target: 'key-tamper-test',
      action: 'revoke',
      outcome: 'revoked',
      ruleId: 'key-lifecycle',
      severity: 3,
      policyVersion: '1.0.0',
    });

    // Read chain — all 3 should verify
    const signingKey = await readSigningKey(ws);
    const chain = await readAuditChain(ws);
    expect(chain).toHaveLength(3);
    for (const entry of chain) {
      expect(verifyAuditEntry(entry, signingKey)).toBe(true);
    }

    // Tamper: modify the HMAC signature of the middle entry on disk
    const chainPath = join(ws, CLAWS_SIDECAR_LAYOUT.audit, CHAIN_FILE);
    const rawContent = readFileSync(chainPath, 'utf-8');
    const lines = rawContent.trim().split('\n');
    expect(lines).toHaveLength(3);

    // Parse middle entry, corrupt its signature
    const middleEntry = JSON.parse(lines[1]!) as AuditChainEntry;
    const corruptedSig = middleEntry.hmacSignature.replace(/^.{8}/, '00000000');
    const tamperedEntry: AuditChainEntry = {
      ...middleEntry,
      hmacSignature: corruptedSig,
    };

    // Rewrite chain with tampered middle entry
    lines[1] = JSON.stringify(tamperedEntry);
    writeFileSync(chainPath, lines.join('\n') + '\n', 'utf-8');

    // Re-read chain from disk
    const tamperedChain = await readAuditChain(ws);
    expect(tamperedChain).toHaveLength(3);

    // Entry 0 and 2 still verify
    expect(verifyAuditEntry(tamperedChain[0]!, signingKey)).toBe(true);
    expect(verifyAuditEntry(tamperedChain[2]!, signingKey)).toBe(true);

    // Entry 1 (tampered) FAILS verification
    expect(verifyAuditEntry(tamperedChain[1]!, signingKey)).toBe(false);
  }, 15_000);

  // ── 5b. Tamper detection — modified event data caught ─────────────

  it('S04-05b: tampering with event data (not just signature) is detected', async () => {
    const ws = createTempDir('s04-05b');

    await appendAuditEvent(ws, {
      eventType: 'KEY_GENERATED',
      target: 'key-data-tamper',
      action: 'generate',
      outcome: 'created safely',
      ruleId: 'key-lifecycle',
      severity: 3,
      policyVersion: '1.0.0',
    });

    const signingKey = await readSigningKey(ws);
    const chain = await readAuditChain(ws);
    expect(chain).toHaveLength(1);
    expect(verifyAuditEntry(chain[0]!, signingKey)).toBe(true);

    // Tamper: change the outcome field on disk (keep signature unchanged)
    const chainPath = join(ws, CLAWS_SIDECAR_LAYOUT.audit, CHAIN_FILE);
    const rawContent = readFileSync(chainPath, 'utf-8');
    const lines = rawContent.trim().split('\n');
    const entry = JSON.parse(lines[0]!) as AuditChainEntry;
    const tamperedEntry: AuditChainEntry = {
      ...entry,
      outcome: 'TAMPERED: attacker was here',
    };
    lines[0] = JSON.stringify(tamperedEntry);
    writeFileSync(chainPath, lines.join('\n') + '\n', 'utf-8');

    // Re-read and verify — tampered data should fail
    const tamperedChain = await readAuditChain(ws);
    expect(verifyAuditEntry(tamperedChain[0]!, signingKey)).toBe(false);
  }, 15_000);

  // ── 6. Full chain integrity from genesis to latest ────────────────

  it('S04-06: full chain from genesis through generate, ceremony, revoke passes integrity validation', async () => {
    const ws = createTempDir('s04-06');

    // Step 1: Generate a key and record audit event
    const keyEntry = await registerKey(ws, {
      id: 'hmac-full-chain',
      algorithm: 'hmac-sha256',
      storageTier: 'file',
    });
    const generated = generateKey('hmac-sha256');
    const storage = createStorage('file', ws);
    await storage.write(keyEntry.id, generated.privateKey);

    await appendAuditEvent(ws, {
      eventType: 'KEY_GENERATED',
      target: keyEntry.id,
      action: 'generate',
      outcome: 'hmac-sha256 secret created',
      ruleId: 'key-lifecycle',
      severity: 3,
      policyVersion: '1.0.0',
    });

    // Step 2: Ceremony init + share distribution
    const ceremony = await initCeremony(ws, {
      totalShares: 3,
      threshold: 2,
    });
    await recordCeremonyInitiated(ws, ceremony.ceremonyId, 3, 2);

    const alice = recordParticipant('alice', ceremony.shares[0]!.index);
    await recordShareDistributed(ws, ceremony.ceremonyId, alice);

    const bob = recordParticipant('bob', ceremony.shares[1]!.index);
    await recordShareDistributed(ws, ceremony.ceremonyId, bob);

    // Step 3: Revoke the original key
    await revokeKey(ws, keyEntry.id, 'end-of-life');

    // Read the full chain
    const chain = await readAuditChain(ws);

    // Should have: KEY_GENERATED + CEREMONY_INITIATED + 2x SHARE_DISTRIBUTED + KEY_REVOKED = 5
    expect(chain).toHaveLength(5);

    // Validate sequential ordering (no gaps, no duplicates)
    for (let i = 0; i < chain.length; i++) {
      expect(chain[i]!.seq).toBe(i);
    }

    // Validate all timestamps are ISO 8601 and non-decreasing
    for (let i = 1; i < chain.length; i++) {
      const prev = new Date(chain[i - 1]!.timestamp).getTime();
      const curr = new Date(chain[i]!.timestamp).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }

    // Validate all entries have consistent signing metadata
    for (const entry of chain) {
      expect(entry.keyId).toBe('claws-default-v1');
      expect(entry.algorithm).toBe('sha256');
      expect(entry.hmacSignature).toMatch(/^[0-9a-f]{64}$/); // SHA-256 = 64 hex chars
    }

    // Validate ALL entries pass HMAC verification
    const signingKey = await readSigningKey(ws);
    const verificationResults = chain.map((entry) => verifyAuditEntry(entry, signingKey));
    expect(verificationResults).toEqual([true, true, true, true, true]);

    // Validate event type progression
    expect(chain.map((e) => e.eventType)).toEqual([
      'KEY_GENERATED',
      'CEREMONY_INITIATED',
      'SHARE_DISTRIBUTED',
      'SHARE_DISTRIBUTED',
      'KEY_REVOKED',
    ]);
  }, 30_000);
});
