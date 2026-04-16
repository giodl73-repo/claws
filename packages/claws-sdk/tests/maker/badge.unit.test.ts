/**
 * L0 unit tests for badge metadata generation.
 *
 * P30: DECLARED renders "self-reported", VERIFIED renders "verified",
 * supply chain independent of tier, R1+transact OBO flagged,
 * pre-badge skill renders no badge, claws/clawhub namespace boundary.
 */

import { describe, it, expect } from 'vitest';

import {
  generateBadgeMetadata,
  resolveQualifier,
  buildSupplyChainBadge,
  preBadge,
} from '../../src/maker/badge.js';

describe('DECLARED renders self-reported qualifier', () => {
  it('resolves DECLARED tier to "self-reported" qualifier', () => {
    const qualifier = resolveQualifier('DECLARED');
    expect(qualifier).toBe('self-reported');
  });

  it('generates badge metadata with "self-reported" for DECLARED skill', () => {
    const badge = generateBadgeMetadata({
      tier: 'DECLARED',
      risk: 2,
      obo: false,
      oboScope: '',
      dataLabels: ['INTERNAL'],
      signatureStatus: 'unsigned',
    });

    expect(badge.tier).toBe('DECLARED');
    expect(badge.qualifier).toBe('self-reported');
    expect(badge.risk).toBe(2);
    expect(badge.obo).toBe(false);
    expect(badge.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('VERIFIED renders verified seal', () => {
  it('resolves VERIFIED tier to "verified" qualifier', () => {
    const qualifier = resolveQualifier('VERIFIED');
    expect(qualifier).toBe('verified');
  });

  it('generates badge metadata with "verified" for VERIFIED skill', () => {
    const badge = generateBadgeMetadata({
      tier: 'VERIFIED',
      risk: 3,
      obo: true,
      oboScope: 'email sending',
      dataLabels: ['PUBLIC'],
      signatureStatus: 'signed',
    });

    expect(badge.tier).toBe('VERIFIED');
    expect(badge.qualifier).toBe('verified');
    expect(badge.obo).toBe(true);
    expect(badge.oboScope).toBe('email sending');
  });

  it('resolves TYPED tier to null qualifier', () => {
    const qualifier = resolveQualifier('TYPED');
    expect(qualifier).toBeNull();
  });
});

describe('supply chain badge independent of tier', () => {
  it('signed supply chain with DECLARED tier', () => {
    const badge = generateBadgeMetadata({
      tier: 'DECLARED',
      risk: 1,
      obo: false,
      oboScope: '',
      dataLabels: [],
      signatureStatus: 'signed',
    });

    expect(badge.tier).toBe('DECLARED');
    expect(badge.qualifier).toBe('self-reported');
    expect(badge.supplyChain.signed).toBe(true);
    expect(badge.supplyChain.signatureStatus).toBe('signed');
  });

  it('unsigned supply chain with VERIFIED tier', () => {
    const badge = generateBadgeMetadata({
      tier: 'VERIFIED',
      risk: 4,
      obo: false,
      oboScope: '',
      dataLabels: [],
      signatureStatus: 'unsigned',
    });

    expect(badge.tier).toBe('VERIFIED');
    expect(badge.qualifier).toBe('verified');
    expect(badge.supplyChain.signed).toBe(false);
    expect(badge.supplyChain.signatureStatus).toBe('unsigned');
  });

  it('buildSupplyChainBadge returns correct signed/unsigned', () => {
    const signed = buildSupplyChainBadge('signed');
    expect(signed.signed).toBe(true);
    expect(signed.signatureStatus).toBe('signed');

    const unsigned = buildSupplyChainBadge('unsigned');
    expect(unsigned.signed).toBe(false);
    expect(unsigned.signatureStatus).toBe('unsigned');

    const invalid = buildSupplyChainBadge('invalid');
    expect(invalid.signed).toBe(false);
    expect(invalid.signatureStatus).toBe('invalid');
  });
});

describe('R1 + transact OBO flagged as inconsistency', () => {
  it('flags R1 skill with OBO transact scope', () => {
    const badge = generateBadgeMetadata({
      tier: 'TYPED',
      risk: 1,
      obo: true,
      oboScope: 'payment transact',
      dataLabels: [],
      signatureStatus: 'signed',
    });

    expect(badge.inconsistencies).toHaveLength(1);
    expect(badge.inconsistencies[0].code).toBe('BADGE-IC-001');
    expect(badge.inconsistencies[0].severity).toBe('warning');
  });

  it('does not flag R2+ with OBO transact scope', () => {
    const badge = generateBadgeMetadata({
      tier: 'TYPED',
      risk: 2,
      obo: true,
      oboScope: 'payment transact',
      dataLabels: [],
      signatureStatus: 'signed',
    });

    expect(badge.inconsistencies).toHaveLength(0);
  });

  it('does not flag R1 without OBO', () => {
    const badge = generateBadgeMetadata({
      tier: 'TYPED',
      risk: 1,
      obo: false,
      oboScope: '',
      dataLabels: [],
      signatureStatus: 'signed',
    });

    expect(badge.inconsistencies).toHaveLength(0);
  });
});

describe('pre-badge skill renders no badge', () => {
  it('preBadge returns null (not error)', () => {
    const result = preBadge();
    expect(result).toBeNull();
  });

  it('pre-badge is distinct from badge with errors', () => {
    const pre = preBadge();
    const badge = generateBadgeMetadata({
      tier: 'DECLARED',
      risk: 1,
      obo: false,
      oboScope: '',
      dataLabels: [],
      signatureStatus: 'unsigned',
    });

    // Pre-badge is null, badge is an object — clearly distinct
    expect(pre).toBeNull();
    expect(badge).toBeTruthy();
    expect(typeof badge).toBe('object');
  });
});

describe('claws/clawhub namespace boundary', () => {
  it('badge module exports generation only, not rendering', () => {
    // Badge generation is in claws-sdk — verify the module exports
    // exist and produce metadata (not rendered HTML/SVG).
    const badge = generateBadgeMetadata({
      tier: 'TYPED',
      risk: 3,
      obo: false,
      oboScope: '',
      dataLabels: ['INTERNAL'],
      signatureStatus: 'signed',
    });

    // Badge metadata is a data structure, not a rendered artifact
    expect(badge).toHaveProperty('tier');
    expect(badge).toHaveProperty('qualifier');
    expect(badge).toHaveProperty('supplyChain');
    expect(badge).toHaveProperty('inconsistencies');

    // No rendering properties — that's clawhub's concern
    expect(badge).not.toHaveProperty('html');
    expect(badge).not.toHaveProperty('svg');
    expect(badge).not.toHaveProperty('rendered');

    // Qualifier is null for TYPED (no qualifier, not a render decision)
    expect(badge.qualifier).toBeNull();
  });
});
