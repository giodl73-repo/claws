/**
 * /approvals — handle-binding round-trip + TTL (5 L0 unit tests per pulse 48).
 */

import { describe, expect, test } from "vitest";
import {
  isApprovalRequest,
  isApprovalResponse,
  parseHandle,
  signHandle,
  validateTimeoutPolicy,
  verifyHandle,
} from "../src/approvals/index.js";
import type {
  ApprovalRequestEvent,
  ApprovalResponseEvent,
  ApprovalTimeoutPolicy,
  GovernanceApprovalMetadata,
  HandleBinding,
} from "../src/approvals/index.js";

const KEY = Buffer.from("b".repeat(64), "hex");

function makeBinding(overrides: Partial<HandleBinding> = {}): HandleBinding {
  return {
    providerId: "exec-approvals",
    contentHash: "sha256-" + "0".repeat(64),
    sequenceNumber: 1,
    approverPrincipal: "user@example.com",
    keyId: "key-2026-04",
    ttlSeconds: 3600,
    nonce: "nonce-abc",
    ...overrides,
  };
}

describe("/approvals — handle-binding (5 L0)", () => {
  test("signHandle + verifyHandle round-trip preserves binding exactly", () => {
    const binding = makeBinding();
    const now = new Date("2026-04-18T00:00:00Z");
    const handle = signHandle(binding, KEY, now);
    const result = verifyHandle(handle, KEY, new Date("2026-04-18T00:30:00Z"));
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.binding).toEqual(binding);
      expect(result.issuedAt).toBe(Math.floor(now.getTime() / 1000));
    }
  });

  test("verifyHandle rejects a handle signed by a different key", () => {
    const binding = makeBinding();
    const handle = signHandle(binding, KEY);
    const result = verifyHandle(handle, Buffer.from("c".repeat(64), "hex"));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("bad_signature");
  });

  test("verifyHandle rejects a handle after TTL expiry (fail-closed)", () => {
    const binding = makeBinding({ ttlSeconds: 60 });
    const issued = new Date("2026-04-18T00:00:00Z");
    const handle = signHandle(binding, KEY, issued);
    const afterTtl = new Date("2026-04-18T00:05:00Z");
    const result = verifyHandle(handle, KEY, afterTtl);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("expired");
  });

  test("verifyHandle rejects malformed handles", () => {
    expect(verifyHandle("not-a-handle", KEY)).toEqual({
      valid: false,
      reason: "malformed",
    });
  });

  test("validateTimeoutPolicy accepts deny + escalate shapes", () => {
    const denyOk: ApprovalTimeoutPolicy = {
      defaultTtlSeconds: 86_400,
      onTimeout: "deny",
    };
    expect(validateTimeoutPolicy(denyOk)).toBeNull();

    const escalateOk: ApprovalTimeoutPolicy = {
      defaultTtlSeconds: 3_600,
      onTimeout: "escalate",
      escalationTargets: ["sec-oncall@example.com"],
    };
    expect(validateTimeoutPolicy(escalateOk)).toBeNull();

    const escalateMissingTargets: ApprovalTimeoutPolicy = {
      defaultTtlSeconds: 3_600,
      onTimeout: "escalate",
    };
    expect(validateTimeoutPolicy(escalateMissingTargets)).toContain("escalationTargets");
  });

  test("GovernanceApprovalMetadata — spec shape (compile check + runtime construction)", () => {
    const meta: GovernanceApprovalMetadata = {
      approvalHandle: "handle.sig",
      contentHash: "sha256-" + "0".repeat(64),
      riskLevel: 4,
      sensitivity: "confidential",
      category: "tool_call",
    };
    expect(meta.approvalHandle).toBe("handle.sig");
    expect(meta.riskLevel).toBe(4);

    const minimal: GovernanceApprovalMetadata = {
      approvalHandle: "h",
      contentHash: "sha256-" + "1".repeat(64),
    };
    expect(minimal.riskLevel).toBeUndefined();
    expect(minimal.sensitivity).toBeUndefined();
    expect(minimal.category).toBeUndefined();
  });
});

// Guard coverage + parse helper (coverage fill).
describe("/approvals — guards + parse helpers (coverage fill)", () => {
  test("isApprovalRequest accepts schemaVersion:1 request events", () => {
    const ev: ApprovalRequestEvent = {
      schemaVersion: 1,
      type: "approval_request",
      requestId: "r1",
      timestamp: "2026-04-18T00:00:00Z",
      toolCall: { server: "s", tool: "t" },
      risk: { level: 3, capability: "communicate", reason: "net" },
      governance: { provider: "p", fleetPolicyApplied: false },
      context: { conversationId: "c1" },
    };
    expect(isApprovalRequest(ev)).toBe(true);
    expect(isApprovalRequest(null)).toBe(false);
    expect(isApprovalRequest({ schemaVersion: 2 })).toBe(false);
  });

  test("isApprovalResponse accepts schemaVersion:1 response events", () => {
    const ev: ApprovalResponseEvent = {
      schemaVersion: 1,
      type: "approval_response",
      requestId: "r1",
      timestamp: "2026-04-18T00:05:00Z",
      decision: { status: "approved", decidedBy: { type: "user" } },
    };
    expect(isApprovalResponse(ev)).toBe(true);
    expect(isApprovalResponse({})).toBe(false);
  });

  test("validateTimeoutPolicy rejects non-positive ttl, bad onTimeout, and malformed escalationTargets", () => {
    expect(
      validateTimeoutPolicy({
        defaultTtlSeconds: 0,
        onTimeout: "deny",
      } as ApprovalTimeoutPolicy),
    ).toContain("defaultTtlSeconds");
    expect(
      validateTimeoutPolicy({
        defaultTtlSeconds: 60,
        onTimeout: "other" as "deny",
      } as ApprovalTimeoutPolicy),
    ).toContain("onTimeout");
    expect(
      validateTimeoutPolicy({
        defaultTtlSeconds: 60,
        onTimeout: "escalate",
        escalationTargets: "not-array" as unknown as readonly string[],
      } as ApprovalTimeoutPolicy),
    ).toContain("array");
    expect(
      validateTimeoutPolicy({
        defaultTtlSeconds: 60,
        onTimeout: "escalate",
        escalationTargets: ["" as string],
      } as ApprovalTimeoutPolicy),
    ).toContain("non-empty strings");
  });

  test("parseHandle returns payload + signature and throws on malformed input", () => {
    const handle = signHandle(makeBinding(), KEY);
    const parsed = parseHandle(handle);
    expect(parsed.signature).toMatch(/^[0-9a-f]{64}$/);
    expect(parsed.payload.binding.providerId).toBe("exec-approvals");
    expect(() => parseHandle("nodots")).toThrow();
  });
});
