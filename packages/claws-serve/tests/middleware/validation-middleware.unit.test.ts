/**
 * L0 unit tests for the PATCH validation middleware.
 *
 * The envelope check and shape check run as two separate middlewares
 * (before + after express.json). These tests exercise every rejection
 * branch in both halves.
 */

import { afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import {
  patchEnvelopeMiddleware,
  patchShapeMiddleware,
  patchValidationMiddleware,
} from '../../src/middleware/validation-middleware.js';

interface TestApp {
  server: Server;
  close: () => Promise<void>;
}

async function buildEnvelopeApp(maxBytes?: number): Promise<TestApp> {
  const app = express();
  app.patch(
    '*',
    maxBytes === undefined
      ? patchEnvelopeMiddleware()
      : patchEnvelopeMiddleware({ maxBytes }),
  );
  app.patch('*', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  return {
    server,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

async function buildFullApp(): Promise<TestApp> {
  const app = express();
  app.patch('*', patchEnvelopeMiddleware());
  app.use(express.json({ limit: '1mb' }));
  app.patch('*', patchShapeMiddleware());
  app.patch('*', (req, res) => {
    res.status(200).json({ editOperation: (req as unknown as { editOperation: unknown }).editOperation });
  });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  return {
    server,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

async function patch(
  server: Server,
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}/`, {
    method: 'PATCH',
    headers,
    body,
  });
  return { status: res.status, body: await res.text() };
}

let harness: TestApp | undefined;

afterEach(async () => {
  if (harness !== undefined) {
    await harness.close();
    harness = undefined;
  }
});

describe('patchEnvelopeMiddleware', () => {
  it('rejects missing Content-Type with 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    harness = await buildEnvelopeApp();
    const res = await patch(harness.server, { 'Content-Length': '2' }, '{}');
    expect(res.status).toBe(415);
    expect(JSON.parse(res.body).error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects wrong Content-Type with 415', async () => {
    harness = await buildEnvelopeApp();
    const res = await patch(
      harness.server,
      { 'Content-Type': 'text/plain', 'Content-Length': '2' },
      '{}',
    );
    expect(res.status).toBe(415);
  });

  it('accepts application/json with charset parameter', async () => {
    harness = await buildEnvelopeApp();
    const res = await patch(
      harness.server,
      { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': '2' },
      '{}',
    );
    expect(res.status).toBe(200);
  });

  it('rejects missing Content-Length with 411 LENGTH_REQUIRED', () => {
    // fetch and node's HTTP client always attach Content-Length for bodied
    // requests, so exercise the branch directly with fake req/res objects.
    const middleware = patchEnvelopeMiddleware();
    const req = {
      headers: { 'content-type': 'application/json' },
    } as unknown as Parameters<typeof middleware>[0];
    let status = 0;
    let body: unknown;
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json(payload: unknown) {
        body = payload;
      },
    } as unknown as Parameters<typeof middleware>[1];
    let nextCalled = false;
    middleware(req, res, () => {
      nextCalled = true;
    });
    expect(status).toBe(411);
    expect(nextCalled).toBe(false);
    expect((body as { error: { code: string } }).error.code).toBe('LENGTH_REQUIRED');
  });

  it('rejects NaN Content-Length with 400 INVALID_CONTENT_LENGTH', () => {
    // Node's HTTP parser rejects malformed Content-Length at the wire
    // layer, so exercise the middleware's branch directly via fake req/res.
    const middleware = patchEnvelopeMiddleware();
    const req = {
      headers: {
        'content-type': 'application/json',
        'content-length': 'not-a-number',
      },
    } as unknown as Parameters<typeof middleware>[0];
    let status = 0;
    let body: unknown;
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json(payload: unknown) {
        body = payload;
      },
    } as unknown as Parameters<typeof middleware>[1];
    let nextCalled = false;
    middleware(req, res, () => {
      nextCalled = true;
    });
    expect(status).toBe(400);
    expect(nextCalled).toBe(false);
    expect((body as { error: { code: string } }).error.code).toBe('INVALID_CONTENT_LENGTH');
  });

  it('rejects Content-Length over the configurable cap with 413', async () => {
    harness = await buildEnvelopeApp(100); // 100-byte cap
    const payload = 'x'.repeat(200);
    const res = await patch(
      harness.server,
      { 'Content-Type': 'application/json', 'Content-Length': String(payload.length) },
      payload,
    );
    expect(res.status).toBe(413);
    expect(JSON.parse(res.body).error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('patchShapeMiddleware', () => {
  it('rejects non-object bodies with 400 INVALID_BODY', () => {
    const middleware = patchShapeMiddleware();
    const req = { body: 'not an object' } as unknown as Parameters<typeof middleware>[0];
    let status = 0;
    let body: unknown;
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json(payload: unknown) {
        body = payload;
      },
    } as unknown as Parameters<typeof middleware>[1];
    let nextCalled = false;
    middleware(req, res, () => {
      nextCalled = true;
    });
    expect(status).toBe(400);
    expect(nextCalled).toBe(false);
    expect((body as { error: { code: string } }).error.code).toBe('INVALID_BODY');
  });

  it('rejects null body with 400 INVALID_BODY', () => {
    const middleware = patchShapeMiddleware();
    const req = { body: null } as unknown as Parameters<typeof middleware>[0];
    let status = 0;
    let body: unknown;
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json(payload: unknown) {
        body = payload;
      },
    } as unknown as Parameters<typeof middleware>[1];
    middleware(req, res, () => {});
    expect(status).toBe(400);
    expect((body as { error: { code: string } }).error.code).toBe('INVALID_BODY');
  });

  it('rejects unknown kind with INVALID_EDIT_KIND', async () => {
    harness = await buildFullApp();
    const payload = JSON.stringify({ kind: 'lol', file: 'TOOLS.md', section: 'x' });
    const res = await patch(
      harness.server,
      {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
      },
      payload,
    );
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_EDIT_KIND');
  });

  it('rejects non-editable file with INVALID_EDIT_FILE', async () => {
    harness = await buildFullApp();
    const payload = JSON.stringify({
      kind: 'toggle',
      file: 'RANDOM.md',
      section: 'x',
      field: 'y',
      value: true,
    });
    const res = await patch(
      harness.server,
      {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
      },
      payload,
    );
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_EDIT_FILE');
  });

  it('rejects non-string section with INVALID_EDIT_SECTION', async () => {
    harness = await buildFullApp();
    const payload = JSON.stringify({
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 5,
      field: 'y',
      value: true,
    });
    const res = await patch(
      harness.server,
      {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
      },
      payload,
    );
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_EDIT_SECTION');
  });

  it('rejects non-boolean toggle value with INVALID_EDIT_VALUE', async () => {
    harness = await buildFullApp();
    const payload = JSON.stringify({
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'x',
      field: 'y',
      value: 'nope',
    });
    const res = await patch(
      harness.server,
      {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
      },
      payload,
    );
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_EDIT_VALUE');
  });

  it('rejects non-string set value with INVALID_EDIT_VALUE', async () => {
    harness = await buildFullApp();
    const payload = JSON.stringify({
      kind: 'set',
      file: 'TOOLS.md',
      section: 'x',
      field: 'y',
      value: 42,
    });
    const res = await patch(
      harness.server,
      {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
      },
      payload,
    );
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_EDIT_VALUE');
  });

  it('rejects set/toggle without field with INVALID_EDIT_FIELD', async () => {
    harness = await buildFullApp();
    const payload = JSON.stringify({
      kind: 'set',
      file: 'TOOLS.md',
      section: 'x',
      value: 'z',
    });
    const res = await patch(
      harness.server,
      {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
      },
      payload,
    );
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_EDIT_FIELD');
  });

  it('rejects append/remove without item with INVALID_EDIT_ITEM', async () => {
    harness = await buildFullApp();
    const payload = JSON.stringify({
      kind: 'append',
      file: 'TOOLS.md',
      section: 'x',
    });
    const res = await patch(
      harness.server,
      {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
      },
      payload,
    );
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_EDIT_ITEM');
  });

  it('accepts a well-formed append EditOperation', async () => {
    harness = await buildFullApp();
    const op = {
      kind: 'append',
      file: 'TOOLS.md',
      section: 'x',
      item: 'y',
    };
    const payload = JSON.stringify(op);
    const res = await patch(
      harness.server,
      {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
      },
      payload,
    );
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body).editOperation).toEqual(op);
  });
});

describe('patchValidationMiddleware combinator', () => {
  it('returns both envelope and shape middlewares', () => {
    const stack = patchValidationMiddleware();
    expect(stack).toHaveLength(2);
    expect(typeof stack[0]).toBe('function');
    expect(typeof stack[1]).toBe('function');
  });

  it('accepts a custom maxBytes option', () => {
    const stack = patchValidationMiddleware({ maxBytes: 512 });
    expect(stack).toHaveLength(2);
  });
});
