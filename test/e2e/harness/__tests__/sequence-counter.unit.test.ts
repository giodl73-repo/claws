import { describe, it, expect } from 'vitest';
import { SequenceCounter } from '#harness/sequence-counter.ts';

describe('sequence-counter', () => {
  it('issues monotonically increasing values', () => {
    const c = new SequenceCounter();
    expect(c.next()).toBe(1);
    expect(c.next()).toBe(2);
    expect(c.next()).toBe(3);
    expect(c.current()).toBe(3);
  });

  it('accepts only strictly increasing values', () => {
    const c = new SequenceCounter(5);
    expect(c.accept(5)).toBe(false);
    expect(c.accept(4)).toBe(false);
    expect(c.accept(6)).toBe(true);
    expect(c.current()).toBe(6);
    expect(c.accept(6)).toBe(false);
    expect(c.accept(100)).toBe(true);
    expect(c.current()).toBe(100);
  });

  it('rejects non-integer and negative start values', () => {
    expect(() => new SequenceCounter(-1)).toThrow();
    expect(() => new SequenceCounter(1.5)).toThrow();
    const c = new SequenceCounter();
    expect(c.accept(2.5)).toBe(false);
    expect(c.current()).toBe(0);
  });
});
