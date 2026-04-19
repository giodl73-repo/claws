/**
 * L0 unit tests for the append-only JSONL admin-reset audit sink.
 *
 * Covers: default path, custom relative path, absolute path, mkdir for
 * nested directories, multi-record append, outcome variants, onError
 * observer receives filesystem errors, console.error fallback when no
 * observer is supplied.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  ADMIN_RESET_AUDIT_RELATIVE_PATH,
  createAdminResetAuditSink,
} from '../../src/audit/admin-reset-sink.js';
import type { AdminResetAuditRecord } from '../../src/routes/admin-reset.js';

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'admin-reset-sink-'));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

function sampleRecord(
  overrides: Partial<AdminResetAuditRecord> = {},
): AdminResetAuditRecord {
  return {
    timestamp: '2026-04-17T12:00:00.000Z',
    actor: 'admin@example.com',
    outcome: 'reset_ok',
    priorMode: 'degraded',
    newMode: 'healthy',
    ...overrides,
  };
}

async function flush(): Promise<void> {
  // Allow the fire-and-forget appendFile + mkdir chain to resolve.
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('createAdminResetAuditSink', () => {
  it('writes JSONL to the default path under the workspace', async () => {
    const sink = createAdminResetAuditSink({ workspaceRoot: workspace });
    sink(sampleRecord());
    await flush();

    const logPath = join(workspace, ADMIN_RESET_AUDIT_RELATIVE_PATH);
    const raw = await readFile(logPath, 'utf-8');
    expect(raw.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(raw.trim()) as AdminResetAuditRecord;
    expect(parsed.outcome).toBe('reset_ok');
    expect(parsed.actor).toBe('admin@example.com');
  });

  it('appends — three outcome variants produce three lines', async () => {
    const sink = createAdminResetAuditSink({ workspaceRoot: workspace });
    sink(sampleRecord({ outcome: 'forbidden' }));
    await flush();
    sink(sampleRecord({ outcome: 'reset_ok' }));
    await flush();
    sink(sampleRecord({ outcome: 'still_degraded', reasonCode: 'policy_parse_error' }));
    await flush();

    const raw = await readFile(
      join(workspace, ADMIN_RESET_AUDIT_RELATIVE_PATH),
      'utf-8',
    );
    const lines = raw.trim().split('\n');
    expect(lines).toHaveLength(3);
    expect((JSON.parse(lines[0]!) as AdminResetAuditRecord).outcome).toBe('forbidden');
    expect((JSON.parse(lines[1]!) as AdminResetAuditRecord).outcome).toBe('reset_ok');
    const third = JSON.parse(lines[2]!) as AdminResetAuditRecord;
    expect(third.outcome).toBe('still_degraded');
    expect(third.reasonCode).toBe('policy_parse_error');
  });

  it('accepts a custom relative logPath', async () => {
    const sink = createAdminResetAuditSink({
      workspaceRoot: workspace,
      logPath: 'custom/admin-reset.jsonl',
    });
    sink(sampleRecord());
    await flush();

    const logPath = join(workspace, 'custom/admin-reset.jsonl');
    const s = await stat(logPath);
    expect(s.isFile()).toBe(true);
  });

  it('accepts an absolute logPath (workspaceRoot is ignored)', async () => {
    const abs = join(workspace, 'abs-admin-reset.jsonl');
    const sink = createAdminResetAuditSink({
      workspaceRoot: '/never-used',
      logPath: abs,
    });
    sink(sampleRecord());
    await flush();

    const s = await stat(abs);
    expect(s.isFile()).toBe(true);
  });

  it('routes write errors to onError (sink never throws)', async () => {
    const onError = vi.fn();
    // Parent is a regular file so mkdir fails.
    const sinkRoot = join(workspace, 'broken');
    await writeFile(sinkRoot, 'x', 'utf-8');
    const sink = createAdminResetAuditSink({
      workspaceRoot: workspace,
      logPath: join(sinkRoot, 'sub', 'log.jsonl'),
      onError,
    });

    expect(() => sink(sampleRecord())).not.toThrow();
    await flush();
    expect(onError).toHaveBeenCalledOnce();
    const err = onError.mock.calls[0]?.[0];
    expect(err).toBeDefined();
  });

  it('falls back to console.error when onError is not provided', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sinkRoot = join(workspace, 'broken-default');
    await writeFile(sinkRoot, 'x', 'utf-8');
    const sink = createAdminResetAuditSink({
      workspaceRoot: workspace,
      logPath: join(sinkRoot, 'sub', 'log.jsonl'),
    });
    sink(sampleRecord());
    await flush();
    expect(consoleSpy).toHaveBeenCalled();
    const [msg, err] = consoleSpy.mock.calls[0] ?? [];
    expect(msg).toContain('admin-reset audit sink write failed');
    expect(err).toBeDefined();
    consoleSpy.mockRestore();
  });

  it('creates nested audit directories on first write', async () => {
    const sink = createAdminResetAuditSink({
      workspaceRoot: workspace,
      logPath: 'deeply/nested/audit/admin-reset.jsonl',
    });
    sink(sampleRecord());
    await flush();
    const s = await stat(join(workspace, 'deeply/nested/audit/admin-reset.jsonl'));
    expect(s.isFile()).toBe(true);
  });
});
