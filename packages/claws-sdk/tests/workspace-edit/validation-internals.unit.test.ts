/**
 * Internal branch coverage for validation layer — exercises error-message
 * templates, fleet policy loader, glob matching, and deny-removal warning
 * paths that the black-box ValidationPipeline tests do not reach.
 *
 * These tests are deliberately focused on uncovered branches rather than
 * business intent. Business intent is covered by `validation.unit.test.ts`
 * and the integration/accept tiers.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ValidationPipeline,
  buildPatchError,
  createCachedFleetPolicyLoader,
  createDenyRemovalValidator,
  createFleetValidator,
  createGovernanceValidator,
  createR5Validator,
  isPatchError,
  loadFleetPolicy,
  ocPathToRoute,
  PATCH_ERROR_LABELS,
  renderPatchErrorMessage,
  type DenyRemovalEdit,
  type EditOperation,
  type FleetPolicyLoadResult,
  type PatchError,
  type ProvenanceChain,
} from '../../src/workspace-edit/index.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'validation-internals-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('error-messages — each code renders and has a label', () => {
  const samples: ReadonlyArray<[PatchError['code'], PatchError]> = [
    ['R5_LOCKED', { code: 'R5_LOCKED', ocPath: 'oc://TOOLS.md/t/enabled', message: '', tool: 't', lockSource: 'r5' }],
    ['FLEET_LOCKED', { code: 'FLEET_LOCKED', ocPath: 'oc://TOOLS.md/t/enabled', message: '', reason: 'policy-missing', policyFile: '/a', lockSource: 'fleet' }],
    ['FLEET_LOCKED', { code: 'FLEET_LOCKED', ocPath: 'oc://TOOLS.md/t/enabled', message: '', reason: 'policy-corrupt', policyFile: '/a', lockSource: 'fleet' }],
    ['FLEET_LOCKED', { code: 'FLEET_LOCKED', ocPath: 'oc://TOOLS.md/t/enabled', message: '', reason: 'field-locked', policyFile: '/a', lockSource: 'fleet' }],
    ['GOVERNANCE_DENIED', {
      code: 'GOVERNANCE_DENIED', ocPath: 'oc://x', message: '', lockSource: 'governance',
      provenance: { policySource: 'p', ruleId: 'r', governanceFile: 'f', origin: 'user-authored' },
    }],
    ['VALIDATION_FAILED', { code: 'VALIDATION_FAILED', ocPath: 'oc://x', message: '', subCode: 'EDIT_FIELD_REQUIRED' }],
    ['FILE_NOT_EDITABLE', { code: 'FILE_NOT_EDITABLE', ocPath: 'oc://x', message: '', file: 'AGENTS.md' }],
    ['COMPILATION_FAILED', { code: 'COMPILATION_FAILED', ocPath: 'oc://x', message: '', compilerMessage: 'boom' }],
    ['ROLLBACK_FAILED', { code: 'ROLLBACK_FAILED', ocPath: 'oc://x', message: '', filesystemState: 'remnant' }],
    ['UNKNOWN_ERROR', { code: 'UNKNOWN_ERROR', ocPath: 'oc://x', message: '', cause: 'unexpected' }],
  ];

  it('renders each code and each variant to a non-empty string', () => {
    for (const [code, err] of samples) {
      const rendered = renderPatchErrorMessage(err);
      expect(rendered.length).toBeGreaterThan(0);
      expect(PATCH_ERROR_LABELS[code]).toBeDefined();
    }
  });

  it('buildPatchError attaches rendered message', () => {
    const built = buildPatchError<Exclude<PatchError, { code: string; message: string }>>({
      code: 'ROLLBACK_FAILED',
      ocPath: 'oc://TOOLS.md',
      filesystemState: 'tmp+bak both present',
    } as unknown as Omit<PatchError, 'message'>);
    expect(built.message).toContain('ROLLBACK_FAILED');
    expect(built.message).toContain('tmp+bak');
  });
});

describe('ocPathToRoute', () => {
  it('maps oc:// to /api/oc/ with URL-encoding of segments', () => {
    expect(ocPathToRoute('oc://TOOLS.md/Tools/send-email')).toBe('/api/oc/TOOLS.md/Tools/send-email');
    expect(ocPathToRoute('oc://SOUL.md/Deny Rules')).toBe('/api/oc/SOUL.md/Deny%20Rules');
  });

  it('preserves query parameters verbatim', () => {
    expect(ocPathToRoute('oc://TOOLS.md?session=cron:daily')).toBe('/api/oc/TOOLS.md?session=cron:daily');
  });

  it('throws on missing scheme', () => {
    expect(() => ocPathToRoute('TOOLS.md/x')).toThrow(/missing oc:\/\//);
  });
});

describe('isPatchError', () => {
  it('rejects missing ocPath', () => {
    expect(isPatchError({ code: 'R5_LOCKED', message: 'm' })).toBe(false);
  });
  it('rejects missing message', () => {
    expect(isPatchError({ code: 'R5_LOCKED', ocPath: 'oc://x' })).toBe(false);
  });
});

describe('loadFleetPolicy — filesystem loader branches', () => {
  it('returns ok for valid policy JSON', async () => {
    const path = join(tmp, 'fleet.json');
    await writeFile(path, JSON.stringify({ overrides: [] }), 'utf-8');
    const r = await loadFleetPolicy(path);
    expect(r.state).toBe('ok');
  });

  it('returns missing when file does not exist', async () => {
    const r = await loadFleetPolicy(join(tmp, 'missing.json'));
    expect(r.state).toBe('missing');
  });

  it('returns corrupt on invalid JSON', async () => {
    const path = join(tmp, 'fleet.json');
    await writeFile(path, '{ invalid', 'utf-8');
    const r = await loadFleetPolicy(path);
    expect(r.state).toBe('corrupt');
  });

  it('returns corrupt on non-object JSON', async () => {
    const path = join(tmp, 'fleet.json');
    await writeFile(path, '"a string"', 'utf-8');
    const r = await loadFleetPolicy(path);
    expect(r.state).toBe('corrupt');
  });

  it('returns corrupt when readFile itself fails (e.g. EISDIR)', async () => {
    // Pointing the loader at a directory forces readFile → EISDIR, which
    // the loader maps to `corrupt`.
    const r = await loadFleetPolicy(tmp);
    expect(r.state).toBe('corrupt');
  });

  it('returns corrupt when overrides is not an array', async () => {
    const path = join(tmp, 'fleet.json');
    await writeFile(path, '{"overrides": "not an array"}', 'utf-8');
    const r = await loadFleetPolicy(path);
    expect(r.state).toBe('corrupt');
  });
});

describe('createFleetValidator — override matching', () => {
  it('field-locked when override requires approval and edit toggles enabled=false', async () => {
    const path = join(tmp, 'fleet.json');
    await writeFile(
      path,
      JSON.stringify({
        overrides: [
          {
            tool: 'read_file',
            requires_approval: true,
            reason: 'pinned',
            authorizedBy: 'admin',
            authorizedAt: '2026-01-01T00:00:00Z',
          },
        ],
      }),
      'utf-8',
    );
    const v = createFleetValidator({ policyFile: path });
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_file',
      field: 'enabled',
      value: false,
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    if (r.error.code !== 'FLEET_LOCKED') throw new Error('expected FLEET_LOCKED');
    expect(r.error.reason).toBe('field-locked');
  });

  it('passes when override requires approval but edit is not a disabling toggle', async () => {
    const path = join(tmp, 'fleet.json');
    await writeFile(
      path,
      JSON.stringify({
        overrides: [
          { tool: 'read_file', requires_approval: true, reason: 'r', authorizedBy: 'a', authorizedAt: 'z' },
        ],
      }),
      'utf-8',
    );
    const v = createFleetValidator({ policyFile: path });
    const op: EditOperation = {
      kind: 'set',
      file: 'TOOLS.md',
      section: 'read_file',
      field: 'description',
      value: 'x',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(true);
  });

  it('passes edits to non-TOOLS.md files even with overrides present', async () => {
    const path = join(tmp, 'fleet.json');
    await writeFile(path, JSON.stringify({ overrides: [] }), 'utf-8');
    const v = createFleetValidator({ policyFile: path });
    const op: EditOperation = {
      kind: 'set',
      file: 'SETTINGS.md',
      section: 's',
      field: 'f',
      value: 'v',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(true);
  });

  it('fleet missing path uses op.section-only ocPath for append edits', async () => {
    const v = createFleetValidator({
      policyFile: '/abs/missing.json',
      loader: async () => ({ state: 'missing' }),
    });
    const op: EditOperation = {
      kind: 'append',
      file: 'TOOLS.md',
      section: 'read_file',
      item: 'new line',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.error.ocPath).toBe('oc://TOOLS.md/read_file');
  });

  it('does not trigger field-locked when override requires_approval is false', async () => {
    const path = join(tmp, 'fleet.json');
    await writeFile(
      path,
      JSON.stringify({
        overrides: [
          { tool: 'read_file', requires_approval: false, reason: 'r', authorizedBy: 'a', authorizedAt: 'z' },
        ],
      }),
      'utf-8',
    );
    const v = createFleetValidator({ policyFile: path });
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_file',
      field: 'enabled',
      value: false,
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(true);
  });
});

describe('createFleetValidator — C2 broadened scope (guarded fields, append/remove)', () => {
  const lockedFleet = async (): Promise<FleetPolicyLoadResult> => ({
    state: 'ok',
    policy: {
      overrides: [
        {
          tool: 'read_file',
          requires_approval: true,
          reason: 'fleet-hold',
          authorizedBy: 'admin',
          authorizedAt: '2026-01-01T00:00:00Z',
        },
      ],
    },
  });

  const makeValidator = () =>
    createFleetValidator({ policyFile: '/abs/fleet.json', loader: lockedFleet });

  it('rejects set risk on a fleet-locked tool with FLEET_LOCKED', async () => {
    const v = makeValidator();
    const op: EditOperation = {
      kind: 'set',
      file: 'TOOLS.md',
      section: 'read_file',
      field: 'risk',
      value: 'low',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    if (r.error.code !== 'FLEET_LOCKED') throw new Error('expected FLEET_LOCKED');
    expect(r.error.reason).toBe('field-locked');
    expect(r.error.ocPath).toBe('oc://TOOLS.md/read_file/risk');
  });

  it('rejects set obo on a fleet-locked tool with FLEET_LOCKED', async () => {
    const v = makeValidator();
    const op: EditOperation = {
      kind: 'set',
      file: 'TOOLS.md',
      section: 'read_file',
      field: 'obo',
      value: 'false',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    if (r.error.code !== 'FLEET_LOCKED') throw new Error('expected FLEET_LOCKED');
    expect(r.error.reason).toBe('field-locked');
  });

  it('rejects set oboFlag on a fleet-locked tool with FLEET_LOCKED', async () => {
    const v = makeValidator();
    const op: EditOperation = {
      kind: 'set',
      file: 'TOOLS.md',
      section: 'read_file',
      field: 'oboFlag',
      value: 'off',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.error.code).toBe('FLEET_LOCKED');
  });

  it('rejects append on a fleet-locked tool with FLEET_LOCKED', async () => {
    const v = makeValidator();
    const op: EditOperation = {
      kind: 'append',
      file: 'TOOLS.md',
      section: 'read_file',
      item: 'new-allowlist-entry',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    if (r.error.code !== 'FLEET_LOCKED') throw new Error('expected FLEET_LOCKED');
    expect(r.error.reason).toBe('field-locked');
  });

  it('rejects remove on a fleet-locked tool with FLEET_LOCKED', async () => {
    const v = makeValidator();
    const op: EditOperation = {
      kind: 'remove',
      file: 'TOOLS.md',
      section: 'read_file',
      item: 'deny-entry',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.error.code).toBe('FLEET_LOCKED');
  });

  it('allows set of non-guarded field (description) on a fleet-locked tool', async () => {
    const v = makeValidator();
    const op: EditOperation = {
      kind: 'set',
      file: 'TOOLS.md',
      section: 'read_file',
      field: 'description',
      value: 'updated copy',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(true);
  });

  it('allows set of non-guarded field (display_name) on a fleet-locked tool', async () => {
    const v = makeValidator();
    const op: EditOperation = {
      kind: 'set',
      file: 'TOOLS.md',
      section: 'read_file',
      field: 'display_name',
      value: 'Read File',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(true);
  });

  it('allows toggle of non-enabled field on a fleet-locked tool', async () => {
    const v = makeValidator();
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_file',
      field: 'deprecated',
      value: true,
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(true);
  });

  it('ignores edits on tools without a fleet override (non-locked tool)', async () => {
    const v = makeValidator();
    const op: EditOperation = {
      kind: 'set',
      file: 'TOOLS.md',
      section: 'write_file',
      field: 'risk',
      value: 'low',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(true);
  });

  it('still rejects toggle enabled=false on fleet-locked tool (legacy behaviour preserved)', async () => {
    const v = makeValidator();
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_file',
      field: 'enabled',
      value: false,
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.error.code).toBe('FLEET_LOCKED');
  });
});

describe('createCachedFleetPolicyLoader — C1 mtime cache', () => {
  it('20-op batch triggers exactly one full read and 20 cheap stat probes', async () => {
    let baseLoaderCalls = 0;
    let statCalls = 0;
    const cache = createCachedFleetPolicyLoader({
      policyFile: '/abs/fleet.json',
      baseLoader: async () => {
        baseLoaderCalls++;
        return {
          state: 'ok',
          policy: { overrides: [] },
        };
      },
      statProbe: async () => {
        statCalls++;
        return { mtimeMs: 1000 };
      },
    });

    for (let i = 0; i < 20; i++) {
      const r = await cache.load();
      expect(r.state).toBe('ok');
    }

    expect(baseLoaderCalls).toBe(1);
    expect(statCalls).toBe(20);
    expect(cache.stats.reads()).toBe(1);
    expect(cache.stats.invocations()).toBe(20);
  });

  it('mtime advance triggers a fresh read', async () => {
    let baseLoaderCalls = 0;
    let currentMtime = 1000;
    const cache = createCachedFleetPolicyLoader({
      policyFile: '/abs/fleet.json',
      baseLoader: async () => {
        baseLoaderCalls++;
        return { state: 'ok', policy: { overrides: [] } };
      },
      statProbe: async () => ({ mtimeMs: currentMtime }),
    });

    await cache.load(); // miss → 1 read
    await cache.load(); // hit
    currentMtime = 2000;
    await cache.load(); // mtime advanced → miss → 1 more read
    await cache.load(); // hit

    expect(baseLoaderCalls).toBe(2);
    expect(cache.stats.reads()).toBe(2);
  });

  it('stat failure fails closed with policy-corrupt (does not serve stale cache)', async () => {
    let baseLoaderCalls = 0;
    let statShouldFail = false;
    const cache = createCachedFleetPolicyLoader({
      policyFile: '/abs/fleet.json',
      baseLoader: async () => {
        baseLoaderCalls++;
        return { state: 'ok', policy: { overrides: [] } };
      },
      statProbe: async () => {
        if (statShouldFail) {
          throw new Error('EBUSY: antivirus lock');
        }
        return { mtimeMs: 1000 };
      },
    });

    const first = await cache.load();
    expect(first.state).toBe('ok');
    expect(baseLoaderCalls).toBe(1);

    statShouldFail = true;
    const second = await cache.load();
    expect(second.state).toBe('corrupt');
    if (second.state !== 'corrupt') throw new Error('expected corrupt');
    expect(second.cause).toMatch(/EBUSY/);

    // After stat recovers, the next call must re-read rather than
    // reuse the cached corrupt state.
    statShouldFail = false;
    const third = await cache.load();
    expect(third.state).toBe('ok');
    expect(baseLoaderCalls).toBe(2);
  });

  it('corrupt policy load is cached so repeated ops do not re-read a broken file', async () => {
    let baseLoaderCalls = 0;
    const cache = createCachedFleetPolicyLoader({
      policyFile: '/abs/fleet.json',
      baseLoader: async () => {
        baseLoaderCalls++;
        return { state: 'corrupt', cause: 'bad json' };
      },
      statProbe: async () => ({ mtimeMs: 1000 }),
    });

    for (let i = 0; i < 10; i++) {
      const r = await cache.load();
      expect(r.state).toBe('corrupt');
    }
    expect(baseLoaderCalls).toBe(1);
  });

  it('missing policy load is cached (fail-closed across batch)', async () => {
    let baseLoaderCalls = 0;
    const cache = createCachedFleetPolicyLoader({
      policyFile: '/abs/fleet.json',
      baseLoader: async () => {
        baseLoaderCalls++;
        return { state: 'missing' };
      },
      statProbe: async () => ({ mtimeMs: 1000 }),
    });

    for (let i = 0; i < 5; i++) {
      const r = await cache.load();
      expect(r.state).toBe('missing');
    }
    expect(baseLoaderCalls).toBe(1);
  });

  it('baseLoader throwing after mtime advance yields corrupt and caches it against the new mtime', async () => {
    let currentMtime = 1000;
    let shouldThrow = false;
    const cache = createCachedFleetPolicyLoader({
      policyFile: '/abs/fleet.json',
      baseLoader: async () => {
        if (shouldThrow) throw new Error('readFile failed');
        return { state: 'ok', policy: { overrides: [] } };
      },
      statProbe: async () => ({ mtimeMs: currentMtime }),
    });

    await cache.load(); // seeds cache as 'ok' at mtime=1000
    currentMtime = 2000;
    shouldThrow = true;
    const second = await cache.load();
    expect(second.state).toBe('corrupt');
    if (second.state !== 'corrupt') throw new Error('expected corrupt');
    expect(second.cause).toMatch(/readFile failed/);

    // Same mtime → served from cache, loader not re-invoked.
    shouldThrow = false;
    const third = await cache.load();
    expect(third.state).toBe('corrupt');
  });

  it('wired into FleetValidator: 20-op batch reads policy once', async () => {
    let baseLoaderCalls = 0;
    const cache = createCachedFleetPolicyLoader({
      policyFile: '/abs/fleet.json',
      baseLoader: async () => {
        baseLoaderCalls++;
        return {
          state: 'ok',
          policy: {
            overrides: [
              {
                tool: 'read_file',
                requires_approval: true,
                reason: 'r',
                authorizedBy: 'a',
                authorizedAt: 'z',
              },
            ],
          },
        };
      },
      statProbe: async () => ({ mtimeMs: 1000 }),
    });
    const v = createFleetValidator({ policyFile: '/abs/fleet.json', loader: cache.load });

    const ops: EditOperation[] = Array.from({ length: 20 }, () => ({
      kind: 'set',
      file: 'TOOLS.md',
      section: 'write_file', // not locked — should pass
      field: 'description',
      value: 'x',
    }));
    for (const op of ops) {
      const r = await v.validate(op);
      expect(r.ok).toBe(true);
    }
    expect(baseLoaderCalls).toBe(1);
  });

  it('default baseLoader + statProbe: real filesystem path reads the policy end-to-end', async () => {
    // Call-site with NO baseLoader/statProbe overrides — the default arrow
    // functions at the top of createCachedFleetPolicyLoader must execute.
    // A valid policy file on disk means the defaults drive fs.stat +
    // loadFleetPolicy directly, which is the production wiring.
    const path = join(tmp, 'default-deps-fleet.json');
    await writeFile(path, JSON.stringify({ overrides: [] }), 'utf-8');

    const cache = createCachedFleetPolicyLoader({ policyFile: path });

    const first = await cache.load();
    expect(first.state).toBe('ok');
    const second = await cache.load();
    expect(second.state).toBe('ok'); // mtime hit → default stat probe ran twice
    expect(cache.stats.invocations()).toBe(2);
    expect(cache.stats.reads()).toBe(1);
  });

  it('default statProbe against a missing file fails closed with corrupt', async () => {
    // Defaults again, but the file does not exist — default stat rejects
    // with ENOENT, which the loader maps to state:'corrupt' (never silent
    // success). Confirms the `statProbe ?? (…)` default arrow runs and the
    // catch branch engages.
    const missing = join(tmp, 'does-not-exist-fleet.json');
    const cache = createCachedFleetPolicyLoader({ policyFile: missing });

    const r = await cache.load();
    expect(r.state).toBe('corrupt');
    if (r.state !== 'corrupt') throw new Error('expected corrupt');
    expect(r.cause).toMatch(/fleet policy stat failed/);
  });

  it('statProbe throwing a non-Error (string) yields corrupt with String(err)', async () => {
    // stat rejects with a raw string rather than an Error instance — the
    // validator must still map it to corrupt with the stringified cause
    // (exercises the false branch of `err instanceof Error ? … : String(err)`
    // in the stat catch block).
    const cache = createCachedFleetPolicyLoader({
      policyFile: '/abs/fleet.json',
      statProbe: async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'bare-string-stat-failure';
      },
      baseLoader: async () => ({ state: 'ok', policy: { overrides: [] } }),
    });

    const r = await cache.load();
    expect(r.state).toBe('corrupt');
    if (r.state !== 'corrupt') throw new Error('expected corrupt');
    expect(r.cause).toContain('bare-string-stat-failure');
  });

  it('baseLoader throwing a non-Error (string) after mtime advance yields corrupt with String(err)', async () => {
    // baseLoader rejects with a raw string — the catch after stat advanced
    // must still produce { state: 'corrupt', cause } using String(err).
    let currentMtime = 1000;
    const cache = createCachedFleetPolicyLoader({
      policyFile: '/abs/fleet.json',
      baseLoader: async () => {
        if (currentMtime === 2000) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 'bare-string-load-failure';
        }
        return { state: 'ok', policy: { overrides: [] } };
      },
      statProbe: async () => ({ mtimeMs: currentMtime }),
    });

    await cache.load(); // seed ok at mtime=1000
    currentMtime = 2000;
    const r = await cache.load();
    expect(r.state).toBe('corrupt');
    if (r.state !== 'corrupt') throw new Error('expected corrupt');
    expect(r.cause).toContain('bare-string-load-failure');
  });
});

describe('createR5Validator — branch coverage', () => {
  const ir = minimalGovernanceIR();
  const r5 = createR5Validator(ir);

  it('passes non-TOOLS.md edits', async () => {
    const op: EditOperation = {
      kind: 'toggle',
      file: 'SETTINGS.md',
      section: 'any',
      field: 'enabled',
      value: false,
    };
    const r = await r5.validate(op);
    expect(r.ok).toBe(true);
  });

  it('passes edits for tools not in manifest', async () => {
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'not-in-manifest',
      field: 'enabled',
      value: false,
    };
    const r = await r5.validate(op);
    expect(r.ok).toBe(true);
  });

  it('passes edits for non-R5 tools', async () => {
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_file',
      field: 'enabled',
      value: false,
    };
    const r = await r5.validate(op);
    expect(r.ok).toBe(true);
  });

  it('passes edits to non-guarded fields on R5 tools (S21 unlocked_field_edit)', async () => {
    const op: EditOperation = {
      kind: 'set',
      file: 'TOOLS.md',
      section: 'send_email',
      field: 'description',
      value: 'new description',
    };
    const r = await r5.validate(op);
    expect(r.ok).toBe(true);
  });

  it('blocks append on R5 tool section', async () => {
    const op: EditOperation = {
      kind: 'append',
      file: 'TOOLS.md',
      section: 'send_email',
      item: 'extra line',
    };
    const r = await r5.validate(op);
    expect(r.ok).toBe(false);
  });
});

describe('governance-validator glob match helpers', () => {
  it('matches exact section target (not file.section)', async () => {
    const base = minimalGovernanceIR();
    const ir: GovernanceIR = {
      ...base,
      intents: [
        {
          id: 'plain-01',
          ruleId: 'P-01',
          level: 3,
          kind: 'deny',
          description: 'Block section-only target',
          target: 'read_file',
          reason: 'plain',
        },
      ],
    };
    const v = createGovernanceValidator({
      ir,
      denyProvenance: new Map([
        [
          'plain-01',
          { policySource: 'p', ruleId: 'P-01', governanceFile: '/g', origin: 'compiler-injected' as const },
        ],
      ]),
      governanceFile: '/g',
    });
    const op: EditOperation = {
      kind: 'append',
      file: 'TOOLS.md',
      section: 'read_file',
      item: 'hello',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(false);
  });

  it('matches universal glob * and uses append/remove ocPath (no field segment)', async () => {
    const base = minimalGovernanceIR();
    const ir: GovernanceIR = {
      ...base,
      intents: [
        {
          id: 'star-01',
          ruleId: 'S-01',
          level: 3,
          kind: 'deny',
          description: 'Block all',
          target: '*',
          reason: 'star',
        },
      ],
    };
    const v = createGovernanceValidator({
      ir,
      denyProvenance: new Map([
        [
          'star-01',
          { policySource: 'p', ruleId: 'S-01', governanceFile: '/g', origin: 'compiler-injected' as const },
        ],
      ]),
      governanceFile: '/g',
    });
    const op: EditOperation = {
      kind: 'remove',
      file: 'SETTINGS.md',
      section: 'defaults',
      item: 'entry',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    // ocPath ends at section for append/remove (no field segment).
    expect(r.error.ocPath).toBe('oc://SETTINGS.md/defaults');
  });

  it('matches glob where file path itself starts with the prefix', async () => {
    const base = minimalGovernanceIR();
    const ir: GovernanceIR = {
      ...base,
      intents: [
        {
          id: 'file-glob',
          ruleId: 'F-01',
          level: 3,
          kind: 'deny',
          description: 'Match by file prefix',
          // Target is a prefix glob that doesn't construct editKey format
          // (no dot); uses the file-prefix alternative branch.
          target: 'TOOLS.*',
          reason: 'file prefix',
        },
      ],
    };
    const v = createGovernanceValidator({
      ir,
      denyProvenance: new Map([
        [
          'file-glob',
          { policySource: 'p', ruleId: 'F-01', governanceFile: '/g', origin: 'compiler-injected' as const },
        ],
      ]),
      governanceFile: '/g',
    });
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_file',
      field: 'enabled',
      value: true,
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(false);
  });

  it('matches full editKey target (file.section form)', async () => {
    const base = minimalGovernanceIR();
    const ir: GovernanceIR = {
      ...base,
      intents: [
        {
          id: 'key-01',
          ruleId: 'K-01',
          level: 3,
          kind: 'deny',
          description: 'editKey exact match',
          target: 'TOOLS.read_file',
          reason: 'key match',
        },
      ],
    };
    const v = createGovernanceValidator({
      ir,
      // Use default denyProvenance (undefined) to hit the `?? new Map()` branch.
      governanceFile: '/g',
    });
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_file',
      field: 'enabled',
      value: true,
    };
    // fallback provenance defaults to user-authored → this passes
    const r = await v.validate(op);
    expect(r.ok).toBe(true);
  });

  it('non-matching target passes', async () => {
    const base = minimalGovernanceIR();
    const ir: GovernanceIR = {
      ...base,
      intents: [
        {
          id: 'miss-01',
          ruleId: 'M-01',
          level: 3,
          kind: 'deny',
          description: 'Unreachable target',
          target: 'SETTINGS.xxxx',
          reason: 'miss',
        },
      ],
    };
    const v = createGovernanceValidator({
      ir,
      denyProvenance: new Map(),
      governanceFile: '/g',
    });
    const op: EditOperation = {
      kind: 'set',
      file: 'TOOLS.md',
      section: 'read_file',
      field: 'description',
      value: 'x',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(true);
  });
});

describe('createGovernanceValidator — glob matching + fallback provenance', () => {
  const base = minimalGovernanceIR();
  const ir: GovernanceIR = {
    ...base,
    intents: [
      ...base.intents,
      {
        id: 'glob-01',
        ruleId: 'GLOB-01',
        level: 3,
        kind: 'deny',
        description: 'Block all TOOLS.*',
        target: 'TOOLS.*',
        reason: 'star match',
      },
      {
        id: 'star-01',
        ruleId: 'STAR-01',
        level: 3,
        kind: 'deny',
        description: 'Block all everywhere',
        target: '*',
        reason: 'universal',
      },
    ],
  };

  it('matches glob target TOOLS.* against TOOLS.md edit', () => {
    const provenance: ProvenanceChain = {
      policySource: 'p',
      ruleId: 'GLOB-01',
      governanceFile: '/gov',
      origin: 'compiler-injected',
    };
    const v = createGovernanceValidator({
      ir,
      denyProvenance: new Map([['glob-01', provenance]]),
      governanceFile: '/gov',
    });
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'anything',
      field: 'enabled',
      value: true,
    };
    const r = v.validate(op);
    // Ensure sync or async, both work:
    expect(Promise.resolve(r).then((x) => x.ok)).resolves.toBe(false);
  });

  it('user-authored provenance passes through governance validator with a warning (W01)', async () => {
    const userProv: ProvenanceChain = {
      policySource: 'user',
      ruleId: 'USER-01',
      governanceFile: '/gov',
      origin: 'user-authored',
    };
    const v = createGovernanceValidator({
      ir: base,
      denyProvenance: new Map([['intent-001', userProv]]),
      governanceFile: '/gov',
    });
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'delete_database',
      field: 'enabled',
      value: true,
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(true);
    expect(r.warnings?.[0]?.code).toBe('USER_DENY_RULE_MATCHED');
    expect(r.warnings?.[0]?.ocPath).toBe('oc://TOOLS.md/delete_database/enabled');
    expect(r.warnings?.[0]?.message).toContain('USER-01');
  });

  it('fallback provenance defaults to user-authored → passes with warning (W01)', async () => {
    const v = createGovernanceValidator({
      ir: base,
      denyProvenance: new Map(),
      governanceFile: '/gov',
    });
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'delete_database',
      field: 'enabled',
      value: true,
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(true);
    expect(r.warnings?.[0]?.code).toBe('USER_DENY_RULE_MATCHED');
  });
});

describe('createDenyRemovalValidator — branch coverage', () => {
  const governanceFile = '/ws/SOUL.md';
  const userProvenance = new Map<string, ProvenanceChain>([
    [
      'user-written rule',
      { policySource: 'user', ruleId: 'USR-01', governanceFile, origin: 'user-authored' },
    ],
    [
      'compiler-written rule',
      { policySource: 'template', ruleId: 'CMP-01', governanceFile, origin: 'compiler-injected' },
    ],
  ]);

  it('ignores non-remove edits', async () => {
    const v = createDenyRemovalValidator({ denyProvenance: userProvenance, governanceFile });
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 's',
      field: 'enabled',
      value: false,
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(true);
    expect(r.warnings).toBeUndefined();
  });

  it('ignores remove edits in non-deny sections', async () => {
    const v = createDenyRemovalValidator({ denyProvenance: userProvenance, governanceFile });
    const edit = {
      kind: 'remove',
      file: 'SOUL.md',
      section: 'Intro',
      item: 'anything',
    } as DenyRemovalEdit;
    const r = await v.validate(edit as unknown as EditOperation);
    expect(r.ok).toBe(true);
    expect(r.warnings).toBeUndefined();
  });

  it('warns on user-authored rule removal', async () => {
    const v = createDenyRemovalValidator({ denyProvenance: userProvenance, governanceFile });
    const edit = {
      kind: 'remove',
      file: 'SOUL.md',
      section: 'Boundaries',
      item: 'user-written rule',
    } as DenyRemovalEdit;
    const r = await v.validate(edit as unknown as EditOperation);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected pass');
    expect(r.warnings?.[0]?.code).toBe('USER_DENY_RULE_REMOVED');
  });

  it('blocks compiler-injected rule removal', async () => {
    const v = createDenyRemovalValidator({ denyProvenance: userProvenance, governanceFile });
    const edit = {
      kind: 'remove',
      file: 'SOUL.md',
      section: 'Boundaries',
      item: 'compiler-written rule',
    } as DenyRemovalEdit;
    const r = await v.validate(edit as unknown as EditOperation);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.error.code).toBe('GOVERNANCE_DENIED');
  });

  it('classifyRule override takes precedence over registry', async () => {
    const v = createDenyRemovalValidator({
      denyProvenance: userProvenance,
      governanceFile,
      classifyRule: (_text) => ({
        policySource: 'classifier',
        ruleId: 'CLASS-01',
        governanceFile,
        origin: 'compiler-injected',
      }),
    });
    const edit = {
      kind: 'remove',
      file: 'SOUL.md',
      section: 'Boundaries',
      item: 'user-written rule', // would be user-authored in registry
    } as DenyRemovalEdit;
    const r = await v.validate(edit as unknown as EditOperation);
    expect(r.ok).toBe(false);
  });

  it('passes remove edits that target non-SOUL files', async () => {
    const v = createDenyRemovalValidator({ denyProvenance: userProvenance, governanceFile });
    const op: EditOperation = {
      kind: 'remove',
      file: 'TOOLS.md',
      section: 'read_file',
      item: 'line',
    };
    const r = await v.validate(op);
    expect(r.ok).toBe(true);
    expect(r.warnings).toBeUndefined();
  });

  it('unknown rule (no provenance, no classifier) fails closed by default (W02)', async () => {
    const v = createDenyRemovalValidator({
      denyProvenance: new Map(),
      governanceFile,
    });
    const edit = {
      kind: 'remove',
      file: 'SOUL.md',
      section: 'Boundaries',
      item: 'brand-new rule text',
    } as DenyRemovalEdit;
    const r = await v.validate(edit as unknown as EditOperation);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.error.code).toBe('GOVERNANCE_DENIED');
    if (r.error.code !== 'GOVERNANCE_DENIED') throw new Error('expected GOVERNANCE_DENIED');
    expect(r.error.provenance.origin).toBe('compiler-injected');
    expect(r.error.provenance.policySource).toBe('unclassified');
  });

  it('unknown rule with allowUnclassifiedRemoval=true emits a warning (opt-in legacy path)', async () => {
    const v = createDenyRemovalValidator({
      denyProvenance: new Map(),
      governanceFile,
      allowUnclassifiedRemoval: true,
    });
    const edit = {
      kind: 'remove',
      file: 'SOUL.md',
      section: 'Boundaries',
      item: 'brand-new rule text',
    } as DenyRemovalEdit;
    const r = await v.validate(edit as unknown as EditOperation);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected pass');
    expect(r.warnings?.[0]?.code).toBe('USER_DENY_RULE_REMOVED');
  });
});

describe('ValidationPipeline.preflight — subcode branches', () => {
  it('EDIT_SECTION_REQUIRED when section is empty', async () => {
    const p = new ValidationPipeline();
    const op = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: '   ',
      field: 'enabled',
      value: true,
    } as EditOperation;
    const r = await p.validate(op);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    if (r.error.code !== 'VALIDATION_FAILED') throw new Error('expected VALIDATION_FAILED');
    expect(r.error.subCode).toBe('EDIT_SECTION_REQUIRED');
  });

  it('EDIT_FIELD_REQUIRED on toggle/set with empty field', async () => {
    const p = new ValidationPipeline();
    const op = {
      kind: 'set',
      file: 'TOOLS.md',
      section: 's',
      field: '',
      value: 'x',
    } as EditOperation;
    const r = await p.validate(op);
    if (r.ok) throw new Error('expected fail');
    if (r.error.code !== 'VALIDATION_FAILED') throw new Error('expected VALIDATION_FAILED');
    expect(r.error.subCode).toBe('EDIT_FIELD_REQUIRED');
  });

  it('EDIT_ITEM_REQUIRED on append/remove with empty item', async () => {
    const p = new ValidationPipeline();
    const op = {
      kind: 'append',
      file: 'TOOLS.md',
      section: 's',
      item: '  ',
    } as EditOperation;
    const r = await p.validate(op);
    if (r.ok) throw new Error('expected fail');
    if (r.error.code !== 'VALIDATION_FAILED') throw new Error('expected VALIDATION_FAILED');
    expect(r.error.subCode).toBe('EDIT_ITEM_REQUIRED');
  });

  it('pipeline.size reflects added validators', () => {
    const p = new ValidationPipeline();
    expect(p.size).toBe(0);
    p.addValidator({ name: 'x', validate: () => ({ ok: true }) });
    expect(p.size).toBe(1);
  });

  it('FILE_NOT_EDITABLE ocPath falls back to empty section when absent', async () => {
    const p = new ValidationPipeline();
    const op = {
      kind: 'toggle',
      file: 'SOUL.md',
      section: 'Any',
      field: 'f',
      value: true,
    } as unknown as EditOperation;
    const r = await p.validate(op);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.error.code).toBe('FILE_NOT_EDITABLE');
  });

  it('warnings accumulate when validators pass with warnings', async () => {
    const p = new ValidationPipeline();
    p.addValidator({
      name: 'a',
      validate: () => ({
        ok: true,
        warnings: [{ code: 'WARN_A', ocPath: 'oc://x', message: 'a' }],
      }),
    });
    p.addValidator({
      name: 'b',
      validate: () => ({
        ok: true,
        warnings: [{ code: 'WARN_B', ocPath: 'oc://x', message: 'b' }],
      }),
    });
    const op: EditOperation = {
      kind: 'set',
      file: 'SETTINGS.md',
      section: 'defaults',
      field: 'timezone',
      value: 'UTC',
    };
    const r = await p.validate(op);
    expect(r.ok).toBe(true);
    expect(r.warnings.map((w) => w.code)).toEqual(['WARN_A', 'WARN_B']);
  });

  it('failing validator still surfaces earlier warnings', async () => {
    const p = new ValidationPipeline();
    p.addValidator({
      name: 'a',
      validate: () => ({
        ok: true,
        warnings: [{ code: 'W1', ocPath: 'oc://x', message: 'w' }],
      }),
    });
    p.addValidator({
      name: 'b',
      validate: () => ({
        ok: false,
        warnings: [{ code: 'W2', ocPath: 'oc://x', message: 'w2' }],
        error: {
          code: 'UNKNOWN_ERROR',
          ocPath: 'oc://x',
          message: 'm',
          cause: 'c',
        },
      }),
    });
    const op: EditOperation = {
      kind: 'set',
      file: 'SETTINGS.md',
      section: 'defaults',
      field: 'timezone',
      value: 'UTC',
    };
    const r = await p.validate(op);
    expect(r.ok).toBe(false);
    expect(r.warnings.map((w) => w.code)).toEqual(['W1', 'W2']);
  });
});
