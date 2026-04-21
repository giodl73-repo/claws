import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AuditChainReader,
  AuditChainWriter,
  verifyChain,
  GENESIS_HASH,
} from '#harness/audit-chain.ts';
import type { AuditChainEntry } from '#harness/audit-types.ts';

function makeFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'audit-hash-'));
  return join(dir, 'chain.jsonl');
}

describe('audit-chain hash integrity (CL-11 §3a)', () => {
  it('valid chain: genesis → writer → verifyChain returns ok', () => {
    const filePath = makeFile();
    const w = new AuditChainWriter({ filePath, clock: () => 1_700_000_000_000 });

    const producer = w.appendProducer({
      policyArtifactSha256: 'sha256:' + 'a'.repeat(64),
      generatedAt: '2024-01-01T00:00:00.000Z',
      scope: '@bic/openclaw',
      producerVersion: '1.0.0',
    });
    expect(producer.seq).toBe(1);
    expect(producer.prevHash).toBe(GENESIS_HASH);

    const decision = w.appendDecision({
      correlationId: 'corr-1',
      snapshotId: 'snap-1',
      policyArtifactSha256: producer.policyArtifactSha256,
      tool: 'read',
      decision: 'allow',
      declaredTier: 'R2',
      effectiveTier: 'R2',
    });
    expect(decision.seq).toBe(2);
    expect(decision.prevHash).toBe(producer.hash);

    const reader = new AuditChainReader({ filePath });
    const result = verifyChain(reader.all());
    expect(result.ok).toBe(true);
  });

  it('broken chain: tampered hash is detected as broken-hash-chain', () => {
    const filePath = makeFile();
    const w = new AuditChainWriter({ filePath, clock: () => 1_700_000_000_000 });
    w.appendProducer({
      policyArtifactSha256: 'sha256:' + 'b'.repeat(64),
      generatedAt: '2024-01-01T00:00:00.000Z',
      scope: '@openclaw',
      producerVersion: '1.0.0',
    });
    w.appendDecision({
      correlationId: 'corr-x',
      snapshotId: 'snap-x',
      policyArtifactSha256: 'sha256:' + 'b'.repeat(64),
      tool: 'read',
      decision: 'allow',
      declaredTier: 'R1',
      effectiveTier: 'R1',
    });

    // Tamper: rewrite the file with a flipped field on the second line.
    const tampered = [
      JSON.stringify({
        type: 'producer',
        policyArtifactSha256: 'sha256:' + 'b'.repeat(64),
        generatedAt: '2024-01-01T00:00:00.000Z',
        scope: '@openclaw',
        producerVersion: '1.0.0',
        ts: new Date(1_700_000_000_000).toISOString(),
        seq: 1,
        prevHash: GENESIS_HASH,
        hash: 'sha256:' + 'x'.repeat(64),
      }),
      JSON.stringify({
        type: 'decision',
        correlationId: 'corr-x',
        snapshotId: 'snap-x',
        policyArtifactSha256: 'sha256:' + 'b'.repeat(64),
        tool: 'read',
        decision: 'allow',
        declaredTier: 'R1',
        effectiveTier: 'R1',
        ts: new Date(1_700_000_000_000).toISOString(),
        seq: 2,
        prevHash: 'sha256:' + 'x'.repeat(64),
        hash: 'sha256:' + 'y'.repeat(64),
      }),
    ].join('\n') + '\n';
    writeFileSync(filePath, tampered, 'utf8');

    const reader = new AuditChainReader({ filePath });
    const result = verifyChain(reader.all());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('broken-hash-chain');
    }
  });

  it('empty chain: verifyChain returns ok', () => {
    const result = verifyChain([]);
    expect(result.ok).toBe(true);
  });

  it('append covers every entry variant + reader lookups + scope allowlist', () => {
    const filePath = makeFile();
    const w = new AuditChainWriter({ filePath, clock: () => 1_700_000_500_000 });
    expect(w.currentSeq()).toBe(0);
    expect(w.currentPrevHash()).toBe(GENESIS_HASH);
    const producer = w.appendProducer({
      policyArtifactSha256: 'sha256:' + '9'.repeat(64),
      generatedAt: '2024-01-03T00:00:00.000Z',
      scope: '@openclaw',
      producerVersion: '1.0.0',
    });
    expect(w.currentSeq()).toBe(1);
    expect(w.currentPrevHash()).toBe(producer.hash);
    w.appendDecision({
      correlationId: 'c-1',
      snapshotId: 's',
      policyArtifactSha256: producer.policyArtifactSha256,
      tool: 'read',
      decision: 'modify',
      declaredTier: 'R2',
      effectiveTier: 'R1',
      modifiedArgsHash: 'sha256:' + 'm'.repeat(64),
    });
    w.appendApproval({
      correlationId: 'c-1',
      approver: 'a',
      outcome: 'deny',
      invalidReason: 'ttl-expired',
      ttl: 1,
      nonce: 'n',
      keyId: 'k',
      sequenceNumber: 1,
      signature: 'sig',
    });
    w.appendDrainWindow({
      from: 'snap-0',
      to: 'snap-1',
      inflightCount: 2,
      openedAt: 1,
      closedAt: 2,
      outcome: 'drained',
    });
    w.appendOnSnapshotPromotedTimeout({
      providerId: 'pX',
      from: 'snap-0',
      snapshotId: 'snap-1',
      timeoutMs: 5000,
      reason: 'hook-hung',
    });
    w.appendSidecarUnreachable({
      sidecarId: 'sc-1',
      endpoint: 'http://127.0.0.1:1',
      attempts: 3,
      lastError: 'ECONNREFUSED',
    });
    w.appendCrossTenantAccessDenied({
      correlationId: 'c-2',
      callerTenantId: 'tenant-a',
      attemptedTenantId: 'tenant-b',
      tool: 'read',
      denialReason: 'cross-tenant-not-allowed',
    });

    const reader = new AuditChainReader({ filePath });
    expect(reader.all()).toHaveLength(7);
    expect(reader.byCorrelationId('c-1')).toHaveLength(2);
    expect(reader.byCorrelationId('c-2')).toHaveLength(1);
    expect(reader.byPolicyArtifactSha256(producer.policyArtifactSha256)).toHaveLength(2);
    expect(verifyChain(reader.all()).ok).toBe(true);
  });

  it('reader rejects scope outside allowlist', () => {
    const filePath = makeFile();
    const w = new AuditChainWriter({ filePath, clock: () => 1_700_000_600_000 });
    w.appendProducer({
      policyArtifactSha256: 'sha256:' + '3'.repeat(64),
      generatedAt: '2024-01-04T00:00:00.000Z',
      scope: '@third-party/unknown',
      producerVersion: '1.0.0',
    });
    expect(
      () => new AuditChainReader({ filePath, scopeAllowlist: ['@openclaw'] }),
    ).toThrow(/scope '@third-party\/unknown' not in allowlist/);
  });

  it('reader handles empty file / missing file gracefully', () => {
    const d = mkdtempSync(join(tmpdir(), 'audit-empty-'));
    const missing = join(d, 'never.jsonl');
    const r1 = new AuditChainReader({ filePath: missing });
    expect(r1.all()).toHaveLength(0);

    const empty = join(d, 'empty.jsonl');
    writeFileSync(empty, '', 'utf8');
    const r2 = new AuditChainReader({ filePath: empty });
    expect(r2.all()).toHaveLength(0);
  });

  it('writer mkdirs missing parent directory', () => {
    const base = mkdtempSync(join(tmpdir(), 'audit-mkdir-'));
    const filePath = join(base, 'nested', 'deeper', 'chain.jsonl');
    expect(existsSync(join(base, 'nested'))).toBe(false);
    const w = new AuditChainWriter({ filePath, clock: () => 0 });
    expect(existsSync(join(base, 'nested', 'deeper'))).toBe(true);
    w.appendProducer({
      policyArtifactSha256: 'sha256:' + '2'.repeat(64),
      generatedAt: '2024-01-05T00:00:00.000Z',
      scope: '@openclaw',
      producerVersion: '1.0.0',
    });
    expect(existsSync(filePath)).toBe(true);
  });

  it('verifyChain detects prevHash mismatch (broken-hash-chain by threading, not hash)', () => {
    const good: AuditChainEntry[] = [
      {
        type: 'producer',
        policyArtifactSha256: 'sha256:' + '8'.repeat(64),
        generatedAt: '2024-01-01T00:00:00.000Z',
        scope: '@openclaw',
        producerVersion: '1.0.0',
        ts: new Date(0).toISOString(),
        seq: 1,
        // bogus prevHash — should NOT equal genesis
        prevHash: 'sha256:' + 'f'.repeat(64),
        hash: 'sha256:' + 'g'.repeat(64),
      },
    ];
    const result = verifyChain(good);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('broken-hash-chain');
  });

  it('verifyChain detects orphan-approval and missing-approval-for-review', () => {
    const filePath = makeFile();
    const w = new AuditChainWriter({ filePath, clock: () => 1_700_000_700_000 });
    w.appendProducer({
      policyArtifactSha256: 'sha256:' + '7'.repeat(64),
      generatedAt: '2024-01-05T00:00:00.000Z',
      scope: '@openclaw',
      producerVersion: '1.0.0',
    });
    // review decision without matching approval → missing-approval-for-review
    w.appendDecision({
      correlationId: 'review-missing',
      snapshotId: 's',
      policyArtifactSha256: 'sha256:' + '7'.repeat(64),
      tool: 'read',
      decision: 'review',
      declaredTier: 'R1',
      effectiveTier: 'R1',
    });
    const r1 = new AuditChainReader({ filePath });
    const v1 = verifyChain(r1.all());
    expect(v1.ok).toBe(false);
    if (!v1.ok) expect(v1.reason).toBe('missing-approval-for-review');

    // Second file: approval with no matching decision → orphan-approval
    const filePath2 = makeFile();
    const w2 = new AuditChainWriter({ filePath: filePath2, clock: () => 1_700_000_800_000 });
    w2.appendProducer({
      policyArtifactSha256: 'sha256:' + '5'.repeat(64),
      generatedAt: '2024-01-05T00:00:00.000Z',
      scope: '@openclaw',
      producerVersion: '1.0.0',
    });
    w2.appendApproval({
      correlationId: 'orphan-c',
      approver: 'a',
      outcome: 'approve',
      ttl: 1,
      nonce: 'n',
      keyId: 'k',
      sequenceNumber: 1,
      signature: 's',
    });
    const r2 = new AuditChainReader({ filePath: filePath2 });
    const v2 = verifyChain(r2.all());
    expect(v2.ok).toBe(false);
    if (!v2.ok) expect(v2.reason).toBe('orphan-approval');
  });
});
