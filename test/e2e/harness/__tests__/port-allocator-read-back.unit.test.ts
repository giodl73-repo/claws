import { describe, it, expect } from 'vitest';
import { reservePort } from '../port-allocator.ts';

describe('port-allocator read-back (pulse 35 D3)', () => {
  it('listen(0) returns an actual bound port > 1024', async () => {
    const r = await reservePort();
    expect(Number.isInteger(r.port)).toBe(true);
    expect(r.port).toBeGreaterThan(1024);
    expect(r.port).toBeLessThan(65536);
    r.release();
  });

  it('release() is idempotent', async () => {
    const r = await reservePort();
    expect(() => r.release()).not.toThrow();
    expect(() => r.release()).not.toThrow();
  });

  it('sequential reservations succeed (reuse or distinct both accepted)', async () => {
    const a = await reservePort();
    a.release();
    const b = await reservePort();
    b.release();
    expect(Number.isInteger(a.port)).toBe(true);
    expect(Number.isInteger(b.port)).toBe(true);
  });

  it('concurrent reservations all return valid distinct bound ports', async () => {
    // Parallel-safety at the allocator level: all 6 listeners bind
    // simultaneously so their ports MUST be distinct while open.
    const six = await Promise.all(
      Array.from({ length: 6 }, () => reservePort()),
    );
    const ports = six.map((r) => r.port);
    const unique = new Set(ports);
    expect(unique.size).toBe(ports.length);
    for (const p of ports) {
      expect(p).toBeGreaterThan(1024);
    }
    for (const r of six) r.release();
  });
});
