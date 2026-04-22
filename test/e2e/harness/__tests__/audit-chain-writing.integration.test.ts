import { describe, it, expect, afterEach } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AuditChainReader,
  AuditChainWriter,
  verifyChain,
  GENESIS_HASH,
} from '#harness/audit-chain.ts';
import { generatePolicy } from '#harness/policy-runner.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = join(HERE, '..', '..', 'fixtures');

const createdDirs: string[] = [];

afterEach(() => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop()!;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        rmSync(dir, { recursive: true, force: true });
        break;
      } catch {
        // Windows can hold the dir briefly after child exit.
      }
    }
  }
});

function makeScratchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'audit-chain-writing-'));
  createdDirs.push(dir);
  return dir;
}

function makeFixtureScratchDir(fixtureName: string): string {
  const dir = mkdtempSync(join(tmpdir(), `audit-chain-writing-${fixtureName}-`));
  createdDirs.push(dir);
  cpSync(join(FIXTURES_ROOT, fixtureName), dir, { recursive: true });
  return dir;
}

function sha256Hex(bytes: string): string {
  return 'sha256:' + createHash('sha256').update(bytes, 'utf8').digest('hex');
}

describe('audit-chain writing (CL-11 §3a end-to-end)', () => {
  it('DecisionEntry written with both declaredTier and effectiveTier present', () => {
    const dir = makeScratchDir();
    const filePath = join(dir, 'chain.jsonl');
    const w = new AuditChainWriter({ filePath, clock: () => 1_700_001_000_000 });
    w.appendProducer({
      policyArtifactSha256: 'sha256:' + 'd'.repeat(64),
      generatedAt: '2024-01-02T00:00:00.000Z',
      scope: '@bic/openclaw',
      producerVersion: '1.0.0',
    });
    const d = w.appendDecision({
      correlationId: 'int-corr-1',
      snapshotId: 'snap-int-1',
      policyArtifactSha256: 'sha256:' + 'd'.repeat(64),
      tool: 'exec',
      decision: 'allow',
      declaredTier: 'R3',
      effectiveTier: 'R2',
    });
    expect(d.declaredTier).toBe('R3');
    expect(d.effectiveTier).toBe('R2');

    const reader = new AuditChainReader({ filePath });
    const entries = reader.byCorrelationId('int-corr-1');
    expect(entries).toHaveLength(1);
    const [firstEntry] = entries;
    if (firstEntry?.type === 'decision') {
      expect(firstEntry.declaredTier).toBe('R3');
      expect(firstEntry.effectiveTier).toBe('R2');
    } else {
      throw new Error('expected decision entry');
    }
  });

  it('ApprovalEntry cross-links with correct correlationId', () => {
    const dir = makeScratchDir();
    const filePath = join(dir, 'chain.jsonl');
    const w = new AuditChainWriter({ filePath, clock: () => 1_700_002_000_000 });
    w.appendProducer({
      policyArtifactSha256: 'sha256:' + 'e'.repeat(64),
      generatedAt: '2024-01-02T00:00:00.000Z',
      scope: '@openclaw',
      producerVersion: '1.0.0',
    });
    w.appendDecision({
      correlationId: 'int-corr-2',
      snapshotId: 'snap-int-2',
      policyArtifactSha256: 'sha256:' + 'e'.repeat(64),
      tool: 'write',
      decision: 'review',
      declaredTier: 'R2',
      effectiveTier: 'R2',
    });
    w.appendApproval({
      correlationId: 'int-corr-2',
      approver: 'bob@example.com',
      outcome: 'approve',
      ttl: 15_000,
      nonce: 'nonce-abc',
      keyId: 'key-1',
      sequenceNumber: 7,
      signature: 'sig-hex',
    });

    const reader = new AuditChainReader({ filePath });
    const linked = reader.byCorrelationId('int-corr-2');
    expect(linked).toHaveLength(2);
    const types = linked.map((e) => e.type);
    expect(types).toEqual(['decision', 'approval']);
  });

  it(
    'ProducerEntry emitted on real `claws policy generate` — sha256 of output matches entry',
    async () => {
      // Pulse 47.7: uses the real `claws policy generate` binary against a
      // real CP-5 fixture rather than a pulse-36 Node-based fake. The sha
      // covers whatever policy-ir.json the real generator produced — the
      // bytes differ run-over-run only if the generator version changes.
      const workspace = makeFixtureScratchDir('allow-r1-public');
      const chainDir = makeScratchDir();
      const filePath = join(chainDir, 'chain.jsonl');

      const result = await generatePolicy(workspace);
      expect(result.exitCode).toBe(0);
      const artifact = readFileSync(
        join(result.policyDir, 'policy-ir.json'),
        'utf8',
      );
      const sha = sha256Hex(artifact);

      const w = new AuditChainWriter({ filePath, clock: () => 1_700_003_000_000 });
      const producer = w.appendProducer({
        policyArtifactSha256: sha,
        generatedAt: new Date(1_700_003_000_000).toISOString(),
        scope: '@bic/openclaw',
        producerVersion: '1.0.0',
      });
      expect(producer.policyArtifactSha256).toBe(sha);
      expect(producer.prevHash).toBe(GENESIS_HASH);

      // Reader finds the producer by sha.
      const reader = new AuditChainReader({ filePath });
      const found = reader.byPolicyArtifactSha256(sha);
      expect(found).toHaveLength(1);
      expect(found[0]!.type).toBe('producer');
    },
    60_000,
  );

  it('hash chain verifies via verifyChain for a 3-entry run (producer + decision + approval)', () => {
    const dir = makeScratchDir();
    const filePath = join(dir, 'chain.jsonl');
    const w = new AuditChainWriter({ filePath, clock: () => 1_700_004_000_000 });
    const p = w.appendProducer({
      policyArtifactSha256: 'sha256:' + 'f'.repeat(64),
      generatedAt: new Date(1_700_004_000_000).toISOString(),
      scope: '@bic/openclaw',
      producerVersion: '2.0.0',
    });
    const d = w.appendDecision({
      correlationId: 'chain-corr-1',
      snapshotId: 'snap-chain-1',
      policyArtifactSha256: p.policyArtifactSha256,
      tool: 'read',
      decision: 'review',
      declaredTier: 'R1',
      effectiveTier: 'R1',
    });
    w.appendApproval({
      correlationId: 'chain-corr-1',
      approver: 'carol@example.com',
      outcome: 'approve',
      ttl: 10_000,
      nonce: 'n-42',
      keyId: 'k-42',
      sequenceNumber: 1,
      signature: 's-42',
    });

    const reader = new AuditChainReader({ filePath });
    expect(reader.all()).toHaveLength(3);
    const verdict = verifyChain(reader.all());
    expect(verdict.ok).toBe(true);
    expect(d.prevHash).toBe(p.hash);
  });
});
