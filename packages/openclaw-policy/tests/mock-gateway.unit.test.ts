import { describe, it, expect, afterEach } from 'vitest';

import { startMockGateway } from '../src/ops/mock-gateway.js';
import type { MockGatewayHandle } from '../src/ops/types.js';
import { MINIMAL_IR } from './ops-fixtures.js';

let handle: MockGatewayHandle | undefined;

afterEach(async () => {
  if (handle !== undefined) {
    await handle.close();
    handle = undefined;
  }
});

describe('startMockGateway — lifecycle', () => {
  it('starts on ephemeral port and responds to /v1/health', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });
    expect(handle.port).toBeGreaterThan(0);
    expect(handle.url).toContain('http://127.0.0.1:');
    const res = await fetch(`${handle.url}/v1/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; policyId: string };
    expect(body.ok).toBe(true);
    expect(body.policyId).toBe(MINIMAL_IR.policyId);
  });
});

describe('startMockGateway — before_tool_call decision', () => {
  it('routes R5 tool through review with requireApproval', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });
    const res = await fetch(`${handle.url}/v1/before_tool_call`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'send-email', args: { to: 'alice', body: 'hi' } }),
    });
    const body = (await res.json()) as { decision: string; requireApproval: boolean; audit: { policyId: string } };
    expect(body.decision).toBe('review');
    expect(body.requireApproval).toBe(true);
    expect(body.audit.policyId).toContain('R5-send-email');
  });

  it('allows R1 tool and issues signed handle', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });
    const res = await fetch(`${handle.url}/v1/before_tool_call`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'read-file', args: {} }),
    });
    const body = (await res.json()) as { decision: string; handle: string };
    expect(body.decision).toBe('allow');
    expect(body.handle).toMatch(/^[0-9a-f]{32}$/);
  });

  it('denies tools matching SOUL deny pattern', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });
    const res = await fetch(`${handle.url}/v1/before_tool_call`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'send-secret-key', args: {} }),
    });
    const body = (await res.json()) as { decision: string };
    expect(body.decision).toBe('deny');
  });

  it('returns 400 on invalid JSON body', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });
    const res = await fetch(`${handle.url}/v1/before_tool_call`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not-json',
    });
    expect(res.status).toBe(400);
  });

  it('rejects depth-bomb body via safeParse — server stays alive (sec-r1 M1)', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });
    // Build a deeply-nested JSON body that exceeds the safeParse ceiling (maxDepth: 100).
    const depth = 500;
    let body = '';
    for (let i = 0; i < depth; i++) body += '{"a":';
    body += 'null';
    for (let i = 0; i < depth; i++) body += '}';

    const res = await fetch(`${handle.url}/v1/before_tool_call`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    expect(res.status).toBe(400);
    const errBody = (await res.json()) as { error: string };
    expect(errBody.error).toBe('E_DEPTH');

    // Server must still answer subsequent requests — depth-bomb must not wedge it.
    const health = await fetch(`${handle.url}/v1/health`);
    expect(health.status).toBe(200);
  });
});

describe('startMockGateway — file ingest', () => {
  it('reviews out-of-bounds paths', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });
    const res = await fetch(`${handle.url}/v1/before_file_ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: '/etc/passwd', content: 'x' }),
    });
    const body = (await res.json()) as { decision: string };
    expect(body.decision).toBe('review');
  });

  it('allows in-bounds paths', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });
    const res = await fetch(`${handle.url}/v1/before_file_ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: '/workspace/readme.md', content: 'x' }),
    });
    const body = (await res.json()) as { decision: string };
    expect(body.decision).toBe('allow');
  });

  it('returns 404 on unknown path', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });
    const res = await fetch(`${handle.url}/v1/unknown`);
    expect(res.status).toBe(404);
  });

  it('close() shuts down server and frees port', async () => {
    const h = await startMockGateway({ policyIR: MINIMAL_IR });
    await h.close();
    await expect(fetch(`${h.url}/v1/health`)).rejects.toBeTruthy();
  });
});
