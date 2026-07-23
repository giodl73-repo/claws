/**
 * @bic/openclaw-guardrails/audit — Chain integrity verification (HMAC-SHA256).
 *
 * Uses timing-safe comparison to prevent side-channel attacks.
 */

import { timingSafeEqual } from "node:crypto";
import type { AuditEvent, VerifyResult } from "./types.js";
import { computeHmac, GENESIS_HASH } from "./chain.js";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Verify an audit event chain's integrity.
 */
export function verifyChain(
  events: AuditEvent[],
  hmacKey: Buffer,
  expectedGenesis?: string,
): VerifyResult {
  if (events.length === 0) {
    return { valid: true, length: 0 };
  }

  const genesisHash = expectedGenesis ?? GENESIS_HASH;
  const first = events[0]!;
  const last = events[events.length - 1]!;

  for (let i = 0; i < events.length; i++) {
    const event = events[i]!;
    const expectedPrev = i === 0 ? genesisHash : events[i - 1]!.hash;

    if (!safeEqual(event.previousHash, expectedPrev)) {
      return {
        valid: false,
        length: events.length,
        genesis: first.hash,
        latest: last.hash,
        brokenAt: event.id,
      };
    }

    const { hash, ...withoutHash } = event;
    const recomputed = computeHmac(
      withoutHash as Omit<AuditEvent, "hash">,
      event.previousHash,
      hmacKey,
    );
    if (!safeEqual(recomputed, hash)) {
      return {
        valid: false,
        length: events.length,
        genesis: first.hash,
        latest: last.hash,
        brokenAt: event.id,
      };
    }
  }

  return {
    valid: true,
    length: events.length,
    genesis: first.hash,
    latest: last.hash,
  };
}
