/**
 * Append-only JSONL audit sink for dry-run probes.
 *
 * Mirrors the rollback sink: one JSON record per line to
 * `.claws/audit/dry-run.jsonl` under the workspace root. Writes are
 * append-only and safe under concurrent PATCHes (each record is well
 * under PIPE_BUF atomicity on every supported platform).
 *
 * CP-6 R3 security M-3 residual: without this sink wired into
 * `patchChunksRouter`, every `?dryRun=true` probe reaches the server,
 * runs the full validator pipeline, and disappears — no record of who
 * probed what, no way for SOC tooling to spot enumeration patterns.
 * The dry-run sanitizer strips governance internals from the response
 * body; this sink captures the probe for forensics.
 *
 * @module claws-serve/audit/dry-run-sink
 */

import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import type {
  DryRunAuditRecord,
  DryRunAuditSink,
} from '../middleware/dry-run-sanitize.js';

export const DRY_RUN_AUDIT_RELATIVE_PATH = '.claws/audit/dry-run.jsonl';

export interface DryRunAuditSinkOptions {
  readonly workspaceRoot: string;
  readonly logPath?: string;
  readonly onError?: (err: unknown) => void;
}

export function createDryRunAuditSink(
  options: DryRunAuditSinkOptions,
): DryRunAuditSink {
  const logPath = resolveLogPath(options);
  const onError = options.onError ?? ((err: unknown): void => {
    // eslint-disable-next-line no-console
    console.error('dry-run audit sink write failed:', err);
  });

  return (record: DryRunAuditRecord): void => {
    void persistRecord(logPath, record).catch(onError);
  };
}

function resolveLogPath(options: DryRunAuditSinkOptions): string {
  if (options.logPath === undefined) {
    return join(options.workspaceRoot, DRY_RUN_AUDIT_RELATIVE_PATH);
  }
  if (isAbsolute(options.logPath)) {
    return options.logPath;
  }
  return join(options.workspaceRoot, options.logPath);
}

async function persistRecord(
  logPath: string,
  record: DryRunAuditRecord,
): Promise<void> {
  await mkdir(dirname(logPath), { recursive: true });
  const line = `${JSON.stringify(record)}\n`;
  await appendFile(logPath, line, { encoding: 'utf-8' });
}
