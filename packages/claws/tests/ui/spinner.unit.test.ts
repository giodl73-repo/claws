/**
 * L0: Spinner states — running shows spinner char, succeed shows checkmark, fail shows cross.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatSpinnerFrame, formatSucceed, formatFail, startSpinner } from '../../src/ui/spinner.js';

describe('spinner', () => {
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

  it('running frame contains spinner char and message', () => {
    const frame = formatSpinnerFrame('⠋', 'Compiling...');
    expect(frame).toContain('⠋');
    expect(frame).toContain('Compiling...');
    expect(frame).not.toContain('\x1b[');
  });

  it('succeed shows checkmark and message', () => {
    const line = formatSucceed('Done in 1.2s');
    expect(line).toContain('✔');
    expect(line).toContain('Done in 1.2s');
    expect(line).not.toContain('\x1b[');
  });

  it('fail shows cross and message', () => {
    const line = formatFail('Compilation failed');
    expect(line).toContain('✖');
    expect(line).toContain('Compilation failed');
    expect(line).not.toContain('\x1b[');
  });

  it('produces ANSI codes when color is enabled', () => {
    delete process.env['NO_COLOR'];
    process.env['FORCE_COLOR'] = '1';

    const frame = formatSpinnerFrame('⠋', 'Working...', { color: true });
    expect(frame).toContain('\x1b[36m'); // cyan

    const succeed = formatSucceed('Done', { color: true });
    expect(succeed).toContain('\x1b[32m'); // green

    const fail = formatFail('Error', { color: true });
    expect(fail).toContain('\x1b[31m'); // red
  });
});

describe('startSpinner', () => {
  const origNoColor = process.env['NO_COLOR'];
  const origForceColor = process.env['FORCE_COLOR'];

  beforeEach(() => {
    process.env['NO_COLOR'] = '1';
    delete process.env['FORCE_COLOR'];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (origNoColor === undefined) delete process.env['NO_COLOR'];
    else process.env['NO_COLOR'] = origNoColor;
    if (origForceColor === undefined) delete process.env['FORCE_COLOR'];
    else process.env['FORCE_COLOR'] = origForceColor;
  });

  it('writes initial frame on TTY stream and animates with interval', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: true as const };

    const spin = startSpinner('Loading...', { stream, colorOverride: false });

    // Initial render writes to stream
    expect(output.length).toBeGreaterThanOrEqual(1);
    expect(output[0]).toContain('Loading...');
    // Contains carriage return + clear for TTY
    expect(output[0]).toContain('\r');

    // Advance timer to trigger more frames
    vi.advanceTimersByTime(160);
    expect(output.length).toBeGreaterThanOrEqual(3);

    spin.stop();
  });

  it('writes static text with newline on non-TTY stream', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: false as const };

    const spin = startSpinner('Loading...', { stream });

    // Non-TTY should write a single line with newline
    expect(output.length).toBe(1);
    expect(output[0]).toContain('Loading...');
    expect(output[0]).toMatch(/\n$/);

    spin.stop();
  });

  it('update() changes message on non-TTY stream', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: false as const };

    const spin = startSpinner('Step 1...', { stream });
    spin.update('Step 2...');

    // Should have initial + update
    expect(output.length).toBe(2);
    expect(output[1]).toContain('Step 2...');
    expect(output[1]).toMatch(/\n$/);

    spin.stop();
  });

  it('update() changes message on TTY — rendered on next tick', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: true as const };

    const spin = startSpinner('Working...', { stream, colorOverride: false });
    spin.update('Still working...');

    // Advance timer to see the updated message
    vi.advanceTimersByTime(80);
    const lastWrite = output[output.length - 1];
    expect(lastWrite).toContain('Still working...');

    spin.stop();
  });

  it('succeed() stops timer and writes checkmark on TTY', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: true as const };

    const spin = startSpinner('Building...', { stream, colorOverride: false });
    spin.succeed('Built in 2s');

    const lastWrite = output[output.length - 1];
    expect(lastWrite).toContain('✔');
    expect(lastWrite).toContain('Built in 2s');
    expect(lastWrite).toContain('\r');

    // Timer should be stopped — no more writes after advancing
    const countBefore = output.length;
    vi.advanceTimersByTime(200);
    expect(output.length).toBe(countBefore);
  });

  it('succeed() writes checkmark with newline on non-TTY', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: false as const };

    const spin = startSpinner('Building...', { stream, colorOverride: false });
    spin.succeed('Built in 2s');

    const lastWrite = output[output.length - 1];
    expect(lastWrite).toContain('✔');
    expect(lastWrite).toContain('Built in 2s');
    expect(lastWrite).toMatch(/\n$/);
  });

  it('fail() stops timer and writes cross on TTY', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: true as const };

    const spin = startSpinner('Compiling...', { stream, colorOverride: false });
    spin.fail('Compilation failed');

    const lastWrite = output[output.length - 1];
    expect(lastWrite).toContain('✖');
    expect(lastWrite).toContain('Compilation failed');
    expect(lastWrite).toContain('\r');

    // Timer should be stopped
    const countBefore = output.length;
    vi.advanceTimersByTime(200);
    expect(output.length).toBe(countBefore);
  });

  it('fail() writes cross with newline on non-TTY', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: false as const };

    const spin = startSpinner('Compiling...', { stream, colorOverride: false });
    spin.fail('Compilation failed');

    const lastWrite = output[output.length - 1];
    expect(lastWrite).toContain('✖');
    expect(lastWrite).toContain('Compilation failed');
    expect(lastWrite).toMatch(/\n$/);
  });

  it('stop() clears line on TTY', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: true as const };

    const spin = startSpinner('Working...', { stream, colorOverride: false });
    spin.stop();

    const lastWrite = output[output.length - 1];
    // Stop on TTY writes carriage return + clear escape
    expect(lastWrite).toContain('\r');
    expect(lastWrite).toContain('\x1b[K');
  });

  it('stop() is a no-op on non-TTY (no extra output)', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: false as const };

    const spin = startSpinner('Working...', { stream });
    const countBefore = output.length;
    spin.stop();

    // No additional output after stop on non-TTY
    expect(output.length).toBe(countBefore);
  });

  it('uses color on TTY when colorOverride is true', () => {
    delete process.env['NO_COLOR'];
    process.env['FORCE_COLOR'] = '1';
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: true as const };

    const spin = startSpinner('Coloring...', { stream, colorOverride: true });
    expect(output[0]).toContain('\x1b[36m'); // cyan spinner frame

    spin.succeed('Done');
    const succeedWrite = output[output.length - 1];
    expect(succeedWrite).toContain('\x1b[32m'); // green check
  });

  it('renders TTY spinner without colorOverride (uses env-based detection)', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: true as const };

    // NO_COLOR is set in beforeEach, so frames should have no ANSI
    const spin = startSpinner('Testing...', { stream });

    expect(output.length).toBeGreaterThanOrEqual(1);
    expect(output[0]).toContain('Testing...');

    spin.succeed('All good');
    const succeedWrite = output[output.length - 1];
    expect(succeedWrite).toContain('✔');
    expect(succeedWrite).toContain('All good');
  });

  it('fail() on TTY without colorOverride uses env-based detection', () => {
    const output: string[] = [];
    const stream = { write: (s: string) => { output.push(s); }, isTTY: true as const };

    const spin = startSpinner('Working...', { stream });
    spin.fail('Broken');

    const lastWrite = output[output.length - 1];
    expect(lastWrite).toContain('✖');
    expect(lastWrite).toContain('Broken');
  });

  it('renders with default stream (no opts) without error', () => {
    // Exercise the default stream path (line 79: opts?.stream ?? process.stderr)
    const spin = startSpinner('Default stream');
    spin.stop();
  });
});
