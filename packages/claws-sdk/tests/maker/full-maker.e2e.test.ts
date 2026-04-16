/**
 * L2 e2e test — full maker lifecycle.
 *
 * P32 CP-3 gate: scaffold, annotate, publish, badge, staleness, re-verify.
 *
 * Validates the entire maker pipeline end-to-end using a temporary
 * skill directory on disk. This is the integration gate for all
 * maker-related CP-3 work (pulses 27-31).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  makerScaffold,
  makerAnnotate,
  makerPublish,
  generateBadgeMetadata,
  computeHandlerHash,
  sha256,
  checkStaleness,
  BadgeStore,
  reverifyBadge,
  applyReverification,
  evaluateEnterprisePolicy,
} from '../../src/maker/index.js';
import type {
  RegistryClient,
  RegistryPublishPayload,
  RegistryPublishResult,
} from '../../src/maker/index.js';

/** Mock registry that always succeeds. */
class MockRegistry implements RegistryClient {
  public published: RegistryPublishPayload[] = [];

  async publish(payload: RegistryPublishPayload): Promise<RegistryPublishResult> {
    this.published.push(payload);
    return { success: true, publishId: `mock-${Date.now()}` };
  }
}

describe('full maker lifecycle: scaffold → annotate → publish → badge → staleness → re-verify', () => {
  let workspaceRoot: string;
  let configDir: string;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), 'claws-maker-e2e-'));

    // Create .claws/config.yaml for workspace config
    configDir = join(workspaceRoot, '.claws');
    await mkdir(configDir, { recursive: true });
    await writeFile(
      join(configDir, 'config.yaml'),
      'trust_tier: 2\ngovernance:\n  default_tier: TYPED\n',
      'utf-8',
    );
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('runs the full maker lifecycle end-to-end', async () => {
    const signingKey = 'claws-e2e-maker-lifecycle-key-32!';
    const registry = new MockRegistry();

    // ── Stage 1: Scaffold ──────────────────────────────────────────────
    const scaffoldResult = await makerScaffold({
      name: 'email-sender',
      template: 'communication',
      workspaceRoot,
      trustTier: 2,
      governanceTier: 'TYPED',
    });

    expect(scaffoldResult.name).toBe('email-sender');
    expect(scaffoldResult.template).toBe('communication');
    expect(scaffoldResult.tier).toBe('TYPED');
    expect(scaffoldResult.files.length).toBeGreaterThan(0);

    const skillDir = scaffoldResult.skillDir;

    // ── Stage 2: Annotate ──────────────────────────────────────────────
    const annotateResult = await makerAnnotate({ skillDir });

    expect(annotateResult.name).toBeDefined();
    expect(annotateResult.diagnostics.length).toBeGreaterThan(0);
    expect(annotateResult.suggestedTier).toBeDefined();

    // ── Stage 3: Publish ───────────────────────────────────────────────
    const publishResult = await makerPublish({
      skillDir,
      version: '1.0.0',
      sdkVersion: '0.6.0',
      signingKey,
      registry,
      policyConfig: '{"compliance":"standard"}',
    });

    expect(publishResult.success).toBe(true);
    expect(publishResult.rolledBack).toBe(false);
    expect(publishResult.manifest).toBeDefined();
    expect(publishResult.badge).toBeDefined();
    expect(publishResult.badge.version).toBe('1.0.0');
    expect(registry.published).toHaveLength(1);

    // ── Stage 4: Badge generation ──────────────────────────────────────
    const badge = generateBadgeMetadata({
      tier: publishResult.tier,
      risk: publishResult.badge.risk,
      obo: publishResult.badge.obo,
      oboScope: '',
      dataLabels: ['INTERNAL'],
      signatureStatus: publishResult.manifest.signatureStatus,
      staleness: 'current',
    });

    expect(badge.tier).toBeDefined();
    expect(badge.staleness).toBe('current');
    expect(badge.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // ── Stage 5: Staleness detection ───────────────────────────────────
    const handlerPath = join(skillDir, 'handler.ts');
    const originalHandler = await readFile(handlerPath, 'utf-8');
    const frontmatter = `name: email-sender\ntier: ${publishResult.tier}`;

    const publishedHandlerHash = computeHandlerHash(originalHandler);
    const publishedFrontmatterHash = sha256(frontmatter);

    // Modify the handler
    const modifiedHandler = originalHandler + '\n// modified for staleness test';
    await writeFile(handlerPath, modifiedHandler, 'utf-8');

    const stalenessResult = checkStaleness({
      currentHandlerContent: modifiedHandler,
      currentFrontmatterContent: frontmatter,
      manifest: publishResult.manifest,
      publishedHandlerHash,
      publishedFrontmatterHash,
    });

    expect(stalenessResult.handlerModified).toBe(true);
    expect(stalenessResult.staleness).toBe('stale');

    // If original tier was VERIFIED, it should downgrade
    if (publishResult.tier === 'VERIFIED') {
      expect(stalenessResult.downgraded).toBe(true);
      expect(stalenessResult.effectiveTier).toBe('TYPED');
    }

    // ── Stage 6: Re-verify ─────────────────────────────────────────────
    const store = new BadgeStore();
    store.set({
      version: '1.0.0',
      tier: publishResult.tier,
      handlerHash: publishedHandlerHash,
      frontmatterHash: publishedFrontmatterHash,
      staleness: 'current',
      generatedAt: new Date().toISOString(),
    });

    // Re-verify with governance checks passing
    const reverifyResult = reverifyBadge({
      version: '1.0.0',
      handlerContent: modifiedHandler,
      frontmatterContent: frontmatter,
      governanceChecksPassed: true,
    });

    expect(reverifyResult.verified).toBe(true);
    expect(reverifyResult.tier).toBe('VERIFIED');

    applyReverification(store, reverifyResult);

    expect(store.get('1.0.0')!.tier).toBe('VERIFIED');
    expect(store.get('1.0.0')!.staleness).toBe('current');
    expect(store.get('1.0.0')!.handlerHash).toBe(computeHandlerHash(modifiedHandler));

    // ── Enterprise policy validation ───────────────────────────────────
    const policyResult = evaluateEnterprisePolicy({
      tier: 'VERIFIED',
      risk: publishResult.badge.risk,
      dataLabels: ['INTERNAL'],
    });

    expect(policyResult.passed).toBe(true);
  });
});
