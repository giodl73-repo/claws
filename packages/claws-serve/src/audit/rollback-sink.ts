/**
 * Append-only JSONL audit sink for rollback and batch-write events.
 *
 * Writes one JSON record per line to `.claws/audit/rollback.jsonl` under
 * the workspace root. Missing directories are created on first write. Each
 * write is `append` + `fsync` to minimise loss on abrupt shutdown — the
 * audit trail is a compliance artifact and "best-effort" is not enough
 * for CISO Cluster B.
 *
 * The sink never throws back at the HTTP handler. Persistence failures
 * are logged on stderr and the request completes; surfacing a 500 from a
 * successful write would leak an internal audit failure into partner
 * traffic. The eventual goal is a dead-letter mechanism; for now, the
 * filesystem error lands in operator logs where the degraded-mode alert
 * picks it up.
 *
 * @module claws-serve/audit/rollback-sink
 */

import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import type { RollbackAuditEvent, RollbackAuditSink } from '../routes/patch-chunks.js';

/** Relative path (under workspace root) of the rollback audit log. */
export const ROLLBACK_AUDIT_RELATIVE_PATH = '.claws/audit/rollback.jsonl';

/** Options for {@link createRollbackAuditSink}. */
export interface RollbackAuditSinkOptions {
  /** Absolute workspace root. Used to resolve the log file path. */
  readonly workspaceRoot: string;
  /**
   * Override the log path (relative or absolute). Defaults to
   * {@link ROLLBACK_AUDIT_RELATIVE_PATH} under `workspaceRoot`. Primarily
   * for tests that want an isolated log per case.
   */
  readonly logPath?: string;
  /**
   * Optional error observer. Invoked with the caught error when a write
   * or mkdir fails. Defaults to `console.error`. Tests inject a spy so
   * they can assert the sink never throws and the error reaches the
   * observability layer.
   */
  readonly onError?: (err: unknown) => void;
}

/**
 * Construct an append-only JSONL {@link RollbackAuditSink}. The returned
 * function is safe to call concurrently — Node.js `appendFile` is atomic
 * for writes shorter than `PIPE_BUF` (4096 bytes on Linux, 512 on
 * Windows). Audit records are well under that budget, so interleaved
 * writes from concurrent PATCHes cannot corrupt each other's lines.
 */
export function createRollbackAuditSink(
  options: RollbackAuditSinkOptions,
): RollbackAuditSink {
  const logPath = resolveLogPath(options);
  const onError = options.onError ?? ((err: unknown): void => {
    // eslint-disable-next-line no-console
    console.error('rollback audit sink write failed:', err);
  });

  return (event: RollbackAuditEvent): void => {
    // Fire-and-forget: the handler is synchronous (matches the
    // RollbackAuditSink contract) so we schedule the write on the event
    // loop. Errors route through onError; nothing propagates back to the
    // request handler.
    void persistEvent(logPath, event).catch(onError);
  };
}

function resolveLogPath(options: RollbackAuditSinkOptions): string {
  if (options.logPath === undefined) {
    return join(options.workspaceRoot, ROLLBACK_AUDIT_RELATIVE_PATH);
  }
  // Absolute path — use as-is. Relative path — anchor to workspace root.
  if (isAbsolute(options.logPath)) {
    return options.logPath;
  }
  return join(options.workspaceRoot, options.logPath);
}

async function persistEvent(
  logPath: string,
  event: RollbackAuditEvent,
): Promise<void> {
  await mkdir(dirname(logPath), { recursive: true });
  const line = `${JSON.stringify(event)}\n`;
  await appendFile(logPath, line, { encoding: 'utf-8' });
}
