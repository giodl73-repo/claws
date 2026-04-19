import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { compileRouter, classifyIRViolations } from '../../src/routes/compile.js';
import { contentType } from '../../src/middleware/content-type.js';
import { CompilationHost } from '../../src/compilation-host.js';
import type { ServerState } from '../../src/server.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';
import type { WsEvent } from '../../src/ws/events.js';
import { ClientManager } from '../../src/ws/events.js';
import { ViolationStateMachine } from '@bic/claws-sdk/workspace/violation-state.js';
import { ViolationState } from '@bic/claws-sdk/workspace/violation-types.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
function makeState(overrides: Partial<ServerState> = {}): ServerState {
  return {
    startedAt: Date.now(),
    compileCount: 0,
    ...overrides,
  };
}

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

describe('POST /compile', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('triggers compilation and returns GovernanceIR', async () => {
    const ir = minimalGovernanceIR();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    const state = makeState();

    const app = express();
    app.post('*', contentType());
    app.use(compileRouter(host, state));
    server = await listen(app);

    const { status, body } = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(200);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json).toHaveProperty('ir');
    expect(json).toHaveProperty('cached');
    expect(json).toHaveProperty('durationMs');

    const returnedIR = json['ir'] as Record<string, unknown>;
    expect(returnedIR).toHaveProperty('capabilities');
    expect(returnedIR).toHaveProperty('analysis');
    expect(returnedIR).toHaveProperty('intents');
    expect(returnedIR).toHaveProperty('delegationMap');
    expect(returnedIR).toHaveProperty('conflicts');
    expect(returnedIR).toHaveProperty('compiler');
    expect(state.compileCount).toBe(1);
  });

  it('response matches GovernanceIR schema structure', async () => {
    const ir = minimalGovernanceIR();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    const state = makeState();

    const app = express();
    app.post('*', contentType());
    app.use(compileRouter(host, state));
    server = await listen(app);

    const { status, body } = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(200);
    const json = JSON.parse(body) as Record<string, unknown>;
    const returnedIR = json['ir'] as Record<string, unknown>;

    // Verify compiler metadata shape
    const compiler = returnedIR['compiler'] as Record<string, unknown>;
    expect(compiler).toHaveProperty('compilerVersion');
    expect(compiler).toHaveProperty('compiledAt');
    expect(compiler).toHaveProperty('schemaVersion');
    expect(typeof compiler['compilerVersion']).toBe('string');
    expect(typeof compiler['compiledAt']).toBe('string');
    expect(typeof compiler['schemaVersion']).toBe('number');

    // Verify analysis shape
    const analysis = returnedIR['analysis'] as Record<string, unknown>;
    expect(analysis).toHaveProperty('violations');
    expect(analysis).toHaveProperty('warnings');
    expect(analysis).toHaveProperty('enforcementPlan');

    // Verify capabilities shape
    const capabilities = returnedIR['capabilities'] as Record<string, unknown>;
    expect(capabilities).toHaveProperty('tools');
    expect(Array.isArray(capabilities['tools'])).toBe(true);
  });

  it('returns 500 when compilation fails with Error', async () => {
    const compileFn = async () => { throw new Error('Compile error'); };
    const host = new CompilationHost(compileFn, '/test');
    const state = makeState();

    const app = express();
    app.post('*', contentType());
    app.use(compileRouter(host, state));
    server = await listen(app);

    const { status, body } = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(500);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['error']).toBe('Compile error');
  });

  it('broadcasts diagnostic:update when IR has violations or warnings', async () => {
    const ir = {
      ...minimalGovernanceIR(),
      analysis: {
        ...minimalGovernanceIR().analysis,
        violations: [
          {
            ruleId: 'R001',
            level: 1,
            message: 'v',
            target: 'tool:x',
            diagnosticCode: 'GOV-001',
            fixSuggestions: [],
            toolFuzzyMatches: [],
          },
        ],
      },
    };
    const host = new CompilationHost(async () => ir, '/test');
    const state = makeState();
    const clientManager = new ClientManager();
    const events: WsEvent[] = [];
    const origBroadcast = clientManager.broadcast.bind(clientManager);
    clientManager.broadcast = (e: WsEvent) => { events.push(e); origBroadcast(e); };

    const app = express();
    app.post('*', contentType());
    app.use(compileRouter(host, state, clientManager));
    server = await listen(app);

    await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    const types = events.map((e) => e.type);
    expect(types).toContain('diagnostic:update');
  });

  it('broadcasts tension:detected when IR has conflicts', async () => {
    const base = minimalGovernanceIR();
    const ir = {
      ...base,
      conflicts: {
        ...base.conflicts,
        oboConflicts: [
          {
            ruleA: 'A',
            ruleB: 'B',
            target: 'tool:x',
            explanation: 'obo conflict',
          },
        ],
        totalConflicts: 1,
      },
    };
    const host = new CompilationHost(async () => ir, '/test');
    const state = makeState();
    const clientManager = new ClientManager();
    const events: WsEvent[] = [];
    const origBroadcast = clientManager.broadcast.bind(clientManager);
    clientManager.broadcast = (e: WsEvent) => { events.push(e); origBroadcast(e); };

    const app = express();
    app.post('*', contentType());
    app.use(compileRouter(host, state, clientManager));
    server = await listen(app);

    await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    const types = events.map((e) => e.type);
    expect(types).toContain('tension:detected');
  });

  it('returns 500 with generic message when non-Error is thrown', async () => {
    const compileFn = async () => { throw 'string error'; };
    const host = new CompilationHost(compileFn, '/test');
    const state = makeState();

    const app = express();
    app.post('*', contentType());
    app.use(compileRouter(host, state));
    server = await listen(app);

    const { status, body } = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(500);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['error']).toBe('Compilation failed');
  });
});

describe('classifyIRViolations (P73 default classifier)', () => {
  it('maps level-5 structural violation to ERROR severity + structural scope', () => {
    const base = minimalGovernanceIR();
    const ir = {
      ...base,
      conflicts: { ...base.conflicts, haltReason: 'UNPARSEABLE_SOUL' },
      analysis: {
        ...base.analysis,
        violations: [{
          ruleId: 'parse/structural',
          level: 5,
          message: 'SOUL.md unparseable',
          target: 'SOUL.md',
          diagnosticCode: 'GOV-STRUCT',
          fixSuggestions: [{ direction: 'tighten', description: 'Restore SOUL.md', target: 'SOUL.md' }],
          toolFuzzyMatches: [],
        }],
      },
    } as unknown as Parameters<typeof classifyIRViolations>[0];
    const classified = classifyIRViolations(ir);
    expect(classified).toHaveLength(1);
    expect(classified[0]!.severity).toBe('error');
    expect(classified[0]!.scope).toBe('structural');
    expect(classified[0]!.fixGuidance).toBe('Restore SOUL.md');
  });

  it('maps level-5 non-structural violation to R5 tool lock', () => {
    const base = minimalGovernanceIR();
    const ir = {
      ...base,
      analysis: {
        ...base.analysis,
        violations: [{
          ruleId: 'R5/transact',
          level: 5,
          message: 'R5 tool requires approval',
          target: 'send_email',
          diagnosticCode: 'GOV-R5',
          fixSuggestions: [{ direction: 'tighten', description: 'Remove send_email', target: 'send_email' }],
          toolFuzzyMatches: [],
        }],
      },
    } as unknown as Parameters<typeof classifyIRViolations>[0];
    const classified = classifyIRViolations(ir);
    expect(classified).toHaveLength(1);
    expect(classified[0]!.severity).toBe('error');
    expect(classified[0]!.scope).toBe('isolated');
    expect(classified[0]!.tool).toBe('send_email');
  });

  it('maps level-3/4 violations to warnings', () => {
    const base = minimalGovernanceIR();
    const ir = {
      ...base,
      analysis: {
        ...base.analysis,
        violations: [{
          ruleId: 'style/reflow',
          level: 3,
          message: 'style drift',
          target: 'PREFS.md',
          diagnosticCode: 'GOV-STYLE',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        }],
      },
    } as unknown as Parameters<typeof classifyIRViolations>[0];
    const classified = classifyIRViolations(ir);
    expect(classified).toHaveLength(1);
    expect(classified[0]!.severity).toBe('warning');
  });

  it('skips info-only (level < 3) violations', () => {
    const base = minimalGovernanceIR();
    const ir = {
      ...base,
      analysis: {
        ...base.analysis,
        violations: [{
          ruleId: 'info/advisory',
          level: 1,
          message: 'just an FYI',
          target: 'SOUL.md',
          diagnosticCode: 'GOV-INFO',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        }],
      },
    } as unknown as Parameters<typeof classifyIRViolations>[0];
    const classified = classifyIRViolations(ir);
    expect(classified).toHaveLength(0);
  });
});

describe('POST /compile — violation-state wiring (CP-7 R1)', () => {
  let server: Server;
  afterEach(() => { server?.close(); });

  it('clean compile advances machine to CLEAN and records lastGoodVersion', async () => {
    const ir = minimalGovernanceIR();
    const host = new CompilationHost(async () => ir, '/test');
    const state = makeState();
    const machine = new ViolationStateMachine();

    const app = express();
    app.post('*', contentType());
    app.use(compileRouter(host, state, undefined, {
      machine,
      currentVersion: () => 42,
    }));
    server = await listen(app);

    const { status } = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(status).toBe(200);
    expect(machine.getState()).toBe(ViolationState.CLEAN);
    expect(machine.getLastGoodVersion()).toBe(42);
  });

  it('R5-level violation demotes machine to DEGRADED_R5; body still returns IR', async () => {
    const base = minimalGovernanceIR();
    const ir = {
      ...base,
      analysis: {
        ...base.analysis,
        violations: [{
          ruleId: 'R5/transact',
          level: 5,
          message: 'R5 tool',
          target: 'send_email',
          diagnosticCode: 'GOV-R5',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        }],
      },
    };
    const host = new CompilationHost(async () => ir as typeof ir, '/test');
    const state = makeState();
    const machine = new ViolationStateMachine();

    const app = express();
    app.post('*', contentType());
    app.use(compileRouter(host, state, undefined, {
      machine,
      currentVersion: () => 1,
    }));
    server = await listen(app);

    const { status, body } = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(status).toBe(200);
    const json = JSON.parse(body) as { ir: unknown };
    expect(json.ir).toBeTruthy();
    expect(machine.getState()).toBe(ViolationState.DEGRADED_R5);
    expect(machine.getBlockedTools()).toEqual(['send_email']);
  });

  it('structural halt demotes machine to ERROR', async () => {
    const base = minimalGovernanceIR();
    const ir = {
      ...base,
      conflicts: { ...base.conflicts, haltReason: 'UNPARSEABLE' },
      analysis: {
        ...base.analysis,
        violations: [{
          ruleId: 'parse/structural',
          level: 5,
          message: 'unparseable',
          target: 'SOUL.md',
          diagnosticCode: 'GOV-STRUCT',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        }],
      },
    };
    const host = new CompilationHost(async () => ir as typeof ir, '/test');
    const state = makeState();
    const machine = new ViolationStateMachine();

    const app = express();
    app.post('*', contentType());
    app.use(compileRouter(host, state, undefined, {
      machine,
      currentVersion: () => 7,
    }));
    server = await listen(app);

    const { status } = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(status).toBe(200);
    expect(machine.getState()).toBe(ViolationState.ERROR);
  });

  it('machine omitted → legacy path; no machine mutation', async () => {
    const ir = minimalGovernanceIR();
    const host = new CompilationHost(async () => ir, '/test');
    const state = makeState();
    const machine = new ViolationStateMachine();

    const app = express();
    app.post('*', contentType());
    // No options / no machine — legacy behaviour.
    app.use(compileRouter(host, state));
    server = await listen(app);

    await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    // Machine untouched because it was never wired.
    expect(machine.getState()).toBe(ViolationState.CLEAN);
    expect(machine.getLastGoodVersion()).toBeNull();
  });

  it('degraded compile with no prior last-good IR falls back to fresh IR', async () => {
    // Cold start: machine transitions to DEGRADED_R5 on first compile. There
    // is no prior last-good IR, so the route must still return a coherent
    // body — the fresh IR from the host — rather than 500.
    const base = minimalGovernanceIR();
    const ir = {
      ...base,
      analysis: {
        ...base.analysis,
        violations: [{
          ruleId: 'R5/transact',
          level: 5,
          message: 'R5',
          target: 'send_email',
          diagnosticCode: 'GOV-R5',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        }],
      },
    };
    const host = new CompilationHost(async () => ir as typeof ir, '/test');
    const state = makeState();
    const machine = new ViolationStateMachine();

    const app = express();
    app.post('*', contentType());
    app.use(compileRouter(host, state, undefined, {
      machine,
      currentVersion: () => 0,
    }));
    server = await listen(app);

    const { status, body } = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(status).toBe(200);
    const json = JSON.parse(body) as { ir: { analysis: { violations: unknown[] } } };
    expect(json.ir.analysis.violations).toHaveLength(1);
  });
});
