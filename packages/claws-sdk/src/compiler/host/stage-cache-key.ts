/**
 * Pure cache-key derivation for per-stage incremental caches (CL-04 §IS.1).
 *
 * Reader stages key on `{contentHash, compilerVersion, keySchemaVersion}`.
 * Emit keys additionally fold in `signingKeyId` so a signing-key rotation
 * invalidates emit outputs even when inputs are byte-identical. Non-emit
 * stages MUST NOT include signing-key identity.
 *
 * The `keySchemaVersion` constant lives here so a deliberate bump invalidates
 * every stage on every operator machine — it is the single knob for key
 * rotation driven by derivation changes.
 *
 * @module claws-sdk/compiler/host/stage-cache-key
 */
import { sha256 } from '../crypto/hash.js';
import type { StageName } from './types.js';

/**
 * On-disk schema version for per-stage cache entries.
 *
 * Bump when the derivation inputs change in a way that would make an old
 * payload unsafe to deserialize (e.g. adding a new input to the hash,
 * changing the payload shape). A mismatched version on read forces a miss
 * rather than returning a stale payload.
 */
export const STAGE_CACHE_KEY_SCHEMA_VERSION = 1;

/**
 * Inputs for reader-stage cache key derivation (§IS.1, reader leaves).
 *
 * Readers do NOT carry signing-key identity — their output is unaffected by
 * signature rotation, so including it would needlessly invalidate them.
 */
export interface ReaderStageKeyInput {
  readonly stage: StageName;
  readonly contentHash: string;
  readonly compilerVersion: string;
  readonly keySchemaVersion: number;
}

/**
 * Inputs for downstream-stage cache key derivation (§IS.1, post-reader).
 *
 * `upstreamByteHashes` folds in every upstream stage this stage consumes so
 * a stale upstream IR MUST cause a miss. Order matters for determinism — the
 * caller supplies them in the stage declaration order from `stage-deps`.
 * Emit-like stages pass `signingKeyId` so signing-key rotation invalidates.
 */
export interface DownstreamStageKeyInput {
  readonly stage: StageName;
  readonly contentHash: string;
  readonly compilerVersion: string;
  readonly keySchemaVersion: number;
  readonly upstreamByteHashes: readonly string[];
  readonly signingKeyId?: string;
}

/**
 * Derive a reader stage cache key.
 *
 * Key shape: SHA-256 over the stage name + content hash + compiler version +
 * keySchemaVersion, NUL-separated. The stage name is included so two reader
 * stages with identical byte content (e.g. empty optional files) never
 * collide across stage caches.
 */
export function deriveReaderStageKey(input: ReaderStageKeyInput): string {
  const parts = [
    input.stage,
    input.contentHash,
    input.compilerVersion,
    String(input.keySchemaVersion),
  ];
  return sha256(parts.join('\u0000'));
}

/**
 * Derive a downstream stage cache key.
 *
 * Folds in every upstream byte-hash so a change to ANY upstream stage
 * invalidates this stage. The `signingKeyId` tail (when set) is included
 * AFTER the upstream hashes, separated by a distinct marker so a rotation
 * can never alias with an upstream hash change.
 */
export function deriveDownstreamStageKey(input: DownstreamStageKeyInput): string {
  const parts: string[] = [
    input.stage,
    input.contentHash,
    input.compilerVersion,
    String(input.keySchemaVersion),
  ];
  for (const h of input.upstreamByteHashes) {
    parts.push(h);
  }
  if (input.signingKeyId !== undefined) {
    parts.push('signing:', input.signingKeyId);
  }
  return sha256(parts.join('\u0000'));
}
