/**
 * L1 integration tests for badge staleness lifecycle.
 *
 * P31: DECLARED to TYPED to VERIFIED transitions, per-version badge query.
 * Exercises the full staleness pipeline: hash computation, staleness check,
 * tier downgrade, badge store, and re-verification working together.
 */

import { describe, it, expect } from 'vitest';

import {
  computeHandlerHash,
  checkStaleness,
  BadgeStore,
  reverifyBadge,
  applyReverification,
} from '../../src/maker/badge-staleness.js';
import { sha256, generateManifest } from '../../src/maker/manifest.js';

// ── Fixtures ────────────────────────────────────────────────────────

const HANDLER_V1 = 'export function handler() { return "scan-v1"; }';
const HANDLER_V2 = 'export function handler() { return "scan-v2-patched"; }';
const FRONTMATTER_V1 = 'name: code-scanner\nrisk: 3\ntier: VERIFIED';
const FRONTMATTER_V2 = 'name: code-scanner\nrisk: 4\ntier: VERIFIED';

// ── Test: tier transition lifecycle ──────────────────────────────────

describe('DECLARED to TYPED to VERIFIED transitions', () => {
  it('full lifecycle: VERIFIED → stale TYPED → re-verify VERIFIED', () => {
    const store = new BadgeStore();

    // Step 1: Publish VERIFIED skill
    const manifest = generateManifest({
      name: 'code-scanner',
      version: '1.0.0',
      sdkVersion: '0.5.0',
      tier: 'VERIFIED',
      risk: 3,
      obo: false,
      oboScope: '',
      policyConfig: '{"compliance":"standard"}',
      skillContent: HANDLER_V1,
      signingKey: 'claws-badge-lifecycle-test-key-32',
    });

    const handlerHashV1 = computeHandlerHash(HANDLER_V1);
    const frontmatterHashV1 = sha256(FRONTMATTER_V1);

    store.set({
      version: '1.0.0',
      tier: 'VERIFIED',
      handlerHash: handlerHashV1,
      frontmatterHash: frontmatterHashV1,
      staleness: 'current',
      generatedAt: manifest.provenance.compiledAt,
    });

    expect(store.get('1.0.0')!.tier).toBe('VERIFIED');
    expect(store.get('1.0.0')!.staleness).toBe('current');

    // Step 2: Developer modifies handler → staleness detected
    const stalenessResult = checkStaleness({
      currentHandlerContent: HANDLER_V2,
      currentFrontmatterContent: FRONTMATTER_V1,
      manifest,
      publishedHandlerHash: handlerHashV1,
      publishedFrontmatterHash: frontmatterHashV1,
    });

    expect(stalenessResult.handlerModified).toBe(true);
    expect(stalenessResult.staleness).toBe('stale');
    expect(stalenessResult.originalTier).toBe('VERIFIED');
    expect(stalenessResult.effectiveTier).toBe('TYPED');
    expect(stalenessResult.downgraded).toBe(true);

    // Apply downgrade to store
    store.set({
      version: '1.0.0',
      tier: stalenessResult.effectiveTier,
      handlerHash: computeHandlerHash(HANDLER_V2),
      frontmatterHash: frontmatterHashV1,
      staleness: 'stale',
      generatedAt: store.get('1.0.0')!.generatedAt,
    });

    expect(store.get('1.0.0')!.tier).toBe('TYPED');

    // Step 3: Developer runs `claws build --skill` → re-verified
    const reverifyResult = reverifyBadge({
      version: '1.0.0',
      handlerContent: HANDLER_V2,
      frontmatterContent: FRONTMATTER_V1,
      governanceChecksPassed: true,
    });

    expect(reverifyResult.verified).toBe(true);
    expect(reverifyResult.tier).toBe('VERIFIED');

    const updatedEntry = applyReverification(store, reverifyResult);

    expect(updatedEntry.tier).toBe('VERIFIED');
    expect(updatedEntry.staleness).toBe('current');
    expect(updatedEntry.handlerHash).toBe(computeHandlerHash(HANDLER_V2));

    // Final state
    expect(store.get('1.0.0')!.tier).toBe('VERIFIED');
    expect(store.get('1.0.0')!.staleness).toBe('current');
  });

  it('DECLARED skill with frontmatter edit stays DECLARED throughout', () => {
    const store = new BadgeStore();

    const manifest = generateManifest({
      name: 'simple-tool',
      version: '1.0.0',
      sdkVersion: '0.5.0',
      tier: 'DECLARED',
      risk: 2,
      obo: false,
      oboScope: '',
      policyConfig: '{}',
      skillContent: HANDLER_V1,
    });

    const handlerHash = computeHandlerHash(HANDLER_V1);
    const frontmatterHash = sha256(FRONTMATTER_V1);

    store.set({
      version: '1.0.0',
      tier: 'DECLARED',
      handlerHash,
      frontmatterHash,
      staleness: 'current',
      generatedAt: manifest.provenance.compiledAt,
    });

    // Edit frontmatter only
    const result = checkStaleness({
      currentHandlerContent: HANDLER_V1,
      currentFrontmatterContent: FRONTMATTER_V2,
      manifest,
      publishedHandlerHash: handlerHash,
      publishedFrontmatterHash: frontmatterHash,
    });

    expect(result.frontmatterModified).toBe(true);
    expect(result.handlerModified).toBe(false);
    expect(result.staleness).toBe('current');
    expect(result.originalTier).toBe('DECLARED');
    expect(result.effectiveTier).toBe('DECLARED');
    expect(result.downgraded).toBe(false);

    // Store unchanged
    expect(store.get('1.0.0')!.tier).toBe('DECLARED');
  });
});

// ── Test: per-version badge query ────────────────────────────────────

describe('per-version badge query', () => {
  it('queries independent versions with different staleness states', () => {
    const store = new BadgeStore();

    // v1.0.0: VERIFIED and current
    const handlerHashV1 = computeHandlerHash(HANDLER_V1);
    const frontmatterHash = sha256(FRONTMATTER_V1);

    store.set({
      version: '1.0.0',
      tier: 'VERIFIED',
      handlerHash: handlerHashV1,
      frontmatterHash,
      staleness: 'current',
      generatedAt: '2026-04-15T00:00:00.000Z',
    });

    // v1.1.0: handler modified after publish, downgraded to TYPED
    store.set({
      version: '1.1.0',
      tier: 'TYPED',
      handlerHash: computeHandlerHash(HANDLER_V2),
      frontmatterHash,
      staleness: 'stale',
      generatedAt: '2026-04-15T01:00:00.000Z',
    });

    // Query v1.0.0 — should be VERIFIED
    const v1Badge = store.get('1.0.0');
    expect(v1Badge).toBeDefined();
    expect(v1Badge!.tier).toBe('VERIFIED');
    expect(v1Badge!.staleness).toBe('current');

    // Query v1.1.0 — should be TYPED (stale)
    const v2Badge = store.get('1.1.0');
    expect(v2Badge).toBeDefined();
    expect(v2Badge!.tier).toBe('TYPED');
    expect(v2Badge!.staleness).toBe('stale');

    // Query non-existent version — should be undefined
    expect(store.get('2.0.0')).toBeUndefined();

    // Versions are independent
    expect(store.versions()).toEqual(['1.0.0', '1.1.0']);
    expect(store.size).toBe(2);
  });

  it('re-verifying one version does not change another (P-227)', () => {
    const store = new BadgeStore();
    const frontmatterHash = sha256(FRONTMATTER_V1);

    // Both start as stale TYPED
    store.set({
      version: '1.0.0',
      tier: 'TYPED',
      handlerHash: computeHandlerHash(HANDLER_V2),
      frontmatterHash,
      staleness: 'stale',
      generatedAt: '2026-04-15T00:00:00.000Z',
    });

    store.set({
      version: '1.1.0',
      tier: 'TYPED',
      handlerHash: computeHandlerHash(HANDLER_V2),
      frontmatterHash,
      staleness: 'stale',
      generatedAt: '2026-04-15T01:00:00.000Z',
    });

    // Re-verify v1.0.0 only
    const result = reverifyBadge({
      version: '1.0.0',
      handlerContent: HANDLER_V2,
      frontmatterContent: FRONTMATTER_V1,
      governanceChecksPassed: true,
    });
    applyReverification(store, result);

    // v1.0.0 restored
    expect(store.get('1.0.0')!.tier).toBe('VERIFIED');
    expect(store.get('1.0.0')!.staleness).toBe('current');

    // v1.1.0 unchanged — still TYPED and stale
    expect(store.get('1.1.0')!.tier).toBe('TYPED');
    expect(store.get('1.1.0')!.staleness).toBe('stale');
  });
});
