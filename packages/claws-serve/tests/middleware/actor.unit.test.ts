/**
 * L0 unit tests for the actor-capture middleware.
 *
 * Exercises:
 *   - Happy-path header stamping (string, array of strings).
 *   - Absent / empty header leaves `req.actor` undefined (anonymous
 *     fallback handled downstream by `readActor`).
 *   - Sanitization contract (CP-6 R2 M-6): length > ACTOR_MAX_LENGTH
 *     and control-character payloads (`\r`, `\n`, `\t`, NUL, DEL) each
 *     surface as 400 BAD_ACTOR and do NOT call `next()`.
 *   - `readActor` mirrors the sanitization rules for handlers that
 *     bypass the middleware.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

import {
  ACTOR_HEADER,
  ACTOR_MAX_LENGTH,
  ANONYMOUS_ACTOR,
  BAD_ACTOR_CODE,
  actorMiddleware,
  readActor,
} from '../../src/middleware/actor.js';

function mockReq(headers: Record<string, string | string[] | undefined>): Request {
  return { headers } as unknown as Request;
}

interface MockRes {
  readonly res: Response;
  readonly statusCalls: number[];
  readonly jsonCalls: unknown[];
}

function mockRes(): MockRes {
  const statusCalls: number[] = [];
  const jsonCalls: unknown[] = [];
  const res = {
    status(code: number) {
      statusCalls.push(code);
      return res;
    },
    json(body: unknown) {
      jsonCalls.push(body);
      return res;
    },
  } as unknown as Response;
  return { res, statusCalls, jsonCalls };
}

interface RunResult {
  readonly req: Request;
  readonly res: MockRes;
  readonly nextCalled: boolean;
}

function runMiddleware(
  headers: Record<string, string | string[] | undefined>,
): RunResult {
  const req = mockReq(headers);
  const res = mockRes();
  const next = vi.fn();
  actorMiddleware()(req, res.res, next);
  return {
    req,
    res,
    nextCalled: next.mock.calls.length > 0,
  };
}

describe('actorMiddleware — happy path', () => {
  it('stamps the actor from X-Actor-Id when the header is a string', () => {
    const { req, nextCalled } = runMiddleware({
      [ACTOR_HEADER]: 'alice@example.com',
    });
    expect(nextCalled).toBe(true);
    expect((req as Request & { actor?: string }).actor).toBe('alice@example.com');
  });

  it('leaves req.actor undefined when the header is absent', () => {
    const { req, nextCalled } = runMiddleware({});
    expect(nextCalled).toBe(true);
    expect((req as Request & { actor?: string }).actor).toBeUndefined();
  });

  it('leaves req.actor undefined when the header is an empty string', () => {
    const { req, nextCalled } = runMiddleware({ [ACTOR_HEADER]: '' });
    expect(nextCalled).toBe(true);
    expect((req as Request & { actor?: string }).actor).toBeUndefined();
  });

  it('picks the first value when the header arrives as an array', () => {
    const { req, nextCalled } = runMiddleware({
      [ACTOR_HEADER]: ['bob', 'carol'],
    });
    expect(nextCalled).toBe(true);
    expect((req as Request & { actor?: string }).actor).toBe('bob');
  });

  it('skips an empty array and leaves req.actor undefined', () => {
    const { req, nextCalled } = runMiddleware({ [ACTOR_HEADER]: [] });
    expect(nextCalled).toBe(true);
    expect((req as Request & { actor?: string }).actor).toBeUndefined();
  });

  it('skips an array whose first value is empty, picks the next string', () => {
    const { req, nextCalled } = runMiddleware({
      [ACTOR_HEADER]: ['', 'carol'],
    });
    expect(nextCalled).toBe(true);
    expect((req as Request & { actor?: string }).actor).toBe('carol');
  });

  it('passes through normal alphanumeric identifiers', () => {
    const { req, nextCalled } = runMiddleware({
      [ACTOR_HEADER]: 'actor-123_ABC.contoso',
    });
    expect(nextCalled).toBe(true);
    expect((req as Request & { actor?: string }).actor).toBe(
      'actor-123_ABC.contoso',
    );
  });
});

describe('actorMiddleware — length bound (CP-6 R2 M-6)', () => {
  it('accepts a header exactly at ACTOR_MAX_LENGTH', () => {
    const value = 'a'.repeat(ACTOR_MAX_LENGTH);
    const { req, res, nextCalled } = runMiddleware({ [ACTOR_HEADER]: value });
    expect(nextCalled).toBe(true);
    expect(res.statusCalls).toHaveLength(0);
    expect((req as Request & { actor?: string }).actor).toBe(value);
  });

  it('rejects a 300-char header with 400 BAD_ACTOR and does not call next', () => {
    const value = 'x'.repeat(300);
    expect(value.length).toBeGreaterThan(ACTOR_MAX_LENGTH);
    const { res, nextCalled } = runMiddleware({ [ACTOR_HEADER]: value });
    expect(nextCalled).toBe(false);
    expect(res.statusCalls).toEqual([400]);
    expect(res.jsonCalls).toHaveLength(1);
    const body = res.jsonCalls[0] as { error: { code: string; message: string } };
    expect(body.error.code).toBe(BAD_ACTOR_CODE);
    expect(body.error.message).toMatch(/exceeds/i);
  });

  it('rejects when the array-form header has an oversized first value', () => {
    const value = 'y'.repeat(ACTOR_MAX_LENGTH + 1);
    const { res, nextCalled } = runMiddleware({
      [ACTOR_HEADER]: [value, 'short'],
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCalls).toEqual([400]);
  });
});

describe('actorMiddleware — control-char sanitization (CP-6 R2 M-6)', () => {
  it('rejects a CRLF-injection attempt with 400 BAD_ACTOR', () => {
    const { res, nextCalled } = runMiddleware({
      [ACTOR_HEADER]: 'legit\r\n{"actor":"root","forged":true}',
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCalls).toEqual([400]);
    expect(res.jsonCalls).toHaveLength(1);
    const body = res.jsonCalls[0] as { error: { code: string; message: string } };
    expect(body.error.code).toBe(BAD_ACTOR_CODE);
    expect(body.error.message).toMatch(/control/i);
  });

  it('rejects lone CR', () => {
    const { nextCalled, res } = runMiddleware({ [ACTOR_HEADER]: 'a\rb' });
    expect(nextCalled).toBe(false);
    expect(res.statusCalls).toEqual([400]);
  });

  it('rejects lone LF', () => {
    const { nextCalled, res } = runMiddleware({ [ACTOR_HEADER]: 'a\nb' });
    expect(nextCalled).toBe(false);
    expect(res.statusCalls).toEqual([400]);
  });

  it('rejects TAB', () => {
    const { nextCalled, res } = runMiddleware({ [ACTOR_HEADER]: 'a\tb' });
    expect(nextCalled).toBe(false);
    expect(res.statusCalls).toEqual([400]);
  });

  it('rejects NUL', () => {
    const { nextCalled, res } = runMiddleware({ [ACTOR_HEADER]: 'a\x00b' });
    expect(nextCalled).toBe(false);
    expect(res.statusCalls).toEqual([400]);
  });

  it('rejects DEL (U+007F)', () => {
    const { nextCalled, res } = runMiddleware({ [ACTOR_HEADER]: 'a\x7Fb' });
    expect(nextCalled).toBe(false);
    expect(res.statusCalls).toEqual([400]);
  });

  it('rejects C0 edge (U+001F)', () => {
    const { nextCalled, res } = runMiddleware({ [ACTOR_HEADER]: 'a\x1Fb' });
    expect(nextCalled).toBe(false);
    expect(res.statusCalls).toEqual([400]);
  });
});

describe('readActor', () => {
  it('prefers the stamped actor when the middleware already ran', () => {
    const req = mockReq({ [ACTOR_HEADER]: 'header-value' });
    (req as Request & { actor?: string }).actor = 'stamped';
    expect(readActor(req)).toBe('stamped');
  });

  it('falls back to the header when no actor is stamped', () => {
    const req = mockReq({ [ACTOR_HEADER]: 'header-only' });
    expect(readActor(req)).toBe('header-only');
  });

  it('returns anonymous when neither stamp nor header is present', () => {
    const req = mockReq({});
    expect(readActor(req)).toBe(ANONYMOUS_ACTOR);
  });

  it('returns header value when the stamped actor is empty', () => {
    const req = mockReq({ [ACTOR_HEADER]: 'header-value' });
    (req as Request & { actor?: string }).actor = '';
    expect(readActor(req)).toBe('header-value');
  });

  it('handles array headers in the fallback path', () => {
    const req = mockReq({ [ACTOR_HEADER]: ['arr'] });
    expect(readActor(req)).toBe('arr');
  });

  it('returns anonymous when the array fallback is empty', () => {
    const req = mockReq({ [ACTOR_HEADER]: [] });
    expect(readActor(req)).toBe(ANONYMOUS_ACTOR);
  });

  it('returns anonymous when the header would fail sanitization (length)', () => {
    const req = mockReq({ [ACTOR_HEADER]: 'z'.repeat(ACTOR_MAX_LENGTH + 1) });
    expect(readActor(req)).toBe(ANONYMOUS_ACTOR);
  });

  it('returns anonymous when the header would fail sanitization (control chars)', () => {
    const req = mockReq({ [ACTOR_HEADER]: 'a\nb' });
    expect(readActor(req)).toBe(ANONYMOUS_ACTOR);
  });
});
