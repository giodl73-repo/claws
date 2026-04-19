/**
 * L0 unit tests for normalize.ts — BOM stripping and content normalization.
 */

import { describe, it, expect } from 'vitest';
import {
  stripBOM,
  normalizeCRLF,
  enforceTrailingNewline,
  normalizeFileContent,
} from '#src/compiler/readers/normalize.js';

describe('stripBOM', () => {
  it('strips UTF-8 BOM (U+FEFF) from start of string', () => {
    const input = '\uFEFFHello World';
    expect(stripBOM(input)).toBe('Hello World');
  });

  it('strips UTF-16 LE BOM (U+FFFE) from start of string', () => {
    const input = '\uFFFEHello World';
    expect(stripBOM(input)).toBe('Hello World');
  });

  it('returns string unchanged if no BOM present', () => {
    expect(stripBOM('Hello World')).toBe('Hello World');
  });

  it('returns empty string unchanged', () => {
    expect(stripBOM('')).toBe('');
  });

  it('does not strip BOM characters from middle of string', () => {
    const input = 'Hello\uFEFFWorld';
    expect(stripBOM(input)).toBe('Hello\uFEFFWorld');
  });
});

describe('normalizeCRLF', () => {
  it('converts CRLF to LF', () => {
    expect(normalizeCRLF('line1\r\nline2\r\n')).toBe('line1\nline2\n');
  });

  it('leaves LF-only content unchanged', () => {
    expect(normalizeCRLF('line1\nline2\n')).toBe('line1\nline2\n');
  });

  it('handles mixed CRLF and LF', () => {
    expect(normalizeCRLF('line1\r\nline2\nline3\r\n')).toBe('line1\nline2\nline3\n');
  });

  it('returns empty string unchanged', () => {
    expect(normalizeCRLF('')).toBe('');
  });
});

describe('enforceTrailingNewline', () => {
  it('adds trailing newline if missing', () => {
    expect(enforceTrailingNewline('content')).toBe('content\n');
  });

  it('does not double trailing newline', () => {
    expect(enforceTrailingNewline('content\n')).toBe('content\n');
  });

  it('returns empty string unchanged', () => {
    expect(enforceTrailingNewline('')).toBe('');
  });
});

describe('normalizeFileContent', () => {
  it('runs full pipeline: BOM strip, CRLF, trailing newline', () => {
    const input = '\uFEFFline1\r\nline2';
    const expected = 'line1\nline2\n';
    expect(normalizeFileContent(input)).toBe(expected);
  });
});
