import { describe, it, expect, vi } from 'vitest';
import { bodyLimit } from '../../src/middleware/body-limit.js';

function makeMockReq(headers: Record<string, string | undefined> = {}, method = 'GET'): { headers: Record<string, string | undefined>; method: string } {
  return { headers, method };
}

function makeMockRes(): { statusCode: number; statusFn: ReturnType<typeof vi.fn>; jsonFn: ReturnType<typeof vi.fn>; status: (code: number) => { json: (body: unknown) => void } } {
  const jsonFn = vi.fn();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  return { statusCode: 0, statusFn, jsonFn, status: statusFn as unknown as (code: number) => { json: (body: unknown) => void } };
}

describe('bodyLimit middleware (direct)', () => {
  it('calls next when Content-Length header is absent on GET', () => {
    const middleware = bodyLimit(1024);
    const req = makeMockReq({}, 'GET');
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusFn).not.toHaveBeenCalled();
  });

  it('calls next when Content-Length is within limit', () => {
    const middleware = bodyLimit(1024);
    const req = makeMockReq({ 'content-length': '512' }, 'POST');
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusFn).not.toHaveBeenCalled();
  });

  it('rejects when Content-Length exceeds limit', () => {
    const middleware = bodyLimit(1024);
    const req = makeMockReq({ 'content-length': '2048' }, 'POST');
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusFn).toHaveBeenCalledWith(413);
    expect(res.jsonFn).toHaveBeenCalledWith({ error: 'Payload Too Large' });
  });

  it('calls next when Content-Length is not a valid number on POST', () => {
    const middleware = bodyLimit(1024);
    const req = makeMockReq({ 'content-length': 'abc' }, 'POST');
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it('uses default 1MB limit', () => {
    const middleware = bodyLimit();
    const req = makeMockReq({ 'content-length': String(1_048_577) }, 'POST');
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusFn).toHaveBeenCalledWith(413);
  });

  it('allows Content-Length exactly at the limit', () => {
    const middleware = bodyLimit(1024);
    const req = makeMockReq({ 'content-length': '1024' }, 'POST');
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusFn).not.toHaveBeenCalled();
  });

  it('rejects POST without Content-Length with 411', () => {
    const middleware = bodyLimit(1024);
    const req = makeMockReq({}, 'POST');
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusFn).toHaveBeenCalledWith(411);
    expect(res.jsonFn).toHaveBeenCalledWith({ error: 'Length Required' });
  });

  it('rejects PUT without Content-Length with 411', () => {
    const middleware = bodyLimit(1024);
    const req = makeMockReq({}, 'PUT');
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusFn).toHaveBeenCalledWith(411);
  });

  it('rejects PATCH without Content-Length with 411', () => {
    const middleware = bodyLimit(1024);
    const req = makeMockReq({}, 'PATCH');
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusFn).toHaveBeenCalledWith(411);
  });

  it('allows DELETE without Content-Length', () => {
    const middleware = bodyLimit(1024);
    const req = makeMockReq({}, 'DELETE');
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusFn).not.toHaveBeenCalled();
  });
});
