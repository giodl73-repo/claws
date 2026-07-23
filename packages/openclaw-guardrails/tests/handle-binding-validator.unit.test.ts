import { describe, expect, it } from "vitest";
import { createHmac, randomBytes } from "node:crypto";
import {
  EVALUATION_ORDER,
  validateHandle,
  type ApprovalHandle,
  type InvalidReason,
  type ValidationContext,
  type ValidationDeps,
} from "../src/handle-binding/index.js";

/**
 * The 7 mutable field positions (excluding the signature pre-check) in the
 * order `validateHandle` evaluates. Used to drive the exhaustive first-failing
 * property test in scenario #12.
 */
const FIELD_ORDER: ReadonlyArray<{ name: string; reason: InvalidReason }> = [
  { name: "providerId", reason: "provider-id-mismatch" },
  { name: "contentHash", reason: "content-hash-mismatch" },
  { name: "sequenceNumber", reason: "sequence-rollback" },
  { name: "approverPrincipal", reason: "principal-mismatch" },
  { name: "keyId", reason: "unknown-keyId" },
  { name: "ttl", reason: "ttl-expired" },
  { name: "nonce", reason: "nonce-reuse" },
];

interface Harness {
  handle: ApprovalHandle;
  ctx: ValidationContext;
  deps: ValidationDeps;
  nowMs: number;
  seenNonces: Set<string>;
}

function sign(payload: Uint8Array, keyId: string, key: Buffer): string {
  const mac = createHmac("sha256", key).update(payload).digest("hex");
  return `${keyId}.${mac}`;
}

function buildHarness(
  overrides: Partial<{ breakField: (typeof FIELD_ORDER)[number]["name"] }> = {},
): Harness {
  const trustedKeyId = "k_trusted";
  const key = randomBytes(32);
  const keyLookup = (kid: string): Buffer | undefined => (kid === trustedKeyId ? key : undefined);

  const baseFields = {
    providerId: "provider-a",
    contentHash: "sha256-abc",
    sequenceNumber: 10,
    approverPrincipal: "user@tenant",
    keyId: trustedKeyId,
    ttl: 10_000,
    nonce: "nonce-1",
  };
  const payload = new TextEncoder().encode(JSON.stringify(baseFields));
  const signature = sign(payload, trustedKeyId, key);

  const handle: ApprovalHandle = {
    ...baseFields,
    signature,
    payload,
  };

  const ctx: ValidationContext = {
    expectedProviderId: "provider-a",
    canonicalInvocationHash: "sha256-abc",
    expectedApproverPrincipal: "user@tenant",
    sequenceHighWaterMark: 9,
    nonceScope: "scenario-1",
  };

  const nowMs = 5_000;
  const seenNonces = new Set<string>();
  const deps: ValidationDeps = {
    clock: () => nowMs,
    trustSet: new Set([trustedKeyId]),
    keyLookup,
    validateNonce: (nonce, _scope) => !seenNonces.has(nonce),
  };

  // Break fields in-place when caller asked; keeps each scenario a one-liner.
  const h: Harness = { handle: { ...handle }, ctx: { ...ctx }, deps, nowMs, seenNonces };
  if (overrides.breakField !== undefined) {
    breakField(h, overrides.breakField);
  }
  return h;
}

/**
 * Mutates the harness to cause `fieldName` to fail. The signature is
 * re-computed over the same payload bytes so the pre-check still passes —
 * this keeps multi-field tests independent of the HMAC.
 */
function breakField(h: Harness, fieldName: string): void {
  switch (fieldName) {
    case "providerId":
      h.ctx = { ...h.ctx, expectedProviderId: "provider-z" };
      return;
    case "contentHash":
      h.ctx = { ...h.ctx, canonicalInvocationHash: "sha256-other" };
      return;
    case "sequenceNumber":
      h.ctx = { ...h.ctx, sequenceHighWaterMark: 100 };
      return;
    case "approverPrincipal":
      h.ctx = { ...h.ctx, expectedApproverPrincipal: "else@tenant" };
      return;
    case "keyId":
      h.handle = { ...h.handle, keyId: "k_other" };
      return;
    case "ttl":
      h.handle = { ...h.handle, ttl: h.nowMs - 1 };
      return;
    case "nonce":
      h.seenNonces.add(h.handle.nonce);
      return;
    default:
      throw new Error(`unknown field: ${fieldName}`);
  }
}

describe("handle-binding validator (pulse 49)", () => {
  it("accepts a fully correct handle", () => {
    const { handle, ctx, deps } = buildHarness();
    expect(validateHandle(handle, ctx, deps)).toEqual({ ok: true });
  });

  it("rejects providerId mismatch alone", () => {
    const { handle, ctx, deps } = buildHarness({ breakField: "providerId" });
    expect(validateHandle(handle, ctx, deps)).toEqual({
      ok: false,
      invalidReason: "provider-id-mismatch",
    });
  });

  it("rejects contentHash differing from canonicalInvocationHash", () => {
    const { handle, ctx, deps } = buildHarness({ breakField: "contentHash" });
    expect(validateHandle(handle, ctx, deps)).toEqual({
      ok: false,
      invalidReason: "content-hash-mismatch",
    });
  });

  it("rejects sequenceNumber at or below high-water mark", () => {
    const { handle, ctx, deps } = buildHarness({ breakField: "sequenceNumber" });
    expect(validateHandle(handle, ctx, deps)).toEqual({
      ok: false,
      invalidReason: "sequence-rollback",
    });
  });

  it("rejects approverPrincipal not matching expected", () => {
    const { handle, ctx, deps } = buildHarness({ breakField: "approverPrincipal" });
    expect(validateHandle(handle, ctx, deps)).toEqual({
      ok: false,
      invalidReason: "principal-mismatch",
    });
  });

  it("rejects keyId not in trust set", () => {
    const { handle, ctx, deps } = buildHarness({ breakField: "keyId" });
    expect(validateHandle(handle, ctx, deps)).toEqual({
      ok: false,
      invalidReason: "unknown-keyId",
    });
  });

  it("rejects ttl expired (clock >= handle.ttl)", () => {
    const { handle, ctx, deps } = buildHarness({ breakField: "ttl" });
    expect(validateHandle(handle, ctx, deps)).toEqual({
      ok: false,
      invalidReason: "ttl-expired",
    });
  });

  it("rejects nonce reuse within scope", () => {
    const { handle, ctx, deps } = buildHarness({ breakField: "nonce" });
    expect(validateHandle(handle, ctx, deps)).toEqual({
      ok: false,
      invalidReason: "nonce-reuse",
    });
  });

  it("interaction: providerId + contentHash wrong → providerId wins (first in order)", () => {
    const h = buildHarness({ breakField: "providerId" });
    breakField(h, "contentHash");
    expect(validateHandle(h.handle, h.ctx, h.deps)).toEqual({
      ok: false,
      invalidReason: "provider-id-mismatch",
    });
  });

  it("interaction: contentHash + ttl wrong → contentHash wins (first in order)", () => {
    const h = buildHarness({ breakField: "contentHash" });
    breakField(h, "ttl");
    expect(validateHandle(h.handle, h.ctx, h.deps)).toEqual({
      ok: false,
      invalidReason: "content-hash-mismatch",
    });
  });

  it("signature pre-check: malformed signature short-circuits before any field", () => {
    const { handle, ctx, deps } = buildHarness({ breakField: "providerId" });
    const badHandle: ApprovalHandle = {
      ...handle,
      signature: `${handle.keyId}.deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef`,
    };
    expect(validateHandle(badHandle, ctx, deps)).toEqual({
      ok: false,
      invalidReason: "signature-mismatch",
    });
  });

  it("exhaustive-order property: for every 2-pair (i, j) with i < j, first-failing wins", () => {
    const allPairs: Array<[number, number]> = [];
    for (let i = 0; i < FIELD_ORDER.length; i++) {
      for (let j = i + 1; j < FIELD_ORDER.length; j++) {
        allPairs.push([i, j]);
      }
    }
    expect(allPairs.length).toBe(21); // C(7,2) = 21 — matches pulse 59 SC-24
    for (const [i, j] of allPairs) {
      const h = buildHarness({ breakField: FIELD_ORDER[i].name });
      breakField(h, FIELD_ORDER[j].name);
      const result = validateHandle(h.handle, h.ctx, h.deps);
      expect(result, `pair (${i}=${FIELD_ORDER[i].name}, ${j}=${FIELD_ORDER[j].name})`).toEqual({
        ok: false,
        invalidReason: FIELD_ORDER[i].reason,
      });
    }
  });

  it("EVALUATION_ORDER is exported and matches the documented 8-step order", () => {
    expect(EVALUATION_ORDER).toEqual([
      "signature",
      "provider-id",
      "content-hash",
      "sequence-number",
      "approver-principal",
      "key-id",
      "ttl",
      "nonce",
    ]);
  });
});
