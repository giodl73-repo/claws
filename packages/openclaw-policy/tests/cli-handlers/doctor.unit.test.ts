/**
 * L0 unit tests for `claws doctor` CLI handler (pulse 47.5 D3).
 *
 * Asserts: real fs probe replaces the hardcoded pass/pass behavior — the
 * handler now stats `.openclaw/policy/policy-ir.json`, reads and chain-verifies
 * `.openclaw/policy/audit-manifest.json`, and surfaces per-check FAIL lines
 * with actionable reasons.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  append,
  createChainStore,
  type ChainStore,
} from '@bic/openclaw-guardrails/audit';

import { handle, realPolicyProbe, type PolicyArtifactProbe } from '../../src/cli-handlers/doctor.js';

const TEST_HMAC_KEY = Buffer.alloc(32, 0x42);
const HEX_KEY = TEST_HMAC_KEY.toString('hex');

function buildChain(): ChainStore {
  let store: ChainStore = createChainStore();
  ({ store } = append(
    store,
    {
      timestamp: '2026-04-20T00:00:00Z',
      source: 'system',
      actor: 'system',
      action: 'genesis',
      target: 'workspace',
      scope: 'policy:sha256-doctor',
      outcome: 'success',
    },
    TEST_HMAC_KEY,
  ));
  ({ store } = append(
    store,
    {
      timestamp: '2026-04-20T00:01:00Z',
      source: 'gateway',
      actor: 'alice',
      action: 'tool_call',
      target: 'ping',
      scope: 'policy:sha256-doctor',
      outcome: 'success',
    },
    TEST_HMAC_KEY,
  ));
  return store;
}

function seedHealthyWorkspace(root: string): void {
  const dir = join(root, '.openclaw', 'policy');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'policy-ir.json'), JSON.stringify({ version: '1.0.0' }));
  const store = buildChain();
  writeFileSync(join(dir, 'audit-manifest.json'), JSON.stringify({ chain: store.events }));
}

describe('doctor handler', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'doctor-handler-'));
  });
  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  function argv(args: string[], env: Record<string, string | undefined> = { OPENCLAW_AUDIT_HMAC_KEY: HEX_KEY }) {
    return { binaryName: 'claws', args, cwd: workdir, env };
  }

  it('both artifacts present + chain valid → exit 0, healthy', async () => {
    seedHealthyWorkspace(workdir);
    const res = await handle(argv([]));
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('claws doctor:');
    expect(res.stdout).toContain('PASS [policy-ir.json present]');
    expect(res.stdout).toContain('PASS [audit-chain verify passes]');
    expect(res.stdout).toContain('entries=2');
    expect(res.stdout).toContain('workspace healthy');
  });

  it('missing policy-ir.json → exit 1 with actionable message', async () => {
    // Seed only audit-manifest
    const dir = join(workdir, '.openclaw', 'policy');
    mkdirSync(dir, { recursive: true });
    const store = buildChain();
    writeFileSync(join(dir, 'audit-manifest.json'), JSON.stringify({ chain: store.events }));

    const res = await handle(argv([]));
    expect(res.exitCode).toBe(1);
    expect(res.stdout).toContain('FAIL [policy-ir.json present]');
    expect(res.stdout).toContain('run claws policy generate');
    expect(res.stdout).toContain('workspace has issues');
  });

  it('corrupted chain → exit 1 with brokenAt surfaced', async () => {
    const dir = join(workdir, '.openclaw', 'policy');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'policy-ir.json'), JSON.stringify({ version: '1.0.0' }));
    const store = buildChain();
    const tampered = [...store.events];
    tampered[1] = { ...tampered[1]!, outcome: 'failed' };
    writeFileSync(join(dir, 'audit-manifest.json'), JSON.stringify({ chain: tampered }));

    const res = await handle(argv([]));
    expect(res.exitCode).toBe(1);
    expect(res.stdout).toContain('PASS [policy-ir.json present]');
    expect(res.stdout).toContain('FAIL [audit-chain verify passes]');
    expect(res.stdout).toContain('chain broken at');
  });

  it('custom probe injection overrides the default fs probe', async () => {
    const fakeProbe: PolicyArtifactProbe = async () => [
      { id: 'policy-ir.json present', passed: true, message: 'injected pass' },
      { id: 'audit-chain verify passes', passed: false, message: 'injected fail' },
    ];
    const res = await handle(argv([]), fakeProbe);
    expect(res.exitCode).toBe(1);
    expect(res.stdout).toContain('injected pass');
    expect(res.stdout).toContain('injected fail');
  });

  it('missing workspace path → exit 2 usage error', async () => {
    const res = await handle({ binaryName: 'claws', args: [], cwd: '', env: {} });
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toContain('workspace path required');
  });

  it('workspace without HMAC env → chain check fails with env guidance', async () => {
    seedHealthyWorkspace(workdir);
    const res = await handle(argv([], {}));
    expect(res.exitCode).toBe(1);
    expect(res.stdout).toContain('PASS [policy-ir.json present]');
    expect(res.stdout).toContain('FAIL [audit-chain verify passes]');
    expect(res.stdout).toContain('OPENCLAW_AUDIT_HMAC_KEY');
  });

  it('realPolicyProbe is reachable via the public export', async () => {
    const dir = join(workdir, '.openclaw', 'policy');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'policy-ir.json'), '{}');
    writeFileSync(join(dir, 'audit-manifest.json'), 'not-json');
    const checks = await realPolicyProbe(workdir, { OPENCLAW_AUDIT_HMAC_KEY: HEX_KEY });
    expect(checks).toHaveLength(2);
    expect(checks[0]!.passed).toBe(true);
    expect(checks[1]!.passed).toBe(false);
    expect(checks[1]!.message).toContain('parse failed');
  });

  it('audit-manifest missing chain array → chain check fails', async () => {
    const dir = join(workdir, '.openclaw', 'policy');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'policy-ir.json'), '{}');
    writeFileSync(join(dir, 'audit-manifest.json'), JSON.stringify({ notchain: true }));
    const res = await handle(argv([]));
    expect(res.exitCode).toBe(1);
    expect(res.stdout).toContain("missing 'chain' array");
  });

  it('audit-manifest missing file → chain check fails with generate hint', async () => {
    const dir = join(workdir, '.openclaw', 'policy');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'policy-ir.json'), '{}');
    const res = await handle(argv([]));
    expect(res.exitCode).toBe(1);
    expect(res.stdout).toContain('FAIL [audit-chain verify passes]');
    expect(res.stdout).toContain('audit-manifest.json missing');
  });

  it('OPENCLAW_AUDIT_HMAC_KEY non-hex → chain check fails with invalid-key', async () => {
    seedHealthyWorkspace(workdir);
    const res = await handle(argv([], { OPENCLAW_AUDIT_HMAC_KEY: 'zzz' }));
    expect(res.exitCode).toBe(1);
    expect(res.stdout).toContain('OPENCLAW_AUDIT_HMAC_KEY invalid');
  });

  it('--workspace flag overrides argv.cwd', async () => {
    const other = mkdtempSync(join(tmpdir(), 'doctor-other-'));
    try {
      seedHealthyWorkspace(other);
      // argv.cwd is workdir (empty), --workspace points to `other` (healthy)
      const res = await handle(argv(['--workspace', other]));
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('workspace healthy');
    } finally {
      rmSync(other, { recursive: true, force: true });
    }
  });
});
