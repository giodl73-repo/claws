/**
 * L3 SDK acceptance test for maker publish.
 *
 * P29: Consumer publishes a TYPED skill through the full pipeline,
 * verifies manifest signing, tier evaluation, and atomic rollback
 * on simulated registry failure.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, cp, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  makerPublish,
  pinchPreflight,
  evaluateTier,
} from '@bic/claws-sdk/maker';
import {
  generateManifest,
  verifyManifest,
} from '@bic/claws-sdk/maker';

import { createMockRegistry } from '../fixtures/mock-registry/index.js';

const TIER2_FIXTURE = join(__dirname, '..', 'fixtures', 'tier2-skill');

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-accept-publish-'));
  await cp(TIER2_FIXTURE, tempDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('SDK acceptance: publish TYPED skill with signing + rollback', () => {
  it('full consumer workflow: publish -> verify manifest -> verify badge', async () => {
    const signingKey = 'claws-accept-signing-key-2024!!!!';
    const registry = createMockRegistry('success');

    // Publish TYPED skill
    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      signingKey,
      registry,
      policyConfig: '{"compliance":"standard"}',
    });

    // Success
    expect(result.success).toBe(true);
    expect(result.name).toBe('data-transform');
    expect(result.version).toBe('1.0.0');
    expect(result.rolledBack).toBe(false);
    expect(result.publishId).toBeTruthy();
    expect(result.durationMs).toBeGreaterThan(0);

    // Tier evaluation
    expect(['TYPED', 'VERIFIED']).toContain(result.tier);

    // Manifest provenance
    expect(result.manifest.version).toBe(1);
    expect(result.manifest.name).toBe('data-transform');
    expect(result.manifest.publishedVersion).toBe('1.0.0');
    expect(result.manifest.provenance.sdkVersion).toBe('0.5.0');
    expect(result.manifest.provenance.compiledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.manifest.provenance.policyHash).toBeTruthy();
    expect(result.manifest.contentHash).toBeTruthy();

    // Signature verification
    expect(result.manifest.signatureStatus).toBe('signed');
    expect(result.manifest.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyManifest(result.manifest, signingKey)).toBe('signed');
    expect(verifyManifest(result.manifest, 'wrong-key')).toBe('invalid');

    // Badge snapshot (S05-F09)
    expect(result.badge.version).toBe('1.0.0');
    expect(result.badge.tier).toBe(result.tier);
    expect(result.badge.signatureStatus).toBe('signed');
    expect(result.badge.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Registry payload
    expect(registry.calls).toHaveLength(1);
    const payload = registry.calls[0].payload;
    expect(payload.name).toBe('data-transform');
    expect(payload.version).toBe('1.0.0');
    expect(payload.files.has('SKILL.md')).toBe(true);
    expect(payload.manifest.signatureStatus).toBe('signed');
  });

  it('atomic rollback on simulated registry failure', async () => {
    const registry = createMockRegistry('status-500');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      signingKey: 'claws-rollback-key-for-testing!!',
      registry,
    });

    // Failure with rollback
    expect(result.success).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(result.error).toContain('500');

    // Manifest cleaned up
    let manifestExists = true;
    try {
      await access(join(tempDir, '.claws-manifest.json'));
    } catch {
      manifestExists = false;
    }
    expect(manifestExists).toBe(false);

    // Security warnings still present
    expect(result.securityWarnings).toBeDefined();
    expect(result.badge).toBeDefined();
  });

  it('per-version badge independence (S05-F09)', async () => {
    const registry = createMockRegistry('success');

    // Publish v1.0.0
    const v1 = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
    });

    // Publish v1.1.0 (same skill, different version)
    const v2 = await makerPublish({
      skillDir: tempDir,
      version: '1.1.0',
      sdkVersion: '0.5.1',
      registry,
    });

    expect(v1.success).toBe(true);
    expect(v2.success).toBe(true);

    // Each version has its own badge
    expect(v1.badge.version).toBe('1.0.0');
    expect(v2.badge.version).toBe('1.1.0');

    // Badges are independent snapshots
    expect(v1.badge.generatedAt).not.toBe(v2.badge.generatedAt);
    expect(v1.manifest.publishedVersion).toBe('1.0.0');
    expect(v2.manifest.publishedVersion).toBe('1.1.0');
  });
});
