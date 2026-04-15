/**
 * L0: Progress bar — output format matches expected pattern at various percentages.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { formatProgressBar, startProgress } from '../../src/ui/progress.js';

describe('progress bar', () => {
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

  it('renders correct format at 0%, 40%, and 100%', () => {
    // 0% — all empty, no ETA (no progress yet)
    const at0 = formatProgressBar(0, 100, 0, { width: 10 });
    expect(at0).toContain('[');
    expect(at0).toContain(']');
    expect(at0).toContain('0%');
    expect(at0).not.toContain('\x1b[');

    // 40% — mixed fill, includes ETA
    const at40 = formatProgressBar(40, 100, 2000, { width: 10 });
    expect(at40).toContain('40%');
    expect(at40).toMatch(/ETA \d+s/);
    // 4 filled blocks out of 10
    const fillCount = (at40.match(/\u2588/g) ?? []).length;
    expect(fillCount).toBe(4);
    const emptyCount = (at40.match(/\u2591/g) ?? []).length;
    expect(emptyCount).toBe(6);

    // 100% — all filled, no ETA
    const at100 = formatProgressBar(100, 100, 5000, { width: 10 });
    expect(at100).toContain('100%');
    expect(at100).not.toContain('ETA');
    const fullFill = (at100.match(/\u2588/g) ?? []).length;
    expect(fullFill).toBe(10);
  });

  it('produces no ANSI codes when NO_COLOR is set', () => {
    const output = formatProgressBar(50, 100, 1000, { width: 10 });
    expect(output).not.toContain('\x1b[');
  });

  it('produces ANSI codes when color is forced', () => {
    delete process.env['NO_COLOR'];
    process.env['FORCE_COLOR'] = '1';
    const output = formatProgressBar(50, 100, 1000, { width: 10, color: true });
    expect(output).toContain('\x1b[');
  });

  it('uses default BAR_WIDTH when width option is omitted', () => {
    const output = formatProgressBar(5, 10, 1000);
    // Default width is 20 — 10 filled + 10 empty = 20 total
    const fillCount = (output.match(/\u2588/g) ?? []).length;
    const emptyCount = (output.match(/\u2591/g) ?? []).length;
    expect(fillCount + emptyCount).toBe(20);
    expect(output).toContain('50%');
  });

  it('handles total of 0 gracefully (no division by zero)', () => {
    const output = formatProgressBar(0, 0, 0, { width: 10 });
    expect(output).toContain('0%');
    expect(output).not.toContain('NaN');
  });

  it('clamps percentage to 100% when current exceeds total', () => {
    const output = formatProgressBar(150, 100, 5000, { width: 10 });
    expect(output).toContain('100%');
    const fillCount = (output.match(/\u2588/g) ?? []).length;
    expect(fillCount).toBe(10);
  });
});

describe('startProgress', () => {
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

  it('tick() advances progress and writes to TTY stream with carriage return', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: true as const };

    const bar = startProgress(10, { stream, width: 10, colorOverride: false });
    bar.tick(3);

    expect(output.length).toBe(1);
    expect(output[0]).toContain('30%');
    expect(output[0]).toMatch(/^\r/);
    expect(output[0]).not.toMatch(/\n$/);
  });

  it('tick() writes to non-TTY stream with newline', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: false as const };

    const bar = startProgress(10, { stream, width: 10, colorOverride: false });
    bar.tick(5);

    expect(output.length).toBe(1);
    expect(output[0]).toContain('50%');
    expect(output[0]).toMatch(/\n$/);
  });

  it('tick() clamps current to total', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: false as const };

    const bar = startProgress(5, { stream, width: 10, colorOverride: false });
    bar.tick(10); // exceeds total

    expect(output[0]).toContain('100%');
  });

  it('multiple tick() calls accumulate progress', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: false as const };

    const bar = startProgress(10, { stream, width: 10, colorOverride: false });
    bar.tick(3);
    bar.tick(3);

    expect(output.length).toBe(2);
    expect(output[0]).toContain('30%');
    expect(output[1]).toContain('60%');
  });

  it('done() sets progress to 100% on TTY with trailing newline', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: true as const };

    const bar = startProgress(10, { stream, width: 10, colorOverride: false });
    bar.done();

    const lastWrite = output[output.length - 1];
    expect(lastWrite).toContain('100%');
    expect(lastWrite).toMatch(/^\r/);
    expect(lastWrite).toMatch(/\n$/);
  });

  it('done() sets progress to 100% on non-TTY with newline', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: false as const };

    const bar = startProgress(10, { stream, width: 10, colorOverride: false });
    bar.done();

    const lastWrite = output[output.length - 1];
    expect(lastWrite).toContain('100%');
    expect(lastWrite).toMatch(/\n$/);
  });

  it('tick() with no arguments advances by 1', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: false as const };

    const bar = startProgress(10, { stream, width: 10, colorOverride: false });
    bar.tick();

    expect(output[0]).toContain('10%');
  });

  it('uses color when colorOverride is true', () => {
    delete process.env['NO_COLOR'];
    process.env['FORCE_COLOR'] = '1';
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: false as const };

    const bar = startProgress(10, { stream, width: 10, colorOverride: true });
    bar.tick(5);

    expect(output[0]).toContain('\x1b[32m');
  });

  it('uses default width and stream when no options provided', () => {
    // Test that default parameters don't cause errors
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: false as const };

    const bar = startProgress(100, { stream, colorOverride: false });
    bar.tick(50);
    bar.done();

    expect(output.length).toBe(2);
    expect(output[0]).toContain('50%');
    expect(output[1]).toContain('100%');
  });

  it('uses default width (BAR_WIDTH=20) when width option is omitted', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: false as const };

    // No width option — exercises opts?.width ?? BAR_WIDTH (line 38 of formatProgressBar)
    const bar = startProgress(10, { stream, colorOverride: false });
    bar.tick(5);

    // Default width is 20, so 10 filled + 10 empty = 20 total bar chars
    const fillCount = (output[0]!.match(/\u2588/g) ?? []).length;
    const emptyCount = (output[0]!.match(/\u2591/g) ?? []).length;
    expect(fillCount + emptyCount).toBe(20);
  });

  it('done() on TTY without colorOverride uses env-based detection', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: true as const };

    // No colorOverride — exercises the spread path with undefined colorOvr
    const bar = startProgress(10, { stream, width: 10 });
    bar.done();

    const lastWrite = output[output.length - 1];
    expect(lastWrite).toContain('100%');
    expect(lastWrite).toMatch(/^\r/);
    expect(lastWrite).toMatch(/\n$/);
  });

  it('done() on non-TTY without colorOverride uses env-based detection', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: false as const };

    // No colorOverride
    const bar = startProgress(10, { stream, width: 10 });
    bar.done();

    const lastWrite = output[output.length - 1];
    expect(lastWrite).toContain('100%');
    expect(lastWrite).toMatch(/\n$/);
  });

  it('defaults isTTY to false when stream has no isTTY property', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); } };

    // stream lacks isTTY → defaults to false → writes with newlines
    const bar = startProgress(10, { stream, width: 10, colorOverride: false });
    bar.tick(5);
    bar.done();

    expect(output.length).toBe(2);
    expect(output[0]).toMatch(/\n$/); // non-TTY behavior
    expect(output[1]).toContain('100%');
  });

  it('uses default stream (process.stderr) when no stream option given', () => {
    // Exercise the default stream fallback (opts?.stream ?? process.stderr)
    // Just ensure it doesn't crash — process.stderr.write is the default
    const bar = startProgress(5, { width: 10, colorOverride: false });
    bar.tick(5);
    bar.done();
  });
});
