/**
 * L2: Publish lifecycle e2e — scaffold -> build -> publish -> verify.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import {
  detectManifestState,
  computeContentHash,
  extractSignableContent,
} from '../../src/publish/manifest-state.js';
import { evaluateFleetPolicy } from '../../src/publish/fleet-policy.js';
import { executeTransaction } from '../../src/publish/atomicity.js';
import { resolveSigningKey } from '../../src/publish/key-resolution.js';
import { readFreshBadge, writeBadgeVersion } from '../../src/publish/badge.js';
import { registerKey } from '../../src/keys/registry.js';
import { createStorage } from '../../src/keys/storage.js';
import type { FleetPublishPolicy } from '../../src/publish/fleet-policy.js';
import type { RegistryClient, StagedArtifact } from '../../src/publish/atomicity.js';

function tempDir(): string {
  return join(tmpdir(), `claws-test-e2e-${randomBytes(4).toString('hex')}`);
}

describe('scaffold VERIFIED skill -> build -> publish -> verify', () => {
  let dir: string;

  beforeEach(async () => {
    dir = tempDir();
    await mkdir(dir, { recursive: true });
    delete process.env['CLAWS_CI_SIGNING_KEY'];
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('full publish pipeline for VERIFIED skill', async () => {
    // 1. Set up workspace with signing key
    const entry = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });
    const keyMaterial = randomBytes(32).toString('hex');
    const storage = createStorage('file', dir);
    await storage.write(entry.id, keyMaterial);

    // 2. Scaffold a skill directory with signed manifest
    const skillDir = join(dir, 'skills', 'invoice-sender');
    await mkdir(skillDir, { recursive: true });

    const manifest = 'name: invoice-sender\ntier: verified\nrisk: 4\n';
    const signable = extractSignableContent(manifest);
    const sig = computeContentHash(signable, keyMaterial);
    const hash = computeContentHash(signable, keyMaterial);
    const signedManifest = `${manifest}signature: ${sig}\ncontent-hash: ${hash}\n`;
    await writeFile(join(skillDir, 'skill.yaml'), signedManifest);

    // Write SKILL.md for badge
    const skillMd = [
      '---',
      'name: invoice-sender',
      'tier: verified',
      'heuristic-risk: R4',
      'heuristic-obo: false',
      'heuristic-risk-confidence: 0.80',
      '---',
      '',
      '# Invoice Sender',
    ].join('\n');
    await writeFile(join(skillDir, 'SKILL.md'), skillMd);

    // 3. Resolve signing key
    const keyResult = await resolveSigningKey(dir);
    expect(keyResult).not.toBeNull();
    expect(keyResult!.source).toBe('fleet');

    // 4. Detect manifest state
    const manifestResult = await detectManifestState(skillDir, keyResult!.keyMaterial);
    expect(manifestResult.state).toBe('valid-signed');

    // 5. Read badge
    const badge = await readFreshBadge(skillDir, '1.0.0');
    expect(badge).not.toBeNull();
    expect(badge!.risk).toBe('R4');

    // 6. Publish
    const artifacts: StagedArtifact[] = [
      { name: 'skill.yaml', content: signedManifest },
      { name: 'badge.json', content: JSON.stringify(badge) },
    ];
    const mockClient: RegistryClient = { async submit() { return 200; } };
    const txResult = await executeTransaction(dir, artifacts, mockClient);
    expect(txResult.state).toBe('committed');

    // 7. Write badge version
    await writeBadgeVersion(skillDir, badge!);
    const badgeStore = await readFile(join(skillDir, '.claws', 'badges.json'), 'utf-8');
    const store = JSON.parse(badgeStore);
    expect(store.versions).toHaveLength(1);
    expect(store.versions[0].badge.risk).toBe('R4');
  });
});

describe('fleet policy enforcement e2e', () => {
  let dir: string;

  beforeEach(async () => {
    dir = tempDir();
    await mkdir(dir, { recursive: true });
    delete process.env['CLAWS_CI_SIGNING_KEY'];
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('blocks DECLARED, allows VERIFIED, respects key resolution chain', async () => {
    // Set up CI key (highest priority)
    const ciKey = randomBytes(32).toString('hex');
    process.env['CLAWS_CI_SIGNING_KEY'] = ciKey;
    process.env['CLAWS_CI_SIGNING_KEY_ID'] = 'ci-key-42';

    // Also set up fleet key
    const entry = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });
    const fleetKey = randomBytes(32).toString('hex');
    const storage = createStorage('file', dir);
    await storage.write(entry.id, fleetKey);

    // Resolve key — should pick CI
    const keyResult = await resolveSigningKey(dir);
    expect(keyResult!.source).toBe('ci-env');
    expect(keyResult!.keyId).toBe('ci-key-42');

    // Fleet policy: require verified
    const restrictive: FleetPublishPolicy = {
      requireVerifiedPublish: true,
      allowDeclaredDryRun: false,
    };

    // DECLARED-tier → blocked
    const declaredResult = evaluateFleetPolicy('declared', restrictive, false);
    expect(declaredResult.allowed).toBe(false);

    // VERIFIED-tier → allowed
    const verifiedResult = evaluateFleetPolicy('verified', restrictive, false);
    expect(verifiedResult.allowed).toBe(true);

    // Publish VERIFIED skill
    const skillDir = join(dir, 'skills', 'secure-skill');
    await mkdir(skillDir, { recursive: true });

    const manifest = 'name: secure-skill\ntier: verified\nrisk: 3\n';
    const signable = extractSignableContent(manifest);
    const sig = computeContentHash(signable, ciKey);
    const hash = computeContentHash(signable, ciKey);
    const signed = `${manifest}signature: ${sig}\ncontent-hash: ${hash}\n`;
    await writeFile(join(skillDir, 'skill.yaml'), signed);

    const manifestResult = await detectManifestState(skillDir, ciKey);
    expect(manifestResult.state).toBe('valid-signed');

    const artifacts: StagedArtifact[] = [
      { name: 'skill.yaml', content: signed },
    ];
    const mockClient: RegistryClient = { async submit() { return 200; } };
    const txResult = await executeTransaction(dir, artifacts, mockClient);
    expect(txResult.state).toBe('committed');

    // Cleanup
    delete process.env['CLAWS_CI_SIGNING_KEY'];
    delete process.env['CLAWS_CI_SIGNING_KEY_ID'];
  });
});
