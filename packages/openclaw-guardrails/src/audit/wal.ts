/**
 * @bic/openclaw-guardrails/audit — Write-ahead log (WAL) for crash recovery.
 *
 * Every auditable action follows the WAL pattern:
 *   1. writePending — record intent before execution
 *   2. execute the action
 *   3. writeComplete — record success or failure
 */

import { randomUUID } from "node:crypto";
import type { AuditEvent, ChainEntry } from "./types.js";
import { computeHmac, GENESIS_HASH } from "./chain.js";

export interface WALStore {
  entries: ChainEntry[];
  latestHash: string;
}

export function createWALStore(): WALStore {
  return { entries: [], latestHash: GENESIS_HASH };
}

export type PendingInput = Omit<AuditEvent, "id" | "hash" | "previousHash" | "outcome">;

export function writePending(
  store: WALStore,
  input: PendingInput,
  hmacKey: Buffer,
): { store: WALStore; event: AuditEvent } {
  const id = randomUUID();
  const previousHash = store.latestHash;

  const pendingBase: Omit<AuditEvent, "hash"> = {
    ...input,
    id,
    outcome: "pending",
    previousHash,
  };

  const hash = computeHmac(pendingBase, previousHash, hmacKey);
  const event: AuditEvent = { ...pendingBase, hash };
  const entry: ChainEntry = { pendingEvent: event };

  return {
    store: {
      entries: [...store.entries, entry],
      latestHash: hash,
    },
    event,
  };
}

export function writeComplete(
  store: WALStore,
  pendingId: string,
  outcome: "success" | "failed",
  hmacKey: Buffer,
  reason?: string,
): { store: WALStore; event: AuditEvent } {
  const entryIndex = store.entries.findIndex((e) => e.pendingEvent.id === pendingId);
  if (entryIndex === -1) {
    throw new Error(`WAL entry not found for pendingId: ${pendingId}`);
  }

  const entry = store.entries[entryIndex]!;
  const previousHash = store.latestHash;

  const { hash: _existingHash, ...base } = entry.pendingEvent;
  const completeBase: Omit<AuditEvent, "hash"> = {
    ...base,
    outcome,
    previousHash,
    ...(reason !== undefined ? { reason } : {}),
  };

  const computedHash = computeHmac(completeBase, previousHash, hmacKey);
  const completeEvent: AuditEvent = { ...completeBase, hash: computedHash };

  const updatedEntries = [...store.entries];
  updatedEntries[entryIndex] = {
    pendingEvent: entry.pendingEvent,
    completeEvent,
  };

  return {
    store: {
      entries: updatedEntries,
      latestHash: computedHash,
    },
    event: completeEvent,
  };
}

export function findIncomplete(store: WALStore): ChainEntry[] {
  return store.entries.filter((e) => e.completeEvent === undefined);
}

export function serialize(store: WALStore): string {
  const lines = store.entries.map((entry) => JSON.stringify(entry));
  return lines.join("\n") + "\n";
}

export function deserialize(jsonl: string): WALStore {
  const lines = jsonl
    .trim()
    .split("\n")
    .filter((l) => l.length > 0);
  const entries: ChainEntry[] = lines.map((line) => JSON.parse(line) as ChainEntry);

  let latestHash = GENESIS_HASH;
  for (const entry of entries) {
    if (entry.completeEvent) {
      latestHash = entry.completeEvent.hash;
    } else {
      latestHash = entry.pendingEvent.hash;
    }
  }

  return { entries, latestHash };
}
