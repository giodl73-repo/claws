import { describe, it, expect } from 'vitest';
import { ClockMock } from '#harness/clock-mock.ts';

describe('clock-mock', () => {
  it('frozen clock returns a deterministic time; advance moves it forward', () => {
    const c = new ClockMock({ freezeAtMs: 1_000 });
    expect(c.nowMs()).toBe(1_000);
    c.advance(250);
    expect(c.nowMs()).toBe(1_250);
    c.advance(750);
    expect(c.nowMs()).toBe(2_000);
  });

  it('real-clock fallthrough advances with wall time and offset', () => {
    const c = new ClockMock();
    const before = c.nowMs();
    const wall = Date.now();
    expect(Math.abs(before - wall)).toBeLessThan(50);
    c.advance(10_000);
    expect(c.nowMs()).toBeGreaterThanOrEqual(before + 10_000);
  });

  it('freeze/unfreeze lifecycle + input validation', () => {
    const c = new ClockMock();
    c.freeze(500);
    expect(c.nowMs()).toBe(500);
    c.advance(100);
    expect(c.nowMs()).toBe(600);
    c.unfreeze();
    const wall = Date.now();
    expect(Math.abs(c.nowMs() - wall)).toBeLessThan(50);
    expect(() => c.advance(-1)).toThrow();
    expect(() => c.advance(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => c.freeze(-10)).toThrow();
    expect(() => new ClockMock({ freezeAtMs: -5 })).toThrow();
  });
});
