/**
 * L2 e2e test for badge staleness lifecycle.
 *
 * P31: full staleness lifecycle — VERIFIED, edit handler, TYPED, rebuild, VERIFIED.
 * Exercises the complete pipeline from manifest generation through staleness
 * detection, tier downgrade, and re-verification using real crypto operations.
 */

import { describe, it, expect } from 'vitest';

import {
  computeHandlerHash,
  checkStaleness,
  BadgeStore,
  reverifyBadge,
  applyReverification,
} from '../../src/maker/badge-staleness.js';
import {
  generateManifest,
  verifyManifest,
  sha256,
} from '../../src/maker/manifest.js';
import { generateBadgeMetadata } from '../../src/maker/badge.js';

describe('full staleness lifecycle: VERIFIED → edit → TYPED → rebuild → VERIFIED', () => {
  it('end-to-end badge staleness with manifest and badge metadata', () => {
    const signingKey = 'claws-e2e-signing-key-2026-32b!!';
    const store = new BadgeStore();

    // ── Phase 1: Initial VERIFIED publish ─────────────────────────────
    const handlerV1 = [
      'import { readFile } from "node:fs/promises";',
      'export async function handler(path: string) {',
      '  return readFile(path, "utf-8");',
      '}',
    ].join('\n');

    const frontmatter = 'name: file-reader\nrisk: 2\ntier: VERIFIED';

    const manifest = generateManifest({
      name: 'file-reader',
      version: '1.0.0',
      sdkVersion: '0.6.0',
      tier: 'VERIFIED',
      risk: 2,
      obo: false,
      oboScope: '',
      policyConfig: '{"compliance":"standard","trustTier":3}',
      skillContent: handlerV1,
      signingKey,
    });

    // Manifest is signed and valid
    expect(manifest.signatureStatus).toBe('signed');
    expect(verifyManifest(manifest, signingKey)).toBe('signed');

    // Generate badge metadata
    const badgeV1 = generateBadgeMetadata({
      tier: 'VERIFIED',
      risk: 2,
      obo: false,
      oboScope: '',
      dataLabels: ['INTERNAL'],
      signatureStatus: manifest.signatureStatus,
      staleness: 'current',
    });
    expect(badgeV1.tier).toBe('VERIFIED');
    expect(badgeV1.qualifier).toBe('verified');
    expect(badgeV1.staleness).toBe('current');

    // Store badge
    const handlerHashV1 = computeHandlerHash(handlerV1);
    const frontmatterHash = sha256(frontmatter);

    store.set({
      version: '1.0.0',
      tier: 'VERIFIED',
      handlerHash: handlerHashV1,
      frontmatterHash,
      staleness: 'current',
      generatedAt: manifest.provenance.compiledAt,
    });

    expect(store.get('1.0.0')!.tier).toBe('VERIFIED');

    // ── Phase 2: Developer edits handler ──────────────────────────────
    const handlerV2 = [
      'import { readFile } from "node:fs/promises";',
      'export async function handler(path: string, encoding = "utf-8") {',
      '  const content = await readFile(path, encoding);',
      '  return { content, size: content.length };',
      '}',
    ].join('\n');

    // Staleness detection
    const stalenessResult = checkStaleness({
      currentHandlerContent: handlerV2,
      currentFrontmatterContent: frontmatter,
      manifest,
      publishedHandlerHash: handlerHashV1,
      publishedFrontmatterHash: frontmatterHash,
    });

    expect(stalenessResult.handlerModified).toBe(true);
    expect(stalenessResult.frontmatterModified).toBe(false);
    expect(stalenessResult.staleness).toBe('stale');
    expect(stalenessResult.originalTier).toBe('VERIFIED');
    expect(stalenessResult.effectiveTier).toBe('TYPED');
    expect(stalenessResult.downgraded).toBe(true);
    expect(stalenessResult.version).toBe('1.0.0');

    // Generate stale badge metadata
    const badgeStale = generateBadgeMetadata({
      tier: stalenessResult.effectiveTier,
      risk: 2,
      obo: false,
      oboScope: '',
      dataLabels: ['INTERNAL'],
      signatureStatus: manifest.signatureStatus,
      staleness: 'stale',
    });
    expect(badgeStale.tier).toBe('TYPED');
    expect(badgeStale.qualifier).toBeNull(); // TYPED has no qualifier
    expect(badgeStale.staleness).toBe('stale');

    // Update store
    store.set({
      version: '1.0.0',
      tier: 'TYPED',
      handlerHash: computeHandlerHash(handlerV2),
      frontmatterHash,
      staleness: 'stale',
      generatedAt: store.get('1.0.0')!.generatedAt,
    });

    expect(store.get('1.0.0')!.tier).toBe('TYPED');
    expect(store.get('1.0.0')!.staleness).toBe('stale');

    // ── Phase 3: Developer runs `claws build --skill` ─────────────────
    const reverifyResult = reverifyBadge({
      version: '1.0.0',
      handlerContent: handlerV2,
      frontmatterContent: frontmatter,
      governanceChecksPassed: true,
    });

    expect(reverifyResult.verified).toBe(true);
    expect(reverifyResult.tier).toBe('VERIFIED');
    expect(reverifyResult.handlerHash).toBe(computeHandlerHash(handlerV2));

    const restoredEntry = applyReverification(store, reverifyResult);

    expect(restoredEntry.tier).toBe('VERIFIED');
    expect(restoredEntry.staleness).toBe('current');

    // Generate restored badge metadata
    const badgeRestored = generateBadgeMetadata({
      tier: 'VERIFIED',
      risk: 2,
      obo: false,
      oboScope: '',
      dataLabels: ['INTERNAL'],
      signatureStatus: 'signed',
      staleness: 'current',
    });
    expect(badgeRestored.tier).toBe('VERIFIED');
    expect(badgeRestored.qualifier).toBe('verified');
    expect(badgeRestored.staleness).toBe('current');

    // Final store state
    const finalBadge = store.get('1.0.0')!;
    expect(finalBadge.tier).toBe('VERIFIED');
    expect(finalBadge.staleness).toBe('current');
    expect(finalBadge.handlerHash).toBe(computeHandlerHash(handlerV2));
  });
});
