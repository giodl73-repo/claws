/**
 * L0: audit-chain — createFsAuditChainSink coverage.
 *
 * Covers lines 327-334: the factory, default onError fallback, onError
 * callback invocation on failed writes, and the emit method that fires
 * appendAuditEvent fire-and-forget.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  createFsAuditChainSink,
  readAuditChain,
  type AuditEventInput,
} from '../../src/compliance/audit-chain.js';

let tempDir: string;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

async function setup(): Promise<string> {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-audit-sink-'));
  await mkdir(join(tempDir, '.claws', 'audit'), { recursive: true });
  await mkdir(join(tempDir, '.claws', 'keys'), { recursive: true });
  await writeFile(
    join(tempDir, 'claws.json'),
    JSON.stringify({ compilerVersion: '1.0.0' }),
  );
  return tempDir;
}

const makeEvent = (eventType: string): AuditEventInput => ({
  eventType,
  target: 'test',
  action: 'test',
  outcome: 'allow',
  ruleId: 'T-001',
  severity: 1,
  policyVersion: '1.0.0',
});

/**
 * Wait until a predicate becomes true or a timeout expires.
 * Needed because the sink's emit() is fire-and-forget — the persistence
 * promise resolves after the caller returns, so assertions must poll.
 */
async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 2000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('waitFor timed out');
}

describe('createFsAuditChainSink', () => {
  it('returns a sink with an emit method', async () => {
    const ws = await setup();
    const sink = createFsAuditChainSink({ workspaceRoot: ws });
    expect(typeof sink.emit).toBe('function');
  });

  it('emits events that land in the audit chain file', async () => {
    const ws = await setup();
    const sink = createFsAuditChainSink({ workspaceRoot: ws });

    sink.emit(makeEvent('SINK_EMIT'));

    await waitFor(async () => {
      const chain = await readAuditChain(ws);
      return chain.length === 1 && chain[0]!.eventType === 'SINK_EMIT';
    });

    const chain = await readAuditChain(ws);
    expect(chain).toHaveLength(1);
    expect(chain[0]!.eventType).toBe('SINK_EMIT');
  });

  it('invokes the custom onError callback when persistence fails', async () => {
    // No setup() — workspaceRoot points at a non-existent path so that
    // mkdir inside appendAuditEvent fails for a reason other than EEXIST.
    // Using an invalid path containing a NUL byte triggers EINVAL reliably.
    const onError = vi.fn();
    const sink = createFsAuditChainSink({
      workspaceRoot: '\0invalid-path',
      onError,
    });

    sink.emit(makeEvent('SINK_FAIL'));

    await waitFor(() => onError.mock.calls.length > 0);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);
  });

  it('falls back to console.error when no onError is provided', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const sink = createFsAuditChainSink({ workspaceRoot: '\0invalid-path' });
    sink.emit(makeEvent('SINK_DEFAULT_ERR'));

    await waitFor(() => consoleSpy.mock.calls.length > 0);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[audit-chain] sink write failed:',
      expect.any(Error),
    );
  });

  it('emit is fire-and-forget — returns void synchronously', async () => {
    const ws = await setup();
    const sink = createFsAuditChainSink({ workspaceRoot: ws });

    const result = sink.emit(makeEvent('SYNC_RETURN'));
    expect(result).toBeUndefined();

    // Drain the fire-and-forget write before afterEach tears down the
    // temp dir. Windows rm() raises ENOTEMPTY if a write handle is still
    // open under the tree; POSIX absorbs it. Polling the chain file
    // guarantees the background append has settled before cleanup.
    await waitFor(async () => {
      const chain = await readAuditChain(ws);
      return chain.length >= 1 && chain.some((e) => e.eventType === 'SYNC_RETURN');
    });
  });
});
