import { describe, it, expect, vi } from 'vitest';
import { contentType } from '../../src/middleware/content-type.js';

function makeMockRes(): { statusFn: ReturnType<typeof vi.fn>; jsonFn: ReturnType<typeof vi.fn>; status: (code: number) => { json: (body: unknown) => void } } {
  const jsonFn = vi.fn();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  return { statusFn, jsonFn, status: statusFn as unknown as (code: number) => { json: (body: unknown) => void } };
}

describe('contentType middleware', () => {
  it('accepts application/json', () => {
    const middleware = contentType();
    const req = { headers: { 'content-type': 'application/json' } } as any;
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusFn).not.toHaveBeenCalled();
  });

  it('accepts application/json with charset parameter', () => {
    const middleware = contentType();
    const req = { headers: { 'content-type': 'application/json; charset=utf-8' } } as any;
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusFn).not.toHaveBeenCalled();
  });

  it('accepts APPLICATION/JSON (case-insensitive)', () => {
    const middleware = contentType();
    const req = { headers: { 'content-type': 'APPLICATION/JSON' } } as any;
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusFn).not.toHaveBeenCalled();
  });

  it('rejects x-application/json-patch (substring match prevention)', () => {
    const middleware = contentType();
    const req = { headers: { 'content-type': 'x-application/json-patch' } } as any;
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusFn).toHaveBeenCalledWith(415);
    expect(res.jsonFn).toHaveBeenCalledWith({ error: 'Unsupported Media Type' });
  });

  it('rejects application/json-patch+json', () => {
    const middleware = contentType();
    const req = { headers: { 'content-type': 'application/json-patch+json' } } as any;
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusFn).toHaveBeenCalledWith(415);
  });

  it('rejects text/plain', () => {
    const middleware = contentType();
    const req = { headers: { 'content-type': 'text/plain' } } as any;
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusFn).toHaveBeenCalledWith(415);
  });

  it('rejects missing content-type header', () => {
    const middleware = contentType();
    const req = { headers: {} } as any;
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusFn).toHaveBeenCalledWith(415);
  });

  it('rejects undefined content-type header', () => {
    const middleware = contentType();
    const req = { headers: { 'content-type': undefined } } as any;
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusFn).toHaveBeenCalledWith(415);
  });

  it('accepts application/json with extra whitespace around media type', () => {
    const middleware = contentType();
    const req = { headers: { 'content-type': ' application/json ; charset=utf-8' } } as any;
    const res = makeMockRes();
    const next = vi.fn();

    middleware(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusFn).not.toHaveBeenCalled();
  });
});
