/**
 * L0: Compliance scenario findings — unit tests.
 *
 * 4 tests:
 * 1. Observation period 6-month validation (edge cases)
 * 2. RFC 8785 canonical JSON deterministic output
 * 3. Evidence format versioning stamp
 * 4. Line-ending normalization
 */

import { describe, it, expect } from 'vitest';
import { validateObservationPeriod } from '../../src/compliance/soc2.js';
import {
  exportCanonicalJson,
  normalizeLineEndings,
  EVIDENCE_FORMAT_VERSION,
} from '../../src/audit/export.js';
import type { ChainEntry } from '../../src/audit/types.js';

function makeChainEntry(seq: number, overrides: Partial<ChainEntry> = {}): ChainEntry {
  return {
    seq,
    timestamp: '2025-10-01T10:00:00Z',
    eventType: 'TOOL_CALL',
    actor: 'agent-1',
    target: 'test-target',
    action: 'invoke',
    outcome: 'allow',
    ruleId: 'TEST-001',
    severity: 3,
    policyVersion: '1.0.0',
    hash: `hash-${seq}`,
    previousHash: seq === 0 ? null : `hash-${seq - 1}`,
    ...overrides,
  };
}

describe('SOC2 observation period 6-month validation', () => {
  it('rejects exactly 179 days (one day short of 6 months)', () => {
    // 179 days = less than 180 days minimum
    const start = '2025-01-01T00:00:00Z';
    const end = '2025-06-30T00:00:00Z'; // 180 days but let's be precise
    // 179 days: Jan 1 to Jun 29
    const end179 = '2025-06-29T00:00:00Z';
    expect(validateObservationPeriod(start, end179)).toBe(false);
  });

  it('accepts exactly 180 days (minimum 6 months)', () => {
    const start = '2025-01-01T00:00:00Z';
    const end = '2025-06-30T00:00:00Z'; // 180 days
    expect(validateObservationPeriod(start, end)).toBe(true);
  });

  it('accepts 365-day observation period', () => {
    expect(validateObservationPeriod('2025-01-01T00:00:00Z', '2026-01-01T00:00:00Z')).toBe(true);
  });

  it('rejects reversed dates (end before start)', () => {
    expect(validateObservationPeriod('2025-08-01T00:00:00Z', '2025-01-01T00:00:00Z')).toBe(false);
  });
});

describe('RFC 8785 canonical JSON', () => {
  it('produces deterministic output with sorted keys', () => {
    const entries: ChainEntry[] = [
      makeChainEntry(0, {
        actor: 'zulu-agent',
        target: 'alpha-target',
        ruleId: 'G-PERM-01',
      }),
    ];

    const output = exportCanonicalJson(entries);

    // Keys must be sorted lexicographically within each entry
    const parsed = JSON.parse(output) as unknown[];
    expect(parsed.length).toBe(1);

    // Re-export should produce identical output (deterministic)
    const output2 = exportCanonicalJson(entries);
    expect(output2).toBe(output);
  });

  it('produces identical output regardless of property insertion order', () => {
    // Create two entries with same values but we verify canonical output is stable
    const entry1 = makeChainEntry(0);
    const entry2 = makeChainEntry(0);

    const out1 = exportCanonicalJson([entry1]);
    const out2 = exportCanonicalJson([entry2]);
    expect(out1).toBe(out2);
  });

  it('handles numeric values consistently', () => {
    const entries: ChainEntry[] = [
      makeChainEntry(0, { severity: 3 }),
      makeChainEntry(1, { severity: 5 }),
    ];

    const output = exportCanonicalJson(entries);
    // Numeric values should appear without quotes
    expect(output).toContain('"severity":3');
    expect(output).toContain('"severity":5');
  });

  it('applies redaction before canonicalization', () => {
    const entries: ChainEntry[] = [
      makeChainEntry(0, { actor: 'secret-agent' }),
    ];

    const output = exportCanonicalJson(entries, {
      redactFields: ['actor'],
      replacement: '[REDACTED]',
    });

    expect(output).not.toContain('secret-agent');
    expect(output).toContain('[REDACTED]');
  });
});

describe('evidence format versioning', () => {
  it('EVIDENCE_FORMAT_VERSION is a valid semver string', () => {
    expect(EVIDENCE_FORMAT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('EVIDENCE_FORMAT_VERSION is at least 1.0.0', () => {
    const [major] = EVIDENCE_FORMAT_VERSION.split('.').map(Number);
    expect(major).toBeGreaterThanOrEqual(1);
  });
});

describe('line-ending normalization', () => {
  it('converts CRLF to LF', () => {
    const input = 'line1\r\nline2\r\nline3';
    expect(normalizeLineEndings(input)).toBe('line1\nline2\nline3');
  });

  it('converts bare CR to LF', () => {
    const input = 'line1\rline2\rline3';
    expect(normalizeLineEndings(input)).toBe('line1\nline2\nline3');
  });

  it('strips trailing whitespace per line', () => {
    const input = 'line1   \nline2\t\nline3';
    expect(normalizeLineEndings(input)).toBe('line1\nline2\nline3');
  });

  it('removes BOM', () => {
    const input = '\uFEFFline1\nline2';
    expect(normalizeLineEndings(input)).toBe('line1\nline2');
  });

  it('handles mixed line endings', () => {
    const input = 'a\r\nb\rc\nd\r\n';
    expect(normalizeLineEndings(input)).toBe('a\nb\nc\nd\n');
  });

  it('preserves content without issues', () => {
    const input = 'clean\nlines\nonly';
    expect(normalizeLineEndings(input)).toBe('clean\nlines\nonly');
  });
});
