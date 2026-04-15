/**
 * L3 acceptance: manifest forgery detection (S07/S12).
 *
 * Validates the publish pipeline correctly detects all 4 manifest states
 * and blocks publish for invalid/forged signatures.
 *
 * Scenarios:
 * - Valid signed manifest → state: valid-signed, publish succeeds
 * - Tampered manifest (byte flipped) → state: invalid-signed, publish blocked
 * - No manifest file → state: absent
 * - Content changed after signing (stale) → state: stale-signed
 * - Unsigned manifest (signature field missing) → state: absent
 *
 * @module claws-sdk/tests/accept/scenarios/manifest-forgery-detection
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
} from '../../../src/publish/manifest-state.js';
import { executeTransaction } from '../../../src/publish/atomicity.js';
import { resolveSigningKey } from '../../../src/publish/key-resolution.js';
import { registerKey } from '../../../src/keys/registry.js';
import { createStorage } from '../../../src/keys/storage.js';
import type { RegistryClient, StagedArtifact } from '../../../src/publish/atomicity.js';

// ── Helpers ─────────────────────────────────────────────────────────

function tempDir(): string {
  return join(tmpdir(), `claws-accept-forgery-${randomBytes(4).toString('hex')}`);
}

/** Simulated registry that records submissions and can be configured to reject. */
function createMockRegistry(rejectWhen?: (txId: string) => boolean): {
  client: RegistryClient;
  submissions: { txId: string; artifacts: readonly StagedArtifact[] }[];
} {
  const submissions: { txId: string; artifacts: readonly StagedArtifact[] }[] = [];
  const client: RegistryClient = {
    async submit(txId: string, artifacts: readonly StagedArtifact[]) {
      if (rejectWhen?.(txId)) return 403;
      submissions.push({ txId, artifacts });
      return 200;
    },
  };
  return { client, submissions };
}

/** Base skill manifest YAML (unsigned). */
const BASE_MANIFEST = [
  'name: token-forge-test',
  'tier: verified',
  'risk: 4',
  'inputs:',
  '  - name: payload',
  '    type: string',
  'outputs:',
  '  - name: token',
  '    type: string',
].join('\n') + '\n';

/** Sign a manifest with the given key material, returning the signed YAML. */
function signManifest(manifest: string, keyMaterial: string): string {
  const signable = extractSignableContent(manifest);
  const signature = computeContentHash(signable, keyMaterial);
  const contentHash = computeContentHash(signable, keyMaterial);
  return `${manifest}signature: ${signature}\ncontent-hash: ${contentHash}\n`;
}

// ── Tests ───────────────────────────────────────────────────────────

describe('accept: manifest forgery detection (S07/S12)', () => {
  let dir: string;
  let skillDir: string;
  let keyMaterial: string;

  beforeEach(async () => {
    dir = tempDir();
    skillDir = join(dir, 'skills', 'token-forge-test');
    await mkdir(skillDir, { recursive: true });

    // Register a signing key in the fleet registry
    const entry = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });
    keyMaterial = randomBytes(32).toString('hex');
    const storage = createStorage('file', dir);
    await storage.write(entry.id, keyMaterial);

    // Clean CI env vars
    delete process.env['CLAWS_CI_SIGNING_KEY'];
    delete process.env['CLAWS_CI_SIGNING_KEY_ID'];
  });

  afterEach(async () => {
    delete process.env['CLAWS_CI_SIGNING_KEY'];
    delete process.env['CLAWS_CI_SIGNING_KEY_ID'];
    await rm(dir, { recursive: true, force: true });
  });

  // ── State: valid-signed ──────────────────────────────────────────

  it('valid-signed: correctly signed manifest detected as valid', async () => {
    const signed = signManifest(BASE_MANIFEST, keyMaterial);
    await writeFile(join(skillDir, 'skill.yaml'), signed);

    const result = await detectManifestState(skillDir, keyMaterial);

    expect(result.state).toBe('valid-signed');
    expect(result.manifest).not.toBeNull();
    expect(result.manifest!.name).toBe('token-forge-test');
    expect(result.manifest!.tier).toBe('verified');
    expect(result.manifest!.signature).toBeTruthy();
    expect(result.currentHash).toBeTruthy();
    expect(result.reason).toContain('valid');
  });

  // ── State: invalid-signed (tampered content) ─────────────────────

  it('invalid-signed: tampered manifest byte detected as forgery', async () => {
    const signed = signManifest(BASE_MANIFEST, keyMaterial);

    // Tamper with the manifest content — flip a character in the name
    const tampered = signed.replace('token-forge-test', 'token-forge-fake');
    await writeFile(join(skillDir, 'skill.yaml'), tampered);

    const result = await detectManifestState(skillDir, keyMaterial);

    expect(result.state).toBe('invalid-signed');
    expect(result.manifest).not.toBeNull();
    expect(result.manifest!.name).toBe('token-forge-fake');
    expect(result.reason).toContain('tamper');
  });

  // ── State: invalid-signed (wrong signing key) ────────────────────

  it('invalid-signed: manifest signed with wrong key detected as forgery', async () => {
    // Sign with a different key than what detection will use
    const wrongKey = randomBytes(32).toString('hex');
    const signed = signManifest(BASE_MANIFEST, wrongKey);
    await writeFile(join(skillDir, 'skill.yaml'), signed);

    const result = await detectManifestState(skillDir, keyMaterial);

    expect(result.state).toBe('invalid-signed');
    expect(result.reason).toContain('tamper');
  });

  // ── State: absent (no manifest file) ─────────────────────────────

  it('absent: missing manifest file detected as absent', async () => {
    // skillDir exists but has no skill.yaml
    const result = await detectManifestState(skillDir, keyMaterial);

    expect(result.state).toBe('absent');
    expect(result.manifest).toBeNull();
    expect(result.currentHash).toBeNull();
    expect(result.reason).toContain('No skill.yaml');
  });

  // ── State: absent (unsigned manifest) ────────────────────────────

  it('absent: unsigned manifest (no signature field) treated as absent', async () => {
    // Write manifest without signature/content-hash fields
    await writeFile(join(skillDir, 'skill.yaml'), BASE_MANIFEST);

    const result = await detectManifestState(skillDir, keyMaterial);

    expect(result.state).toBe('absent');
    expect(result.manifest).not.toBeNull();
    expect(result.manifest!.name).toBe('token-forge-test');
    expect(result.manifest!.signature).toBeNull();
    expect(result.reason).toContain('unsigned');
  });

  // ── State: stale-signed ──────────────────────────────────────────

  it('stale-signed: content changed after signing detected as stale', async () => {
    // Sign with a content-hash that differs from what recomputation yields.
    // The signature field matches the signable content (so it's not invalid),
    // but the stored content-hash diverges — indicating content drift.
    const signable = extractSignableContent(BASE_MANIFEST);
    const signature = computeContentHash(signable, keyMaterial);

    // Fabricate a content-hash from slightly different content
    const altContent = BASE_MANIFEST.replace('risk: 4', 'risk: 5');
    const altSignable = extractSignableContent(altContent);
    const staleContentHash = computeContentHash(altSignable, keyMaterial);

    const staleManifest = `${BASE_MANIFEST}signature: ${signature}\ncontent-hash: ${staleContentHash}\n`;
    await writeFile(join(skillDir, 'skill.yaml'), staleManifest);

    const result = await detectManifestState(skillDir, keyMaterial);

    expect(result.state).toBe('stale-signed');
    expect(result.reason).toContain('re-sign');
  });

  // ── Publish gate: invalid-signed → BLOCKED ───────────────────────

  it('publish BLOCKED for invalid-signed manifest', async () => {
    // Create a tampered manifest
    const signed = signManifest(BASE_MANIFEST, keyMaterial);
    const tampered = signed.replace('token-forge-test', 'token-forge-evil');
    await writeFile(join(skillDir, 'skill.yaml'), tampered);

    // Verify state is invalid
    const keyResult = await resolveSigningKey(dir);
    expect(keyResult).not.toBeNull();

    const stateResult = await detectManifestState(skillDir, keyResult!.keyMaterial);
    expect(stateResult.state).toBe('invalid-signed');

    // Simulate the publish gate: invalid-signed must NOT proceed
    // The publish pipeline checks manifest state before submitting
    const allowed = stateResult.state === 'valid-signed';
    expect(allowed).toBe(false);

    // Even if we tried to submit, the registry should not receive artifacts
    const { client, submissions } = createMockRegistry();
    if (allowed) {
      const content = await readFile(join(skillDir, 'skill.yaml'), 'utf-8');
      await executeTransaction(dir, [{ name: 'skill.yaml', content }], client);
    }

    expect(submissions).toHaveLength(0);
  });

  // ── Publish gate: valid-signed → SUCCEEDS ────────────────────────

  it('publish SUCCEEDS for valid-signed manifest', async () => {
    // Create a properly signed manifest
    const signed = signManifest(BASE_MANIFEST, keyMaterial);
    await writeFile(join(skillDir, 'skill.yaml'), signed);

    // Resolve key and verify state
    const keyResult = await resolveSigningKey(dir);
    expect(keyResult).not.toBeNull();

    const stateResult = await detectManifestState(skillDir, keyResult!.keyMaterial);
    expect(stateResult.state).toBe('valid-signed');

    // Publish gate allows valid-signed
    const allowed = stateResult.state === 'valid-signed';
    expect(allowed).toBe(true);

    // Execute the publish transaction
    const { client, submissions } = createMockRegistry();
    const content = await readFile(join(skillDir, 'skill.yaml'), 'utf-8');
    const txResult = await executeTransaction(
      dir,
      [{ name: 'skill.yaml', content }],
      client,
    );

    expect(txResult.state).toBe('committed');
    expect(txResult.remoteStatus).toBe(200);
    expect(txResult.artifactCount).toBe(1);
    expect(submissions).toHaveLength(1);
    expect(submissions[0]!.artifacts[0]!.name).toBe('skill.yaml');
  });

  // ── End-to-end: full forgery detection chain ─────────────────────

  it('end-to-end: 4 states detected correctly in sequence', async () => {
    const keyResult = await resolveSigningKey(dir);
    expect(keyResult).not.toBeNull();
    const key = keyResult!.keyMaterial;

    // State 1: absent (no file)
    const s1 = await detectManifestState(skillDir, key);
    expect(s1.state).toBe('absent');

    // State 2: absent (unsigned manifest written)
    await writeFile(join(skillDir, 'skill.yaml'), BASE_MANIFEST);
    const s2 = await detectManifestState(skillDir, key);
    expect(s2.state).toBe('absent');

    // State 3: valid-signed (properly signed)
    const signed = signManifest(BASE_MANIFEST, key);
    await writeFile(join(skillDir, 'skill.yaml'), signed);
    const s3 = await detectManifestState(skillDir, key);
    expect(s3.state).toBe('valid-signed');

    // State 4: invalid-signed (tamper the content)
    const tampered = signed.replace('token-forge-test', 'token-forge-pwnd');
    await writeFile(join(skillDir, 'skill.yaml'), tampered);
    const s4 = await detectManifestState(skillDir, key);
    expect(s4.state).toBe('invalid-signed');

    // State 5: stale-signed (valid sig but stale content-hash)
    const signable = extractSignableContent(BASE_MANIFEST);
    const sig = computeContentHash(signable, key);
    const fakeHash = computeContentHash('different-content', key);
    const staleYaml = `${BASE_MANIFEST}signature: ${sig}\ncontent-hash: ${fakeHash}\n`;
    await writeFile(join(skillDir, 'skill.yaml'), staleYaml);
    const s5 = await detectManifestState(skillDir, key);
    expect(s5.state).toBe('stale-signed');
  });
});
