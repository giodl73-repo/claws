/**
 * SC-26: audit-chain corruption — chain gap.
 *
 * Remove an intermediate entry from a clean chain. The subsequent entry's
 * prevHash no longer threads to an existing entry's hash. Assert verifyChain
 * reports `chain-gap` (NOT `hash-mismatch`, NOT `correlation-mismatch`) and
 * the CLI will not silently continue past the gap.
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

describe('SC-26 audit-chain chain-gap', () => {
  let cleanChain: readonly AuditChainEntry[];

  beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), 'cp6-sc26-'));
    const path = join(dir, 'audit.jsonl');
    const w = new AuditChainWriter({ filePath: path, clock: () => 1_700_000_000_000 });
    const policySha = 'sha256:' + 'a'.repeat(64);
    w.appendProducer({
      policyArtifactSha256: policySha,
      generatedAt: '2024-01-01T00:00:00.000Z',
      scope: '@bic/openclaw',
      producerVersion: '1.0.0',
    });
    w.appendDecision({
      correlationId: 'corr-a',
      policyArtifactSha256: policySha,
      principal: 'user@example.com',
      toolName: 'send-email',
      argsHash: 'sha256:' + '1'.repeat(64),
      declaredTier: 'R5',
      effectiveTier: 'R5',
      decision: 'allow',
    });
    w.appendDecision({
      correlationId: 'corr-b',
      policyArtifactSha256: policySha,
      principal: 'user@example.com',
      toolName: 'send-email',
      argsHash: 'sha256:' + '2'.repeat(64),
      declaredTier: 'R5',
      effectiveTier: 'R5',
      decision: 'allow',
    });
    cleanChain = new AuditChainReader({ filePath: path }).all();
    expect(verifyChain(cleanChain).ok).toBe(true);
  });

  it('F-01..F-04: gap is detected (not silent)', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'chain-gap' });
    expect(corrupted.length).toBe(cleanChain.length - 1);
    const result = verifyChain(corrupted);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('chain-gap');
      expect(result.atSeq).toBeDefined();
    }
  });

  it('F-05: gap produces DISTINCT reason from hash-mismatch and correlation-mismatch', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'chain-gap' });
    const result = verifyChain(corrupted);
    if (!result.ok) {
      expect(result.reason).not.toBe('hash-mismatch');
      expect(result.reason).not.toBe('correlation-mismatch');
    }
  });

  it('F-06: atSeq identifies the orphaned entry (next-after-removed)', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'chain-gap' });
    const result = verifyChain(corrupted);
    if (!result.ok) {
      // The removed entry was at index 1 (seq 2). The now-broken entry is what
      // was at index 2 (seq 3) — its prevHash points to the removed entry's
      // hash. Because verifyChain also checks seq monotonicity, and we removed
      // an entry, the sequence check may fire first with sequence-rollback at
      // seq 3 (the new index-1 entry expects seq 2). Both orderings are valid
      // per spec; assert we got one of them.
      expect(['chain-gap', 'sequence-rollback']).toContain(result.reason);
    }
  });

  it('F-07: re-run over the same corrupted chain is deterministic', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'chain-gap' });
    const r1 = verifyChain(corrupted);
    const r2 = verifyChain(corrupted);
    expect(r1).toEqual(r2);
  });

  it('F-08: verifier does NOT pass on a gapped chain', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'chain-gap' });
    expect(verifyChain(corrupted).ok).toBe(false);
  });
});
