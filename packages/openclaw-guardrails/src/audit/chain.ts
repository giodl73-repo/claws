/**
 * @bic/openclaw-guardrails/audit — Hash-chained JSONL audit trail.
 *
 * Append-only event chain with HMAC-SHA256 integrity. Each event's hash
 * incorporates the previous event's hash, creating a tamper-evident chain.
 */

import { createHmac, randomUUID } from 'node:crypto';
import { canonicalize } from '@bic/openclaw-workspace/canonicalize';
import type { AuditEvent, AuditQuery, PruneResult } from './types.js';

/** Genesis hash — the previousHash for the first event in a chain. */
export const GENESIS_HASH = '0'.repeat(64);

const HMAC_FIELDS = [
  'id',
  'timestamp',
  'source',
  'actor',
  'action',
  'target',
  'scope',
  'outcome',
  'reason',
  'previousHash',
] as const;

/**
 * Compute the HMAC-SHA256 hash for an audit event.
 * Canonicalization uses `@bic/openclaw-workspace/canonicalize` (RFC 8785 JCS)
 * so audit hashes are byte-identical across every consumer of the peer.
 */
export function computeHmac(
  event: Omit<AuditEvent, 'hash'>,
  previousHash: string,
  hmacKey: Buffer,
): string {
  const hashInput: Record<string, unknown> = { previousHash };
  for (const key of HMAC_FIELDS) {
    if (key === 'previousHash') continue;
    const value = event[key as keyof typeof event];
    if (value !== undefined) {
      hashInput[key] = value;
    }
  }
  const payload = canonicalize(hashInput);
  return createHmac('sha256', hmacKey).update(payload).digest('hex');
}

/** In-memory chain state. */
export interface ChainStore {
  events: AuditEvent[];
  latestHash: string;
}

/** Create an empty chain store. */
export function createChainStore(): ChainStore {
  return { events: [], latestHash: GENESIS_HASH };
}

/** Fields required to append an event. */
export type AppendInput = Omit<AuditEvent, 'id' | 'hash' | 'previousHash'>;

/**
 * Append an event to the chain.
 */
export function append(
  store: ChainStore,
  input: AppendInput,
  hmacKey: Buffer,
): { store: ChainStore; event: AuditEvent } {
  const id = randomUUID();
  const previousHash = store.latestHash;

  const eventBase: Omit<AuditEvent, 'hash'> = {
    ...input,
    id,
    previousHash,
  };

  const hash = computeHmac(eventBase, previousHash, hmacKey);
  const event: AuditEvent = { ...eventBase, hash };

  return {
    store: {
      events: [...store.events, event],
      latestHash: hash,
    },
    event,
  };
}

/**
 * Prune events older than retentionDays, respecting per-event retention
 * overrides.
 */
export function prune(
  store: ChainStore,
  retentionDays: number,
  now?: Date,
): { store: ChainStore; result: PruneResult } {
  const reference = now ?? new Date();
  const cutoff = new Date(reference);
  cutoff.setDate(cutoff.getDate() - retentionDays);

  let pruned = 0;
  let retained = 0;
  let blockedByRetention = 0;
  let anchorHash: string | undefined;
  const kept: AuditEvent[] = [];

  for (const event of store.events) {
    const eventDate = new Date(event.timestamp);

    if (eventDate >= cutoff) {
      kept.push(event);
      retained++;
      continue;
    }

    if (event.retentionDays !== undefined) {
      const regulatoryCutoff = new Date(eventDate);
      regulatoryCutoff.setDate(regulatoryCutoff.getDate() + event.retentionDays);
      if (regulatoryCutoff > reference) {
        kept.push(event);
        retained++;
        blockedByRetention++;
        continue;
      }
    }

    anchorHash = event.hash;
    pruned++;
  }

  return {
    store: {
      events: kept,
      latestHash: kept.length > 0 ? kept[kept.length - 1]!.hash : GENESIS_HASH,
    },
    result: {
      pruned,
      retained,
      blockedByRetention,
      ...(anchorHash !== undefined ? { anchorHash } : {}),
    },
  };
}

/**
 * Query events with AND-semantics filters.
 */
export function query(store: ChainStore, filter: AuditQuery): AuditEvent[] {
  return store.events.filter((event) => {
    if (filter.actor !== undefined && event.actor !== filter.actor) return false;
    if (filter.from !== undefined && event.timestamp < filter.from) return false;
    if (filter.to !== undefined && event.timestamp > filter.to) return false;
    if (filter.action !== undefined && event.action !== filter.action) return false;
    if (filter.scope !== undefined && !event.scope.includes(filter.scope)) return false;
    if (filter.source !== undefined && event.source !== filter.source) return false;
    return true;
  });
}
