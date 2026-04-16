/**
 * L1 integration tests for maker publish pipeline.
 *
 * P29: full publish pipeline with mocked ClawHub, publish TYPED skill
 * with governance badge, full lifecycle (compile -> sign -> upload -> verify),
 * fleet policy enforcement, rollback on registry 500.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, cp, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { makerPublish } from '../../src/maker/publish.js';
import { verifyManifest } from '../../src/maker/manifest.js';
import { createMockRegistry } from '../fixtures/mock-registry/index.js';

const TIER2_FIXTURE = join(__dirname, '..', 'fixtures', 'tier2-skill');
const UNGOVERNED_FIXTURE = join(__dirname, '..', 'fixtures', 'ungoverned-skill');

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-publish-int-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('full publish pipeline with mocked ClawHub', () => {
  it('publishes skill through all 5 stages with correct registry payload', async () => {
    await cp(UNGOVERNED_FIXTURE, tempDir, { recursive: true });
    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      signingKey: 'claws-integration-test-key-32b!!',
      registry,
      policyConfig: '{"trustTier":2}',
    });

    // Publish succeeded
    expect(result.success).toBe(true);
    expect(result.name).toBe('send-invoice');
    expect(result.version).toBe('1.0.0');
    expect(result.publishId).toBeTruthy();
    expect(result.rolledBack).toBe(false);

    // Registry received correct payload
    expect(registry.calls).toHaveLength(1);
    const call = registry.calls[0];
    expect(call.payload.name).toBe('send-invoice');
    expect(call.payload.version).toBe('1.0.0');
    expect(call.payload.manifest.signatureStatus).toBe('signed');
    expect(call.payload.files.has('SKILL.md')).toBe(true);
    expect(call.payload.files.has('handler.ts')).toBe(true);

    // Manifest is valid
    const status = verifyManifest(result.manifest, 'claws-integration-test-key-32b!!');
    expect(status).toBe('signed');

    // Badge snapshot
    expect(result.badge.version).toBe('1.0.0');
    expect(result.badge.tier).toBe(result.tier);
    expect(result.badge.signatureStatus).toBe('signed');
  });
});

describe('publish TYPED skill with governance badge', () => {
  it('publishes tier2-skill fixture with correct tier and badge', async () => {
    await cp(TIER2_FIXTURE, tempDir, { recursive: true });
    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '0.1.0',
      sdkVersion: '0.5.0',
      registry,
    });

    expect(result.success).toBe(true);
    expect(result.name).toBe('data-transform');
    expect(['TYPED', 'VERIFIED']).toContain(result.tier);

    // Badge has correct version and tier
    expect(result.badge.version).toBe('0.1.0');
    expect(result.badge.tier).toBe(result.tier);
    expect(result.badge.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('full publish lifecycle: compile -> sign -> upload -> verify manifest', () => {
  it('complete lifecycle with manifest verification', async () => {
    await cp(UNGOVERNED_FIXTURE, tempDir, { recursive: true });
    const signingKey = 'claws-lifecycle-test-key-2024!!!';
    const registry = createMockRegistry('success');

    // Publish (compile + sign + upload)
    const result = await makerPublish({
      skillDir: tempDir,
      version: '2.0.0',
      sdkVersion: '0.6.0',
      signingKey,
      registry,
      policyConfig: '{"compliance":"soc2"}',
    });

    expect(result.success).toBe(true);

    // Verify manifest provenance
    expect(result.manifest.provenance.sdkVersion).toBe('0.6.0');
    expect(result.manifest.provenance.tier).toBe(result.tier);
    expect(result.manifest.provenance.policyHash).toBeTruthy();
    expect(result.manifest.contentHash).toBeTruthy();

    // Verify signature
    const status = verifyManifest(result.manifest, signingKey);
    expect(status).toBe('signed');

    // Verify with wrong key fails
    const wrongKeyStatus = verifyManifest(result.manifest, 'wrong-key');
    expect(wrongKeyStatus).toBe('invalid');

    // Registry received signed manifest
    const payload = registry.calls[0].payload;
    expect(payload.manifest.signatureStatus).toBe('signed');
    expect(payload.manifest.signature).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('fleet policy enforcement: DECLARED blocked, VERIFIED allowed', () => {
  it('blocks DECLARED skill when fleet requires VERIFIED', async () => {
    // Prompt-only skill (no handler) = DECLARED tier
    await writeFile(join(tempDir, 'SKILL.md'), [
      '---',
      'name: prompt-only',
      'description: A prompt-only skill',
      '---',
      '',
      '# Prompt Only',
    ].join('\n'), 'utf-8');

    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
      fleetPolicy: { minimumTier: 'VERIFIED', requireSigning: false },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Fleet policy requires minimum tier VERIFIED');
    expect(result.tier).toBe('DECLARED');
    expect(registry.calls).toHaveLength(0);

    // Fleet security warning emitted
    const fleetWarning = result.securityWarnings.find(w => w.code === 'FLEET-001');
    expect(fleetWarning).toBeDefined();
  });

  it('allows TYPED skill when fleet requires TYPED', async () => {
    await cp(UNGOVERNED_FIXTURE, tempDir, { recursive: true });
    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
      fleetPolicy: { minimumTier: 'TYPED', requireSigning: false },
    });

    expect(result.success).toBe(true);
    expect(registry.calls).toHaveLength(1);
  });

  it('blocks publish when fleet requires signing but no key provided', async () => {
    await cp(UNGOVERNED_FIXTURE, tempDir, { recursive: true });
    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
      fleetPolicy: { minimumTier: 'DECLARED', requireSigning: true },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('signing');
    expect(registry.calls).toHaveLength(0);
  });
});

describe('publish rollback: mock registry returns 500', () => {
  it('cleans up local staging on HTTP 500 from registry', async () => {
    await cp(UNGOVERNED_FIXTURE, tempDir, { recursive: true });
    const registry = createMockRegistry('status-500');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
    });

    expect(result.success).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(result.error).toContain('500');

    // Manifest file cleaned up
    let manifestExists = true;
    try {
      await access(join(tempDir, '.claws-manifest.json'));
    } catch {
      manifestExists = false;
    }
    expect(manifestExists).toBe(false);
  });
});
