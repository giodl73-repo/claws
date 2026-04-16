import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { cors } from '../../src/middleware/cors.js';

function mockRes(): Response {
  const headers = new Map<string, string>();
  return {
    set: vi.fn((key: string, value: string) => { headers.set(key, value); }),
    _headers: headers,
  } as unknown as Response;
}

describe('cors middleware', () => {
  it('sets X-Content-Type-Options to nosniff', () => {
    const middleware = cors();
    const req = {} as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.set).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  });

  it('sets X-Frame-Options to DENY', () => {
    const middleware = cors();
    const req = {} as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.set).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
  });

  it('calls next()', () => {
    const middleware = cors();
    const req = {} as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('does not set Access-Control-Allow-Origin', () => {
    const middleware = cors();
    const req = {} as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    // Verify only the expected headers were set (2 calls)
    expect(res.set).toHaveBeenCalledTimes(2);
    const calls = (res.set as ReturnType<typeof vi.fn>).mock.calls;
    const headerNames = calls.map((c: unknown[]) => c[0]);
    expect(headerNames).not.toContain('Access-Control-Allow-Origin');
  });
});
