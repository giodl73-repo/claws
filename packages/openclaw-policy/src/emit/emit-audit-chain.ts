/**
 * Emit a hash-chained audit-manifest — the on-disk document produced by
 * `claws policy generate` and consumed by `claws policy verify`.
 *
 * Shape:
 * ```json
 * {
 *   "policyId":  "sha256-…",
 *   "snapshotId":"sha256-…",
 *   "version":   "0.1.0",
 *   "chain":     [AuditEntry, AuditEntry, ...]
 * }
 * ```
 *
 * Each entry is a `ProducerEntry`-shaped audit event per CL-11 §3a: one
 * genesis marker followed by one entry per generated artifact
 * (`policy-ir.json`, `gateway-plugin.ts`, `audit-manifest.json`). The chain
 * is HMAC-SHA256-linked via `@bic/openclaw-guardrails/audit.append` so
 * `verifyAudit` round-trips.
 *
 * HMAC-key derivation: we prefer a caller-supplied key (from
 * `OPENCLAW_AUDIT_HMAC_KEY`). When absent — fixture workspaces and the
 * claws-policy-generate smoke gate — the chain is signed with a key
 * derived deterministically from the `policyId` via SHA-256. Verify
 * reproduces the derivation when no env is set; this preserves the
 * "generate → verify" round-trip without leaking secret material.
 *
 * @module @bic/openclaw-policy/emit/emit-audit-chain
 */

import { createHash } from 'node:crypto';

import {
  computeHmac,
  GENESIS_HASH,
  type AuditEntry,
} from '@bic/openclaw-guardrails/audit';

import type { PolicyIR } from '../types/index.js';

export interface AuditChainManifest {
  readonly policyId: string;
  readonly snapshotId: string;
  readonly version: string;
  readonly chain: readonly AuditEntry[];
}

export interface EmitAuditChainOptions {
  readonly ir: PolicyIR;
  readonly snapshotId: string;
  readonly artifactHashes: {
    readonly 'policy-ir.json': string;
    readonly 'gateway-plugin.ts': string;
    readonly 'audit-manifest.json'?: string;
  };
  readonly hmacKey?: Buffer;
  readonly generatorVersion?: string;
  readonly workspaceId?: string;
  readonly scope?: '@openclaw' | '@bic/openclaw';
  /** Injected ID generator — lets callers produce a deterministic chain. */
  readonly idFactory?: () => string;
  /** Injected clock — deterministic timestamps for byte-identical round-trip. */
  readonly now?: () => Date;
}

/**
 * Derive a 32-byte HMAC key from a policyId. Deterministic; same policyId
 * always produces the same key. Scoped with a fixed-prefix domain separator
 * so this derivation does not accidentally collide with any other use of
 * the policyId.
 */
export function deriveFixtureHmacKey(policyId: string): Buffer {
  return createHash('sha256')
    .update('openclaw-policy:audit-chain:fixture:')
    .update(policyId)
    .digest();
}

/**
 * Build a deterministic audit-chain manifest for the three generated
 * artifacts. The manifest is what `verifyAudit` consumes.
 */
export function emitAuditChain(options: EmitAuditChainOptions): AuditChainManifest {
  const {
    ir,
    snapshotId,
    artifactHashes,
    generatorVersion = ir.version,
    workspaceId = 'oc://workspace/default',
    scope = '@bic/openclaw',
  } = options;

  const hmacKey = options.hmacKey ?? deriveFixtureHmacKey(ir.policyId);
  const idFactory = options.idFactory ?? makeDeterministicIdFactory(ir.policyId);
  const now = options.now ?? (() => new Date('2026-01-01T00:00:00.000Z'));

  const timestamp = now().toISOString();
  const base = {
    source: 'openclaw-policy-generate',
    actor: 'generator',
    scope,
    outcome: 'success' as const,
    timestamp,
  };

  const templates: ReadonlyArray<Omit<AuditEntry, 'hash' | 'id' | 'previousHash'>> = [
    {
      ...base,
      action: 'producer-genesis',
      target: snapshotId,
      reason: `generatorVersion=${generatorVersion} workspace=${workspaceId}`,
    },
    {
      ...base,
      action: 'producer-emit',
      target: 'policy-ir.json',
      reason: `sha256=${artifactHashes['policy-ir.json']}`,
    },
    {
      ...base,
      action: 'producer-emit',
      target: 'gateway-plugin.ts',
      reason: `sha256=${artifactHashes['gateway-plugin.ts']}`,
    },
  ];

  const chain = buildDeterministicChain(templates, hmacKey, idFactory);

  return {
    policyId: ir.policyId,
    snapshotId,
    version: ir.version,
    chain,
  };
}

function makeDeterministicIdFactory(seed: string): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    // UUIDv4-shaped deterministic ID derived from the seed + counter.
    const h = createHash('sha256').update(seed).update(`:${counter}`).digest('hex');
    return [
      h.slice(0, 8),
      h.slice(8, 12),
      `4${h.slice(13, 16)}`,
      `8${h.slice(17, 20)}`,
      h.slice(20, 32),
    ].join('-');
  };
}

function buildDeterministicChain(
  templates: ReadonlyArray<Omit<AuditEntry, 'hash' | 'id' | 'previousHash'>>,
  hmacKey: Buffer,
  idFactory: () => string,
): readonly AuditEntry[] {
  const out: AuditEntry[] = [];
  let previousHash = GENESIS_HASH;
  for (const template of templates) {
    const id = idFactory();
    const base: Omit<AuditEntry, 'hash'> = { ...template, id, previousHash };
    const hash = computeHmac(base, previousHash, hmacKey);
    const event: AuditEntry = { ...base, hash };
    out.push(event);
    previousHash = hash;
  }
  return out;
}

/**
 * Serialise the manifest with a 2-space indent so humans can read/diff the
 * chain on disk. The chain is already deterministic — indent is a
 * presentation concern.
 */
export function serializeAuditChain(manifest: AuditChainManifest): string {
  return JSON.stringify(manifest, null, 2) + '\n';
}
