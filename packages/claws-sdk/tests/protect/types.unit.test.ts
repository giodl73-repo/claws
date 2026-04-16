/**
 * L0: PROTECT types — construction and validation for budget, vault, threshold, limit types.
 */

import { describe, it, expect } from 'vitest';
import {
  isThresholdLevel,
  THRESHOLD_LEVELS,
  createBudgetLimit,
} from '../../src/protect/types.js';
import type {
  BudgetReport,
  VaultConfig,
  ThresholdAlert,
} from '../../src/protect/types.js';

describe('BudgetReport', () => {
  it('constructs with valid workspace-scoped fields', () => {
    const report: BudgetReport = {
      tokenCount: 150_000,
      limit: 500_000,
      percentage: 30,
      period: 'monthly',
    };

    expect(report.tokenCount).toBe(150_000);
    expect(report.limit).toBe(500_000);
    expect(report.percentage).toBe(30);
    expect(report.period).toBe('monthly');
  });
});

describe('VaultConfig', () => {
  it('constructs with algorithm and paths', () => {
    const vault: VaultConfig = {
      algorithm: 'aes-256-gcm',
      saltPath: '/etc/claws/salt',
      vaultPath: '/etc/claws/vault.enc',
      keyDerivation: 'argon2',
    };

    expect(vault.algorithm).toBe('aes-256-gcm');
    expect(vault.saltPath).toBe('/etc/claws/salt');
    expect(vault.vaultPath).toBe('/etc/claws/vault.enc');
    expect(vault.keyDerivation).toBe('argon2');
  });
});

describe('ThresholdAlert', () => {
  it('validates 80, 95, 100 as the only valid threshold levels', () => {
    // Valid levels
    expect(isThresholdLevel(80)).toBe(true);
    expect(isThresholdLevel(95)).toBe(true);
    expect(isThresholdLevel(100)).toBe(true);

    // Invalid levels
    expect(isThresholdLevel(0)).toBe(false);
    expect(isThresholdLevel(50)).toBe(false);
    expect(isThresholdLevel(90)).toBe(false);
    expect(isThresholdLevel(101)).toBe(false);

    // Runtime array matches
    expect(THRESHOLD_LEVELS).toEqual([80, 95, 100]);

    // Construct a valid alert
    const alert: ThresholdAlert = {
      level: 95,
      triggered: true,
      message: 'Budget at 95% — approaching limit',
    };
    expect(alert.level).toBe(95);
    expect(alert.triggered).toBe(true);
  });
});

describe('BudgetLimit', () => {
  it('rejects negative daily and monthly values', () => {
    // Negative daily
    expect(() => createBudgetLimit(-1, 1_000_000, 'warn')).toThrow(RangeError);
    expect(() => createBudgetLimit(-1, 1_000_000, 'warn')).toThrow(
      'daily limit must be non-negative',
    );

    // Negative weekly
    expect(() => createBudgetLimit(50_000, 1_000_000, 'warn', -10)).toThrow(RangeError);
    expect(() => createBudgetLimit(50_000, 1_000_000, 'warn', -10)).toThrow(
      'weekly limit must be non-negative',
    );

    // Negative monthly
    expect(() => createBudgetLimit(50_000, -500, 'block')).toThrow(RangeError);
    expect(() => createBudgetLimit(50_000, -500, 'block')).toThrow(
      'monthly limit must be non-negative',
    );

    // Valid construction
    const limit = createBudgetLimit(50_000, 1_000_000, 'warn');
    expect(limit.daily).toBe(50_000);
    expect(limit.monthly).toBe(1_000_000);
    expect(limit.enforcement).toBe('warn');

    // Valid with explicit weekly
    const withWeekly = createBudgetLimit(10_000, 500_000, 'block', 70_000);
    expect(withWeekly.daily).toBe(10_000);
    expect(withWeekly.weekly).toBe(70_000);
    expect(withWeekly.monthly).toBe(500_000);
    expect(withWeekly.enforcement).toBe('block');

    // Zero is valid (unlimited)
    const zero = createBudgetLimit(0, 0, 'block');
    expect(zero.daily).toBe(0);
    expect(zero.weekly).toBe(0);
    expect(zero.monthly).toBe(0);
  });
});
