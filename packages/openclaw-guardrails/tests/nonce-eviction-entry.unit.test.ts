/**
 * L0 unit tests for the NonceEvictionEntry audit type (pulse 59 D2).
 *
 * Covers the `isNonceEvictionEntry` structural guard across every shape the
 * emitter can produce (and every way a caller can get it wrong).
 */
import { describe, expect, it } from "vitest";
import {
  NONCE_EVICTION_REASON,
  NONCE_EVICTION_TYPE,
  isNonceEvictionEntry,
  type NonceEvictionEntry,
} from "../src/audit/nonce-eviction-entry.js";

describe("NonceEvictionEntry (pulse 59 D2)", () => {
  const valid: NonceEvictionEntry = {
    type: "nonce-eviction",
    scope: { keyId: "k1", snapshotId: "s1" },
    evictedCount: 1,
    reason: "lru-bound-exceeded",
    timestamp: 1_700_000_000_000,
  };

  it("recognizes a well-formed entry", () => {
    expect(isNonceEvictionEntry(valid)).toBe(true);
  });

  it("discriminator constant matches the entry type literal", () => {
    expect(NONCE_EVICTION_TYPE).toBe("nonce-eviction");
    expect(NONCE_EVICTION_REASON).toBe("lru-bound-exceeded");
  });

  it("rejects null and non-objects", () => {
    expect(isNonceEvictionEntry(null)).toBe(false);
    expect(isNonceEvictionEntry("string")).toBe(false);
    expect(isNonceEvictionEntry(42)).toBe(false);
    expect(isNonceEvictionEntry(undefined)).toBe(false);
  });

  it("rejects entries with the wrong discriminator", () => {
    expect(isNonceEvictionEntry({ ...valid, type: "other" })).toBe(false);
  });

  it("rejects entries with the wrong reason", () => {
    expect(isNonceEvictionEntry({ ...valid, reason: "something-else" })).toBe(false);
  });

  it("rejects entries missing numeric fields", () => {
    expect(isNonceEvictionEntry({ ...valid, evictedCount: "one" })).toBe(false);
    expect(isNonceEvictionEntry({ ...valid, timestamp: "now" })).toBe(false);
  });

  it("rejects entries without a scope", () => {
    expect(isNonceEvictionEntry({ ...valid, scope: null })).toBe(false);
    expect(isNonceEvictionEntry({ ...valid, scope: "scope-string" })).toBe(false);
    const { scope: _scope, ...withoutScope } = valid;
    expect(isNonceEvictionEntry(withoutScope)).toBe(false);
  });

  it("rejects entries whose scope lacks keyId/snapshotId strings", () => {
    expect(
      isNonceEvictionEntry({
        ...valid,
        scope: { keyId: "k1", snapshotId: 42 },
      }),
    ).toBe(false);
    expect(
      isNonceEvictionEntry({
        ...valid,
        scope: { keyId: null, snapshotId: "s1" },
      }),
    ).toBe(false);
  });
});
