/**
 * L0 unit tests for PATCH /api/chunks/connections/allow-all.
 *
 * Validates the four behaviours we need partners (CAP UI + auditors) to be
 * able to rely on:
 *   1. Mixed workspace → only non-R5 tools enabled; summary counts match.
 *   2. All-R5 workspace → 0 enabled, 3 skipped with reason 'r5' (S05).
 *   3. Already-enabled tools are counted separately, not double-written.
 *   4. Audit sink receives the full structured record (enabled + skipped
 *      lists, actor, ISO timestamp).
 *
 * The harness mirrors `patch-chunks.unit.test.ts`: explicit middleware
 * chain, real StructuredEditor + ValidationPipeline, stubbed IR. No
 * dependency on `createApp` — keeps these true L0 tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import {
  StructuredEditor,
  ValidationPipeline,
  buildPatchError,
  createR5Validator,
  type FleetLockedError,
  type R5LockedError,
  type ValidationFailedError,
} from '@bic/claws-sdk/workspace-edit';
import type { GovernanceIR } from '@bic/claws-sdk';
import { CompilationHost } from '../../src/compilation-host.js';
import {
  allowAllRouter,
  type AllowAllAuditRecord,
  type AllowAllResponse,
} from '../../src/routes/allow-all.js';
import { patchEnvelopeMiddleware } from '../../src/middleware/validation-middleware.js';
import { governanceIRMixedRisk, MIXED_RISK_TOOLS_MD } from '../fixtures/mixed-risk-workspace.js';
import { governanceIRAllR5, ALL_R5_TOOLS_MD } from '../fixtures/all-r5-workspace.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nAllow-all unit.\n\n## Purpose\n\n- allow\n';

interface Harness {
  readonly server: Server;
  readonly root: string;
  readonly auditRecords: AllowAllAuditRecord[];
  close(): Promise<void>;
}

interface HarnessOverrides {
  readonly ir?: GovernanceIR;
  readonly toolsMd?: string | null;
  readonly pipelineBuilder?: (ir: GovernanceIR) => ValidationPipeline;
  readonly audit?: (record: AllowAllAuditRecord) => void | Promise<void>;
  readonly compileImpl?: (baseIr: GovernanceIR) => Promise<GovernanceIR>;
  readonly writeSoul?: boolean;
  readonly omitNow?: boolean;
}

async function buildHarness(overrides: HarnessOverrides = {}): Promise<Harness> {
  const root = await mkdtemp(join(tmpdir(), 'allow-all-unit-'));
  if (overrides.writeSoul !== false) {
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  }
  if (overrides.toolsMd !== null) {
    await writeFile(join(root, 'TOOLS.md'), overrides.toolsMd ?? MIXED_RISK_TOOLS_MD, 'utf-8');
  }

  const ir = overrides.ir ?? governanceIRMixedRisk();
  const compileFn = overrides.compileImpl !== undefined
    ? async (): Promise<GovernanceIR> => overrides.compileImpl!(ir)
    : async (): Promise<GovernanceIR> => ir;
  const host = new CompilationHost(compileFn, root);
  // Pre-compile so the route sees a cached IR. Swallow compile failures so
  // tests can assert the 409 COMPILATION_REQUIRED branch without exploding
  // during setup — the route's own compile attempt still runs.
  try {
    await host.compile();
  } catch {
    // Test cases that assert 409 rely on the cache staying empty.
  }

  const auditRecords: AllowAllAuditRecord[] = [];
  const defaultAudit = (record: AllowAllAuditRecord): void => {
    auditRecords.push(record);
  };

  const app = express();
  app.patch('*', patchEnvelopeMiddleware());
  app.use(express.json({ limit: '1mb' }));
  const routerOptions: Parameters<typeof allowAllRouter>[1] = {
    workspaceRoot: root,
    editor: new StructuredEditor({ workspaceRoot: root }),
    pipelineFactory: overrides.pipelineBuilder ?? ((compiledIr) => {
      const pipeline = new ValidationPipeline();
      pipeline.addValidator(createR5Validator(compiledIr));
      return pipeline;
    }),
    audit: overrides.audit ?? defaultAudit,
  };
  if (overrides.omitNow !== true) {
    (routerOptions as { now: () => Date }).now = (): Date => new Date('2026-04-17T12:00:00.000Z');
  }
  app.use('/api/chunks', allowAllRouter(host, routerOptions));

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  return {
    server,
    root,
    auditRecords,
    close: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    },
  };
}

async function patch(
  server: Server,
  path: string,
  body: unknown = {},
): Promise<{ status: number; body: string }> {
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

let harness: Harness | undefined;

afterEach(async () => {
  if (harness !== undefined) {
    await harness.close();
    harness = undefined;
  }
});

describe('PATCH /api/chunks/connections/allow-all — L0 unit', () => {
  it('enables every non-R5 tool and reports counts in the summary', async () => {
    harness = await buildHarness();
    const res = await patch(harness.server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as AllowAllResponse;
    // Mixed fixture has 4 non-R5 tools (ping, read_inbox, post_message, send_mail)
    // and 1 R5 (delete_site). All start disabled.
    expect(body.summary.enabled).toBe(4);
    expect(body.summary.alreadyEnabled).toBe(0);
    const skippedR5 = body.summary.skipped.filter((s) => s.reason === 'r5');
    expect(skippedR5).toHaveLength(1);
    expect(skippedR5[0]!.tool).toBe('delete_site');

    // On-disk assertion: the R5 section must still read `enabled: false`.
    const onDisk = await readFile(join(harness.root, 'TOOLS.md'), 'utf-8');
    expect(onDisk).toMatch(/## delete_site\s*\n\n- enabled: false/);
    // All non-R5 tools should have flipped to true.
    expect(onDisk).toMatch(/## ping\s*\n\n- enabled: true/);
    expect(onDisk).toMatch(/## send_mail\s*\n\n- enabled: true/);
  });

  it('returns 200 with 0 enabled when every tool is R5 (S05)', async () => {
    harness = await buildHarness({
      ir: governanceIRAllR5(),
      toolsMd: ALL_R5_TOOLS_MD,
    });
    const res = await patch(harness.server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as AllowAllResponse;
    expect(body.summary.enabled).toBe(0);
    expect(body.summary.alreadyEnabled).toBe(0);
    expect(body.summary.skipped).toHaveLength(3);
    for (const s of body.summary.skipped) {
      expect(s.reason).toBe('r5');
    }

    // Every R5 tool must still be disabled on disk.
    const onDisk = await readFile(join(harness.root, 'TOOLS.md'), 'utf-8');
    expect(onDisk).not.toMatch(/enabled: true/);
  });

  it('counts already-enabled tools separately from newly-enabled ones', async () => {
    // Pre-enable read_inbox on disk so the planner finds 3 new + 1 already.
    const tools = MIXED_RISK_TOOLS_MD.replace(
      '## read_inbox\n\n- enabled: false',
      '## read_inbox\n\n- enabled: true',
    );
    harness = await buildHarness({ toolsMd: tools });
    const res = await patch(harness.server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as AllowAllResponse;
    expect(body.summary.enabled).toBe(3);
    expect(body.summary.alreadyEnabled).toBe(1);
  });

  it('returns 503 COMPILATION_ERRORED when the IR halted', async () => {
    const erroredIR = {
      ...governanceIRMixedRisk(),
      conflicts: {
        oboConflicts: [],
        multiConstraintConflicts: [],
        haltReason: 'schema-diverged',
        hasOboWithoutElicit: false,
        totalConflicts: 0,
      },
    };
    harness = await buildHarness({ ir: erroredIR });
    const res = await patch(harness.server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(503);
    const body = JSON.parse(res.body) as { error: { code: string; details: { haltReason: string } } };
    expect(body.error.code).toBe('COMPILATION_ERRORED');
    expect(body.error.details.haltReason).toBe('schema-diverged');
  });

  it('returns 409 COMPILATION_REQUIRED when no IR is available', async () => {
    // compile() throws — cache stays empty so resolveIR returns 'missing'.
    harness = await buildHarness({
      compileImpl: async () => {
        throw new Error('compile failed');
      },
    });
    const res = await patch(harness.server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(409);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('COMPILATION_REQUIRED');
  });

  it('STALE IR narrows the batch by excluding tools flagged by violations', async () => {
    const staleIR: GovernanceIR = {
      ...governanceIRMixedRisk(),
      analysis: {
        ...governanceIRMixedRisk().analysis,
        violations: [
          {
            ruleId: 'rule-1',
            level: 4,
            message: 'send_mail requires review',
            target: 'oc://TOOLS.md/send_mail',
            diagnosticCode: 'SEND_MAIL_REVIEW',
            fixSuggestions: [],
            toolFuzzyMatches: [],
          },
          {
            // Dotted-form and bare-name targets exercise the other parse branches.
            ruleId: 'rule-2',
            level: 3,
            message: 'post_message needs scrub',
            target: 'TOOLS.post_message',
            diagnosticCode: 'POST_SCRUB',
            fixSuggestions: [],
            toolFuzzyMatches: [],
          },
          {
            ruleId: 'rule-3',
            level: 3,
            message: 'ping unreviewed',
            target: 'ping',
            diagnosticCode: 'PING_REVIEW',
            fixSuggestions: [],
            toolFuzzyMatches: [],
          },
          // Malformed targets should be ignored, not crash the planner.
          {
            ruleId: 'rule-4',
            level: 3,
            message: '',
            target: '',
            diagnosticCode: 'EMPTY',
            fixSuggestions: [],
            toolFuzzyMatches: [],
          },
          {
            ruleId: 'rule-5',
            level: 2,
            message: '',
            target: 'something/with/slashes',
            diagnosticCode: 'SLASH',
            fixSuggestions: [],
            toolFuzzyMatches: [],
          },
        ],
      },
    };
    harness = await buildHarness({ ir: staleIR });
    const res = await patch(harness.server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as AllowAllResponse;
    // send_mail, post_message, ping are skipped via violation; read_inbox is the
    // only R1-R4 tool still eligible; delete_site is R5.
    expect(body.summary.enabled).toBe(1);
    const violationSkips = body.summary.skipped.filter((s) => s.reason === 'violation');
    expect(violationSkips.map((s) => s.tool).sort()).toEqual(['ping', 'post_message', 'send_mail']);
  });

  it('maps pipeline PatchError codes to skip reasons in the response summary', async () => {
    // Pipeline fails every validate() with FLEET_LOCKED to exercise the
    // fleet-locked mapping in mapPatchReason.
    harness = await buildHarness({
      pipelineBuilder: () => {
        const pipeline = new ValidationPipeline();
        pipeline.addValidator({
          name: 'fleet',
          validate: (op) => ({
            ok: false,
            error: buildPatchError<FleetLockedError>({
              code: 'FLEET_LOCKED',
              ocPath: `oc://${op.file}/${op.section}/enabled`,
              reason: 'field-locked',
              policyFile: '/tmp/fleet.json',
              lockSource: 'fleet',
            }),
          }),
        });
        return pipeline;
      },
    });
    const res = await patch(harness.server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as AllowAllResponse;
    expect(body.summary.enabled).toBe(0);
    // The planner's R5 skip survives merge with pipeline FLEET_LOCKED skips.
    const reasons = new Set(body.summary.skipped.map((s) => s.reason));
    expect(reasons.has('fleet-locked')).toBe(true);
    expect(reasons.has('r5')).toBe(true);
  });

  it('maps every PatchError code mapPatchReason knows about', async () => {
    // Exercise R5_LOCKED + FILE_NOT_EDITABLE + fallback paths through a
    // pipeline that cycles error codes by section name.
    const errorByTool: Record<string, string> = {
      ping: 'R5_LOCKED',
      read_inbox: 'FILE_NOT_EDITABLE',
      post_message: 'ROLLBACK_FAILED', // unknown → 'violation'
      send_mail: 'FLEET_LOCKED',
    };
    harness = await buildHarness({
      pipelineBuilder: () => {
        const pipeline = new ValidationPipeline();
        pipeline.addValidator({
          name: 'cycling',
          validate: (op) => {
            const code = errorByTool[op.section];
            if (code === undefined) return { ok: true };
            if (code === 'R5_LOCKED') {
              return {
                ok: false,
                error: buildPatchError<R5LockedError>({
                  code: 'R5_LOCKED',
                  ocPath: `oc://${op.file}/${op.section}/enabled`,
                  tool: op.section,
                  lockSource: 'r5',
                }),
              };
            }
            if (code === 'FLEET_LOCKED') {
              return {
                ok: false,
                error: buildPatchError<FleetLockedError>({
                  code: 'FLEET_LOCKED',
                  ocPath: `oc://${op.file}/${op.section}/enabled`,
                  reason: 'field-locked',
                  policyFile: '/x',
                  lockSource: 'fleet',
                }),
              };
            }
            if (code === 'FILE_NOT_EDITABLE') {
              return {
                ok: false,
                error: buildPatchError({
                  code: 'FILE_NOT_EDITABLE',
                  ocPath: `oc://${op.file}/${op.section}`,
                  file: op.file,
                }),
              };
            }
            return {
              ok: false,
              error: buildPatchError({
                code: 'ROLLBACK_FAILED',
                ocPath: `oc://${op.file}/${op.section}`,
                filePath: '/x',
                preEditHash: '',
                postEditHash: '',
                compilerMessage: 'boom',
                rollbackOk: false,
                timestamp: '2026-04-17T00:00:00.000Z',
              }),
            };
          },
        });
        return pipeline;
      },
    });
    const res = await patch(harness.server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as AllowAllResponse;
    const reasonFor = (t: string) => body.summary.skipped.find((s) => s.tool === t)?.reason;
    expect(reasonFor('ping')).toBe('r5');
    expect(reasonFor('read_inbox')).toBe('unclassified');
    expect(reasonFor('post_message')).toBe('violation');
    expect(reasonFor('send_mail')).toBe('fleet-locked');
  });

  it('maps unknown pipeline error codes to reason "violation"', async () => {
    harness = await buildHarness({
      pipelineBuilder: () => {
        const pipeline = new ValidationPipeline();
        pipeline.addValidator({
          name: 'bespoke',
          validate: (op) => ({
            ok: false,
            error: buildPatchError<ValidationFailedError>({
              code: 'VALIDATION_FAILED',
              ocPath: `oc://${op.file}/${op.section}`,
              subCode: 'BESPOKE',
            }),
          }),
        });
        return pipeline;
      },
    });
    const res = await patch(harness.server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as AllowAllResponse;
    // Pipeline-mapped reason must be present for each non-R5 tool.
    const violations = body.summary.skipped.filter((s) => s.reason === 'violation');
    expect(violations.length).toBeGreaterThan(0);
  });

  it('handles a missing TOOLS.md without crashing (preEnabled falls to undefined)', async () => {
    // No TOOLS.md on disk, but the IR still has tools → editor will fail
    // every apply and every tool lands in pipelineSkipped as 'violation'.
    // The route must still respond 200 with the summary, not throw.
    const ir = governanceIRMixedRisk();
    harness = await buildHarness({ ir, toolsMd: null });
    const res = await patch(harness.server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as AllowAllResponse;
    expect(body.summary.enabled).toBe(0);
    // Every non-R5 tool should end up skipped (editor couldn't write).
    const violationSkips = body.summary.skipped.filter((s) => s.reason === 'violation');
    expect(violationSkips.length).toBeGreaterThan(0);
  });

  it('returns 500 AUDIT_FAILED when the audit sink throws (audit is a required invariant)', async () => {
    // CISO E2: audit is a required invariant. When the sink fails, the
    // writes have committed on disk but the audit trail is broken, so
    // the response MUST signal the incomplete outcome — the 200 is wrong.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      harness = await buildHarness({
        audit: () => {
          throw new Error('sink down');
        },
      });
      const res = await patch(harness.server, '/api/chunks/connections/allow-all');
      expect(res.status).toBe(500);
      const body = JSON.parse(res.body) as {
        error: {
          code: string;
          message: string;
          enabled: string[];
          skipped: { tool: string; reason: string }[];
        };
      };
      expect(body.error.code).toBe('AUDIT_FAILED');
      // Operator visibility: the committed file list is surfaced so the
      // audit trail can be reconstructed by hand.
      expect(body.error.enabled.length).toBeGreaterThan(0);
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('audit-sink success keeps the 200 path intact', async () => {
    // Regression guard: the AUDIT_FAILED path must only trigger on throw;
    // a healthy sink still yields a 200 chunk response.
    let sinkCalls = 0;
    harness = await buildHarness({
      audit: () => {
        sinkCalls += 1;
      },
    });
    const res = await patch(harness.server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(200);
    expect(sinkCalls).toBe(1);
  });

  it('uses Date.now() when no clock is injected', async () => {
    harness = await buildHarness({ omitNow: true });
    const before = Date.now();
    const res = await patch(harness.server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(200);
    expect(harness.auditRecords).toHaveLength(1);
    const ts = new Date(harness.auditRecords[0]!.timestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(Date.now());
  });

  it('falls back to the defaultResolveActor (anonymous) when no header is set', async () => {
    harness = await buildHarness();
    // The default patch() helper does not send X-Actor-Id, so the record
    // must read `anonymous`.
    const res = await patch(harness.server, '/api/chunks/connections/allow-all');
    expect(res.status).toBe(200);
    expect(harness.auditRecords).toHaveLength(1);
    expect(harness.auditRecords[0]!.actor).toBe('anonymous');
  });

  it('emits a structured audit record with enabled + skipped lists and actor', async () => {
    harness = await buildHarness();
    const res = await fetch(
      `http://127.0.0.1:${String((harness.server.address() as { port: number }).port)}/api/chunks/connections/allow-all`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '2',
          'X-Actor-Id': 'admin@contoso.com',
        },
        body: '{}',
      },
    );
    expect(res.status).toBe(200);
    expect(harness.auditRecords).toHaveLength(1);
    const record = harness.auditRecords[0]!;
    expect(record.actor).toBe('admin@contoso.com');
    expect(record.timestamp).toBe('2026-04-17T12:00:00.000Z');
    expect(record.outcome).toBe('ok');
    expect(record.enabled).toEqual(
      expect.arrayContaining(['ping', 'read_inbox', 'post_message', 'send_mail']),
    );
    expect(record.enabled).toHaveLength(4);
    expect(record.skipped).toEqual([{ tool: 'delete_site', reason: 'r5' }]);
    expect(record.alreadyEnabled).toHaveLength(0);
  });
});

describe('PATCH /api/chunks/connections/allow-all — compile-failure rollback (J1)', () => {
  /**
   * Build a harness whose CompilationHost succeeds on the first compile
   * (so the route sees a cached IR for planning) and throws on every
   * subsequent compile (the post-write recompile inside the locked
   * window). The route must then roll TOOLS.md back to its pre-edit
   * bytes and respond 422 COMPILATION_FAILED without invoking the
   * audit sink.
   */
  async function buildCompileFailureHarness(
    overrides: HarnessOverrides = {},
  ): Promise<Harness> {
    const root = await mkdtemp(join(tmpdir(), 'allow-all-j1-'));
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    await writeFile(
      join(root, 'TOOLS.md'),
      overrides.toolsMd ?? MIXED_RISK_TOOLS_MD,
      'utf-8',
    );

    const ir = overrides.ir ?? governanceIRMixedRisk();
    let calls = 0;
    const compileFn = async (): Promise<GovernanceIR> => {
      calls += 1;
      if (calls === 1) return ir;
      throw new Error(`synthetic compile failure (call ${String(calls)})`);
    };
    const host = new CompilationHost(compileFn, root);
    // Prime the cache so the route's pre-plan resolveIR returns 'ok'.
    await host.compile();

    const auditRecords: AllowAllAuditRecord[] = [];
    const app = express();
    app.patch('*', patchEnvelopeMiddleware());
    app.use(express.json({ limit: '1mb' }));
    const routerOptions: Parameters<typeof allowAllRouter>[1] = {
      workspaceRoot: root,
      editor: new StructuredEditor({ workspaceRoot: root }),
      pipelineFactory: (compiledIr) => {
        const pipeline = new ValidationPipeline();
        pipeline.addValidator(createR5Validator(compiledIr));
        return pipeline;
      },
      audit: overrides.audit ?? ((record) => {
        auditRecords.push(record);
      }),
    };
    if (overrides.omitNow !== true) {
      (routerOptions as { now: () => Date }).now = (): Date =>
        new Date('2026-04-17T12:00:00.000Z');
    }
    app.use('/api/chunks', allowAllRouter(host, routerOptions));

    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    return {
      server,
      root,
      auditRecords,
      close: async () => {
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
        });
        await rm(root, { recursive: true, force: true });
      },
    };
  }

  it('rolls back TOOLS.md to the pre-edit bytes when post-write compile throws', async () => {
    harness = await buildCompileFailureHarness();
    const beforeBytes = await readFile(join(harness.root, 'TOOLS.md'), 'utf-8');

    const res = await patch(
      harness.server,
      '/api/chunks/connections/allow-all',
    );

    // 422 COMPILATION_FAILED — distinct from validation (400) and
    // degraded mode (503) so commit-on-success middleware skips the
    // snapshot and partners know the writes never persisted.
    expect(res.status).toBe(422);
    const body = JSON.parse(res.body) as {
      error: { code: string; message: string; compilerMessage?: string };
    };
    expect(body.error.code).toBe('COMPILATION_FAILED');
    expect(body.error.compilerMessage).toMatch(/synthetic compile failure/);

    // On-disk bytes must match the pre-request snapshot (byte-for-byte
    // rollback — lossless OC fidelity rule).
    const afterBytes = await readFile(join(harness.root, 'TOOLS.md'), 'utf-8');
    expect(afterBytes).toBe(beforeBytes);
    // Extra guard against partial writes — the original file had every
    // tool's `enabled: false`, so post-rollback should match.
    expect(afterBytes).not.toMatch(/- enabled: true/);
  });

  it('does NOT invoke the audit sink when the compile-failure rollback fires', async () => {
    // Audit is a success-path contract — a rolled-back request must not
    // produce an audit record, otherwise compliance tooling sees
    // evidence of writes that never persisted.
    let sinkCalls = 0;
    harness = await buildCompileFailureHarness({
      audit: () => {
        sinkCalls += 1;
      },
    });
    const res = await patch(
      harness.server,
      '/api/chunks/connections/allow-all',
    );
    expect(res.status).toBe(422);
    expect(sinkCalls).toBe(0);
    expect(harness.auditRecords).toHaveLength(0);
  });

  it('surfaces 500 ROLLBACK_FAILED when the post-compile rollback itself fails', async () => {
    // Simulate a rollback failure by removing the workspace root after
    // the editor takes its snapshot but before the post-compile restore
    // runs. The route must surface ROLLBACK_FAILED so the operator
    // signal can never be mistaken for the healthier compile-only
    // failure.
    const root = await mkdtemp(join(tmpdir(), 'allow-all-j1-rf-'));
    await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
    await writeFile(join(root, 'TOOLS.md'), MIXED_RISK_TOOLS_MD, 'utf-8');
    const ir = governanceIRMixedRisk();
    let calls = 0;
    const compileFn = async (): Promise<GovernanceIR> => {
      calls += 1;
      if (calls === 1) return ir;
      // Destroy the workspace between apply and rollback so tx.writeRaw
      // hits ENOENT when it tries to restore the snapshot.
      await rm(root, { recursive: true, force: true });
      throw new Error('compile failed AND workspace gone');
    };
    const host = new CompilationHost(compileFn, root);
    await host.compile();

    const app = express();
    app.patch('*', patchEnvelopeMiddleware());
    app.use(express.json({ limit: '1mb' }));
    app.use('/api/chunks', allowAllRouter(host, {
      workspaceRoot: root,
      editor: new StructuredEditor({ workspaceRoot: root }),
      pipelineFactory: (compiledIr) => {
        const pipeline = new ValidationPipeline();
        pipeline.addValidator(createR5Validator(compiledIr));
        return pipeline;
      },
      now: () => new Date('2026-04-17T12:00:00.000Z'),
    }));
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await patch(server, '/api/chunks/connections/allow-all');
      expect(res.status).toBe(500);
      const body = JSON.parse(res.body) as { error: { code: string } };
      expect(body.error.code).toBe('ROLLBACK_FAILED');
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      // Root already removed by the synthetic compile failure above.
    }
  });

  it('returns 422 (not rollback path) when compile fails and zero edits actually applied', async () => {
    // Edge case: every tool is either R5 or violation-skipped, so the
    // apply loop never writes. If the post-write compile then fails,
    // there is nothing to roll back — the route surfaces 422 with
    // `rolledBack: true` (trivially), audit sink is not called.
    const allR5Harness = await buildCompileFailureHarness({
      ir: governanceIRAllR5(),
      toolsMd: ALL_R5_TOOLS_MD,
    });
    harness = allR5Harness;
    const beforeBytes = await readFile(
      join(harness.root, 'TOOLS.md'),
      'utf-8',
    );
    const res = await patch(
      harness.server,
      '/api/chunks/connections/allow-all',
    );
    expect(res.status).toBe(422);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('COMPILATION_FAILED');
    // No rollback executed because no writes happened — file identical.
    const afterBytes = await readFile(join(harness.root, 'TOOLS.md'), 'utf-8');
    expect(afterBytes).toBe(beforeBytes);
  });
});
