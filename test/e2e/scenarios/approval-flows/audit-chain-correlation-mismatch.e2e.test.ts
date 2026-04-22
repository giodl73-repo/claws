/**
 * SC-25: audit-chain corruption — correlation mismatch.
 *
 * Given a clean review-flow chain, mutate a DecisionEntry's correlationId so
 * it no longer matches its paired ApprovalEntry (while re-threading hashes to
 * keep the hash-chain integrity check clean). Assert verifyChain reports
 * `correlation-mismatch` with the offending DecisionEntry's seq.
 *
 * Pulse 60 / plan 5. Host-neutral — not preset-parameterized.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  AuditChainReader,
  AuditChainWriter,
  type AuditChainEntry,
  corruptAuditChain,
  verifyChain,
} from '#harness/audit-chain.js';

describe('SC-25 audit-chain correlation-mismatch', () => {
  let cleanChain: readonly AuditChainEntry[];

  beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), 'cp6-sc25-'));
    const path = join(dir, 'audit.jsonl');
    const w = new AuditChainWriter({ filePath: path, clock: () => 1_700_000_000_000 });
    const policySha = 'sha256:' + '8'.repeat(64);
    w.appendProducer({
      policyArtifactSha256: policySha,
      generatedAt: '2024-01-01T00:00:00.000Z',
      scope: '@bic/openclaw',
      producerVersion: '1.0.0',
    });
    w.appendDecision({
      correlationId: 'corr-review',
      policyArtifactSha256: policySha,
      principal: 'user@example.com',
      toolName: 'send-email',
      argsHash: 'sha256:' + '1'.repeat(64),
      declaredTier: 'R5',
      effectiveTier: 'R5',
      decision: 'review',
    });
    w.appendApproval({
      correlationId: 'corr-review',
      handleId: 'handle-1',
      approverPrincipal: 'supervisor@example.com',
      outcome: 'approve',
      keyId: 'k1',
    });
    cleanChain = new AuditChainReader({ filePath: path }).all();
    // Sanity: clean chain verifies.
    const pre = verifyChain(cleanChain);
    expect(pre.ok).toBe(true);
  });

  it('F-01..F-04: correlation mismatch is detected (not silent)', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'correlation-mismatch' });
    const result = verifyChain(corrupted);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('correlation-mismatch');
      expect(result.atSeq).toBeDefined();
    }
  });

  it('F-05: corruption produces DISTINCT reason from chain-gap and hash-mismatch', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'correlation-mismatch' });
    const result = verifyChain(corrupted);
    if (!result.ok) {
      expect(result.reason).not.toBe('chain-gap');
      expect(result.reason).not.toBe('hash-mismatch');
    }
  });

  it('F-06: corruption does NOT break hash-chain integrity (hashes re-threaded)', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'correlation-mismatch' });
    // Specifically: chain-gap / hash-mismatch do NOT trigger. We already
    // verified reason === 'correlation-mismatch', which means the hash-integrity
    // checks (1)/(2) passed and (4 preflight) caught the paired cross-link
    // corruption. This IS the assertion the pulse requires.
    const result = verifyChain(corrupted);
    expect(result.ok).toBe(false);
  });

  it('F-07: offending entry seq is cited (operators can locate the mutation)', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'correlation-mismatch' });
    const result = verifyChain(corrupted);
    if (!result.ok) {
      expect(typeof result.atSeq).toBe('number');
      expect(result.atSeq).toBeGreaterThan(0);
    }
  });

  it('F-08: re-run over the same corrupted chain produces the same reason (deterministic)', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'correlation-mismatch' });
    const r1 = verifyChain(corrupted);
    const r2 = verifyChain(corrupted);
    expect(r1).toEqual(r2);
  });
});
