/**
 * L1: Publish pipeline integration — cross-module publish flows.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { detectManifestState } from '../../src/publish/manifest-state.js';
import { evaluateFleetPolicy } from '../../src/publish/fleet-policy.js';
import { executeTransaction } from '../../src/publish/atomicity.js';
import { resolveSigningKey } from '../../src/publish/key-resolution.js';
import { registerKey } from '../../src/keys/registry.js';
import { createStorage } from '../../src/keys/storage.js';
import type { FleetPublishPolicy } from '../../src/publish/fleet-policy.js';
import type { RegistryClient, StagedArtifact } from '../../src/publish/atomicity.js';

function tempDir(): string {
  return join(tmpdir(), `claws-test-int-${randomBytes(4).toString('hex')}`);
}

describe('publish DECLARED-tier unsigned skill (no fleet policy)', () => {
  let dir: string;

  beforeEach(async () => {
    dir = tempDir();
    await mkdir(join(dir, 'skills', 'my-skill'), { recursive: true });
    delete process.env['CLAWS_CI_SIGNING_KEY'];
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('succeeds when no fleet policy restricts DECLARED tier', async () => {
    // Set up signing key
    const entry = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });
    const keyMaterial = randomBytes(32).toString('hex');
    const storage = createStorage('file', dir);
    await storage.write(entry.id, keyMaterial);

    // Write unsigned manifest
    const skillDir = join(dir, 'skills', 'my-skill');
    await writeFile(join(skillDir, 'skill.yaml'), 'name: my-skill\nrisk: 1\n');

    // Resolve key
    const keyResult = await resolveSigningKey(dir);
    expect(keyResult).not.toBeNull();

    // Detect manifest state
    const manifestResult = await detectManifestState(skillDir, keyResult!.keyMaterial);
    expect(manifestResult.state).toBe('absent');

    // Check fleet policy (permissive)
    const permissive: FleetPublishPolicy = {
      requireVerifiedPublish: false,
      allowDeclaredDryRun: true,
    };
    const policyResult = evaluateFleetPolicy('declared', permissive, false);
    expect(policyResult.allowed).toBe(true);

    // Execute transaction
    const artifacts: StagedArtifact[] = [
      { name: 'skill.yaml', content: 'name: my-skill\nrisk: 1\n' },
    ];
    const mockClient: RegistryClient = { async submit() { return 200; } };
    const txResult = await executeTransaction(dir, artifacts, mockClient);
    expect(txResult.state).toBe('committed');
  });
});

describe('publish VERIFIED-tier signed skill with signature verification', () => {
  let dir: string;

  beforeEach(async () => {
    dir = tempDir();
    await mkdir(join(dir, 'skills', 'secure-skill'), { recursive: true });
    delete process.env['CLAWS_CI_SIGNING_KEY'];
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('succeeds with valid signature', async () => {
    // Set up signing key
    const entry = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });
    const keyMaterial = randomBytes(32).toString('hex');
    const storage = createStorage('file', dir);
    await storage.write(entry.id, keyMaterial);

    // Write signed manifest
    const { computeContentHash, extractSignableContent } = await import('../../src/publish/manifest-state.js');
    const content = 'name: secure-skill\ntier: verified\nrisk: 3\n';
    const signable = extractSignableContent(content);
    const sig = computeContentHash(signable, keyMaterial);
    const hash = computeContentHash(signable, keyMaterial);
    const signedContent = `${content}signature: ${sig}\ncontent-hash: ${hash}\n`;

    const skillDir = join(dir, 'skills', 'secure-skill');
    await writeFile(join(skillDir, 'skill.yaml'), signedContent);

    // Resolve key and detect state
    const keyResult = await resolveSigningKey(dir);
    expect(keyResult).not.toBeNull();

    const manifestResult = await detectManifestState(skillDir, keyResult!.keyMaterial);
    expect(manifestResult.state).toBe('valid-signed');

    // Restrictive fleet policy — should still allow VERIFIED
    const restrictive: FleetPublishPolicy = {
      requireVerifiedPublish: true,
      allowDeclaredDryRun: true,
    };
    const policyResult = evaluateFleetPolicy('verified', restrictive, false);
    expect(policyResult.allowed).toBe(true);
  });
});

describe('fleet policy blocks DECLARED tier when requireVerifiedPublish=true', () => {
  it('blocks DECLARED but allows VERIFIED', () => {
    const restrictive: FleetPublishPolicy = {
      requireVerifiedPublish: true,
      allowDeclaredDryRun: false,
    };

    const declared = evaluateFleetPolicy('declared', restrictive, false);
    expect(declared.allowed).toBe(false);

    const verified = evaluateFleetPolicy('verified', restrictive, false);
    expect(verified.allowed).toBe(true);
  });
});
