/**
 * L0 unit tests for `claws policy verify` CLI handler (pulse 47.1 D3).
 *
 * Asserts: valid chain → exit 0 with entry count; corrupted chain → exit 1
 * with brokenAt; missing manifest path → exit 2; file-read failure → exit 1.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  append,
  createChainStore,
  type ChainStore,
} from '@bic/openclaw-guardrails/audit';

import { handle } from '../../src/cli-handlers/verify.js';

const TEST_HMAC_KEY = Buffer.alloc(32, 0x42);
const HEX_KEY = TEST_HMAC_KEY.toString('hex');

function buildChain(): ChainStore {
  let store: ChainStore = createChainStore();
  ({ store } = append(
    store,
    {
      timestamp: '2026-04-18T00:00:00Z',
      source: 'system',
      actor: 'system',
      action: 'genesis',
      target: 'workspace',
      scope: 'policy:sha256-test',
      outcome: 'success',
    },
    TEST_HMAC_KEY,
  ));
  ({ store } = append(
    store,
    {
      timestamp: '2026-04-18T00:01:00Z',
      source: 'gateway',
      actor: 'alice',
      action: 'tool_call',
      target: 'send-email',
      scope: 'policy:sha256-test',
      outcome: 'success',
    },
    TEST_HMAC_KEY,
  ));
  return store;
}

describe('verify handler', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'verify-handler-'));
  });
  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  function argv(args: string[], env: Record<string, string | undefined> = { OPENCLAW_AUDIT_HMAC_KEY: HEX_KEY }) {
    return { binaryName: 'claws', args, cwd: workdir, env };
  }

  it('valid chain → exit 0 with entry count', async () => {
    const path = join(workdir, 'chain.json');
    const store = buildChain();
    writeFileSync(path, JSON.stringify({ chain: store.events }));
    const res = await handle(argv(['--manifest', path]));
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('audit-chain ok entries=2');
  });

  it('corrupted chain → exit 1 with brokenAt', async () => {
    const path = join(workdir, 'chain.json');
    const store = buildChain();
    const tampered = [...store.events];
    tampered[1] = { ...tampered[1]!, outcome: 'failed' };
    writeFileSync(path, JSON.stringify({ chain: tampered }));
    const res = await handle(argv(['--manifest', path]));
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain('chain invalid');
    expect(res.stderr).toContain(`brokenAt=${tampered[1]!.id}`);
  });

  it('missing --manifest flag → exit 2 usage', async () => {
    const res = await handle(argv([]));
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toContain('--manifest <path> required');
  });

  it('file-read error (nonexistent path) → exit 1', async () => {
    const res = await handle(argv(['--manifest', join(workdir, 'nope.json')]));
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain('failed to read manifest');
  });

  it('missing HMAC key env → exit 2 usage', async () => {
    const path = join(workdir, 'chain.json');
    writeFileSync(path, JSON.stringify({ chain: [] }));
    const res = await handle(argv(['--manifest', path], {}));
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toContain('OPENCLAW_AUDIT_HMAC_KEY');
  });

  it('manifest missing chain array → exit 1', async () => {
    const path = join(workdir, 'chain.json');
    writeFileSync(path, JSON.stringify({ notchain: [] }));
    const res = await handle(argv(['--manifest', path]));
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("missing 'chain' array");
  });

  it('OPENCLAW_AUDIT_HMAC_KEY with non-hex chars decodes empty → exit 2 usage', async () => {
    const path = join(workdir, 'chain.json');
    writeFileSync(path, JSON.stringify({ chain: [] }));
    const res = await handle(argv(['--manifest', path], { OPENCLAW_AUDIT_HMAC_KEY: 'zzz' }));
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toContain('OPENCLAW_AUDIT_HMAC_KEY invalid');
    expect(res.stderr).toContain('empty HMAC key');
  });

  it('expectedGenesis mismatch surfaces brokenAt on first entry', async () => {
    const path = join(workdir, 'chain.json');
    const store = buildChain();
    writeFileSync(path, JSON.stringify({ chain: store.events, genesis: 'f'.repeat(64) }));
    const res = await handle(argv(['--manifest', path]));
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain(`brokenAt=${store.events[0]!.id}`);
  });
});
