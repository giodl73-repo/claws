import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { GovernanceIR } from '@bic/claws-sdk';
import { snapshotRouter, validateSnapshotName, type SnapshotStore } from '../../src/routes/snapshot.js';
import { contentType } from '../../src/middleware/content-type.js';
import { CompilationHost } from '../../src/compilation-host.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

async function request(
  server: Server,
  method: string,
  path: string,
  options: { body?: string; headers?: Record<string, string> } = {},
): Promise<{ status: number; body: string; headers: Headers }> {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Server not listening on TCP');
  }
  const url = `http://127.0.0.1:${String(address.port)}${path}`;
  const fetchOptions: RequestInit = { method, headers: options.headers };
  if (options.body !== undefined) {
    fetchOptions.body = options.body;
  }
  const res = await fetch(url, fetchOptions);
  const body = await res.text();
  return { status: res.status, body, headers: res.headers };
}

function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => { resolve(s); });
  });
}

describe('POST /snapshot', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('saves a named snapshot with timestamp', async () => {
    const ir = minimalGovernanceIR();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    await host.compile();

    const store: SnapshotStore = new Map();
    const app = express();
    app.post('*', contentType());
    app.use(express.json());
    app.use(snapshotRouter(host, store));
    server = await listen(app);

    const { status, body } = await request(server, 'POST', '/snapshot', {
      body: JSON.stringify({ name: 'baseline-v1' }),
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(201);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['name']).toBe('baseline-v1');
    expect(typeof json['timestamp']).toBe('string');

    // Verify stored in the store
    expect(store.has('baseline-v1')).toBe(true);
    const snapshot = store.get('baseline-v1')!;
    expect(snapshot.ir).toEqual(ir);
  });

  it('returns 404 when no IR is cached', async () => {
    const compileFn = async () => minimalGovernanceIR();
    const host = new CompilationHost(compileFn, '/test');
    // Do NOT compile — cache is empty

    const store: SnapshotStore = new Map();
    const app = express();
    app.post('*', contentType());
    app.use(express.json());
    app.use(snapshotRouter(host, store));
    server = await listen(app);

    const { status, body } = await request(server, 'POST', '/snapshot', {
      body: JSON.stringify({ name: 'no-ir' }),
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(404);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['error']).toContain('No compiled IR');
    expect(store.size).toBe(0);
  });

  it('rejects path traversal in snapshot name with 400', async () => {
    const ir = minimalGovernanceIR();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    await host.compile();

    const store: SnapshotStore = new Map();
    const app = express();
    app.post('*', contentType());
    app.use(express.json());
    app.use(snapshotRouter(host, store));
    server = await listen(app);

    // Test ../
    const res1 = await request(server, 'POST', '/snapshot', {
      body: JSON.stringify({ name: '../etc-passwd' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res1.status).toBe(400);
    const json1 = JSON.parse(res1.body) as Record<string, unknown>;
    expect(json1['error']).toContain('path');

    // Test null bytes
    const res2 = await request(server, 'POST', '/snapshot', {
      body: JSON.stringify({ name: 'snap\0shot' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res2.status).toBe(400);
    const json2 = JSON.parse(res2.body) as Record<string, unknown>;
    expect(json2['error']).toContain('null');

    // Test forward slash
    const res3 = await request(server, 'POST', '/snapshot', {
      body: JSON.stringify({ name: 'snap/shot' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res3.status).toBe(400);

    // Test backslash
    const res4 = await request(server, 'POST', '/snapshot', {
      body: JSON.stringify({ name: 'snap\\shot' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res4.status).toBe(400);

    // Nothing should have been stored
    expect(store.size).toBe(0);
  });
});

describe('GET /diff', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('returns delta between two snapshots', async () => {
    const ir1 = minimalGovernanceIR();
    const ir2: GovernanceIR = {
      ...minimalGovernanceIR(),
      analysis: {
        ...minimalGovernanceIR().analysis,
        violations: [
          {
            ruleId: 'R001',
            level: 1,
            message: 'New violation',
            target: 'tool:write_file',
            diagnosticCode: 'GOV-001',
            fixSuggestions: [],
            toolFuzzyMatches: [],
          },
        ],
      },
      conflicts: {
        ...minimalGovernanceIR().conflicts,
        totalConflicts: 2,
      },
    };

    let currentIR = ir1;
    const compileFn = async () => currentIR;
    const host = new CompilationHost(compileFn, '/test');

    const store: SnapshotStore = new Map();
    const app = express();
    app.post('*', contentType());
    app.use(express.json());
    app.use(snapshotRouter(host, store));
    server = await listen(app);

    // Save first snapshot
    await host.compile();
    await request(server, 'POST', '/snapshot', {
      body: JSON.stringify({ name: 'snap-a' }),
      headers: { 'content-type': 'application/json' },
    });

    // Change IR and save second snapshot
    currentIR = ir2;
    host.clear();
    await host.compile();
    await request(server, 'POST', '/snapshot', {
      body: JSON.stringify({ name: 'snap-b' }),
      headers: { 'content-type': 'application/json' },
    });

    // Get diff
    const { status, body } = await request(server, 'GET', '/diff?from=snap-a&to=snap-b');

    expect(status).toBe(200);
    const diff = JSON.parse(body) as Record<string, unknown>;
    expect(diff['from']).toBe('snap-a');
    expect(diff['to']).toBe('snap-b');

    const violations = diff['violations'] as Record<string, unknown>;
    expect(Array.isArray(violations['added'])).toBe(true);
    expect((violations['added'] as unknown[]).length).toBe(1);
    expect((violations['removed'] as unknown[]).length).toBe(0);

    const tensions = diff['tensions'] as Record<string, unknown>;
    expect(tensions['before']).toBe(0);
    expect(tensions['after']).toBe(2);
    expect(tensions['delta']).toBe(2);
  });

  it('returns 404 when a named snapshot does not exist', async () => {
    const ir = minimalGovernanceIR();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    await host.compile();

    const store: SnapshotStore = new Map();
    const app = express();
    app.use(snapshotRouter(host, store));
    server = await listen(app);

    const { status, body } = await request(server, 'GET', '/diff?from=nonexistent&to=also-missing');
    expect(status).toBe(404);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect((json['error'] as string)).toContain('nonexistent');
  });

  it('returns 404 when only the second snapshot does not exist', async () => {
    const ir = minimalGovernanceIR();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    await host.compile();

    const store: SnapshotStore = new Map();
    const app = express();
    app.post('*', contentType());
    app.use(express.json());
    app.use(snapshotRouter(host, store));
    server = await listen(app);

    // Save one snapshot
    await request(server, 'POST', '/snapshot', {
      body: JSON.stringify({ name: 'exists' }),
      headers: { 'content-type': 'application/json' },
    });

    const { status, body } = await request(server, 'GET', '/diff?from=exists&to=missing');
    expect(status).toBe(404);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect((json['error'] as string)).toContain('missing');
  });

  it('returns 400 when query params are missing', async () => {
    const compileFn = async () => minimalGovernanceIR();
    const host = new CompilationHost(compileFn, '/test');

    const store: SnapshotStore = new Map();
    const app = express();
    app.use(snapshotRouter(host, store));
    server = await listen(app);

    // No params at all
    const res1 = await request(server, 'GET', '/diff');
    expect(res1.status).toBe(400);
    const json1 = JSON.parse(res1.body) as Record<string, unknown>;
    expect(json1['error']).toContain('required');

    // Only "from" param
    const res2 = await request(server, 'GET', '/diff?from=snap-a');
    expect(res2.status).toBe(400);
  });

  it('returns 400 when "from" param fails name validation', async () => {
    const compileFn = async () => minimalGovernanceIR();
    const host = new CompilationHost(compileFn, '/test');

    const store: SnapshotStore = new Map();
    const app = express();
    app.use(snapshotRouter(host, store));
    server = await listen(app);

    // Path traversal in "from"
    const res1 = await request(server, 'GET', '/diff?from=../etc&to=valid-name');
    expect(res1.status).toBe(400);
    const json1 = JSON.parse(res1.body) as Record<string, unknown>;
    expect(json1['error']).toContain('path');

    // Special characters in "from"
    const res2 = await request(server, 'GET', '/diff?from=snap%20shot&to=valid-name');
    expect(res2.status).toBe(400);
  });

  it('returns 400 when "to" param fails name validation', async () => {
    const compileFn = async () => minimalGovernanceIR();
    const host = new CompilationHost(compileFn, '/test');

    const store: SnapshotStore = new Map();
    const app = express();
    app.use(snapshotRouter(host, store));
    server = await listen(app);

    // Path traversal in "to"
    const res1 = await request(server, 'GET', '/diff?from=valid-name&to=../etc');
    expect(res1.status).toBe(400);
    const json1 = JSON.parse(res1.body) as Record<string, unknown>;
    expect(json1['error']).toContain('path');

    // Backslash in "to"
    const res2 = await request(server, 'GET', encodeURI('/diff?from=valid-name&to=snap\\shot'));
    expect(res2.status).toBe(400);
  });

  it('detects changed violations with same ruleId but different level', async () => {
    const base = minimalGovernanceIR();
    const ir1: GovernanceIR = {
      ...base,
      analysis: {
        ...base.analysis,
        violations: [
          {
            ruleId: 'R-SHARED',
            level: 1,
            message: 'Rule at level 1',
            target: 'tool:x',
            diagnosticCode: 'GOV-SHARED',
            fixSuggestions: [],
            toolFuzzyMatches: [],
          },
        ],
      },
    };
    const ir2: GovernanceIR = {
      ...base,
      analysis: {
        ...base.analysis,
        violations: [
          {
            ruleId: 'R-SHARED',
            level: 3,
            message: 'Rule at level 3',
            target: 'tool:x',
            diagnosticCode: 'GOV-SHARED',
            fixSuggestions: [],
            toolFuzzyMatches: [],
          },
        ],
      },
    };

    let currentIR = ir1;
    const compileFn = async () => currentIR;
    const host = new CompilationHost(compileFn, '/test');

    const store: SnapshotStore = new Map();
    const app = express();
    app.post('*', contentType());
    app.use(express.json());
    app.use(snapshotRouter(host, store));
    server = await listen(app);

    // Save first snapshot
    await host.compile();
    await request(server, 'POST', '/snapshot', {
      body: JSON.stringify({ name: 'v1' }),
      headers: { 'content-type': 'application/json' },
    });

    // Change IR and save second snapshot
    currentIR = ir2;
    host.clear();
    await host.compile();
    await request(server, 'POST', '/snapshot', {
      body: JSON.stringify({ name: 'v2' }),
      headers: { 'content-type': 'application/json' },
    });

    // Get diff
    const { status, body } = await request(server, 'GET', '/diff?from=v1&to=v2');
    expect(status).toBe(200);
    const diff = JSON.parse(body) as Record<string, unknown>;
    const violations = diff['violations'] as Record<string, unknown>;
    expect((violations['added'] as unknown[]).length).toBe(0);
    expect((violations['removed'] as unknown[]).length).toBe(0);
    const changed = violations['changed'] as { ruleId: string; from: number; to: number }[];
    expect(changed.length).toBe(1);
    expect(changed[0]!.ruleId).toBe('R-SHARED');
    expect(changed[0]!.from).toBe(1);
    expect(changed[0]!.to).toBe(3);
  });
});

describe('validateSnapshotName', () => {
  it('accepts valid names', () => {
    expect(validateSnapshotName('baseline-v1')).toBeUndefined();
    expect(validateSnapshotName('snap_2024')).toBeUndefined();
    expect(validateSnapshotName('ABC123')).toBeUndefined();
  });

  it('rejects empty/non-string', () => {
    expect(validateSnapshotName('')).toBeDefined();
    expect(validateSnapshotName(undefined)).toBeDefined();
    expect(validateSnapshotName(123)).toBeDefined();
  });

  it('rejects names over 128 characters', () => {
    const longName = 'a'.repeat(129);
    expect(validateSnapshotName(longName)).toBeDefined();
  });

  it('rejects null bytes', () => {
    expect(validateSnapshotName('snap\0shot')).toBeDefined();
  });

  it('rejects path traversal sequences', () => {
    expect(validateSnapshotName('../etc')).toBeDefined();
    expect(validateSnapshotName('snap/shot')).toBeDefined();
    expect(validateSnapshotName('snap\\shot')).toBeDefined();
  });

  it('rejects special characters', () => {
    expect(validateSnapshotName('snap shot')).toBeDefined();
    expect(validateSnapshotName('snap.shot')).toBeDefined();
    expect(validateSnapshotName('snap@shot')).toBeDefined();
  });
});
