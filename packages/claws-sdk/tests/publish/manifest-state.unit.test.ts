/**
 * L0: Manifest state detection — all 4 states.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import {
  detectManifestState,
  computeContentHash,
  extractSignableContent,
  parseManifestFields,
} from '../../src/publish/manifest-state.js';

function tempDir(): string {
  return join(tmpdir(), `claws-test-manifest-${randomBytes(4).toString('hex')}`);
}

describe('manifest-state detection', () => {
  let dir: string;
  const signingKey = randomBytes(32).toString('hex');

  beforeEach(async () => {
    dir = tempDir();
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('detects absent manifest when no skill.yaml exists', async () => {
    const result = await detectManifestState(dir, signingKey);
    expect(result.state).toBe('absent');
    expect(result.manifest).toBeNull();
    expect(result.currentHash).toBeNull();
  });

  it('detects absent manifest when skill.yaml is unsigned', async () => {
    await writeFile(join(dir, 'skill.yaml'), 'name: my-skill\ntier: declared\nrisk: 1\n');
    const result = await detectManifestState(dir, signingKey);
    expect(result.state).toBe('absent');
    expect(result.manifest).not.toBeNull();
    expect(result.manifest!.name).toBe('my-skill');
  });

  it('detects valid-signed manifest when signature matches', async () => {
    const content = 'name: my-skill\ntier: verified\nrisk: 3\n';
    const signableContent = extractSignableContent(content);
    const sig = computeContentHash(signableContent, signingKey);
    const hash = computeContentHash(signableContent, signingKey);

    const signed = `${content}signature: ${sig}\ncontent-hash: ${hash}\n`;
    await writeFile(join(dir, 'skill.yaml'), signed);

    const result = await detectManifestState(dir, signingKey);
    expect(result.state).toBe('valid-signed');
    expect(result.manifest!.signature).toBe(sig);
    expect(result.reason).toContain('valid');
  });

  it('detects invalid-signed manifest when signature is tampered', async () => {
    const content = 'name: my-skill\ntier: verified\nrisk: 3\n';
    const fakeSig = randomBytes(32).toString('hex');

    const signed = `${content}signature: ${fakeSig}\ncontent-hash: ${fakeSig}\n`;
    await writeFile(join(dir, 'skill.yaml'), signed);

    const result = await detectManifestState(dir, signingKey);
    expect(result.state).toBe('invalid-signed');
    expect(result.reason).toContain('tampering');
  });

  it('detects stale-signed manifest when content changed', async () => {
    // Sign original content
    const original = 'name: my-skill\ntier: verified\nrisk: 3\n';
    const signableOriginal = extractSignableContent(original);
    const sig = computeContentHash(signableOriginal, signingKey);
    const oldHash = computeContentHash(signableOriginal, signingKey);

    // Write modified content but keep old signature and old content-hash
    const modified = 'name: my-skill\ntier: verified\nrisk: 5\n';
    const signableModified = extractSignableContent(modified);
    const currentHash = computeContentHash(signableModified, signingKey);

    // The signature must match the current content for stale detection
    // stale = signature matches current content, but content-hash differs
    const staleManifest = `${modified}signature: ${currentHash}\ncontent-hash: ${oldHash}\n`;
    await writeFile(join(dir, 'skill.yaml'), staleManifest);

    const result = await detectManifestState(dir, signingKey);
    expect(result.state).toBe('stale-signed');
    expect(result.reason).toContain('changed');
  });
});

describe('parseManifestFields', () => {
  it('extracts name, tier, signature, and content-hash', () => {
    const content = 'name: test-skill\ntier: typed\nrisk: 2\nsignature: abc123\ncontent-hash: def456\n';
    const fields = parseManifestFields(content);
    expect(fields.name).toBe('test-skill');
    expect(fields.tier).toBe('typed');
    expect(fields.signature).toBe('abc123');
    expect(fields.contentHash).toBe('def456');
  });

  it('returns null for missing signature and content-hash', () => {
    const content = 'name: test-skill\nrisk: 1\n';
    const fields = parseManifestFields(content);
    expect(fields.signature).toBeNull();
    expect(fields.contentHash).toBeNull();
  });
});

describe('extractSignableContent', () => {
  it('removes signature and content-hash lines', () => {
    const content = 'name: test\nrisk: 1\nsignature: abc\ncontent-hash: def\n';
    const signable = extractSignableContent(content);
    expect(signable).not.toContain('signature:');
    expect(signable).not.toContain('content-hash:');
    expect(signable).toContain('name: test');
  });
});

describe('computeContentHash', () => {
  it('produces consistent hex-encoded HMAC', () => {
    const key = randomBytes(32).toString('hex');
    const h1 = computeContentHash('hello', key);
    const h2 = computeContentHash('hello', key);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes for different content', () => {
    const key = randomBytes(32).toString('hex');
    const h1 = computeContentHash('hello', key);
    const h2 = computeContentHash('world', key);
    expect(h1).not.toBe(h2);
  });
});
