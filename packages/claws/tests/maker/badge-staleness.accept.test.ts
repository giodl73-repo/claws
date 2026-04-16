/**
 * L3 CLI acceptance test for badge staleness.
 *
 * P31: `claws build --skill` detects stale VERIFIED badge, reports downgrade,
 * and re-verification restores VERIFIED with correct per-version badge query.
 *
 * Tests the SDK directly (same pattern as P29 CLI accept test) since
 * the maker CLI command surface is the thin adapter.
 */

import { describe, it, expect } from 'vitest';

import {
  computeHandlerHash,
  checkStaleness,
  BadgeStore,
  reverifyBadge,
  applyReverification,
} from '@bic/claws-sdk/maker';
import {
  generateManifest,
  sha256,
} from '@bic/claws-sdk/maker';
import { generateBadgeMetadata } from '@bic/claws-sdk/maker';

describe('CLI acceptance: claws build --skill staleness detection', () => {
  it('detects stale VERIFIED badge and reports downgrade', () => {
    const signingKey = 'claws-cli-accept-staleness-key!!';

    // Simulate a published VERIFIED skill
    const handler = 'export function handler() { return "original"; }';
    const modifiedHandler = 'export function handler() { return "modified"; }';
    const frontmatter = 'name: cli-test-skill\nrisk: 3\ntier: VERIFIED';

    const manifest = generateManifest({
      name: 'cli-test-skill',
      version: '1.0.0',
      sdkVersion: '0.6.0',
      tier: 'VERIFIED',
      risk: 3,
      obo: false,
      oboScope: '',
      policyConfig: '{"compliance":"standard"}',
      skillContent: handler,
      signingKey,
    });

    const publishedHandlerHash = computeHandlerHash(handler);
    const publishedFrontmatterHash = sha256(frontmatter);

    // CLI would run: claws build --skill → triggers staleness check
    const result = checkStaleness({
      currentHandlerContent: modifiedHandler,
      currentFrontmatterContent: frontmatter,
      manifest,
      publishedHandlerHash,
      publishedFrontmatterHash,
    });

    // CLI would render: "Badge STALE: handler modified since last verified build"
    expect(result.staleness).toBe('stale');
    expect(result.handlerModified).toBe(true);

    // CLI would render: "Tier downgrade: VERIFIED → TYPED"
    expect(result.downgraded).toBe(true);
    expect(result.originalTier).toBe('VERIFIED');
    expect(result.effectiveTier).toBe('TYPED');

    // CLI would render badge with stale indicator
    const badge = generateBadgeMetadata({
      tier: result.effectiveTier,
      risk: 3,
      obo: false,
      oboScope: '',
      dataLabels: ['INTERNAL'],
      signatureStatus: manifest.signatureStatus,
      staleness: 'stale',
    });

    expect(badge.tier).toBe('TYPED');
    expect(badge.staleness).toBe('stale');
    expect(badge.qualifier).toBeNull();
  });

  it('re-verification restores VERIFIED with correct per-version badge query', () => {
    const store = new BadgeStore();
    const signingKey = 'claws-cli-accept-reverify-key!!!';

    const handler = 'export function handler() { return "v1"; }';
    const modifiedHandler = 'export function handler() { return "v2"; }';
    const frontmatter = 'name: cli-reverify\nrisk: 2\ntier: VERIFIED';

    // Publish two versions
    for (const version of ['1.0.0', '2.0.0'] as const) {
      const manifest = generateManifest({
        name: 'cli-reverify',
        version,
        sdkVersion: '0.6.0',
        tier: 'VERIFIED',
        risk: 2,
        obo: false,
        oboScope: '',
        policyConfig: '{}',
        skillContent: handler,
        signingKey,
      });

      store.set({
        version,
        tier: 'VERIFIED',
        handlerHash: computeHandlerHash(handler),
        frontmatterHash: sha256(frontmatter),
        staleness: 'current',
        generatedAt: manifest.provenance.compiledAt,
      });
    }

    // Handler edit affects v2.0.0 only (v1.0.0 is a frozen published artifact)
    store.set({
      version: '2.0.0',
      tier: 'TYPED',
      handlerHash: computeHandlerHash(modifiedHandler),
      frontmatterHash: sha256(frontmatter),
      staleness: 'stale',
      generatedAt: store.get('2.0.0')!.generatedAt,
    });

    // CLI would render: v1.0.0 VERIFIED, v2.0.0 TYPED (stale)
    expect(store.get('1.0.0')!.tier).toBe('VERIFIED');
    expect(store.get('2.0.0')!.tier).toBe('TYPED');

    // CLI: claws build --skill → re-verify v2.0.0
    const reverifyResult = reverifyBadge({
      version: '2.0.0',
      handlerContent: modifiedHandler,
      frontmatterContent: frontmatter,
      governanceChecksPassed: true,
    });

    applyReverification(store, reverifyResult);

    // CLI would render: "Badge restored: VERIFIED"
    expect(store.get('2.0.0')!.tier).toBe('VERIFIED');
    expect(store.get('2.0.0')!.staleness).toBe('current');

    // Per-version query: both VERIFIED now, but different handler hashes
    expect(store.get('1.0.0')!.handlerHash).toBe(computeHandlerHash(handler));
    expect(store.get('2.0.0')!.handlerHash).toBe(computeHandlerHash(modifiedHandler));
    expect(store.get('1.0.0')!.handlerHash).not.toBe(store.get('2.0.0')!.handlerHash);

    // Badge metadata for CLI display
    const badge = generateBadgeMetadata({
      tier: 'VERIFIED',
      risk: 2,
      obo: false,
      oboScope: '',
      dataLabels: [],
      signatureStatus: 'signed',
      staleness: 'current',
    });

    expect(badge.tier).toBe('VERIFIED');
    expect(badge.qualifier).toBe('verified');
    expect(badge.staleness).toBe('current');
  });
});
