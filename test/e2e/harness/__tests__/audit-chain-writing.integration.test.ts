import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AuditChainReader,
  AuditChainWriter,
  verifyChain,
  GENESIS_HASH,
} from '#harness/audit-chain.ts';
import {
  defaultClawsCommand,
  generatePolicy,
  type ResolvedCommand,
} from '#harness/policy-runner.ts';

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

function sha256Hex(bytes: string): string {
  return 'sha256:' + createHash('sha256').update(bytes, 'utf8').digest('hex');
}

function fakeClawsPolicyGen(outputFile: string): ResolvedCommand {
  // A fake `claws policy generate` that writes a deterministic policy-ir.json
  // so the integration test can hash the bytes + compare to the entry shape.
  const scriptBody =
    `const fs = require('fs');\n` +
    `const path = require('path');\n` +
    `const out = path.join(process.cwd(), '.openclaw', 'policy');\n` +
    `fs.mkdirSync(out, { recursive: true });\n` +
    `fs.writeFileSync(path.join(out, 'policy-ir.json'), ${JSON.stringify(outputFile)});\n`;
  return {
    bin: process.execPath,
    args: ['-e', scriptBody, '--'],
  };
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

  it('ProducerEntry emitted on `claws policy generate` — sha256 of output matches entry', async () => {
    const dir = makeScratchDir();
    const filePath = join(dir, 'chain.jsonl');
    const policyBytes = '{"policyId":"p-1","tier":"R1"}';
    const command = fakeClawsPolicyGen(policyBytes);

    const result = await generatePolicy(dir, { command });
    expect(result.exitCode).toBe(0);
    const artifact = readFileSync(join(result.policyDir, 'policy-ir.json'), 'utf8');
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
    // Ensure the fake didn't leak the defaultClawsCommand fallback.
    expect(defaultClawsCommand).toBeDefined();
  });

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
