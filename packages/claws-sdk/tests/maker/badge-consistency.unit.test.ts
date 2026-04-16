/**
 * L0 unit tests for badge inconsistency detection.
 *
 * P30: governance metadata contradiction detection.
 * Tests all branches in detectInconsistencies, hasTransactScope,
 * and hasConfidentialLabel.
 */

import { describe, it, expect } from 'vitest';

import { detectInconsistencies } from '../../src/maker/badge-consistency.js';
import type { ConsistencyInput } from '../../src/maker/badge-consistency.js';

const BASE_INPUT: ConsistencyInput = {
  tier: 'TYPED',
  risk: 3,
  obo: false,
  oboScope: '',
  dataLabels: [],
};

describe('detectInconsistencies', () => {
  it('returns empty array when no inconsistencies', () => {
    expect(detectInconsistencies(BASE_INPUT)).toEqual([]);
  });

  // ── BADGE-IC-001: R1 + OBO transact ────────────────────────────

  it('BADGE-IC-001: flags R1 + OBO with "transact" scope', () => {
    const result = detectInconsistencies({
      ...BASE_INPUT,
      risk: 1,
      obo: true,
      oboScope: 'transact on behalf of user',
    });
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('BADGE-IC-001');
    expect(result[0].severity).toBe('warning');
  });

  it('BADGE-IC-001: flags R1 + OBO with "payment" scope', () => {
    const result = detectInconsistencies({
      ...BASE_INPUT,
      risk: 1,
      obo: true,
      oboScope: 'process payment',
    });
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('BADGE-IC-001');
  });

  it('BADGE-IC-001: flags R1 + OBO with "purchase" scope', () => {
    const result = detectInconsistencies({
      ...BASE_INPUT,
      risk: 1,
      obo: true,
      oboScope: 'purchase items',
    });
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('BADGE-IC-001');
  });

  it('BADGE-IC-001: does not flag R1 + OBO without transact keywords', () => {
    const result = detectInconsistencies({
      ...BASE_INPUT,
      risk: 1,
      obo: true,
      oboScope: 'send email on behalf',
    });
    expect(result).toHaveLength(0);
  });

  it('BADGE-IC-001: does not flag R1 + no OBO even with transact scope', () => {
    const result = detectInconsistencies({
      ...BASE_INPUT,
      risk: 1,
      obo: false,
      oboScope: 'transact',
    });
    expect(result).toHaveLength(0);
  });

  it('BADGE-IC-001: does not flag R2 + OBO transact (risk too high)', () => {
    const result = detectInconsistencies({
      ...BASE_INPUT,
      risk: 2,
      obo: true,
      oboScope: 'transact on behalf',
    });
    expect(result).toHaveLength(0);
  });

  // ── BADGE-IC-002: CONFIDENTIAL + DECLARED ──────────────────────

  it('BADGE-IC-002: flags DECLARED + CONFIDENTIAL label', () => {
    const result = detectInconsistencies({
      ...BASE_INPUT,
      tier: 'DECLARED',
      dataLabels: ['CONFIDENTIAL'],
    });
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('BADGE-IC-002');
    expect(result[0].severity).toBe('error');
  });

  it('BADGE-IC-002: case-insensitive CONFIDENTIAL detection', () => {
    const result = detectInconsistencies({
      ...BASE_INPUT,
      tier: 'DECLARED',
      dataLabels: ['confidential'],
    });
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('BADGE-IC-002');
  });

  it('BADGE-IC-002: does not flag DECLARED without CONFIDENTIAL', () => {
    const result = detectInconsistencies({
      ...BASE_INPUT,
      tier: 'DECLARED',
      dataLabels: ['PUBLIC', 'INTERNAL'],
    });
    expect(result).toHaveLength(0);
  });

  it('BADGE-IC-002: does not flag TYPED + CONFIDENTIAL', () => {
    const result = detectInconsistencies({
      ...BASE_INPUT,
      tier: 'TYPED',
      dataLabels: ['CONFIDENTIAL'],
    });
    expect(result).toHaveLength(0);
  });

  // ── Both rules simultaneously ──────────────────────────────────

  it('detects both IC-001 and IC-002 simultaneously', () => {
    const result = detectInconsistencies({
      tier: 'DECLARED',
      risk: 1,
      obo: true,
      oboScope: 'transact on behalf',
      dataLabels: ['CONFIDENTIAL'],
    });
    expect(result).toHaveLength(2);
    const codes = result.map(r => r.code);
    expect(codes).toContain('BADGE-IC-001');
    expect(codes).toContain('BADGE-IC-002');
  });
});
