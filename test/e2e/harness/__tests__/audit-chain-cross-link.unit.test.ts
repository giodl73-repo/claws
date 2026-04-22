import { describe, it, expect } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AuditChainReader,
  AuditChainWriter,
  verifyChain,
} from '#harness/audit-chain.ts';
import type { AuditChainEntry } from '#harness/audit-types.ts';

function makeFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'audit-xlink-'));
  return join(dir, 'chain.jsonl');
}

const POLICY_SHA = 'sha256:' + 'c'.repeat(64);

describe('audit-chain cross-link assertions (CL-11 §3a)', () => {
  it('DecisionEntry → ApprovalEntry by correlationId: review + approval verifies', () => {
    const filePath = makeFile();
    const w = new AuditChainWriter({ filePath, clock: () => 1_700_000_100_000 });
    w.appendProducer({
      policyArtifactSha256: POLICY_SHA,
      generatedAt: '2024-01-01T00:00:00.000Z',
      scope: '@bic/openclaw',
      producerVersion: '1.0.0',
    });
    w.appendDecision({
      correlationId: 'corr-review-1',
      snapshotId: 'snap-1',
      policyArtifactSha256: POLICY_SHA,
      tool: 'write',
      decision: 'review',
      declaredTier: 'R2',
      effectiveTier: 'R2',
    });
    w.appendApproval({
      correlationId: 'corr-review-1',
      approver: 'alice@example.com',
      outcome: 'approve',
      ttl: 30_000,
      nonce: 'n1',
      keyId: 'k1',
      sequenceNumber: 1,
      signature: 'sig1',
    });

    const reader = new AuditChainReader({ filePath });
    const result = verifyChain(reader.all());
    expect(result.ok).toBe(true);
  });

  it('ProducerEntry → DecisionEntry by policyArtifactSha256: matching sha verifies', () => {
    const filePath = makeFile();
    const w = new AuditChainWriter({ filePath, clock: () => 1_700_000_200_000 });
    w.appendProducer({
      policyArtifactSha256: POLICY_SHA,
      generatedAt: '2024-01-01T00:00:00.000Z',
      scope: '@bic/openclaw',
      producerVersion: '1.0.0',
    });
    w.appendDecision({
      correlationId: 'corr-allow-1',
      snapshotId: 'snap-1',
      policyArtifactSha256: POLICY_SHA,
      tool: 'read',
      decision: 'allow',
      declaredTier: 'R1',
      effectiveTier: 'R1',
    });

    const reader = new AuditChainReader({ filePath });
    expect(reader.byPolicyArtifactSha256(POLICY_SHA)).toHaveLength(2);
    const result = verifyChain(reader.all());
    expect(result.ok).toBe(true);
  });

  it('missing-producer-for-decision: decision without matching producer is detected', () => {
    const filePath = makeFile();
    const w = new AuditChainWriter({ filePath, clock: () => 1_700_000_300_000 });
    // No producer emitted — decision references a sha no one wrote.
    w.appendDecision({
      correlationId: 'corr-missing',
      snapshotId: 'snap-1',
      policyArtifactSha256: POLICY_SHA,
      tool: 'read',
      decision: 'allow',
      declaredTier: 'R1',
      effectiveTier: 'R1',
    });

    const reader = new AuditChainReader({ filePath });
    const result = verifyChain(reader.all());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('missing-producer-for-decision');
      expect(result.atSeq).toBe(1);
    }
  });

  it('sequence-rollback: out-of-order seq is detected', () => {
    // Hand-craft entries with a gap in seq (3 then 2).
    const crafted: AuditChainEntry[] = [
      {
        type: 'producer',
        policyArtifactSha256: POLICY_SHA,
        generatedAt: '2024-01-01T00:00:00.000Z',
        scope: '@openclaw',
        producerVersion: '1.0.0',
        ts: new Date(0).toISOString(),
        seq: 3,
        prevHash: 'sha256:' + '0'.repeat(64),
        hash: 'sha256:' + 'z'.repeat(64),
      },
    ];
    const result = verifyChain(crafted);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('sequence-rollback');
    }
  });
});
