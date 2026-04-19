/**
 * L0 unit tests for the startup health check and the derived server mode.
 *
 * These tests drive `runStartupHealthCheck` directly (no HTTP, no
 * express) so the branches of the mode computation stay pinned to the
 * function's contract: healthy when compile + fleet policy both resolve,
 * degraded otherwise with a structured reason. The handler that turns
 * the mode into a 503 on write endpoints is covered separately by the
 * integration + e2e tiers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceIR } from '@bic/claws-sdk';
import type { FleetPolicyLoadResult } from '@bic/claws-sdk/workspace-edit';
import { CompilationHost } from '../../src/compilation-host.js';
import {
  degradedModeError,
  runStartupHealthCheck,
  setDegradedReasonLogger,
  type DegradedReason,
} from '../../src/lifecycle/health-check.js';
import { governanceIRMultiServer } from '../fixtures/governance-ir-multi-server.js';

function makeHost(ir: GovernanceIR | (() => Promise<GovernanceIR>)): CompilationHost {
  const fn = typeof ir === 'function' ? ir : async () => ir;
  return new CompilationHost(fn, '/tmp');
}

describe('runStartupHealthCheck — server mode', () => {
  it('healthy workspace yields mode=healthy (S33)', async () => {
    const host = makeHost(governanceIRMultiServer());
    const result = await runStartupHealthCheck({ host });
    expect(result.mode).toBe('healthy');
    expect(result.reason).toBeUndefined();
  });

  it('broken workspace (compile throws) yields mode=degraded with compile-failed reason (S33)', async () => {
    const host = makeHost(async () => {
      throw new Error('SOUL.md is malformed: missing required "Purpose" section');
    });
    const result = await runStartupHealthCheck({ host });
    expect(result.mode).toBe('degraded');
    expect(result.reason?.kind).toBe('compile-failed');
    if (result.reason?.kind === 'compile-failed') {
      expect(result.reason.compilerMessage).toContain('SOUL.md is malformed');
    }
  });

  it('missing fleet policy yields mode=degraded with fleet-policy-missing', async () => {
    const host = makeHost(governanceIRMultiServer());
    const result = await runStartupHealthCheck({
      host,
      fleetPolicyFile: '/does/not/exist/fleet.json',
      fleetPolicyLoader: async (): Promise<FleetPolicyLoadResult> => ({ state: 'missing' }),
    });
    expect(result.mode).toBe('degraded');
    expect(result.reason?.kind).toBe('fleet-policy-missing');
    if (result.reason?.kind === 'fleet-policy-missing') {
      expect(result.reason.policyFile).toBe('/does/not/exist/fleet.json');
    }
  });

  it('corrupt fleet policy yields mode=degraded with fleet-policy-corrupt', async () => {
    const host = makeHost(governanceIRMultiServer());
    const result = await runStartupHealthCheck({
      host,
      fleetPolicyFile: '/tmp/fleet.json',
      fleetPolicyLoader: async (): Promise<FleetPolicyLoadResult> => ({
        state: 'corrupt',
        cause: 'Unexpected token in JSON at position 4',
      }),
    });
    expect(result.mode).toBe('degraded');
    expect(result.reason?.kind).toBe('fleet-policy-corrupt');
    if (result.reason?.kind === 'fleet-policy-corrupt') {
      expect(result.reason.cause).toContain('Unexpected token');
    }
  });

  it('ok fleet policy yields mode=healthy with no reason', async () => {
    const host = makeHost(governanceIRMultiServer());
    const result = await runStartupHealthCheck({
      host,
      fleetPolicyFile: '/tmp/fleet.json',
      fleetPolicyLoader: async (): Promise<FleetPolicyLoadResult> => ({
        state: 'ok',
        policy: { overrides: [] },
      }),
    });
    expect(result.mode).toBe('healthy');
    expect(result.reason).toBeUndefined();
  });

  it('compile throws a non-Error value — reason uses String(err) fallback', async () => {
    // Exercises the `err instanceof Error ? err.message : String(err)` branch
    // when something throws a primitive (common in legacy JS interop).
    const host = makeHost(async () => {
      throw 'string thrown as error';
    });
    const result = await runStartupHealthCheck({ host });
    expect(result.mode).toBe('degraded');
    if (result.reason?.kind === 'compile-failed') {
      expect(result.reason.compilerMessage).toBe('string thrown as error');
    }
  });
});

describe('runStartupHealthCheck — default loader path', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'hc-loader-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('default loader reads a real file when no override is supplied', async () => {
    // Write a valid policy to disk and rely on the SDK's default
    // `loadFleetPolicy` (no loader override).
    const policyFile = join(root, 'fleet.json');
    await writeFile(policyFile, JSON.stringify({ overrides: [] }), 'utf-8');

    const host = makeHost(governanceIRMultiServer());
    const result = await runStartupHealthCheck({ host, fleetPolicyFile: policyFile });
    expect(result.mode).toBe('healthy');
  });
});

describe('degradedModeError — 503 body shape (K2 sanitization)', () => {
  // Swap the logger for each test so we can assert server-side rich
  // detail is preserved even though the public body is sanitized.
  let captured: DegradedReason[] = [];
  let restore: () => void = () => {};
  beforeEach(() => {
    captured = [];
    restore = setDegradedReasonLogger((reason) => captured.push(reason));
  });
  afterEach(() => {
    restore();
  });

  it('renders compile-failed reason as sanitized 503 body (no compilerMessage echo)', () => {
    const body = degradedModeError({
      kind: 'compile-failed',
      compilerMessage: 'bad soul.md: /etc/secret-path/SOUL.md line 42',
    });
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error.message).toBe('Server is in degraded mode: initial compile failed');
    // Key assertion: the public body exposes ONLY the stable code. No
    // compilerMessage echo, no policyFile, no raw reason object.
    expect(body.error.reasonCode).toBe('COMPILATION_FAILED_AT_STARTUP');
    expect(JSON.stringify(body)).not.toContain('bad soul.md');
    expect(JSON.stringify(body)).not.toContain('/etc/secret-path');
    expect((body.error as Record<string, unknown>).reason).toBeUndefined();
  });

  it('renders fleet-policy-missing reason without leaking policyFile', () => {
    const body = degradedModeError({
      kind: 'fleet-policy-missing',
      policyFile: '/etc/claws/fleet.json',
    });
    expect(body.error.message).toBe('Server is in degraded mode: fleet policy is missing');
    expect(body.error.reasonCode).toBe('FLEET_POLICY_MISSING');
    expect(JSON.stringify(body)).not.toContain('/etc/claws/fleet.json');
  });

  it('renders fleet-policy-corrupt reason without leaking parser cause', () => {
    const body = degradedModeError({
      kind: 'fleet-policy-corrupt',
      policyFile: '/etc/claws/fleet.json',
      cause: 'JSON parse error at line 7 col 12',
    });
    expect(body.error.message).toBe('Server is in degraded mode: fleet policy is corrupt');
    expect(body.error.reasonCode).toBe('FLEET_POLICY_CORRUPT');
    expect(JSON.stringify(body)).not.toContain('JSON parse error');
    expect(JSON.stringify(body)).not.toContain('/etc/claws/fleet.json');
  });

  it('emits the full DegradedReason to the server-side logger (not log-swallowed)', () => {
    const richReason: DegradedReason = {
      kind: 'fleet-policy-corrupt',
      policyFile: '/var/claws/fleet.json',
      cause: 'Unexpected token at position 14',
    };
    degradedModeError(richReason);
    expect(captured).toHaveLength(1);
    // Server logs retain every field — operator forensic detail is
    // preserved even though the public response body is sanitized.
    expect(captured[0]).toEqual(richReason);
  });

  it('default logger writes to console.error when no override is installed', () => {
    // Exercise the default-logger branch so coverage sees the sink used
    // in production. We restore the test's spy immediately afterwards.
    restore();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      degradedModeError({ kind: 'compile-failed', compilerMessage: 'x' });
      expect(spy).toHaveBeenCalledWith(
        '[degraded-mode] write rejected:',
        expect.objectContaining({ kind: 'compile-failed' }),
      );
    } finally {
      spy.mockRestore();
      restore = setDegradedReasonLogger((reason) => captured.push(reason));
    }
  });
});
