/**
 * Append-only JSONL audit sink for admin-reset events.
 *
 * One JSON record per line to `.claws/audit/admin-reset.jsonl` under the
 * workspace root. Fires on every authenticated reset attempt — forbidden,
 * reset_ok, still_degraded — so operator privilege use is traceable.
 * The 404 "token not configured" branch is intentionally excluded from
 * audit (the endpoint is invisible; an audit line would leak its
 * existence).
 *
 * CP-6 R3 security NEW-2: without this sink wired, an attacker who
 * steals `CLAWS_ADMIN_TOKEN` can flip degraded → healthy repeatedly
 * with zero trail.
 *
 * @module claws-serve/audit/admin-reset-sink
 */

import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import type {
  AdminResetAuditRecord,
  AdminResetAuditSink,
} from '../routes/admin-reset.js';

export const ADMIN_RESET_AUDIT_RELATIVE_PATH = '.claws/audit/admin-reset.jsonl';

export interface AdminResetAuditSinkOptions {
  readonly workspaceRoot: string;
  readonly logPath?: string;
  readonly onError?: (err: unknown) => void;
}

export function createAdminResetAuditSink(
  options: AdminResetAuditSinkOptions,
): AdminResetAuditSink {
  const logPath = resolveLogPath(options);
  const onError = options.onError ?? ((err: unknown): void => {
    // eslint-disable-next-line no-console
    console.error('admin-reset audit sink write failed:', err);
  });

  return (record: AdminResetAuditRecord): void => {
    void persistRecord(logPath, record).catch(onError);
  };
}

function resolveLogPath(options: AdminResetAuditSinkOptions): string {
  if (options.logPath === undefined) {
    return join(options.workspaceRoot, ADMIN_RESET_AUDIT_RELATIVE_PATH);
  }
  if (isAbsolute(options.logPath)) {
    return options.logPath;
  }
  return join(options.workspaceRoot, options.logPath);
}

async function persistRecord(
  logPath: string,
  record: AdminResetAuditRecord,
): Promise<void> {
  await mkdir(dirname(logPath), { recursive: true });
  const line = `${JSON.stringify(record)}\n`;
  await appendFile(logPath, line, { encoding: 'utf-8' });
}
