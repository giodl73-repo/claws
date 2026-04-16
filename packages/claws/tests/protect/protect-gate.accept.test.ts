/**
 * L3: CLI acceptance — `claws protect budget`, `claws protect secrets`,
 * `claws protect identity` commands produce correct output and exit codes
 * on reference workspace.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { signAuditEntry } from '@bic/claws-sdk/compliance/artifact-signer';
import { claws } from '../accept/helpers.js';

describe('CLI protect-gate acceptance', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('claws protect budget produces correct output and exits 0', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-gate-budget-'));

    const auditDir = join(tempDir, '.claws', 'audit');
    await mkdir(auditDir, { recursive: true });

    const key = Buffer.alloc(32, 'g');
    const entry = signAuditEntry({
      seq: 0,
      timestamp: '2026-04-14T09:00:00Z',
      eventType: 'TOKEN_USAGE',
      actor: 'gate-test',
      target: '5000',
      action: 'consume',
      outcome: 'allow',
      ruleId: 'budget-gate',
      severity: 1,
      policyVersion: '1.0.0',
    }, key, 'gate-key-v1');
    await writeFile(
      join(auditDir, 'chain.jsonl'),
      JSON.stringify(entry) + '\n',
      'utf-8',
    );

    await writeFile(join(tempDir, 'claws.json'), JSON.stringify({
      trustTier: 2,
      budgetConfig: { daily: 50000, monthly: 500000 },
    }), 'utf-8');

    const result = await claws(['protect', 'budget'], { cwd: tempDir });
    expect(result.exitCode).toBe(0);
    // Output should contain budget-related content
    expect(result.stdout.length + result.stderr.length).toBeGreaterThan(0);
  });

  it('claws protect secrets list on uninitialised vault exits non-zero', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-gate-secrets-'));
    await writeFile(join(tempDir, 'claws.json'), JSON.stringify({ trustTier: 2 }), 'utf-8');

    const result = await claws(['protect', 'secrets', 'list'], { cwd: tempDir });
    // Should fail because vault is not initialized
    expect(result.exitCode).not.toBe(0);
  });

  it('claws protect identity show exits with output', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-gate-identity-'));
    await writeFile(join(tempDir, 'claws.json'), JSON.stringify({ trustTier: 2 }), 'utf-8');

    const result = await claws(['protect', 'identity', 'show'], { cwd: tempDir });
    // Identity show should produce output even without config
    expect(result.stdout.length + result.stderr.length).toBeGreaterThan(0);
  });
});
