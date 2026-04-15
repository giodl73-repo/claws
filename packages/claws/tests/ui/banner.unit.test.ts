/**
 * L0: Banner — includes version string and "claws" name.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatBanner, printBanner } from '../../src/ui/banner.js';

describe('banner', () => {
  const origNoColor = process.env['NO_COLOR'];
  const origForceColor = process.env['FORCE_COLOR'];

  beforeEach(() => {
    process.env['NO_COLOR'] = '1';
    delete process.env['FORCE_COLOR'];
  });

  afterEach(() => {
    if (origNoColor === undefined) delete process.env['NO_COLOR'];
    else process.env['NO_COLOR'] = origNoColor;
    if (origForceColor === undefined) delete process.env['FORCE_COLOR'];
    else process.env['FORCE_COLOR'] = origForceColor;
  });

  it('contains "claws" name and version string', () => {
    const banner = formatBanner('0.36.0');
    expect(banner).toContain('claws');
    expect(banner).toContain('v0.36.0');
    expect(banner).not.toContain('\x1b[');
  });

  it('includes ASCII art lines', () => {
    const banner = formatBanner('1.0.0');
    const lines = banner.split('\n');
    // ASCII art (5 lines) + version line
    expect(lines.length).toBeGreaterThanOrEqual(6);
    expect(lines[lines.length - 1]).toContain('claws v1.0.0');
  });

  it('adds ANSI color when color is enabled', () => {
    delete process.env['NO_COLOR'];
    process.env['FORCE_COLOR'] = '1';
    const banner = formatBanner('0.36.0', { color: true });
    expect(banner).toContain('\x1b[36m'); // cyan for art
    expect(banner).toContain('\x1b[2m');  // dim for version
    expect(banner).toContain('claws');
    expect(banner).toContain('v0.36.0');
  });
});

describe('printBanner', () => {
  const origNoColor = process.env['NO_COLOR'];
  const origForceColor = process.env['FORCE_COLOR'];

  beforeEach(() => {
    process.env['NO_COLOR'] = '1';
    delete process.env['FORCE_COLOR'];
  });

  afterEach(() => {
    if (origNoColor === undefined) delete process.env['NO_COLOR'];
    else process.env['NO_COLOR'] = origNoColor;
    if (origForceColor === undefined) delete process.env['FORCE_COLOR'];
    else process.env['FORCE_COLOR'] = origForceColor;
  });

  it('writes banner to provided stream', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); } };

    printBanner('1.2.3', { stream });

    expect(output.length).toBe(1);
    expect(output[0]).toContain('claws');
    expect(output[0]).toContain('v1.2.3');
    // Ends with two newlines (banner + trailing blank line)
    expect(output[0]).toMatch(/\n\n$/);
  });

  it('writes banner without color when colorOverride is false', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); } };

    printBanner('0.1.0', { stream, colorOverride: false });

    expect(output[0]).not.toContain('\x1b[');
    expect(output[0]).toContain('claws v0.1.0');
  });

  it('writes banner with color when colorOverride is true', () => {
    delete process.env['NO_COLOR'];
    process.env['FORCE_COLOR'] = '1';
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); } };

    printBanner('2.0.0', { stream, colorOverride: true });

    expect(output[0]).toContain('\x1b[36m'); // cyan for art
    expect(output[0]).toContain('\x1b[2m');  // dim for version
  });

  it('writes to process.stderr by default when no stream provided', () => {
    // Just verify it doesn't throw when called without a stream option
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      printBanner('3.0.0');
      expect(stderrSpy).toHaveBeenCalled();
      const written = stderrSpy.mock.calls[0]?.[0] as string;
      expect(written).toContain('claws');
      expect(written).toContain('v3.0.0');
    } finally {
      stderrSpy.mockRestore();
    }
  });

  it('enables color when stream has isTTY and no colorOverride', () => {
    delete process.env['NO_COLOR'];
    delete process.env['FORCE_COLOR'];
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: true };

    printBanner('5.0.0', { stream });

    expect(output[0]).toContain('\x1b[36m'); // color enabled from TTY
    expect(output[0]).toContain('claws v5.0.0');
  });

  it('disables color when stream lacks isTTY and no colorOverride', () => {
    delete process.env['NO_COLOR'];
    delete process.env['FORCE_COLOR'];
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); } };

    printBanner('5.1.0', { stream });

    expect(output[0]).not.toContain('\x1b['); // no TTY = no color
    expect(output[0]).toContain('claws v5.1.0');
  });

  it('passes colorOverride=undefined when no colorOverride option given', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); } };

    // With NO_COLOR=1 set in beforeEach, color should be disabled
    printBanner('4.0.0', { stream });

    expect(output[0]).not.toContain('\x1b[');
    expect(output[0]).toContain('claws v4.0.0');
  });
});
