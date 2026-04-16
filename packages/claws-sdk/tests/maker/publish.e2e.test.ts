/**
 * L2 e2e test for maker publish — scaffold, annotate, publish lifecycle.
 *
 * P29: full pipeline from scaffold through annotate to publish,
 * verifying governance integrity end-to-end.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, readdir, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { makerScaffold } from '../../src/maker/scaffold.js';
import { makerAnnotate } from '../../src/maker/annotate.js';
import { makerPublish } from '../../src/maker/publish.js';
import { verifyManifest } from '../../src/maker/manifest.js';
import { createMockRegistry } from '../fixtures/mock-registry/index.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-publish-e2e-'));
  // Write a minimal claws.json for scaffold
  await writeFile(join(tempDir, 'claws.json'), JSON.stringify({ trustTier: 2 }), 'utf-8');
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('scaffold -> annotate -> publish lifecycle', () => {
  it('full e2e: scaffold communication skill, annotate, publish with signing', async () => {
    // ── Step 1: Scaffold ───────────────────────────────────────────
    const scaffoldResult = await makerScaffold({
      name: 'team-notifier',
      template: 'communication',
      workspaceRoot: tempDir,
    });

    expect(scaffoldResult.name).toBe('team-notifier');
    expect(scaffoldResult.tier).toBe('TYPED');
    expect(scaffoldResult.files.length).toBeGreaterThan(0);

    // ── Step 2: Annotate ───────────────────────────────────────────
    const annotateResult = await makerAnnotate({
      skillDir: scaffoldResult.skillDir,
    });

    expect(annotateResult.name).toBe('team-notifier');
    // Communication template implies OBO
    expect(annotateResult.suggestedTier).toBe('TYPED');
    expect(annotateResult.diagnostics.length).toBeGreaterThan(0);

    // ── Step 3: Publish ────────────────────────────────────────────
    const signingKey = 'claws-e2e-test-signing-key-32b!!';
    const registry = createMockRegistry('success');

    const publishResult = await makerPublish({
      skillDir: scaffoldResult.skillDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      signingKey,
      registry,
      policyConfig: '{"trustTier":2}',
    });

    expect(publishResult.success).toBe(true);
    expect(publishResult.name).toBe('team-notifier');
    expect(publishResult.version).toBe('1.0.0');
    expect(publishResult.rolledBack).toBe(false);

    // Manifest is signed and valid
    expect(publishResult.manifest.signatureStatus).toBe('signed');
    const status = verifyManifest(publishResult.manifest, signingKey);
    expect(status).toBe('signed');

    // Badge has correct data
    expect(publishResult.badge.version).toBe('1.0.0');
    expect(publishResult.badge.tier).toBe(publishResult.tier);
    expect(publishResult.badge.signatureStatus).toBe('signed');

    // Provenance is complete
    expect(publishResult.manifest.provenance.sdkVersion).toBe('0.5.0');
    expect(publishResult.manifest.provenance.compiledAt).toBeTruthy();
    expect(publishResult.manifest.provenance.policyHash).toBeTruthy();
    expect(publishResult.manifest.contentHash).toBeTruthy();

    // Registry received the right data
    expect(registry.calls).toHaveLength(1);
    expect(registry.calls[0].payload.name).toBe('team-notifier');

    // Security warnings exist (always, regardless of success)
    expect(publishResult.securityWarnings).toBeDefined();
  });
});
