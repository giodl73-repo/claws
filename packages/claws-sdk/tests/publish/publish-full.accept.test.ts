/**
 * L3: Full publish lifecycle — scaffold -> annotate -> build -> publish -> verify.
 *
 * Simulates the complete skill lifecycle through the publish pipeline.
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
import {
  evaluateFleetPolicy,
  readFleetPublishPolicy,
} from '../../src/publish/fleet-policy.js';
import { executeTransaction } from '../../src/publish/atomicity.js';
import { resolveSigningKey } from '../../src/publish/key-resolution.js';
import { readFreshBadge, writeBadgeVersion, readBadgeStore } from '../../src/publish/badge.js';
import { registerKey } from '../../src/keys/registry.js';
import { createStorage } from '../../src/keys/storage.js';
import type { RegistryClient, StagedArtifact } from '../../src/publish/atomicity.js';

function tempDir(): string {
  return join(tmpdir(), `claws-accept-pub-${randomBytes(4).toString('hex')}`);
}

/**
 * Simulated registry: records all submissions for assertion.
 */
function createMockRegistry(): { client: RegistryClient; submissions: { txId: string; artifacts: readonly StagedArtifact[] }[] } {
  const submissions: { txId: string; artifacts: readonly StagedArtifact[] }[] = [];
  const client: RegistryClient = {
    async submit(txId: string, artifacts: readonly StagedArtifact[]) {
      submissions.push({ txId, artifacts });
      return 200;
    },
  };
  return { client, submissions };
}

describe('full lifecycle: scaffold -> annotate -> build -> publish -> verify', () => {
  let dir: string;

  beforeEach(async () => {
    dir = tempDir();
    await mkdir(dir, { recursive: true });
    delete process.env['CLAWS_CI_SIGNING_KEY'];
    delete process.env['CLAWS_CI_SIGNING_KEY_ID'];
  });

  afterEach(async () => {
    delete process.env['CLAWS_CI_SIGNING_KEY'];
    delete process.env['CLAWS_CI_SIGNING_KEY_ID'];
    await rm(dir, { recursive: true, force: true });
  });

  it('end-to-end publish with manifest signed, badge correct, fleet policy honored', async () => {
    // ── Step 1: Generate signing key ───────────────────────────────────
    const entry = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });
    const keyMaterial = randomBytes(32).toString('hex');
    const storage = createStorage('file', dir);
    await storage.write(entry.id, keyMaterial);

    // ── Step 2: Scaffold skill ─────────────────────────────────────────
    const skillDir = join(dir, 'skills', 'data-ingest');
    await mkdir(skillDir, { recursive: true });

    // Simulated scaffold output
    const manifest = [
      'name: data-ingest',
      'tier: verified',
      'risk: 3',
      'inputs:',
      '  - name: source',
      '    type: string',
      'outputs:',
      '  - name: records',
      '    type: number',
    ].join('\n') + '\n';

    await writeFile(join(skillDir, 'skill.yaml'), manifest);

    // ── Step 3: Annotate (simulated — write SKILL.md with heuristic fields)
    const skillMd = [
      '---',
      'name: data-ingest',
      'tier: verified',
      'description: Ingest data from external sources',
      'heuristic-risk: R3',
      'heuristic-obo: false',
      'heuristic-risk-confidence: 0.75',
      'heuristic-data-classification: internal',
      '---',
      '',
      '# Data Ingest Skill',
      '',
      'Ingests data from configured sources.',
    ].join('\n');
    await writeFile(join(skillDir, 'SKILL.md'), skillMd);

    // ── Step 4: Build (simulated — sign the manifest) ──────────────────
    const signableContent = extractSignableContent(manifest);
    const signature = computeContentHash(signableContent, keyMaterial);
    const contentHash = computeContentHash(signableContent, keyMaterial);
    const signedManifest = `${manifest}signature: ${signature}\ncontent-hash: ${contentHash}\n`;
    await writeFile(join(skillDir, 'skill.yaml'), signedManifest);

    // ── Step 5: Resolve signing key ────────────────────────────────────
    const keyResult = await resolveSigningKey(dir);
    expect(keyResult).not.toBeNull();
    expect(keyResult!.source).toBe('fleet');
    expect(keyResult!.keyId).toBe(entry.id);

    // ── Step 6: Detect manifest state ──────────────────────────────────
    const manifestState = await detectManifestState(skillDir, keyResult!.keyMaterial);
    expect(manifestState.state).toBe('valid-signed');
    expect(manifestState.manifest!.name).toBe('data-ingest');
    expect(manifestState.manifest!.tier).toBe('verified');

    // ── Step 7: Evaluate fleet policy ──────────────────────────────────
    const policy = readFleetPublishPolicy({ requireVerifiedPublish: true });
    const policyResult = evaluateFleetPolicy('verified', policy, false);
    expect(policyResult.allowed).toBe(true);

    // Also verify DECLARED would be blocked
    const declaredResult = evaluateFleetPolicy('declared', policy, false);
    expect(declaredResult.allowed).toBe(false);

    // ── Step 8: Read badge data (fresh) ────────────────────────────────
    const badge = await readFreshBadge(skillDir, '1.0.0');
    expect(badge).not.toBeNull();
    expect(badge!.name).toBe('data-ingest');
    expect(badge!.tier).toBe('verified');
    expect(badge!.risk).toBe('R3');
    expect(badge!.obo).toBe(false);
    expect(badge!.confidence).toBe(0.75);
    expect(badge!.dataClassification).toBe('internal');

    // ── Step 9: Publish via two-phase transaction ──────────────────────
    const { client, submissions } = createMockRegistry();

    const readManifest = await readFile(join(skillDir, 'skill.yaml'), 'utf-8');
    const artifacts: StagedArtifact[] = [
      { name: 'skill.yaml', content: readManifest },
      { name: 'badge.json', content: JSON.stringify(badge, null, 2) },
    ];

    const txResult = await executeTransaction(dir, artifacts, client);
    expect(txResult.state).toBe('committed');
    expect(txResult.remoteStatus).toBe(200);
    expect(txResult.artifactCount).toBe(2);

    // Verify registry received the submission
    expect(submissions).toHaveLength(1);
    expect(submissions[0]!.artifacts).toHaveLength(2);

    // ── Step 10: Write badge version ───────────────────────────────────
    await writeBadgeVersion(skillDir, badge!);
    const store = await readBadgeStore(skillDir);
    expect(store.skillName).toBe('data-ingest');
    expect(store.versions).toHaveLength(1);
    expect(store.versions[0]!.version).toBe('1.0.0');
    expect(store.versions[0]!.badge.risk).toBe('R3');
    expect(store.versions[0]!.badge.tier).toBe('verified');
  });
});
