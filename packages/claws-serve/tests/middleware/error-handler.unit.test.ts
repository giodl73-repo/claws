/**
 * L0 unit tests for the error-handler middleware. Covers all mapping
 * branches: status resolution, code resolution, message redaction in
 * production, stack inclusion in development, details passthrough,
 * duck-typed name matches, and the notFoundHandler.
 */
import { describe, it, expect } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import {
  errorHandler,
  notFoundHandler,
  ValidationError,
  WorkspaceNotFoundError,
} from '../../src/middleware/error-handler.js';
import { WorkspaceError, OcPathError } from '@bic/claws-sdk/workspace';

async function inject(app: express.Express, method: string, path: string): Promise<{ status: number; body: string }> {
  const { default: http } = await import('node:http');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => { server.listen(0, '127.0.0.1', () => { resolve(); }); });
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no address');
  try {
    const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`, { method });
    return { status: res.status, body: await res.text() };
  } finally {
    await new Promise<void>((resolve) => { server.close(() => { resolve(); }); });
  }
}

function appThat(throws: (next: NextFunction) => void): express.Express {
  const app = express();
  app.get('/t', (_req, _res, next) => { throws(next); });
  app.use(errorHandler());
  return app;
}

describe('ValidationError + WorkspaceNotFoundError shapes', () => {
  it('ValidationError defaults code to VALIDATION_ERROR and details to undefined', () => {
    const e = new ValidationError('bad');
    expect(e.name).toBe('ValidationError');
    expect(e.message).toBe('bad');
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.details).toBeUndefined();
  });

  it('WorkspaceNotFoundError defaults code to WORKSPACE_NOT_FOUND', () => {
    const e = new WorkspaceNotFoundError('missing');
    expect(e.name).toBe('WorkspaceNotFoundError');
    expect(e.message).toBe('missing');
    expect(e.code).toBe('WORKSPACE_NOT_FOUND');
    expect(e.details).toBeUndefined();
  });

  it('WorkspaceNotFoundError carries custom code + details', () => {
    const e = new WorkspaceNotFoundError('missing', 'NO_WS', { path: '/x' });
    expect(e.code).toBe('NO_WS');
    expect(e.details).toEqual({ path: '/x' });
  });
});

describe('errorHandler mapping', () => {
  it('maps WorkspaceNotFoundError to 404 with details', async () => {
    const app = appThat((next) => {
      next(new WorkspaceNotFoundError('gone', 'WORKSPACE_NOT_FOUND', { path: '/ws' }));
    });
    const { status, body } = await inject(app, 'GET', '/t');
    const json = JSON.parse(body) as { error: { code: string; details?: { path: string } } };
    expect(status).toBe(404);
    expect(json.error.code).toBe('WORKSPACE_NOT_FOUND');
    expect(json.error.details).toEqual({ path: '/ws' });
  });

  it('maps duck-typed { name: "ValidationError" } errors to 400', async () => {
    const app = appThat((next) => {
      const err = new Error('duck bad');
      err.name = 'ValidationError';
      next(err);
    });
    const { status, body } = await inject(app, 'GET', '/t');
    const json = JSON.parse(body) as { error: { code: string; message: string } };
    expect(status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toBe('duck bad');
  });

  it('maps duck-typed { name: "WorkspaceNotFoundError" } errors to 404', async () => {
    const app = appThat((next) => {
      const err = new Error('duck missing');
      err.name = 'WorkspaceNotFoundError';
      next(err);
    });
    const { status, body } = await inject(app, 'GET', '/t');
    const json = JSON.parse(body) as { error: { code: string } };
    expect(status).toBe(404);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('preserves an arbitrary string .code property on 400 duck-type errors', async () => {
    const app = appThat((next) => {
      const err = new Error('custom') as Error & { code?: string };
      err.name = 'ValidationError';
      err.code = 'CUSTOM_CODE';
      next(err);
    });
    const { status, body } = await inject(app, 'GET', '/t');
    const json = JSON.parse(body) as { error: { code: string } };
    expect(status).toBe(400);
    expect(json.error.code).toBe('CUSTOM_CODE');
  });

  it('includes stack trace for 500s when NODE_ENV !== production', async () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'development';
    try {
      const app = appThat((next) => { next(new Error('dev boom')); });
      const { status, body } = await inject(app, 'GET', '/t');
      const json = JSON.parse(body) as { error: { code: string; message: string; stack?: string } };
      expect(status).toBe(500);
      expect(json.error.message).toBe('Internal server error');
      expect(json.error.stack).toBeDefined();
      expect(json.error.stack).toContain('Error: dev boom');
    } finally {
      if (originalEnv === undefined) {
        delete process.env['NODE_ENV'];
      } else {
        process.env['NODE_ENV'] = originalEnv;
      }
    }
  });

  it('maps non-Error thrown values to a 500 with generic message', async () => {
    const app = appThat((next) => { next('a bare string'); });
    const { status, body } = await inject(app, 'GET', '/t');
    const json = JSON.parse(body) as { error: { code: string; message: string } };
    expect(status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_ERROR');
    expect(json.error.message).toBe('Internal server error');
  });

  it('delegates to next when response headers are already sent', async () => {
    let delegatedErr: unknown = null;
    const app = express();
    app.get('/t', (_req: Request, res: Response, next: NextFunction) => {
      res.status(200).write('partial');
      next(new Error('late boom'));
    });
    app.use(errorHandler());
    // Express default final handler runs after ours, but we only need to
    // exercise the headersSent branch. Intercept with a trailing handler:
    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      delegatedErr = err;
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
      }
    });
    await inject(app, 'GET', '/t');
    expect(delegatedErr).toBeInstanceOf(Error);
    expect((delegatedErr as Error).message).toBe('late boom');
  });
});

describe('errorHandler — SDK WorkspaceError mapping', () => {
  it('maps WorkspaceError with default code (WORKSPACE_SOUL_MISSING) to 404 and attaches workspaceRoot in details', async () => {
    const app = appThat((next) => {
      next(new WorkspaceError('SOUL.md not found', '/ws/root'));
    });
    const { status, body } = await inject(app, 'GET', '/t');
    const json = JSON.parse(body) as {
      error: { code: string; message: string; details?: { workspaceRoot?: string } };
    };
    expect(status).toBe(404);
    expect(json.error.code).toBe('WORKSPACE_SOUL_MISSING');
    expect(json.error.details?.workspaceRoot).toBe('/ws/root');
  });

  it('maps WorkspaceError with `_STALE` suffix to 409', async () => {
    const app = appThat((next) => {
      next(new WorkspaceError('workspace is stale', '/ws/root', 'WORKSPACE_CACHE_STALE'));
    });
    const { status, body } = await inject(app, 'GET', '/t');
    const json = JSON.parse(body) as { error: { code: string } };
    expect(status).toBe(409);
    expect(json.error.code).toBe('WORKSPACE_CACHE_STALE');
  });

  it('maps WorkspaceError with other codes to 400 (malformed workspace input)', async () => {
    const app = appThat((next) => {
      next(new WorkspaceError('bad workspace', '/ws/root', 'WORKSPACE_MALFORMED'));
    });
    const { status, body } = await inject(app, 'GET', '/t');
    const json = JSON.parse(body) as { error: { code: string } };
    expect(status).toBe(400);
    expect(json.error.code).toBe('WORKSPACE_MALFORMED');
  });

  it('maps duck-typed { name: "WorkspaceError", code: ..._MISSING } to 404', async () => {
    const app = appThat((next) => {
      const err = new Error('duck missing') as Error & {
        code?: string;
        workspaceRoot?: string;
      };
      err.name = 'WorkspaceError';
      err.code = 'IDENTITY_MISSING';
      err.workspaceRoot = '/duck/ws';
      next(err);
    });
    const { status, body } = await inject(app, 'GET', '/t');
    const json = JSON.parse(body) as {
      error: { code: string; details?: { workspaceRoot?: string } };
    };
    expect(status).toBe(404);
    expect(json.error.code).toBe('IDENTITY_MISSING');
    expect(json.error.details?.workspaceRoot).toBe('/duck/ws');
  });

  it('falls back to 400 when duck-typed WorkspaceError lacks a string `code`', async () => {
    const app = appThat((next) => {
      const err = new Error('no code');
      err.name = 'WorkspaceError';
      next(err);
    });
    const { status, body } = await inject(app, 'GET', '/t');
    const json = JSON.parse(body) as { error: { code: string } };
    expect(status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('errorHandler — SDK OcPathError mapping', () => {
  it('maps OcPathError to 400 with the malformed input exposed in details', async () => {
    const app = appThat((next) => {
      next(new OcPathError('Missing oc:// scheme: foo', 'foo', 'OC_PATH_MISSING_SCHEME'));
    });
    const { status, body } = await inject(app, 'GET', '/t');
    const json = JSON.parse(body) as {
      error: { code: string; message: string; details?: { input?: string } };
    };
    expect(status).toBe(400);
    expect(json.error.code).toBe('OC_PATH_MISSING_SCHEME');
    expect(json.error.message).toBe('Missing oc:// scheme: foo');
    expect(json.error.details?.input).toBe('foo');
  });

  it('maps duck-typed { name: "OcPathError", input: ..., code: ... } to 400', async () => {
    const app = appThat((next) => {
      const err = new Error('duck path') as Error & { code?: string; input?: string };
      err.name = 'OcPathError';
      err.code = 'OC_PATH_NESTING';
      err.input = 'oc://TOOLS.md';
      next(err);
    });
    const { status, body } = await inject(app, 'GET', '/t');
    const json = JSON.parse(body) as {
      error: { code: string; details?: { input?: string } };
    };
    expect(status).toBe(400);
    expect(json.error.code).toBe('OC_PATH_NESTING');
    expect(json.error.details?.input).toBe('oc://TOOLS.md');
  });
});

describe('notFoundHandler', () => {
  it('includes method and path in the message', async () => {
    const app = express();
    app.use(notFoundHandler());
    const { status, body } = await inject(app, 'GET', '/absent/path');
    const json = JSON.parse(body) as { error: { code: string; message: string } };
    expect(status).toBe(404);
    expect(json.error.code).toBe('ROUTE_NOT_FOUND');
    expect(json.error.message).toBe('No route matches GET /absent/path');
  });
});
