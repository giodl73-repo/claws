/**
 * L0 unit tests for badge staleness detection.
 *
 * P31: handler edit invalidates VERIFIED, frontmatter edit preserves
 * DECLARED, per-version badge independence, re-verification restores VERIFIED.
 */

import { describe, it, expect } from 'vitest';

import {
  computeHandlerHash,
  checkStaleness,
  BadgeStore,
  reverifyBadge,
  applyReverification,
} from '../../src/maker/badge-staleness.js';
import { sha256 } from '../../src/maker/manifest.js';
import type { ClawsManifest } from '../../src/maker/manifest.js';

// ── Helpers ─────────────────────────────────────────────────────────

const ORIGINAL_HANDLER = 'export function handler() { return "v1"; }';
const MODIFIED_HANDLER = 'export function handler() { return "v2"; }';
const ORIGINAL_FRONTMATTER = 'name: test-skill\nrisk: 3\ntier: VERIFIED';
const MODIFIED_FRONTMATTER = 'name: test-skill\nrisk: 4\ntier: VERIFIED';

function makeManifest(overrides?: Partial<ClawsManifest>): ClawsManifest {
  return {
    version: 1,
    name: 'test-skill',
    publishedVersion: '1.0.0',
    provenance: {
      sdkVersion: '0.5.0',
      compiledAt: '2026-04-15T00:00:00.000Z',
      tier: 'VERIFIED',
      risk: 3,
      obo: false,
      oboScope: '',
      policyHash: sha256('{}'),
    },
    contentHash: sha256('content'),
    signature: 'abcd'.repeat(16),
    signatureStatus: 'signed',
    ...overrides,
  };
}

// ── Test: handler edit invalidates VERIFIED ──────────────────────────

describe('handler edit invalidates VERIFIED', () => {
  it('detects handler modification and downgrades VERIFIED to TYPED', () => {
    const manifest = makeManifest();
    const publishedHandlerHash = computeHandlerHash(ORIGINAL_HANDLER);
    const publishedFrontmatterHash = sha256(ORIGINAL_FRONTMATTER);

    const result = checkStaleness({
      currentHandlerContent: MODIFIED_HANDLER,
      currentFrontmatterContent: ORIGINAL_FRONTMATTER,
      manifest,
      publishedHandlerHash,
      publishedFrontmatterHash,
    });

    expect(result.handlerModified).toBe(true);
    expect(result.staleness).toBe('stale');
    expect(result.originalTier).toBe('VERIFIED');
    expect(result.effectiveTier).toBe('TYPED');
    expect(result.downgraded).toBe(true);
  });

  it('reports current when handler is unchanged', () => {
    const manifest = makeManifest();
    const publishedHandlerHash = computeHandlerHash(ORIGINAL_HANDLER);
    const publishedFrontmatterHash = sha256(ORIGINAL_FRONTMATTER);

    const result = checkStaleness({
      currentHandlerContent: ORIGINAL_HANDLER,
      currentFrontmatterContent: ORIGINAL_FRONTMATTER,
      manifest,
      publishedHandlerHash,
      publishedFrontmatterHash,
    });

    expect(result.handlerModified).toBe(false);
    expect(result.staleness).toBe('current');
    expect(result.effectiveTier).toBe('VERIFIED');
    expect(result.downgraded).toBe(false);
  });

  it('does not downgrade TYPED when handler is modified', () => {
    const manifest = makeManifest({
      provenance: {
        sdkVersion: '0.5.0',
        compiledAt: '2026-04-15T00:00:00.000Z',
        tier: 'TYPED',
        risk: 3,
        obo: false,
        oboScope: '',
        policyHash: sha256('{}'),
      },
    });
    const publishedHandlerHash = computeHandlerHash(ORIGINAL_HANDLER);
    const publishedFrontmatterHash = sha256(ORIGINAL_FRONTMATTER);

    const result = checkStaleness({
      currentHandlerContent: MODIFIED_HANDLER,
      currentFrontmatterContent: ORIGINAL_FRONTMATTER,
      manifest,
      publishedHandlerHash,
      publishedFrontmatterHash,
    });

    // TYPED stays TYPED — no pinch downgrade (already at TYPED)
    expect(result.handlerModified).toBe(true);
    expect(result.staleness).toBe('stale');
    expect(result.originalTier).toBe('TYPED');
    expect(result.effectiveTier).toBe('TYPED');
    expect(result.downgraded).toBe(false);
  });

  it('computeHandlerHash is deterministic', () => {
    const hash1 = computeHandlerHash(ORIGINAL_HANDLER);
    const hash2 = computeHandlerHash(ORIGINAL_HANDLER);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ── Test: frontmatter edit preserves DECLARED ────────────────────────

describe('frontmatter edit preserves DECLARED', () => {
  it('frontmatter-only edit does not downgrade DECLARED tier', () => {
    const manifest = makeManifest({
      provenance: {
        sdkVersion: '0.5.0',
        compiledAt: '2026-04-15T00:00:00.000Z',
        tier: 'DECLARED',
        risk: 2,
        obo: false,
        oboScope: '',
        policyHash: sha256('{}'),
      },
    });
    const publishedHandlerHash = computeHandlerHash(ORIGINAL_HANDLER);
    const publishedFrontmatterHash = sha256(ORIGINAL_FRONTMATTER);

    const result = checkStaleness({
      currentHandlerContent: ORIGINAL_HANDLER,
      currentFrontmatterContent: MODIFIED_FRONTMATTER,
      manifest,
      publishedHandlerHash,
      publishedFrontmatterHash,
    });

    expect(result.frontmatterModified).toBe(true);
    expect(result.handlerModified).toBe(false);
    expect(result.staleness).toBe('current');
    expect(result.originalTier).toBe('DECLARED');
    expect(result.effectiveTier).toBe('DECLARED');
    expect(result.downgraded).toBe(false);
  });

  it('frontmatter edit on VERIFIED does not downgrade (handler unchanged)', () => {
    const manifest = makeManifest();
    const publishedHandlerHash = computeHandlerHash(ORIGINAL_HANDLER);
    const publishedFrontmatterHash = sha256(ORIGINAL_FRONTMATTER);

    const result = checkStaleness({
      currentHandlerContent: ORIGINAL_HANDLER,
      currentFrontmatterContent: MODIFIED_FRONTMATTER,
      manifest,
      publishedHandlerHash,
      publishedFrontmatterHash,
    });

    expect(result.frontmatterModified).toBe(true);
    expect(result.handlerModified).toBe(false);
    expect(result.staleness).toBe('current');
    expect(result.effectiveTier).toBe('VERIFIED');
    expect(result.downgraded).toBe(false);
  });
});

// ── Test: per-version badge independence ─────────────────────────────

describe('per-version badge independence', () => {
  it('v1.0.0 and v1.1.0 have independent badge entries (P-227)', () => {
    const store = new BadgeStore();

    store.set({
      version: '1.0.0',
      tier: 'VERIFIED',
      handlerHash: computeHandlerHash(ORIGINAL_HANDLER),
      frontmatterHash: sha256(ORIGINAL_FRONTMATTER),
      staleness: 'current',
      generatedAt: '2026-04-15T00:00:00.000Z',
    });

    store.set({
      version: '1.1.0',
      tier: 'TYPED',
      handlerHash: computeHandlerHash(MODIFIED_HANDLER),
      frontmatterHash: sha256(ORIGINAL_FRONTMATTER),
      staleness: 'stale',
      generatedAt: '2026-04-15T01:00:00.000Z',
    });

    const v1 = store.get('1.0.0');
    const v2 = store.get('1.1.0');

    expect(v1).toBeDefined();
    expect(v2).toBeDefined();
    expect(v1!.tier).toBe('VERIFIED');
    expect(v2!.tier).toBe('TYPED');
    expect(v1!.staleness).toBe('current');
    expect(v2!.staleness).toBe('stale');
    expect(store.size).toBe(2);
  });

  it('querying non-existent version returns undefined (P-227)', () => {
    const store = new BadgeStore();

    store.set({
      version: '1.0.0',
      tier: 'VERIFIED',
      handlerHash: computeHandlerHash(ORIGINAL_HANDLER),
      frontmatterHash: sha256(ORIGINAL_FRONTMATTER),
      staleness: 'current',
      generatedAt: '2026-04-15T00:00:00.000Z',
    });

    expect(store.get('2.0.0')).toBeUndefined();
    expect(store.has('2.0.0')).toBe(false);
    expect(store.has('1.0.0')).toBe(true);
  });

  it('updating one version does not affect another (P-227)', () => {
    const store = new BadgeStore();
    const handlerHash = computeHandlerHash(ORIGINAL_HANDLER);
    const frontmatterHash = sha256(ORIGINAL_FRONTMATTER);

    store.set({
      version: '1.0.0',
      tier: 'VERIFIED',
      handlerHash,
      frontmatterHash,
      staleness: 'current',
      generatedAt: '2026-04-15T00:00:00.000Z',
    });

    store.set({
      version: '1.1.0',
      tier: 'VERIFIED',
      handlerHash,
      frontmatterHash,
      staleness: 'current',
      generatedAt: '2026-04-15T01:00:00.000Z',
    });

    // Downgrade v1.1.0 only
    store.set({
      version: '1.1.0',
      tier: 'TYPED',
      handlerHash: computeHandlerHash(MODIFIED_HANDLER),
      frontmatterHash,
      staleness: 'stale',
      generatedAt: '2026-04-15T02:00:00.000Z',
    });

    // v1.0.0 untouched
    expect(store.get('1.0.0')!.tier).toBe('VERIFIED');
    expect(store.get('1.0.0')!.staleness).toBe('current');

    // v1.1.0 updated
    expect(store.get('1.1.0')!.tier).toBe('TYPED');
    expect(store.get('1.1.0')!.staleness).toBe('stale');
  });

  it('versions() returns sorted list', () => {
    const store = new BadgeStore();
    const entry = {
      tier: 'VERIFIED' as const,
      handlerHash: 'abc',
      frontmatterHash: 'def',
      staleness: 'current' as const,
      generatedAt: '2026-04-15T00:00:00.000Z',
    };

    store.set({ ...entry, version: '2.0.0' });
    store.set({ ...entry, version: '1.0.0' });
    store.set({ ...entry, version: '1.1.0' });

    expect(store.versions()).toEqual(['1.0.0', '1.1.0', '2.0.0']);
  });

  it('remove() deletes a single version without affecting others', () => {
    const store = new BadgeStore();
    const entry = {
      tier: 'VERIFIED' as const,
      handlerHash: 'abc',
      frontmatterHash: 'def',
      staleness: 'current' as const,
      generatedAt: '2026-04-15T00:00:00.000Z',
    };

    store.set({ ...entry, version: '1.0.0' });
    store.set({ ...entry, version: '1.1.0' });

    expect(store.remove('1.0.0')).toBe(true);
    expect(store.has('1.0.0')).toBe(false);
    expect(store.has('1.1.0')).toBe(true);
    expect(store.size).toBe(1);
    expect(store.remove('1.0.0')).toBe(false);
  });
});

// ── Test: re-verification restores VERIFIED ──────────────────────────

describe('re-verification restores VERIFIED', () => {
  it('reverifyBadge restores VERIFIED when governance checks pass', () => {
    const result = reverifyBadge({
      version: '1.0.0',
      handlerContent: MODIFIED_HANDLER,
      frontmatterContent: ORIGINAL_FRONTMATTER,
      governanceChecksPassed: true,
    });

    expect(result.verified).toBe(true);
    expect(result.tier).toBe('VERIFIED');
    expect(result.handlerHash).toBe(computeHandlerHash(MODIFIED_HANDLER));
    expect(result.frontmatterHash).toBe(sha256(ORIGINAL_FRONTMATTER));
    expect(result.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('reverifyBadge stays TYPED when governance checks fail', () => {
    const result = reverifyBadge({
      version: '1.0.0',
      handlerContent: MODIFIED_HANDLER,
      frontmatterContent: ORIGINAL_FRONTMATTER,
      governanceChecksPassed: false,
    });

    expect(result.verified).toBe(false);
    expect(result.tier).toBe('TYPED');
  });

  it('applyReverification updates badge store with VERIFIED entry', () => {
    const store = new BadgeStore();

    // Initial stale entry
    store.set({
      version: '1.0.0',
      tier: 'TYPED',
      handlerHash: computeHandlerHash(ORIGINAL_HANDLER),
      frontmatterHash: sha256(ORIGINAL_FRONTMATTER),
      staleness: 'stale',
      generatedAt: '2026-04-15T00:00:00.000Z',
    });

    // Re-verify
    const result = reverifyBadge({
      version: '1.0.0',
      handlerContent: MODIFIED_HANDLER,
      frontmatterContent: ORIGINAL_FRONTMATTER,
      governanceChecksPassed: true,
    });

    const entry = applyReverification(store, result);

    expect(entry.tier).toBe('VERIFIED');
    expect(entry.staleness).toBe('current');
    expect(entry.handlerHash).toBe(computeHandlerHash(MODIFIED_HANDLER));

    // Store updated
    const stored = store.get('1.0.0');
    expect(stored).toBeDefined();
    expect(stored!.tier).toBe('VERIFIED');
    expect(stored!.staleness).toBe('current');
  });

  it('applyReverification with failed checks keeps stale state', () => {
    const store = new BadgeStore();

    const result = reverifyBadge({
      version: '1.0.0',
      handlerContent: MODIFIED_HANDLER,
      frontmatterContent: ORIGINAL_FRONTMATTER,
      governanceChecksPassed: false,
    });

    const entry = applyReverification(store, result);

    expect(entry.tier).toBe('TYPED');
    expect(entry.staleness).toBe('stale');
  });
});
