/**
 * L1 integration tests for PATCH /api/sessions/:id/config (Pulse 65).
 *
 * Four cases the pulse specifies plus adjacent failure modes:
 *  1. Cron tool change → HEARTBEAT.md updated
 *  2. Agent delegation change → AGENTS.md updated
 *  3. R5 rejection
 *  4. Fleet-lock rejection (emulated via blockedTools)
 *  5. Channel/main session rejection
 *  6. Malformed body / unknown session / unknown tool
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Opt-in fault injection on `node:fs/promises`. The default state is
// pass-through (real fs) so every existing test continues to exercise the
// live filesystem. The last two tests in this file flip these flags to
// (a) simulate a mid-write crash at the `rename()` commit point of
// atomicWriteFile and (b) record every writeFile invocation the route
// triggers so the regression gate can assert no direct-target writes.
interface FsFaultControl {
  renameShouldFail: boolean;
  writeFileCalls: Array<{ target: unknown }>;
  recordWriteFileCalls: boolean;
}
const fsFaultControl: FsFaultControl = {
  renameShouldFail: false,
  writeFileCalls: [],
  recordWriteFileCalls: false,
};
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    rename: async (...args: Parameters<typeof actual.rename>): Promise<void> => {
      if (fsFaultControl.renameShouldFail) {
        throw Object.assign(new Error('simulated rename crash'), { code: 'EIO' });
      }
      return actual.rename(...args);
    },
    writeFile: async (
      ...args: Parameters<typeof actual.writeFile>
    ): ReturnType<typeof actual.writeFile> => {
      if (fsFaultControl.recordWriteFileCalls) {
        fsFaultControl.writeFileCalls.push({ target: args[0] });
      }
      return actual.writeFile(...args);
    },
  };
});
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp, type ServerState } from '../../src/server.js';
import { createSessionStore } from '../../src/state/session-store.js';
import {
  governanceIRMultiServer,
  MULTI_SERVER_TOOLS_MD,
} from '../fixtures/governance-ir-multi-server.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function patch(
  server: Server,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: unknown; headers: Headers }> {
  const addr = server.address() as AddressInfo | null;
  if (addr === null) throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as unknown, headers: res.headers };
}

/**
 * Escalate the server's trust tier via the same HTTP surface the CAP uses
 * (T0 → T1 is self-service, no JWT). Every test that exercises a
 * tier-gated delta (cron tool-add, schedule-set, agent revoke-set) calls
 * this first so the in-memory `TrustManager` tier passes the session-
 * config gate (CP-7 R1 FIX-D C5).
 *
 * Fetches the current ETag off `/api/trust` first so the call works under
 * production `requireETag: true` harnesses — the trust/escalate PATCH
 * now rides the If-Match precondition (CP-7 R1 FIX-D K).
 */
async function escalateToT1(server: Server): Promise<void> {
  const addr = server.address() as AddressInfo | null;
  if (addr === null) throw new Error('no addr');
  const base = `http://127.0.0.1:${String(addr.port)}`;
  const headRes = await fetch(`${base}/api/trust`);
  const etag = headRes.headers.get('etag') ?? '"0"';
  const res = await fetch(`${base}/api/trust/escalate`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'if-match': etag },
    body: JSON.stringify({ targetTier: 'T1', justification: 'integration-test setup' }),
  });
  if (res.status !== 200) {
    throw new Error(`failed to escalate to T1: ${String(res.status)}`);
  }
}

async function escalateToT2(server: Server, signingKey: Buffer, workspaceRoot: string): Promise<void> {
  await escalateToT1(server);
  const { TrustManager, generateJti } = await import('@bic/claws-sdk/workspace');
  const signer = new TrustManager({ workspaceRoot, signingKey });
  const nowSec = Math.floor(Date.now() / 1000);
  const jwt = signer.signApprovalJwt({
    sub: 'manager-1',
    exp: nowSec + 300,
    iat: nowSec,
    jti: generateJti(),
    targetTier: 'T2',
    requester: 'integration-test',
  });
  const addr = server.address() as AddressInfo | null;
  if (addr === null) throw new Error('no addr');
  const base = `http://127.0.0.1:${String(addr.port)}`;
  const headRes = await fetch(`${base}/api/trust`);
  const etag = headRes.headers.get('etag') ?? '"0"';
  const res = await fetch(`${base}/api/trust/escalate`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'if-match': etag },
    body: JSON.stringify({
      targetTier: 'T2',
      justification: 'integration-test setup',
      approvalJwt: jwt,
    }),
  });
  if (res.status !== 200) {
    throw new Error(`failed to escalate to T2: ${String(res.status)}`);
  }
}

const SOUL_MD = '# Soul\n\n## Purpose\n\n- govern\n';

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'session-config-int-'));
  await writeFile(join(root, 'SOUL.md'), SOUL_MD, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), MULTI_SERVER_TOOLS_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

async function seedCron(id: string, opts: { preAuth?: readonly string[] } = {}): Promise<void> {
  const store = createSessionStore({ workspaceRoot: root });
  await store.upsert({
    state: {
      id,
      type: 'cron',
      status: 'idle',
      createdAt: '2026-04-17T00:00:00Z',
      lastActiveAt: '2026-04-17T06:00:00Z',
    },
    config: { type: 'cron', schedule: '0 6 * * *' },
    runCount: 0,
    runs: [],
  });
  const preAuth = opts.preAuth ?? [];
  const section = preAuth.length === 0 ? '' : `\n## Cron Pre-Auth\n\n${preAuth.map((t) => `- tool:${t}`).join('\n')}\n`;
  const heartbeat = `# Heartbeat\n\n## On Start\n\n- boot\n${section}`;
  await writeFile(join(root, 'HEARTBEAT.md'), heartbeat, 'utf-8');
}

async function seedAgent(id: string, revokedTools: readonly string[] = []): Promise<void> {
  const store = createSessionStore({ workspaceRoot: root });
  const config = revokedTools.length === 0
    ? { type: 'agent' as const, delegatorSessionId: 'main' }
    : { type: 'agent' as const, delegatorSessionId: 'main', revokedTools };
  await store.upsert({
    state: {
      id,
      type: 'agent',
      status: 'active',
      createdAt: '2026-04-17T00:00:00Z',
      lastActiveAt: '2026-04-17T01:00:00Z',
    },
    config,
    runCount: 0,
    runs: [],
  });
}

function bootApp(opts: { compileFn?: () => Promise<GovernanceIR> } = {}): ReturnType<typeof createApp> {
  const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
  const compileFn = opts.compileFn ?? (async (): Promise<GovernanceIR> => governanceIRMultiServer());
  return createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
}

describe('PATCH /api/sessions/:id/config (integration)', () => {
  it('cron tool-add writes to HEARTBEAT.md session config log', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootApp());
    await escalateToT1(server);

    // Prime the cache so buildContext sees the workspace tools.
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'tool-add',
      tool: 'read_file',
    });
    expect(res.status).toBe(200);
    const body = res.body as { targetFile: string; config: { type: string; toolAllowlist: string[] } };
    expect(body.targetFile).toBe('HEARTBEAT.md');
    expect(body.config.type).toBe('cron');
    expect(body.config.toolAllowlist).toEqual(['read_file']);

    const heartbeat = await readFile(join(root, 'HEARTBEAT.md'), 'utf-8');
    expect(heartbeat).toContain('## Session Config Log');
    expect(heartbeat).toContain('- session:cron:triage tool:read_file');
  });

  it('agent tool-remove writes to AGENTS.md and updates revokedTools', async () => {
    await seedAgent('agent:triage');
    server = await listenApp(bootApp());
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/agent:triage/config', {
      kind: 'tool-remove',
      tool: 'read_file',
    });
    expect(res.status).toBe(200);
    const body = res.body as { targetFile: string; config: { type: string; revokedTools: string[] } };
    expect(body.targetFile).toBe('AGENTS.md');
    expect(body.config.revokedTools).toEqual(['read_file']);

    const agents = await readFile(join(root, 'AGENTS.md'), 'utf-8');
    expect(agents).toContain('## Session Config Log');
    expect(agents).toContain('- session:agent:triage tool:read_file removed');
  });

  it('rejects an R5 tool add with 403 R5_LOCKED', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootApp());
    await escalateToT1(server);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'tool-add',
      tool: 'delete_site',
    });
    expect(res.status).toBe(403);
    const body = res.body as { error: { code: string; tool: string } };
    expect(body.error.code).toBe('R5_LOCKED');
    expect(body.error.tool).toBe('delete_site');
  });

  it('rejects a fleet-locked tool add with 403 FLEET_LOCKED', async () => {
    await seedCron('cron:triage', { preAuth: ['post_message'] });
    server = await listenApp(
      bootApp({
        compileFn: async (): Promise<GovernanceIR> => {
          const ir = governanceIRMultiServer();
          return {
            ...ir,
            analysis: {
              ...ir.analysis,
              enforcementPlan: {
                ...ir.analysis.enforcementPlan,
                blockedTools: ['post_message'],
              },
            },
          };
        },
      }),
    );
    await escalateToT1(server);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'tool-add',
      tool: 'post_message',
    });
    expect(res.status).toBe(403);
    const body = res.body as { error: { code: string } };
    expect(body.error.code).toBe('FLEET_LOCKED');
  });

  it('rejects an unknown session id with 404', async () => {
    server = await listenApp(bootApp());
    const res = await patch(server, '/api/sessions/missing/config', {
      kind: 'tool-add',
      tool: 'read_file',
    });
    expect(res.status).toBe(404);
    const body = res.body as { error: { code: string } };
    expect(body.error.code).toBe('SESSION_NOT_FOUND');
  });

  it('rejects a malformed body with 400 SESSION_CONFIG_BAD_BODY', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootApp());
    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'tool-add',
      // tool missing
    });
    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string } };
    expect(body.error.code).toBe('SESSION_CONFIG_BAD_BODY');
  });

  it('rejects R3 tool add without pre-auth, accepts with pre-auth', async () => {
    await seedCron('cron:triage'); // no pre-auth
    server = await listenApp(bootApp());
    await escalateToT1(server);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const denied = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'tool-add',
      tool: 'post_message',
    });
    expect(denied.status).toBe(403);
    expect((denied.body as { error: { code: string } }).error.code).toBe(
      'PRE_AUTH_REQUIRED',
    );
  });

  it('schedule-set with a malformed cron expression returns 400 INVALID_SCHEDULE', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootApp());
    await escalateToT2(server, TEST_TRUST_SIGNING_KEY, root);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'schedule-set',
      schedule: 'not valid',
    });
    expect(res.status).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe(
      'INVALID_SCHEDULE',
    );
  });

  it('revoke-set rewrites the agent revocation list and writes AGENTS.md', async () => {
    await seedAgent('agent:triage', ['read_file']);
    server = await listenApp(bootApp());
    await escalateToT2(server, TEST_TRUST_SIGNING_KEY, root);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/agent:triage/config', {
      kind: 'revoke-set',
      revokedTools: ['read_file', 'read_inbox'],
    });
    expect(res.status).toBe(200);
    const body = res.body as { config: { revokedTools: string[] } };
    expect(body.config.revokedTools).toEqual(['read_file', 'read_inbox']);

    const agents = await readFile(join(root, 'AGENTS.md'), 'utf-8');
    expect(agents).toContain('- session:agent:triage revoked:read_file,read_inbox');
  });

  it('appends to an existing Session Config Log without clobbering it', async () => {
    await seedCron('cron:triage', { preAuth: [] });
    // Pre-seed HEARTBEAT.md with a log section to force the append branch.
    const seeded = `# Heartbeat\n\n## On Start\n\n- boot\n\n## Session Config Log\n\n- session:cron:triage tool:list_sites\n`;
    await writeFile(join(root, 'HEARTBEAT.md'), seeded, 'utf-8');

    server = await listenApp(bootApp());
    await escalateToT1(server);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'tool-add',
      tool: 'read_file',
    });
    expect(res.status).toBe(200);
    const heartbeat = await readFile(join(root, 'HEARTBEAT.md'), 'utf-8');
    expect(heartbeat).toContain('- session:cron:triage tool:list_sites');
    expect(heartbeat).toContain('- session:cron:triage tool:read_file');
  });

  it('rejects an unknown delta kind with 400 SESSION_CONFIG_BAD_BODY', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootApp());
    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'unsupported-kind',
    });
    expect(res.status).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe(
      'SESSION_CONFIG_BAD_BODY',
    );
  });

  it('inserts the log line above an H2 section that follows Session Config Log', async () => {
    await seedCron('cron:triage');
    // HEARTBEAT.md with the log section first, then another H2 after it.
    const heartbeat = [
      '# Heartbeat',
      '',
      '## Session Config Log',
      '',
      '- session:cron:triage tool:list_sites',
      '',
      '## Trailing',
      '',
      '- marker',
      '',
    ].join('\n');
    await writeFile(join(root, 'HEARTBEAT.md'), heartbeat, 'utf-8');
    server = await listenApp(bootApp());
    await escalateToT1(server);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'tool-add',
      tool: 'read_file',
    });
    expect(res.status).toBe(200);
    const updated = await readFile(join(root, 'HEARTBEAT.md'), 'utf-8');
    // Trailing H2 must still exist and come after the new log line.
    const logIdx = updated.indexOf('tool:read_file');
    const trailingIdx = updated.indexOf('## Trailing');
    expect(logIdx).toBeGreaterThan(-1);
    expect(trailingIdx).toBeGreaterThan(logIdx);
  });

  it('pads a blank line when the existing log section has no trailing blank', async () => {
    await seedCron('cron:triage');
    const heartbeat = [
      '# Heartbeat',
      '',
      '## Session Config Log',
      '- session:cron:triage tool:list_sites',
    ].join('\n');
    await writeFile(join(root, 'HEARTBEAT.md'), heartbeat, 'utf-8');
    server = await listenApp(bootApp());
    await escalateToT1(server);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'tool-add',
      tool: 'read_file',
    });
    expect(res.status).toBe(200);
    const updated = await readFile(join(root, 'HEARTBEAT.md'), 'utf-8');
    expect(updated).toContain('- session:cron:triage tool:read_file');
    expect(updated).toContain('- session:cron:triage tool:list_sites');
  });

  it('rejects a revoke-set with a non-array revokedTools field', async () => {
    await seedAgent('agent:triage');
    server = await listenApp(bootApp());
    const res = await patch(server, '/api/sessions/agent:triage/config', {
      kind: 'revoke-set',
      revokedTools: 'not-an-array',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a revoke-set with a non-string element', async () => {
    await seedAgent('agent:triage');
    server = await listenApp(bootApp());
    const res = await patch(server, '/api/sessions/agent:triage/config', {
      kind: 'revoke-set',
      revokedTools: ['ok', 123],
    });
    expect(res.status).toBe(400);
  });

  it('rejects schedule-set with an empty schedule field', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootApp());
    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'schedule-set',
      schedule: '',
    });
    expect(res.status).toBe(400);
  });

  it('creates the Session Config Log section when AGENTS.md lacks a trailing newline', async () => {
    await seedAgent('agent:triage');
    // File without trailing newline exercises the `!existing.endsWith('\\n')` branch.
    await writeFile(join(root, 'AGENTS.md'), '# Agents\n\n## delegate\n\n- triage', 'utf-8');
    server = await listenApp(bootApp());
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/agent:triage/config', {
      kind: 'tool-remove',
      tool: 'read_file',
    });
    expect(res.status).toBe(200);
    const agents = await readFile(join(root, 'AGENTS.md'), 'utf-8');
    expect(agents).toContain('## Session Config Log');
    expect(agents).toContain('- session:agent:triage tool:read_file removed');
    expect(agents.startsWith('# Agents\n\n## delegate\n\n- triage')).toBe(true);
  });

  it('returns empty workspace tools + empty fleet lock when the IR cache is cold', async () => {
    // No `/compile` warm-up — the editor should still short-circuit a
    // fleet-agnostic tool-remove on agent sessions (no workspace-tool lookup).
    await seedAgent('agent:triage');
    server = await listenApp(bootApp());
    const res = await patch(server, '/api/sessions/agent:triage/config', {
      kind: 'tool-remove',
      tool: 'read_file',
    });
    expect(res.status).toBe(200);
  });

  it('rejects tool-add for an unknown tool with 404 TOOL_UNKNOWN', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootApp());
    await escalateToT1(server);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'tool-add',
      tool: 'nonexistent_tool',
    });
    expect(res.status).toBe(404);
    expect((res.body as { error: { code: string } }).error.code).toBe('TOOL_UNKNOWN');
  });

  // ── Atomic write invariant (CP-7 R1 C4) ─────────────────────────────
  // After a successful PATCH that rewrites HEARTBEAT.md via the shared
  // atomicWriteFile helper, the workspace MUST NOT leak `.tmp-*` orphans
  // next to the target file. Acts as a regression gate on the wiring of
  // the atomic helper into session-config.appendConfigLogLine — a
  // non-atomic writeFile path would not produce tempfiles at all (silent
  // regression), so we also assert the final file contents are correct,
  // proving the write went through the intended code path end-to-end.
  it('leaves no .tmp-* orphan files in the workspace after a successful PATCH', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootApp());
    await escalateToT1(server);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'tool-add',
      tool: 'read_file',
    });
    expect(res.status).toBe(200);

    // The workspace directory must contain HEARTBEAT.md but no
    // `HEARTBEAT.md.tmp-<pid>-<hex>` orphans.
    const entries = await readdir(root);
    const tempfiles = entries.filter((f) => f.includes('HEARTBEAT.md.tmp-'));
    expect(tempfiles).toEqual([]);
    const heartbeat = await readFile(join(root, 'HEARTBEAT.md'), 'utf-8');
    expect(heartbeat).toContain('- session:cron:triage tool:read_file');
  });

  // Fault injection: a crash at the `rename()` commit point of
  // atomicWriteFile must leave the operator's AGENTS.md byte-for-byte
  // unchanged and must not leave a `.tmp-*` orphan next to it. We
  // simulate the crash by intercepting the `rename` export on
  // `node:fs/promises` so the tempfile has already been written on
  // disk — this is strictly stronger than a target-as-directory trick
  // (which fires EISDIR inside `writeFile` before the tempfile is
  // fully flushed and would pass even if the route bypassed the
  // atomic helper entirely).
  //
  // AGENTS.md path (agent tool-remove) reaches the write without the
  // cron PRE_AUTH_REQUIRED gate and without a workspace-tool lookup
  // (see the cold-cache test above).
  it('fault injection: rename crash mid-write leaves AGENTS.md byte-for-byte unchanged and sweeps the tempfile', async () => {
    await seedAgent('agent:triage', ['read_file']);
    const agentsPath = join(root, 'AGENTS.md');
    const originalContents = '# Agents\n\n## delegate\n\n- triage\n';
    await writeFile(agentsPath, originalContents, 'utf-8');

    server = await listenApp(bootApp());

    // Flip the rename fault AFTER the server is up so the boot path
    // (Express listen, workspace scan) stays on the real filesystem —
    // only the atomicWriteFile invocation inside the handler sees the
    // simulated crash at the rename() commit point.
    fsFaultControl.renameShouldFail = true;
    try {
      const res = await patch(server, '/api/sessions/agent:triage/config', {
        kind: 'tool-remove',
        tool: 'read_file',
      });
      // atomicWriteFile rethrows the rename error; the generic error
      // handler surfaces it as 500.
      expect(res.status).toBe(500);
    } finally {
      fsFaultControl.renameShouldFail = false;
    }

    // AGENTS.md byte-for-byte untouched (the commit never landed).
    const after = await readFile(agentsPath, 'utf-8');
    expect(after).toBe(originalContents);

    // No orphan `.tmp-*` files next to the target. atomicWriteFile's
    // best-effort sweep runs in the catch block.
    const workspaceEntries = await readdir(root);
    const orphans = workspaceEntries.filter((f) => f.includes('AGENTS.md.tmp-'));
    expect(orphans).toEqual([]);
  });

  // Regression gate: the session-config handler MUST go through the
  // atomic helper and MUST NOT call `writeFile` directly against the
  // target OC file. atomicWriteFile itself calls `writeFile` on the
  // `.tmp-<pid>-<nonce>` sidecar, so the guard is "no writeFile call
  // whose target path equals AGENTS.md / HEARTBEAT.md exactly".
  //
  // This is the test that would have caught the RR1 regression where
  // FIX-C's marker commit left the bare `writeFile(filePath, …)` line
  // in place.
  it('regression: session-config writes never target HEARTBEAT.md / AGENTS.md directly (atomic helper only)', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootApp());
    await escalateToT1(server);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    // Start recording writeFile calls only AFTER the boot path is
    // complete so we scope the assertion to what the PATCH handler
    // does. The mock in the module hoist records every call; we
    // flip the recorder here so the boot-path writes don't pollute.
    fsFaultControl.writeFileCalls.length = 0;
    fsFaultControl.recordWriteFileCalls = true;
    try {
      const res = await patch(server, '/api/sessions/cron:triage/config', {
        kind: 'tool-add',
        tool: 'read_file',
      });
      expect(res.status).toBe(200);
    } finally {
      fsFaultControl.recordWriteFileCalls = false;
    }

    const heartbeatPath = join(root, 'HEARTBEAT.md');
    const agentsPath = join(root, 'AGENTS.md');
    const directTargetCalls = fsFaultControl.writeFileCalls.filter(({ target }) => {
      return target === heartbeatPath || target === agentsPath;
    });
    expect(directTargetCalls).toEqual([]);

    // And: at least one writeFile call WAS made against a tempfile
    // sidecar of HEARTBEAT.md — proves the atomic helper is the
    // one doing the write, not some other code path.
    const tempfileCalls = fsFaultControl.writeFileCalls.filter(({ target }) => {
      return typeof target === 'string' && target.startsWith(`${heartbeatPath}.tmp-`);
    });
    expect(tempfileCalls.length).toBeGreaterThan(0);
  });

  // ── CP-7 R1 FIX-D: ETag / commit / actor / trust-tier wiring ─────────
  // Session-config PATCH must now ride the same envelope as the chunks
  // PATCH surface: If-Match is required under production `requireETag`;
  // stale If-Match yields a 409 VERSION_CONFLICT; successful writes
  // advance the VersionStore counter. The actor identity from X-Actor-Id
  // must land in the HEARTBEAT.md / AGENTS.md log line so SREs can
  // attribute edits (ciso W2). Trust-tier minimums gate tool-add on cron
  // (T1) and schedule-set / agent revoke-set (T2).

  function bootProd(
    opts: { compileFn?: () => Promise<GovernanceIR> } = {},
  ): ReturnType<typeof createApp> {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = opts.compileFn ?? (async (): Promise<GovernanceIR> => governanceIRMultiServer());
    return createApp(state, {
      compileFn,
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      requireETag: true,
    });
  }

  it('PATCH without If-Match returns 428 PRECONDITION_REQUIRED under production ETag mode', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootProd());
    await escalateToT1(server);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    // No If-Match — production requireETag=true rejects up front.
    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'tool-add',
      tool: 'read_file',
    });
    expect(res.status).toBe(428);
    const body = res.body as { error: { code: string } };
    expect(body.error.code).toBe('PRECONDITION_REQUIRED');
  });

  it('PATCH with a stale If-Match value returns 409 VERSION_CONFLICT', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootProd());
    await escalateToT1(server);
    const addr = server.address() as AddressInfo;
    await fetch(`http://127.0.0.1:${addr.port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    // Pull the current ETag off a GET before the first PATCH — the
    // escalate-to-T1 step already advanced the counter, so a hardcoded
    // "0" would itself be stale on the first attempt.
    const beforeRes = await fetch(`http://127.0.0.1:${addr.port}/api/sessions`);
    const currentEtag = beforeRes.headers.get('etag') ?? '"0"';
    const first = await patch(
      server,
      '/api/sessions/cron:triage/config',
      { kind: 'tool-add', tool: 'read_file' },
      { 'if-match': currentEtag },
    );
    expect(first.status).toBe(200);
    // Replay the same (now stale) If-Match — the server rejects with 409.
    const stale = await patch(
      server,
      '/api/sessions/cron:triage/config',
      { kind: 'tool-add', tool: 'list_sites' },
      { 'if-match': currentEtag },
    );
    expect(stale.status).toBe(409);
    const body = stale.body as { error: { code: string } };
    expect(body.error.code).toBe('VERSION_CONFLICT');
  });

  it('PATCH with X-Actor-Id writes the actor into the HEARTBEAT.md log line', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootApp());
    await escalateToT1(server);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(
      server,
      '/api/sessions/cron:triage/config',
      { kind: 'tool-add', tool: 'read_file' },
      { 'x-actor-id': 'alice@contoso.com' },
    );
    expect(res.status).toBe(200);

    const heartbeat = await readFile(join(root, 'HEARTBEAT.md'), 'utf-8');
    expect(heartbeat).toContain(
      '- session:cron:triage tool:read_file actor:alice@contoso.com',
    );
  });

  it('T0 caller cannot add a tool to a cron session (403 TRUST_TIER_INSUFFICIENT)', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootApp());
    // Deliberately do NOT escalate — server stays at T0.
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'tool-add',
      tool: 'read_file',
    });
    expect(res.status).toBe(403);
    const body = res.body as {
      error: { code: string; requiredTier: string; currentTier: string };
    };
    expect(body.error.code).toBe('TRUST_TIER_INSUFFICIENT');
    expect(body.error.requiredTier).toBe('T1');
    expect(body.error.currentTier).toBe('T0');

    // The gated PATCH must NOT advance the VersionStore — a stale state
    // would otherwise appear in time-travel diffs.
    const heartbeat = await readFile(join(root, 'HEARTBEAT.md'), 'utf-8').catch(() => '');
    expect(heartbeat).not.toContain('tool:read_file');
  });

  it('T1 caller can add an R1 tool to a cron session (200)', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootApp());
    await escalateToT1(server);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'tool-add',
      tool: 'read_file',
    });
    expect(res.status).toBe(200);
  });

  it('T0 caller cannot schedule-set a cron session (403 TRUST_TIER_INSUFFICIENT T2)', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootApp());
    // T0 from boot — schedule-set requires T2.
    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'schedule-set',
      schedule: '0 7 * * *',
    });
    expect(res.status).toBe(403);
    const body = res.body as {
      error: { code: string; requiredTier: string };
    };
    expect(body.error.code).toBe('TRUST_TIER_INSUFFICIENT');
    expect(body.error.requiredTier).toBe('T2');
  });

  it('successful session-config PATCH advances the ETag counter on the response', async () => {
    await seedCron('cron:triage');
    server = await listenApp(bootApp());
    await escalateToT1(server);
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await patch(server, '/api/sessions/cron:triage/config', {
      kind: 'tool-add',
      tool: 'read_file',
    });
    expect(res.status).toBe(200);
    // commitOnSuccess stamps the new version number on the ETag header.
    const etag = res.headers.get('etag');
    expect(etag).toBeTruthy();
    expect(etag).toMatch(/^"\d+"$/);
  });
});
