/**
 * SC-27: audit-chain corruption — hash mismatch.
 *
 * Mutate a DecisionEntry's content without updating its stored hash. The
 * recomputed hash over the mutated content no longer matches entry.hash, so
 * verifyChain reports `hash-mismatch` at that entry's seq.
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
  corruptAuditChain,
  verifyChain,
} from '#harness/audit-chain.js';
import type { AuditChainEntry, DecisionEntry } from '#harness/audit-types.js';

describe('SC-27 audit-chain hash-mismatch', () => {
  let cleanChain: readonly AuditChainEntry[];

  beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), 'cp6-sc27-'));
    const path = join(dir, 'audit.jsonl');
    const w = new AuditChainWriter({ filePath: path, clock: () => 1_700_000_000_000 });
    const policySha = 'sha256:' + 'c'.repeat(64);
    w.appendProducer({
      policyArtifactSha256: policySha,
      generatedAt: '2024-01-01T00:00:00.000Z',
      scope: '@bic/openclaw',
      producerVersion: '1.0.0',
    });
    w.appendDecision({
      correlationId: 'corr-27',
      snapshotId: 'snap-sc27',
      policyArtifactSha256: policySha,
      tool: 'send-email',
      decision: 'allow',
      declaredTier: 'R5',
      effectiveTier: 'R5',
    });
    cleanChain = new AuditChainReader({ filePath: path }).all();
    expect(verifyChain(cleanChain).ok).toBe(true);
  });

  it('F-01..F-04: content mutation is detected via recomputed-hash check', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'hash-mismatch' });
    const result = verifyChain(corrupted);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('hash-mismatch');
      expect(result.atSeq).toBeDefined();
    }
  });

  it('F-05: hash-mismatch produces DISTINCT reason from chain-gap and correlation-mismatch', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'hash-mismatch' });
    const result = verifyChain(corrupted);
    if (!result.ok) {
      expect(result.reason).not.toBe('chain-gap');
      expect(result.reason).not.toBe('correlation-mismatch');
    }
  });

  it('F-06: mutation leaves stored hash intact; recomputed differs (that is the signal)', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'hash-mismatch' });
    const decision = corrupted.find((e) => e.type === 'decision') as DecisionEntry | undefined;
    expect(decision).toBeDefined();
    // Stored hash still matches the original chain's decision hash field — the
    // mutation is to content, not hash.
    const originalDecision = cleanChain.find((e) => e.type === 'decision') as DecisionEntry | undefined;
    expect(decision!.hash).toBe(originalDecision!.hash);
    // But content differs (tool tampered).
    expect(decision!.tool).not.toBe(originalDecision!.tool);
  });

  it('F-07: offending seq is cited', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'hash-mismatch' });
    const result = verifyChain(corrupted);
    if (!result.ok) {
      expect(typeof result.atSeq).toBe('number');
      expect(result.atSeq).toBeGreaterThan(0);
    }
  });

  it('F-08: verification is deterministic across re-runs', () => {
    const corrupted = corruptAuditChain(cleanChain, { mode: 'hash-mismatch' });
    const r1 = verifyChain(corrupted);
    const r2 = verifyChain(corrupted);
    expect(r1).toEqual(r2);
  });
});
