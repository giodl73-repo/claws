/**
 * Audit chain — barrel export.
 *
 * @module claws-sdk/audit
 */

// Types
export type {
  AuditEntry,
  ChainEntry,
  ChainVerifyResult,
  ExportFormat,
  PlannedExportFormat,
  RedactionOptions,
  StreamExportOptions,
  TamperType,
  WitnessReceipt,
} from './types.js';

// Chain operations
export { AuditChain, computeChainHash, verifyChain } from './chain.js';

// Chain integrity verification
export { verifyChainIntegrity, analyzePostBreak } from './verify.js';
export type { ChainBreakScope, PostBreakAnalysis } from './verify.js';

// WAL (Write-Ahead Log) for crash recovery
export type { WalEntry, WalRecord, WalRecoveryResult, MonotonicClock } from './wal.js';
export { AuditWal, defaultMonotonicClock } from './wal.js';

// Witness receipts (Merkle proof of inclusion)
export {
  issueReceipt,
  validateReceipt,
  verifyMerkleProof,
  WitnessStore,
} from './witness.js';

// Multi-format export (CEF, JSON, syslog, canonical JSON)
export {
  exportCef,
  exportJson,
  exportCanonicalJson,
  exportSyslog,
  exportChain,
  streamExport,
  normalizeLineEndings,
  EVIDENCE_FORMAT_VERSION,
} from './export.js';
