/**
 * L0: post-command hook — timing and CommandTiming record.
 */

import { describe, it, expect } from 'vitest';
import { createTimer, postCommand } from '../../src/hooks/post-command.js';

describe('createTimer', () => {
  it('returns elapsed time in milliseconds', async () => {
    const timer = createTimer();
    // Small busy-wait to ensure non-zero elapsed
    const start = performance.now();
    while (performance.now() - start < 5) { /* spin */ }
    const elapsed = timer.elapsed();
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(typeof elapsed).toBe('number');
  });

  it('returns a rounded integer', () => {
    const timer = createTimer();
    const elapsed = timer.elapsed();
    expect(Number.isInteger(elapsed)).toBe(true);
  });
});

describe('postCommand', () => {
  it('returns CommandTiming with command name, duration, and success=true', () => {
    const result = postCommand('compile', 150, true);
    expect(result.command).toBe('compile');
    expect(result.durationMs).toBe(150);
    expect(result.success).toBe(true);
  });

  it('returns CommandTiming with success=false for failed commands', () => {
    const result = postCommand('build', 3200, false);
    expect(result.command).toBe('build');
    expect(result.durationMs).toBe(3200);
    expect(result.success).toBe(false);
  });

  it('preserves exact command name string', () => {
    const result = postCommand('check --json', 42, true);
    expect(result.command).toBe('check --json');
  });
});
