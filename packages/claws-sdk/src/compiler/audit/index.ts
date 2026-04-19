/**
 * Audit chain module for the claws free tier.
 *
 * Local-only Ed25519-signed, SHA-256-chained audit log with WAL for
 * crash recovery. SIEM export and RFC3161 timestamps are paid-tier.
 *
 * @module claws-sdk/compiler/audit
 */

export type { AuditEntry, AuditChainMeta, AuditVerifyResult, ChainFileHeader } from './types.js';
export type { AuditEntryInput } from './chain.js';

export {
  AuditEntryValidationError,
  validateAuditEntry,
  validateChainFileHeader,
} from './types.js';
export { AuditChain, AuditChainCorruptionError, computeEntryHash } from './chain.js';
export { verifyChain } from './verify.js';
export { AuditWal } from './wal.js';
export {
  saveChain,
  loadChain,
  appendEntry,
  updateChainMeta,
  chainFilePath,
  walFilePath,
} from './storage.js';
