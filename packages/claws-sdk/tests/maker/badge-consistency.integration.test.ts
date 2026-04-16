/**
 * L1 integration tests for badge inconsistency detection.
 *
 * P30: risk-OBO contradiction detected, data-tier mismatch detected.
 * These tests exercise the full badge generation pipeline including
 * inconsistency detection, verifying that contradictions surface
 * in the final BadgeMetadata output.
 */

import { describe, it, expect } from 'vitest';

import { generateBadgeMetadata } from '../../src/maker/badge.js';
import { detectInconsistencies } from '../../src/maker/badge-consistency.js';

describe('risk-OBO contradiction detected', () => {
  it('flags R1 + OBO transact through the full badge pipeline', () => {
    const badge = generateBadgeMetadata({
      tier: 'TYPED',
      risk: 1,
      obo: true,
      oboScope: 'transact on behalf of user',
      dataLabels: ['INTERNAL'],
      signatureStatus: 'signed',
    });

    // Inconsistency surfaces in badge metadata
    expect(badge.inconsistencies.length).toBeGreaterThanOrEqual(1);
    const riskObo = badge.inconsistencies.find(i => i.code === 'BADGE-IC-001');
    expect(riskObo).toBeDefined();
    expect(riskObo!.severity).toBe('warning');
    expect(riskObo!.message).toContain('R1');
    expect(riskObo!.message).toContain('OBO');
  });

  it('flags R1 + OBO with payment scope variant', () => {
    const inconsistencies = detectInconsistencies({
      tier: 'VERIFIED',
      risk: 1,
      obo: true,
      oboScope: 'process payment for subscription',
      dataLabels: [],
    });

    expect(inconsistencies).toHaveLength(1);
    expect(inconsistencies[0].code).toBe('BADGE-IC-001');
  });

  it('flags R1 + OBO with purchase scope variant', () => {
    const inconsistencies = detectInconsistencies({
      tier: 'TYPED',
      risk: 1,
      obo: true,
      oboScope: 'purchase items in cart',
      dataLabels: [],
    });

    expect(inconsistencies).toHaveLength(1);
    expect(inconsistencies[0].code).toBe('BADGE-IC-001');
  });

  it('does not flag R1 + OBO without transact scope', () => {
    const inconsistencies = detectInconsistencies({
      tier: 'TYPED',
      risk: 1,
      obo: true,
      oboScope: 'send email on behalf of user',
      dataLabels: [],
    });

    expect(inconsistencies).toHaveLength(0);
  });

  it('does not flag R3 + OBO transact (risk high enough)', () => {
    const inconsistencies = detectInconsistencies({
      tier: 'TYPED',
      risk: 3,
      obo: true,
      oboScope: 'transact on behalf of user',
      dataLabels: [],
    });

    expect(inconsistencies).toHaveLength(0);
  });
});

describe('data-tier mismatch detected', () => {
  it('flags CONFIDENTIAL + DECLARED through the full badge pipeline', () => {
    const badge = generateBadgeMetadata({
      tier: 'DECLARED',
      risk: 3,
      obo: false,
      oboScope: '',
      dataLabels: ['CONFIDENTIAL'],
      signatureStatus: 'unsigned',
    });

    // Inconsistency surfaces in badge metadata
    expect(badge.inconsistencies.length).toBeGreaterThanOrEqual(1);
    const dataTier = badge.inconsistencies.find(i => i.code === 'BADGE-IC-002');
    expect(dataTier).toBeDefined();
    expect(dataTier!.severity).toBe('error');
    expect(dataTier!.message).toContain('CONFIDENTIAL');
    expect(dataTier!.message).toContain('DECLARED');
  });

  it('flags case-insensitive CONFIDENTIAL label', () => {
    const inconsistencies = detectInconsistencies({
      tier: 'DECLARED',
      risk: 2,
      obo: false,
      oboScope: '',
      dataLabels: ['confidential'],
    });

    expect(inconsistencies).toHaveLength(1);
    expect(inconsistencies[0].code).toBe('BADGE-IC-002');
  });

  it('does not flag CONFIDENTIAL + TYPED (tier sufficient)', () => {
    const inconsistencies = detectInconsistencies({
      tier: 'TYPED',
      risk: 3,
      obo: false,
      oboScope: '',
      dataLabels: ['CONFIDENTIAL'],
    });

    expect(inconsistencies).toHaveLength(0);
  });

  it('does not flag CONFIDENTIAL + VERIFIED (tier sufficient)', () => {
    const inconsistencies = detectInconsistencies({
      tier: 'VERIFIED',
      risk: 4,
      obo: false,
      oboScope: '',
      dataLabels: ['CONFIDENTIAL'],
    });

    expect(inconsistencies).toHaveLength(0);
  });

  it('does not flag DECLARED + non-confidential labels', () => {
    const inconsistencies = detectInconsistencies({
      tier: 'DECLARED',
      risk: 1,
      obo: false,
      oboScope: '',
      dataLabels: ['PUBLIC', 'INTERNAL'],
    });

    expect(inconsistencies).toHaveLength(0);
  });

  it('detects both inconsistencies simultaneously', () => {
    const badge = generateBadgeMetadata({
      tier: 'DECLARED',
      risk: 1,
      obo: true,
      oboScope: 'transact on behalf of user',
      dataLabels: ['CONFIDENTIAL'],
      signatureStatus: 'unsigned',
    });

    expect(badge.inconsistencies).toHaveLength(2);
    const codes = badge.inconsistencies.map(i => i.code);
    expect(codes).toContain('BADGE-IC-001');
    expect(codes).toContain('BADGE-IC-002');
  });
});
