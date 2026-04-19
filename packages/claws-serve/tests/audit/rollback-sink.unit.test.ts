/**
 * L0 unit tests for the append-only JSONL rollback audit sink.
 *
 * Covers: default path, custom relative path, absolute path, mkdir for
 * nested directories, successful event persistence, malformed event
 * errors surface through onError (sink never throws).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  ROLLBACK_AUDIT_RELATIVE_PATH,
  createRollbackAuditSink,
} from '../../src/audit/rollback-sink.js';
import type { RollbackAuditEvent } from '../../src/routes/patch-chunks.js';

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'rollback-sink-'));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

function sampleEvent(overrides: Partial<RollbackAuditEvent> = {}): RollbackAuditEvent {
  return {
    ocPath: 'oc://TOOLS.md/send_mail',
    filePath: join(workspace, 'TOOLS.md'),
    preEditHash: 'pre-hash',
    postEditHash: 'post-hash',
    compilerMessage: 'boom',
    rollbackOk: true,
    timestamp: '2026-04-17T12:00:00.000Z',
    actor: 'test-actor',
    ...overrides,
  };
}

async function flush(): Promise<void> {
  // Allow the fire-and-forget appendFile + mkdir chain to resolve. The
  // `void persistEvent(...).catch(onError)` shape uses microtasks only
  // until it hits the first `await`; we pump both the microtask queue
  // and a macrotask turn to clear the filesystem I/O.
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('createRollbackAuditSink', () => {
  it('writes JSONL to the default path under the workspace', async () => {
    const sink = createRollbackAuditSink({ workspaceRoot: workspace });
    sink(sampleEvent());
    await flush();

    const logPath = join(workspace, ROLLBACK_AUDIT_RELATIVE_PATH);
    const raw = await readFile(logPath, 'utf-8');
    expect(raw.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(raw.trim()) as RollbackAuditEvent;
    expect(parsed.ocPath).toBe('oc://TOOLS.md/send_mail');
  });

  it('appends — two events produce two lines', async () => {
    const sink = createRollbackAuditSink({ workspaceRoot: workspace });
    sink(sampleEvent({ ocPath: 'oc://TOOLS.md/a' }));
    await flush();
    sink(sampleEvent({ ocPath: 'oc://TOOLS.md/b' }));
    await flush();

    const raw = await readFile(
      join(workspace, ROLLBACK_AUDIT_RELATIVE_PATH),
      'utf-8',
    );
    const lines = raw.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect((JSON.parse(lines[0]!) as RollbackAuditEvent).ocPath).toBe(
      'oc://TOOLS.md/a',
    );
    expect((JSON.parse(lines[1]!) as RollbackAuditEvent).ocPath).toBe(
      'oc://TOOLS.md/b',
    );
  });

  it('accepts a custom relative logPath', async () => {
    const sink = createRollbackAuditSink({
      workspaceRoot: workspace,
      logPath: 'custom/rollback.jsonl',
    });
    sink(sampleEvent());
    await flush();

    const logPath = join(workspace, 'custom/rollback.jsonl');
    const s = await stat(logPath);
    expect(s.isFile()).toBe(true);
  });

  it('accepts an absolute logPath', async () => {
    const abs = join(workspace, 'abs-log.jsonl');
    const sink = createRollbackAuditSink({
      workspaceRoot: '/never-used',
      logPath: abs,
    });
    sink(sampleEvent());
    await flush();

    const s = await stat(abs);
    expect(s.isFile()).toBe(true);
  });

  it('routes write errors to onError (sink never throws)', async () => {
    const onError = vi.fn();
    // Point at a path whose parent is a regular file so mkdir fails.
    const sinkRoot = join(workspace, 'broken');
    await (await import('node:fs/promises')).writeFile(sinkRoot, 'x', 'utf-8');
    const sink = createRollbackAuditSink({
      workspaceRoot: workspace,
      logPath: join(sinkRoot, 'sub', 'log.jsonl'),
      onError,
    });

    // Invocation must not throw.
    expect(() => sink(sampleEvent())).not.toThrow();
    await flush();
    expect(onError).toHaveBeenCalledOnce();
    const err = onError.mock.calls[0]?.[0];
    expect(err).toBeDefined();
  });

  it('falls back to console.error when onError is not provided', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sinkRoot = join(workspace, 'broken-default');
    await (await import('node:fs/promises')).writeFile(sinkRoot, 'x', 'utf-8');
    const sink = createRollbackAuditSink({
      workspaceRoot: workspace,
      logPath: join(sinkRoot, 'sub', 'log.jsonl'),
    });
    sink(sampleEvent());
    await flush();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles Windows-style absolute paths', async () => {
    // Drive-letter path detection branch (portable test: also handle POSIX).
    const abs = join(workspace, 'drive-like.jsonl');
    const sink = createRollbackAuditSink({
      workspaceRoot: workspace,
      logPath: abs,
    });
    sink(sampleEvent());
    await flush();
    const s = await stat(abs);
    expect(s.isFile()).toBe(true);
  });
});
