import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AuditChainReader,
  AuditChainWriter,
  verifyChain,
  DEFAULT_SCOPE_ALLOWLIST,
} from '#harness/audit-chain.ts';

function makeFile(): string {
  const d = mkdtempSync(join(tmpdir(), 'scope-flip-'));
  return join(d, 'chain.jsonl');
}

import type {
  ApprovalEntry,
  DecisionEntry,
} from '#harness/audit-types.ts';

/**
 * Emit a fixed 3-entry run under a given scope. The DecisionEntry +
 * ApprovalEntry bodies (sans `prevHash`/`hash` — those thread through the
 * ProducerEntry whose `scope` differs) should be byte-identical across scopes.
 */
function runFixture(
  filePath: string,
  scope: string,
): { decision: DecisionEntry; approval: ApprovalEntry } {
  const w = new AuditChainWriter({ filePath, clock: () => 1_700_020_000_000 });
  w.appendProducer({
    policyArtifactSha256: 'sha256:' + 'a'.repeat(64),
    generatedAt: '2024-02-01T00:00:00.000Z',
    scope,
    producerVersion: '1.0.0',
  });
  const decision = w.appendDecision({
    correlationId: 'scope-flip-corr',
    snapshotId: 'snap-flip',
    policyArtifactSha256: 'sha256:' + 'a'.repeat(64),
    tool: 'read',
    decision: 'review',
    declaredTier: 'R1',
    effectiveTier: 'R1',
  });
  const approval = w.appendApproval({
    correlationId: 'scope-flip-corr',
    approver: 'dana@example.com',
    outcome: 'approve',
    ttl: 20_000,
    nonce: 'nonce-flip',
    keyId: 'key-flip',
    sequenceNumber: 1,
    signature: 'sig-flip',
  });
  return { decision, approval };
}

function stripChainFields<T extends { prevHash: string; hash: string }>(
  entry: T,
): Omit<T, 'prevHash' | 'hash'> {
  const { prevHash: _p, hash: _h, ...rest } = entry;
  void _p;
  void _h;
  return rest;
}

describe('scope-flip harness-level (@bic/openclaw ↔ @openclaw)', () => {
  it('harness runs same fixture under both scopes — artifacts byte-identical after normalization', () => {
    const bicFile = makeFile();
    const ocFile = makeFile();
    const bic = runFixture(bicFile, '@bic/openclaw');
    const oc = runFixture(ocFile, '@openclaw');

    // DecisionEntry + ApprovalEntry bodies (excluding prevHash/hash which
    // thread through the ProducerEntry whose `scope` differs) are byte-
    // identical across scopes — the scope flip never leaks into decision
    // or approval records.
    expect(stripChainFields(bic.decision)).toEqual(stripChainFields(oc.decision));
    expect(stripChainFields(bic.approval)).toEqual(stripChainFields(oc.approval));

    // Both chains should pass verifyChain under the same reader allowlist.
    const bicReader = new AuditChainReader({
      filePath: bicFile,
      scopeAllowlist: DEFAULT_SCOPE_ALLOWLIST,
    });
    const ocReader = new AuditChainReader({
      filePath: ocFile,
      scopeAllowlist: DEFAULT_SCOPE_ALLOWLIST,
    });
    expect(verifyChain(bicReader.all()).ok).toBe(true);
    expect(verifyChain(ocReader.all()).ok).toBe(true);
  });

  it('reader rejects an out-of-allowlist scope: older → newer flip path preserved, unknown scope errors', () => {
    const filePath = makeFile();
    runFixture(filePath, '@bic/openclaw');

    // Reader with `@openclaw` only — prior scope should still error since
    // allowlist is tight. Default allowlist accepts both.
    expect(() =>
      new AuditChainReader({
        filePath,
        scopeAllowlist: ['@openclaw'],
      }),
    ).toThrow(/scope '@bic\/openclaw' not in allowlist/);

    // Default allowlist accepts both scopes — proves the forward-compat path.
    const reader = new AuditChainReader({ filePath });
    expect(reader.all()).toHaveLength(3);

    // Also smoke-check that on-disk bytes are UTF-8 JSONL, one entry per line.
    const bytes = readFileSync(filePath, 'utf8');
    expect(bytes.split('\n').filter((l) => l.length > 0)).toHaveLength(3);
  });
});
