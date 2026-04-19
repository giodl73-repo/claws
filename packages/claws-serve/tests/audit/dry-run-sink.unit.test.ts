/**
 * L0 unit tests for the append-only JSONL dry-run audit sink.
 *
 * Covers: default path, custom relative path, absolute path, mkdir for
 * nested directories, append semantics for allowed/denied verdicts,
 * onError observer receives filesystem errors, console.error fallback
 * when no observer is supplied.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  DRY_RUN_AUDIT_RELATIVE_PATH,
  createDryRunAuditSink,
} from '../../src/audit/dry-run-sink.js';
import type { DryRunAuditRecord } from '../../src/middleware/dry-run-sanitize.js';

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'dry-run-sink-'));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

function sampleRecord(overrides: Partial<DryRunAuditRecord> = {}): DryRunAuditRecord {
  return {
    timestamp: '2026-04-17T12:00:00.000Z',
    actor: 'probe-actor',
    outcome: 'dry_run_allowed',
    ocPath: 'oc://TOOLS.md/send_mail',
    editKind: 'set',
    file: 'TOOLS.md',
    section: 'send_mail',
    ...overrides,
  };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('createDryRunAuditSink', () => {
  it('writes JSONL to the default path under the workspace', async () => {
    const sink = createDryRunAuditSink({ workspaceRoot: workspace });
    sink(sampleRecord());
    await flush();

    const logPath = join(workspace, DRY_RUN_AUDIT_RELATIVE_PATH);
    const raw = await readFile(logPath, 'utf-8');
    expect(raw.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(raw.trim()) as DryRunAuditRecord;
    expect(parsed.ocPath).toBe('oc://TOOLS.md/send_mail');
    expect(parsed.outcome).toBe('dry_run_allowed');
  });

  it('appends — allowed + denied produce two lines with distinct outcomes', async () => {
    const sink = createDryRunAuditSink({ workspaceRoot: workspace });
    sink(sampleRecord({ outcome: 'dry_run_allowed', ocPath: 'oc://TOOLS.md/a' }));
    await flush();
    sink(
      sampleRecord({
        outcome: 'dry_run_denied',
        denialCode: 'R5_LOCKED',
        ocPath: 'oc://TOOLS.md/b',
      }),
    );
    await flush();

    const raw = await readFile(
      join(workspace, DRY_RUN_AUDIT_RELATIVE_PATH),
      'utf-8',
    );
    const lines = raw.trim().split('\n');
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0]!) as DryRunAuditRecord;
    expect(first.outcome).toBe('dry_run_allowed');
    expect(first.denialCode).toBeUndefined();
    const second = JSON.parse(lines[1]!) as DryRunAuditRecord;
    expect(second.outcome).toBe('dry_run_denied');
    expect(second.denialCode).toBe('R5_LOCKED');
  });

  it('accepts a custom relative logPath', async () => {
    const sink = createDryRunAuditSink({
      workspaceRoot: workspace,
      logPath: 'custom/dry-run.jsonl',
    });
    sink(sampleRecord());
    await flush();

    const logPath = join(workspace, 'custom/dry-run.jsonl');
    const s = await stat(logPath);
    expect(s.isFile()).toBe(true);
  });

  it('accepts an absolute logPath (workspaceRoot is ignored)', async () => {
    const abs = join(workspace, 'abs-dry-run.jsonl');
    const sink = createDryRunAuditSink({
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
    const sinkRoot = join(workspace, 'broken');
    await writeFile(sinkRoot, 'x', 'utf-8');
    const sink = createDryRunAuditSink({
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
    const sink = createDryRunAuditSink({
      workspaceRoot: workspace,
      logPath: join(sinkRoot, 'sub', 'log.jsonl'),
    });
    sink(sampleRecord());
    await flush();
    expect(consoleSpy).toHaveBeenCalled();
    const [msg, err] = consoleSpy.mock.calls[0] ?? [];
    expect(msg).toContain('dry-run audit sink write failed');
    expect(err).toBeDefined();
    consoleSpy.mockRestore();
  });

  it('creates nested audit directories on first write', async () => {
    const sink = createDryRunAuditSink({
      workspaceRoot: workspace,
      logPath: 'deeply/nested/audit/dry-run.jsonl',
    });
    sink(sampleRecord());
    await flush();
    const s = await stat(join(workspace, 'deeply/nested/audit/dry-run.jsonl'));
    expect(s.isFile()).toBe(true);
  });
});
