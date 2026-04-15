/**
 * L0: Remediation message injection — claws annotate hints, versioned doc URLs.
 */

import { describe, it, expect } from 'vitest';
import {
  buildDocUrl,
  getClawsVersion,
  remediateInvalidRiskLabel,
  remediateMissingGovernance,
  formatRemediation,
  injectRemediation,
} from '../../src/annotate/remediation.js';

describe('buildDocUrl()', () => {
  it('includes claws version in URL', () => {
    const url = buildDocUrl('docs/claws/annotate.md');
    expect(url).toContain(getClawsVersion());
    expect(url).toContain('docs/claws/annotate.md');
  });

  it('produces a versioned URL with v prefix', () => {
    const url = buildDocUrl('docs/foo.md');
    expect(url).toMatch(/\/v\d+\.\d+\.\d+\//);
  });
});

describe('remediateInvalidRiskLabel()', () => {
  it('includes "Or run: claws annotate" in message', () => {
    const hint = remediateInvalidRiskLabel('R6');
    expect(hint.message).toContain('Or run: claws annotate');
  });

  it('includes near-miss suggestion for "R6"', () => {
    const hint = remediateInvalidRiskLabel('R6');
    expect(hint.suggestion).toBeDefined();
    expect(hint.suggestion!.suggestion).toBe('R5');
    expect(hint.message).toContain('Did you mean');
  });

  it('includes versioned doc URL', () => {
    const hint = remediateInvalidRiskLabel('R6');
    expect(hint.docUrl).toBeDefined();
    expect(hint.docUrl).toContain(getClawsVersion());
  });

  it('handles completely unrecognized labels', () => {
    const hint = remediateInvalidRiskLabel('totally-invalid-value');
    expect(hint.message).toContain('Or run: claws annotate');
    // No suggestion — too far from any canonical value
    expect(hint.suggestion).toBeUndefined();
  });
});

describe('remediateMissingGovernance()', () => {
  it('includes "Or run: claws annotate" in message', () => {
    const hint = remediateMissingGovernance('risk');
    expect(hint.message).toContain('Or run: claws annotate');
    expect(hint.message).toContain('risk');
  });

  it('includes versioned doc URL', () => {
    const hint = remediateMissingGovernance('risk');
    expect(hint.docUrl).toBeDefined();
    expect(hint.docUrl).toContain(getClawsVersion());
  });
});

describe('formatRemediation()', () => {
  it('formats hint with message and doc URL', () => {
    const hint = remediateInvalidRiskLabel('R6');
    const formatted = formatRemediation(hint);
    expect(formatted).toContain('hint:');
    expect(formatted).toContain('docs:');
    expect(formatted).toContain('Or run: claws annotate');
  });
});

describe('injectRemediation()', () => {
  it('appends "Or run: claws annotate" to error message', () => {
    const result = injectRemediation('Invalid risk level');
    expect(result).toContain('Invalid risk level');
    expect(result).toContain('Or run: claws annotate');
  });

  it('omits doc URL when no path provided', () => {
    const result = injectRemediation('Invalid risk level');
    expect(result).not.toContain('docs:');
  });

  it('includes versioned doc URL when path provided', () => {
    const result = injectRemediation('Error', 'docs/claws/annotate.md');
    expect(result).toContain('docs:');
    expect(result).toContain(getClawsVersion());
  });
});

describe('formatRemediation() without doc URL', () => {
  it('omits docs line when hint has no docUrl', () => {
    const hint = {
      message: 'Test hint. Or run: claws annotate',
      docUrl: undefined,
      suggestion: undefined,
    };
    const formatted = formatRemediation(hint);
    expect(formatted).toContain('hint:');
    expect(formatted).not.toContain('docs:');
  });
});
