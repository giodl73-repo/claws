/**
 * L1 integration tests for GET/PATCH /api/oc/SOUL.md — the Loop sync
 * formatter (pulse 35).
 *
 * Scenarios covered:
 *   1. GET ?view=loop returns SoulSectionView[] with governance context
 *   2. PATCH with sectionId+content rewrites the target section
 *   3. PATCH on a governance-locked section is rejected with 403
 *   4. PATCH triggers a recompile (compileCount increments)
 */
import express from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceIR } from '@bic/claws-sdk';
import type { SoulSectionView } from '@bic/claws-sdk/workspace';
import { createApp, type ServerState } from '../../src/server.js';
import { CompilationHost } from '../../src/compilation-host.js';
import { loopSoulRouter } from '../../src/routes/loop-soul.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\n## Purpose\n\nWrite well.\n\n## Values\n\n- Integrity\n';

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

interface Response {
  readonly status: number;
  readonly body: string;
}

async function get(server: Server, path: string): Promise<Response> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

async function patch(server: Server, path: string, body: unknown): Promise<Response> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const payload = JSON.stringify(body);
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
    },
    body: payload,
  });
  return { status: res.status, body: await res.text() };
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'loop-soul-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('GET /api/oc/SOUL.md?view=loop — L1 integration', () => {
  it('returns sections with governance context when ?view=loop is supplied', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    const ir: GovernanceIR = {
      ...minimalGovernanceIR(),
      intents: [
        {
          kind: 'deny',
          id: 'deny:soul-purpose',
          ruleId: 'G-SOUL-01',
          level: 3,
          description: 'compile-injected SOUL pin',
          target: 'SOUL.purpose',
          reason: 'test pin',
        },
      ],
    };
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => ir,
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const res = await get(server, '/api/oc/SOUL.md?view=loop');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      file: 'SOUL.md';
      sections: readonly SoulSectionView[];
    };
    expect(body.file).toBe('SOUL.md');
    const purpose = body.sections.find((s) => s.id === 'purpose')!;
    expect(purpose).toBeDefined();
    expect(purpose.governanceContext.denyRuleCount).toBe(1);
    expect(purpose.governanceContext.compilerInjected).toBe(true);
    expect(purpose.governanceContext.lockSource).toBe('governance');

    const values = body.sections.find((s) => s.id === 'values')!;
    expect(values.governanceContext.lockSource).toBe('none');
  });
});

describe('PATCH /api/oc/SOUL.md — L1 integration', () => {
  it('rewrites the target section and returns the updated view', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const res = await patch(server, '/api/oc/SOUL.md', {
      sectionId: 'values',
      content: '\n- Rewrite complete.\n',
    });
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      file: 'SOUL.md';
      sections: readonly SoulSectionView[];
    };
    const values = body.sections.find((s) => s.id === 'values')!;
    expect(values.content).toBe('\n- Rewrite complete.\n');
    const onDisk = await readFile(join(root, 'SOUL.md'), 'utf-8');
    expect(onDisk).toContain('- Rewrite complete.');
    expect(onDisk).not.toContain('- Integrity');
  });

  it('rejects PATCH on a governance-locked section with 403', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    const ir: GovernanceIR = {
      ...minimalGovernanceIR(),
      intents: [
        {
          kind: 'deny',
          id: 'deny:soul-purpose',
          ruleId: 'FLEET-01',
          level: 3,
          description: 'fleet pin',
          target: 'SOUL.purpose',
          reason: 'fleet policy',
        },
      ],
    };
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => ir,
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const res = await patch(server, '/api/oc/SOUL.md', {
      sectionId: 'purpose',
      content: '\nNew purpose.\n',
    });
    expect(res.status).toBe(403);
    const body = JSON.parse(res.body) as {
      error: { code: string; lockSource: string; sectionId: string };
    };
    expect(body.error.code).toBe('SOUL_SECTION_LOCKED');
    expect(body.error.lockSource).toBe('fleet');
    expect(body.error.sectionId).toBe('purpose');
    const onDisk = await readFile(join(root, 'SOUL.md'), 'utf-8');
    expect(onDisk).toBe(SOUL);
  });

  it('rejects a malformed PATCH body with 400 SOUL_PATCH_BAD_BODY', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const res = await patch(server, '/api/oc/SOUL.md', { sectionId: '', content: 'x' });
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('SOUL_PATCH_BAD_BODY');
  });

  it('returns 404 SOUL_SECTION_NOT_FOUND when the section id is missing', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const res = await patch(server, '/api/oc/SOUL.md', {
      sectionId: 'does-not-exist',
      content: 'x',
    });
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body) as { error: { code: string; sectionId: string } };
    expect(body.error.code).toBe('SOUL_SECTION_NOT_FOUND');
    expect(body.error.sectionId).toBe('does-not-exist');
  });

  it('falls through to the generic router when ?view=loop is absent', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const res = await get(server, '/api/oc/SOUL.md');
    expect(res.status).toBe(200);
    // The generic router surfaces `preamble` + `raw`; the Loop response
    // never does. Presence of `raw` confirms the fall-through to pulse 27.
    const body = JSON.parse(res.body) as { preamble?: string; raw?: string };
    expect(typeof body.raw).toBe('string');
  });

  it('still serves GET ?view=loop when the compile host fails (degraded)', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    let firstCall = true;
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      // First invocation succeeds (server startup / other code paths),
      // subsequent invocations fail so the Loop handler hits the
      // `tryCompile` catch branch.
      compileFn: async () => {
        if (firstCall) {
          firstCall = false;
          return minimalGovernanceIR();
        }
        throw new Error('compile broken');
      },
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    // Prime the cache so subsequent reads fail inside the route handler.
    await get(server, '/api/status');

    const res = await get(server, '/api/oc/SOUL.md?view=loop');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as { sections: readonly SoulSectionView[] };
    expect(body.sections.length).toBeGreaterThan(0);
    for (const section of body.sections) {
      // Without an IR, every section is unlocked — the UI can show a
      // banner indicating governance is stale.
      expect(section.governanceContext.lockSource).toBe('none');
    }
  });

  it('triggers a recompile after a successful PATCH', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    let compiles = 0;
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => {
        compiles++;
        return minimalGovernanceIR();
      },
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    // Prime compile via GET so we're counting deltas that the PATCH causes.
    await get(server, '/api/oc/SOUL.md?view=loop');
    const baseline = compiles;

    const res = await patch(server, '/api/oc/SOUL.md', {
      sectionId: 'values',
      content: '\n- Updated.\n',
    });
    expect(res.status).toBe(200);
    expect(compiles).toBeGreaterThan(baseline);
  });

  // ── CP-7 R2 FIX-H — /api/oc PATCH governance stack ──────────────────
  // RC1: /api/oc/SOUL.md PATCH rides the same requireIfMatch +
  // violationGate + commitOnSuccess envelope that FIX-D mounted on
  // session-config. Actor lands in the audit chain; violation-gate blocks
  // in DEGRADED_R5 / ERROR.
  // RC2: When `tryCompile(host)` returns undefined (compile broken) the
  // PATCH fails closed with 503 GOVERNANCE_DEGRADED instead of silently
  // evaluating locks against an absent IR (the compile-degraded window
  // would otherwise be a lock-bypass oracle).

  it('FIX-H RC1: PATCH without If-Match returns 428 under production ETag mode', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      requireETag: true,
    });
    server = await listenApp(app);

    const res = await patch(server, '/api/oc/SOUL.md', {
      sectionId: 'values',
      content: '\n- Forbidden.\n',
    });
    expect(res.status).toBe(428);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('PRECONDITION_REQUIRED');
    // Disk untouched — FIX-H gate fired before reaching the route handler.
    const onDisk = await readFile(join(root, 'SOUL.md'), 'utf-8');
    expect(onDisk).toBe(SOUL);
  });

  it('FIX-H RC1: PATCH with a stale If-Match returns 409 VERSION_CONFLICT', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      requireETag: true,
    });
    server = await listenApp(app);

    const addr = server.address();
    if (addr === null || typeof addr === 'string') throw new Error('no addr');
    const baseUrl = `http://127.0.0.1:${String(addr.port)}`;

    // Pull the current ETag off a GET.
    const pre = await fetch(`${baseUrl}/api/oc/SOUL.md?view=loop`);
    const etag = pre.headers.get('etag') ?? '"0"';

    // First PATCH with the current ETag succeeds and advances the counter.
    const first = await fetch(`${baseUrl}/api/oc/SOUL.md`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'if-match': etag },
      body: JSON.stringify({ sectionId: 'values', content: '\n- First.\n' }),
    });
    expect(first.status).toBe(200);

    // Replay the same (now stale) If-Match — server rejects with 409.
    const stale = await fetch(`${baseUrl}/api/oc/SOUL.md`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'if-match': etag },
      body: JSON.stringify({ sectionId: 'values', content: '\n- Second.\n' }),
    });
    expect(stale.status).toBe(409);
    const body = (await stale.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VERSION_CONFLICT');
  });

  it('FIX-H RC2: PATCH returns 503 GOVERNANCE_DEGRADED when compile is broken', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    // compileFn throws on every invocation — the PATCH handler's
    // `tryCompile(host)` swallows the throw and returns undefined, which
    // must drive the 503 fast-path BEFORE any lock evaluation. GET
    // `?view=loop` stays best-effort (existing test covers the degraded
    // GET); only the write path fails closed.
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => {
        throw new Error('compile broken');
      },
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const res = await patch(server, '/api/oc/SOUL.md', {
      sectionId: 'values',
      content: '\n- Rewrite complete.\n',
    });
    expect(res.status).toBe(503);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('GOVERNANCE_DEGRADED');
    // Disk untouched — the PATCH fails closed before the atomic write.
    const onDisk = await readFile(join(root, 'SOUL.md'), 'utf-8');
    expect(onDisk).toBe(SOUL);
  });

  it('FIX-H RC1: successful PATCH threads the X-Actor-Id into the audit chain', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    const captured: Array<{
      eventType: string;
      actor?: string;
      target: string;
      outcome: string;
    }> = [];
    const auditChainSink = {
      emit(event: {
        eventType: string;
        actor?: string;
        target: string;
        outcome: string;
      }): void {
        captured.push(event);
      },
    };
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      auditChainSink,
    });
    server = await listenApp(app);

    const addr = server.address();
    if (addr === null || typeof addr === 'string') throw new Error('no addr');
    const res = await fetch(`http://127.0.0.1:${String(addr.port)}/api/oc/SOUL.md`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-actor-id': 'alice@contoso.com' },
      body: JSON.stringify({ sectionId: 'values', content: '\n- Signed.\n' }),
    });
    expect(res.status).toBe(200);

    const ocFileEdits = captured.filter((e) => e.eventType === 'OC_FILE_EDIT');
    expect(ocFileEdits.length).toBe(1);
    expect(ocFileEdits[0]!.actor).toBe('alice@contoso.com');
    expect(ocFileEdits[0]!.target).toBe('SOUL.md');
    expect(ocFileEdits[0]!.outcome).toBe('section:values');
  });

  it('FIX-H RC1: violation-gate blocks PATCH when machine is DEGRADED_R5 with a non-repair target', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      // No-op sink so the afterEach rm does not race the background
      // `.claws/audit/chain.jsonl` append (Windows ENOTEMPTY on rmdir).
      auditChainSink: { emit: (): void => {} },
    });
    server = await listenApp(app);

    // Drive the machine into DEGRADED_R5 via an error violation on a
    // DIFFERENT path so the SOUL.md PATCH is not treated as a repair
    // attempt. The gate's default extractor pulls `oc://SOUL.md` from
    // `req.path`; since it is not in `getRepairPaths()` and no tool
    // identifier is present in the body, the gate fails closed per the
    // DEGRADED_R5 fail-closed branch (CP-7 R1 dragon M-4).
    const { ViolationStateMachine: VSM } = await import(
      '@bic/claws-sdk/workspace/violation-state.js'
    );
    const machine = app.get('violationMachine') as InstanceType<typeof VSM>;
    machine.applyRecompile({
      violations: [
        {
          path: 'oc://TOOLS.md#draft_wire',
          severity: 'error',
          rule: 'R5/transact',
          message: 'draft_wire is an R5 tool',
          fixGuidance: 'Drop the skill or supply an approval token',
          source: 'compiler',
          scope: 'isolated',
          tool: 'draft_wire',
        },
      ],
      lastGoodVersion: 1,
    });
    // `debounceMs: 200` (FIX-K RR2) means `applyRecompile` buffers the
    // commit; `flush()` forces a synchronous commit for test determinism.
    machine.flush();

    const res = await patch(server, '/api/oc/SOUL.md', {
      sectionId: 'values',
      content: '\n- blocked.\n',
    });
    expect(res.status).toBe(503);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('GOVERNANCE_DEGRADED');
    const onDisk = await readFile(join(root, 'SOUL.md'), 'utf-8');
    expect(onDisk).toBe(SOUL);
  });

  it('FIX-H RC1: PATCH succeeds when auditSink is undefined — no emission, no throw', async () => {
    // Covers the `auditSink === undefined` branch of handlePatch's audit
    // emission block. `createApp` always threads a sink, so this test wires
    // the router directly with auditSink omitted. The PATCH should still
    // write the file and return 200 without attempting any audit call.
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    const app = express();
    app.use(express.json());
    app.use('/api/oc', loopSoulRouter(host, { workspaceRoot: root }));
    server = await listenApp(app);

    const res = await patch(server, '/api/oc/SOUL.md', {
      sectionId: 'values',
      content: '\n- Rewrite complete.\n',
    });
    expect(res.status).toBe(200);
    const onDisk = await readFile(join(root, 'SOUL.md'), 'utf-8');
    expect(onDisk).toContain('- Rewrite complete.');
  });

  it('FIX-H RC1: emits policyVersion:"unknown" when the option is omitted on the router', async () => {
    // Covers the `options.policyVersion ?? 'unknown'` fallback. The
    // router is wired with an auditSink but no policyVersion, forcing
    // the nullish-coalesce arm.
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    const captured: Array<{ eventType: string; policyVersion: string }> = [];
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    const app = express();
    app.use(express.json());
    app.use(
      '/api/oc',
      loopSoulRouter(host, {
        workspaceRoot: root,
        auditSink: {
          emit: (event: { eventType: string; policyVersion: string }): void => {
            captured.push(event);
          },
        },
      }),
    );
    server = await listenApp(app);

    const res = await patch(server, '/api/oc/SOUL.md', {
      sectionId: 'values',
      content: '\n- unknown policy.\n',
    });
    expect(res.status).toBe(200);
    const edit = captured.find((e) => e.eventType === 'OC_FILE_EDIT');
    expect(edit).toBeDefined();
    expect(edit!.policyVersion).toBe('unknown');
  });
});
