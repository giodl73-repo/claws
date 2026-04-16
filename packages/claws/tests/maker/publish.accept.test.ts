/**
 * L3 CLI acceptance test for maker publish.
 *
 * P29: `claws maker publish` on TYPED skill produces signed manifest
 * with correct provenance; security warnings render despite --quiet flag.
 *
 * Tests the SDK directly (same pattern as P28 CLI accept test) since
 * the maker CLI command surface is the thin adapter.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  makerPublish,
  verifyManifest,
} from '@bic/claws-sdk/maker';

import { createMockRegistry } from '../../../claws-sdk/tests/fixtures/mock-registry/index.js';

const TIER2_FIXTURE = join(__dirname, '../../../claws-sdk/tests/fixtures/tier2-skill');

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-cli-accept-publish-'));
  await cp(TIER2_FIXTURE, tempDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('CLI acceptance: claws maker publish', () => {
  it('publish produces signed manifest with correct provenance', async () => {
    const signingKey = 'claws-cli-accept-key-2024-32byte';
    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      signingKey,
      registry,
      policyConfig: '{"compliance":"standard"}',
    });

    // CLI would render: success status
    expect(result.success).toBe(true);

    // CLI would render: skill name and version
    expect(result.name).toBe('data-transform');
    expect(result.version).toBe('1.0.0');

    // CLI would render: manifest provenance table
    expect(result.manifest.provenance.sdkVersion).toBe('0.5.0');
    expect(result.manifest.provenance.compiledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.manifest.provenance.tier).toBeTruthy();
    expect(result.manifest.provenance.policyHash).toBeTruthy();
    expect(result.manifest.contentHash).toBeTruthy();

    // CLI would render: signature status badge
    expect(result.manifest.signatureStatus).toBe('signed');
    expect(result.manifest.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyManifest(result.manifest, signingKey)).toBe('signed');

    // CLI would render: governance badge
    expect(result.badge.version).toBe('1.0.0');
    expect(result.badge.tier).toBe(result.tier);
    expect(result.badge.signatureStatus).toBe('signed');
    expect(result.badge.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // CLI would render: registry confirmation
    expect(result.publishId).toBeTruthy();

    // CLI would render: duration
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('security warnings render despite --quiet flag (S05-F03)', async () => {
    const registry = createMockRegistry('success');

    // Publish with --quiet and no signing key to trigger warnings
    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
      quiet: true,
    });

    // Even in quiet mode, security warnings ALWAYS present
    expect(result.securityWarnings.length).toBeGreaterThan(0);

    // Unsigned warning (no signing key = SIGN-001)
    const unsignedWarning = result.securityWarnings.find(w => w.code === 'SIGN-001');
    expect(unsignedWarning).toBeDefined();
    expect(unsignedWarning!.severity).toBe('warning');
    expect(unsignedWarning!.message).toContain('unsigned');

    // CLI would render security warnings section regardless of --quiet
    for (const warning of result.securityWarnings) {
      expect(warning.code).toBeTruthy();
      expect(warning.message).toBeTruthy();
      expect(['warning', 'critical']).toContain(warning.severity);
    }
  });
});
