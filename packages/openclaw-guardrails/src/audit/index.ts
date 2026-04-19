/**
 * @bic/openclaw-guardrails/audit
 *
 * Hash-chained JSONL audit trails with HMAC-SHA256 integrity verification,
 * write-ahead log (WAL) for crash recovery, and multi-format export.
 *
 * Absorbed from the prior governance orphan package (audit-chain, v0.1.0, MIT).
 */

export type {
  AuditEntry,
  AuditEvent,
  AuditQuery,
  ChainEntry,
  ExportFormat,
  PruneResult,
  VerifyResult,
} from './types.js';

export {
  append,
  computeHmac,
  createChainStore,
  GENESIS_HASH,
  prune,
  query,
} from './chain.js';
export type { AppendInput, ChainStore } from './chain.js';

export {
  createWALStore,
  deserialize,
  findIncomplete,
  serialize,
  writeComplete,
  writePending,
} from './wal.js';
export type { PendingInput, WALStore } from './wal.js';

export { verifyChain } from './verify.js';

export {
  cefExport,
  exportEvents,
  jsonlExport,
  syslogExport,
} from './export.js';
