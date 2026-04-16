/**
 * L3 SDK acceptance test for badge staleness.
 *
 * P31: Consumer modifies handler after VERIFIED build, verifies automatic
 * downgrade to TYPED, then re-verifies to restore VERIFIED badge with
 * per-version independence.
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
  sha256,
} from '../../src/maker/manifest.js';
import { generateBadgeMetadata } from '../../src/maker/badge.js';

describe('SDK acceptance: staleness downgrade + re-verify with per-version independence', () => {
  it('consumer workflow: VERIFIED → handler edit → TYPED → rebuild → VERIFIED, per-version independent', () => {
    const store = new BadgeStore();
    const signingKey = 'claws-accept-staleness-key-32b!!';

    // ── Consumer publishes v1.0.0 as VERIFIED ─────────────────────────
    const handlerOriginal = 'export function scan(code: string) { return code.includes("eval"); }';
    const frontmatter = 'name: eval-scanner\nrisk: 4\ntier: VERIFIED';

    const manifestV1 = generateManifest({
      name: 'eval-scanner',
      version: '1.0.0',
      sdkVersion: '0.6.0',
      tier: 'VERIFIED',
      risk: 4,
      obo: false,
      oboScope: '',
      policyConfig: '{"trustTier":3}',
      skillContent: handlerOriginal,
      signingKey,
    });

    const handlerHashOrig = computeHandlerHash(handlerOriginal);
    const frontmatterHash = sha256(frontmatter);

    store.set({
      version: '1.0.0',
      tier: 'VERIFIED',
      handlerHash: handlerHashOrig,
      frontmatterHash,
      staleness: 'current',
      generatedAt: manifestV1.provenance.compiledAt,
    });

    // ── Consumer also publishes v1.1.0 as VERIFIED ────────────────────
    const manifestV11 = generateManifest({
      name: 'eval-scanner',
      version: '1.1.0',
      sdkVersion: '0.6.0',
      tier: 'VERIFIED',
      risk: 4,
      obo: false,
      oboScope: '',
      policyConfig: '{"trustTier":3}',
      skillContent: handlerOriginal,
      signingKey,
    });

    store.set({
      version: '1.1.0',
      tier: 'VERIFIED',
      handlerHash: handlerHashOrig,
      frontmatterHash,
      staleness: 'current',
      generatedAt: manifestV11.provenance.compiledAt,
    });

    // Both versions VERIFIED
    expect(store.get('1.0.0')!.tier).toBe('VERIFIED');
    expect(store.get('1.1.0')!.tier).toBe('VERIFIED');

    // ── Consumer edits handler (affects v1.1.0 only) ──────────────────
    const handlerModified = 'export function scan(code: string) { return code.includes("eval") || code.includes("Function"); }';

    // Check staleness for v1.1.0
    const staleResult = checkStaleness({
      currentHandlerContent: handlerModified,
      currentFrontmatterContent: frontmatter,
      manifest: manifestV11,
      publishedHandlerHash: handlerHashOrig,
      publishedFrontmatterHash: frontmatterHash,
    });

    expect(staleResult.handlerModified).toBe(true);
    expect(staleResult.downgraded).toBe(true);
    expect(staleResult.effectiveTier).toBe('TYPED');

    // Apply downgrade to v1.1.0 in store
    store.set({
      version: '1.1.0',
      tier: staleResult.effectiveTier,
      handlerHash: computeHandlerHash(handlerModified),
      frontmatterHash,
      staleness: 'stale',
      generatedAt: store.get('1.1.0')!.generatedAt,
    });

    // Per-version independence (P-227): v1.0.0 unaffected
    expect(store.get('1.0.0')!.tier).toBe('VERIFIED');
    expect(store.get('1.0.0')!.staleness).toBe('current');
    expect(store.get('1.1.0')!.tier).toBe('TYPED');
    expect(store.get('1.1.0')!.staleness).toBe('stale');

    // Badge metadata reflects downgrade
    const staleBadge = generateBadgeMetadata({
      tier: 'TYPED',
      risk: 4,
      obo: false,
      oboScope: '',
      dataLabels: ['INTERNAL'],
      signatureStatus: 'signed',
      staleness: 'stale',
    });
    expect(staleBadge.tier).toBe('TYPED');
    expect(staleBadge.qualifier).toBeNull();
    expect(staleBadge.staleness).toBe('stale');

    // ── Consumer runs claws build --skill for v1.1.0 ──────────────────
    const reverifyResult = reverifyBadge({
      version: '1.1.0',
      handlerContent: handlerModified,
      frontmatterContent: frontmatter,
      governanceChecksPassed: true,
    });

    expect(reverifyResult.verified).toBe(true);
    expect(reverifyResult.tier).toBe('VERIFIED');

    applyReverification(store, reverifyResult);

    // Both versions now VERIFIED again
    expect(store.get('1.0.0')!.tier).toBe('VERIFIED');
    expect(store.get('1.0.0')!.staleness).toBe('current');
    expect(store.get('1.1.0')!.tier).toBe('VERIFIED');
    expect(store.get('1.1.0')!.staleness).toBe('current');

    // Handler hashes are different (v1.0.0 has original, v1.1.0 has modified)
    expect(store.get('1.0.0')!.handlerHash).toBe(handlerHashOrig);
    expect(store.get('1.1.0')!.handlerHash).toBe(computeHandlerHash(handlerModified));
    expect(store.get('1.0.0')!.handlerHash).not.toBe(store.get('1.1.0')!.handlerHash);
  });
});
