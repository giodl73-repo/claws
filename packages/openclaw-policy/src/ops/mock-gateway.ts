/**
 * startMockGateway — stand up a local OC-compatible endpoint on a port,
 * load the generated plugin (the PolicyIR here, since the runtime engine
 * consumes it directly in simulation mode), and answer `before_tool_call`
 * and `before_file_ingest` events against in-memory state.
 *
 * Distinct from `serve`: `sim` speaks agent-facing endpoints (tool-call,
 * file-ingest); `serve` speaks management endpoints. See policy.md §Local
 * mock gateway.
 *
 * @module @bic/openclaw-policy/ops/mock-gateway
 */

import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';

import { safeParse, CanonicalizeError } from '@bic/openclaw-workspace/canonicalize';

import type { PolicyIR, DenyRule } from '../types/index.js';
import type { MockGatewayHandle, MockGatewayOptions } from './types.js';

interface DecisionOutcome {
  readonly decision: 'allow' | 'deny' | 'review' | 'modify';
  readonly requireApproval?: boolean;
  readonly approvalHandle?: string;
  readonly redirectPath?: string;
  readonly blockReason?: string;
  readonly audit?: { readonly event: string; readonly policyId?: string };
}

function matchDenyRule(ir: PolicyIR, toolName: string): DenyRule | null {
  for (const rule of ir.soul.denyRules) {
    try {
      const re = new RegExp(rule.pattern);
      if (re.test(toolName)) return rule;
    } catch {
      if (rule.pattern === toolName) return rule;
    }
  }
  return null;
}

function signApprovalHandle(policyId: string, toolName: string, nonce: string): string {
  // Deterministic signed-handle shape: `${policyId}:${toolName}:${nonce}`
  // Real gateways use HMAC; the fixture reports a sortable inspectable handle.
  return `ah-${policyId.slice(0, 12)}-${toolName}-${nonce}`;
}

function decideToolCall(ir: PolicyIR, toolName: string, _args: Record<string, unknown>): DecisionOutcome {
  const deny = matchDenyRule(ir, toolName);
  if (deny !== null) {
    return {
      decision: 'deny',
      blockReason: deny.reason,
      audit: { event: 'tool_call_denied', policyId: `${ir.policyId}:${deny.id}` },
    };
  }

  const spec = ir.tools.find((t) => t.name === toolName);
  if (spec === undefined) {
    const nonce = randomBytes(4).toString('hex');
    return {
      decision: 'review',
      requireApproval: true,
      approvalHandle: signApprovalHandle(ir.policyId, toolName, nonce),
      audit: { event: 'tool_call_reviewed', policyId: `${ir.policyId}:unknown-tool` },
    };
  }

  if (spec.riskLevel === 5) {
    const nonce = randomBytes(4).toString('hex');
    return {
      decision: 'review',
      requireApproval: true,
      approvalHandle: signApprovalHandle(ir.policyId, spec.name, nonce),
      audit: { event: 'tool_call_reviewed', policyId: `${ir.policyId}:R5-${spec.name}` },
    };
  }

  return {
    decision: 'allow',
    audit: { event: 'tool_call_allowed', policyId: `${ir.policyId}:${spec.name}` },
  };
}

function redirectPathFor(original: string): string {
  // Sandbox redirect: canonical path -> quarantine area. Keeps the original
  // file untouched; the write goes to the redirect target.
  return `/quarantine${original}`;
}

function decideFileIngest(ir: PolicyIR, path: string): DecisionOutcome {
  // File ingest decisions:
  //   /redirect/* => modify + redirectPath (sandbox; canonical untouched)
  //   bounds miss => review + requireApproval (preserves existing contract)
  //   bounds hit  => allow
  if (path.startsWith('/redirect/')) {
    return {
      decision: 'modify',
      redirectPath: redirectPathFor(path),
      audit: { event: 'file_ingest_modified', policyId: `${ir.policyId}:redirect` },
    };
  }
  const bounds = ir.user.authorityBounds;
  const inBounds = bounds.some((b) => path.startsWith(b.scope));
  if (bounds.length > 0 && !inBounds) {
    return {
      decision: 'review',
      requireApproval: true,
      audit: { event: 'file_ingest_reviewed', policyId: `${ir.policyId}:bound-check` },
    };
  }
  return {
    decision: 'allow',
    audit: { event: 'file_ingest_allowed', policyId: `${ir.policyId}:${path}` },
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString('utf8'); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(payload)) });
  res.end(payload);
}

function issueHandle(): string {
  return randomBytes(16).toString('hex');
}

async function handleRequest(ir: PolicyIR, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url;
  if (url === undefined) {
    sendJson(res, 400, { error: 'missing url' });
    return;
  }
  if (req.method === 'GET' && url === '/v1/health') {
    sendJson(res, 200, { ok: true, policyId: ir.policyId });
    return;
  }
  if (req.method === 'POST' && url === '/v1/before_tool_call') {
    const body = await readBody(req);
    let payload: { name?: string; args?: Record<string, unknown> };
    try {
      payload = safeParse(body, { maxDepth: 100 }) as { name?: string; args?: Record<string, unknown> };
    } catch (err) {
      const reason = err instanceof CanonicalizeError ? err.code : 'invalid json';
      sendJson(res, 400, { error: reason });
      return;
    }
    const name = payload.name !== undefined ? payload.name : '';
    const args = payload.args !== undefined ? payload.args : {};
    const outcome = decideToolCall(ir, name, args);
    sendJson(res, 200, { ...outcome, handle: issueHandle() });
    return;
  }
  if (req.method === 'POST' && url === '/v1/before_file_ingest') {
    const body = await readBody(req);
    let payload: { path?: string; content?: string };
    try {
      payload = safeParse(body, { maxDepth: 100 }) as { path?: string; content?: string };
    } catch (err) {
      const reason = err instanceof CanonicalizeError ? err.code : 'invalid json';
      sendJson(res, 400, { error: reason });
      return;
    }
    const path = payload.path !== undefined ? payload.path : '';
    const outcome = decideFileIngest(ir, path);
    sendJson(res, 200, { ...outcome, handle: issueHandle() });
    return;
  }
  sendJson(res, 404, { error: 'not found' });
}

export async function startMockGateway(options: MockGatewayOptions): Promise<MockGatewayHandle> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 0;
  const server: Server = createServer((req, res) => {
    void handleRequest(options.policyIR, req, res);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });

  const address = server.address() as AddressInfo;
  const boundPort = address.port;
  const url = `http://${host}:${boundPort}`;

  return {
    url,
    port: boundPort,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}
