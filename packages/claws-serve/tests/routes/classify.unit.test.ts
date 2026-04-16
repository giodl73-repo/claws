import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { classifyRouter } from '../../src/routes/classify.js';
import { CompilationHost } from '../../src/compilation-host.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';
import { governanceIRWithViolations } from '../fixtures/governance-ir-with-violations.js';

async function request(
  server: Server,
  path: string,
): Promise<{ status: number; body: string; headers: Headers }> {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Server not listening on TCP');
  }
  const url = `http://127.0.0.1:${String(address.port)}${path}`;
  const res = await fetch(url);
  const body = await res.text();
  return { status: res.status, body, headers: res.headers };
}

function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => { resolve(s); });
  });
}

describe('GET /classify/:tool', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('returns R-level, classification, and OBO status for known tool', async () => {
    const ir = governanceIRWithViolations();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    await host.compile();

    const app = express();
    app.use(classifyRouter(host));
    server = await listen(app);

    // send-email is critical → R5, OBO true
    const { status, body } = await request(server, '/classify/send-email');

    expect(status).toBe(200);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['tool']).toBe('send-email');
    expect(json['rLevel']).toBe('R5');
    expect(json['classification']).toBe('communication');
    expect(json['oboFlag']).toBe(true);
    expect(json['description']).toBe('Send email on behalf of user');
  });

  it('returns correct R-level for each risk level', async () => {
    const ir = governanceIRWithViolations();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    await host.compile();

    const app = express();
    app.use(classifyRouter(host));
    server = await listen(app);

    // read_file is low → R2
    const low = await request(server, '/classify/read_file');
    expect(low.status).toBe(200);
    const lowJson = JSON.parse(low.body) as Record<string, unknown>;
    expect(lowJson['rLevel']).toBe('R2');
    expect(lowJson['oboFlag']).toBe(false);

    // exec-shell is high → R4
    const high = await request(server, '/classify/exec-shell');
    expect(high.status).toBe(200);
    const highJson = JSON.parse(high.body) as Record<string, unknown>;
    expect(highJson['rLevel']).toBe('R4');
    expect(highJson['classification']).toBe('execution');
  });

  it('falls back to R1 for unmapped risk levels', async () => {
    const ir = governanceIRWithViolations();
    // Add a tool with an unmapped risk level
    const modified = {
      ...ir,
      capabilities: {
        ...ir.capabilities,
        tools: [
          ...ir.capabilities.tools,
          {
            name: 'custom-tool',
            description: 'Tool with unusual risk',
            riskLevel: 'experimental' as 'low',
            oboFlag: false,
            classification: 'custom' as const,
          },
        ],
      },
    };
    const compileFn = async () => modified;
    const host = new CompilationHost(compileFn, '/test');
    await host.compile();

    const app = express();
    app.use(classifyRouter(host));
    server = await listen(app);

    const { status, body } = await request(server, '/classify/custom-tool');

    expect(status).toBe(200);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['rLevel']).toBe('R1');
  });

  it('returns 404 for unknown tool names', async () => {
    const ir = governanceIRWithViolations();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    await host.compile();

    const app = express();
    app.use(classifyRouter(host));
    server = await listen(app);

    const { status, body } = await request(server, '/classify/nonexistent-tool');

    expect(status).toBe(404);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['error']).toBe('Tool "nonexistent-tool" not found in compiled IR.');
  });

  it('returns 404 when no IR is cached', async () => {
    const compileFn = async () => minimalGovernanceIR();
    const host = new CompilationHost(compileFn, '/test');

    const app = express();
    app.use(classifyRouter(host));
    server = await listen(app);

    const { status, body } = await request(server, '/classify/read_file');

    expect(status).toBe(404);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['error']).toBe('No compiled IR available. POST /compile first.');
  });
});
