/**
 * Type-shape verification for the v2-prototype package. This is
 * documentation-as-tests: each test pins a load-bearing type relationship
 * so that a future "swap to @openclaw/plugin-sdk" refactor can run these
 * same tests against the real upstream types and verify shape parity.
 *
 * If a test fails after the swap, the upstream type drifted from what
 * we proposed in the PR drafts.
 */

import { describe, expect, it } from "vitest";
import type {
  CanonicalManifest,
  Decision,
  DenyRule,
  PolicyIR,
  Snapshot,
  SnapshotError,
  SnapshotErrorCode,
  SnapshotId,
  SnapshotInternalPath,
  SnapshotStore,
  ToolSpec,
  WorkspaceId,
} from "../src/index.js";
import { POLICY_IR_PATH, validatePolicyIR } from "../src/index.js";

describe("snapshot — type shape", () => {
  it("SnapshotId, WorkspaceId, SnapshotInternalPath are string brands", () => {
    const id: SnapshotId = "abc123";
    const w: WorkspaceId = "workspace-1";
    const p: SnapshotInternalPath = ".openclaw/policy/policy-ir.json";
    expect(typeof id).toBe("string");
    expect(typeof w).toBe("string");
    expect(typeof p).toBe("string");
  });

  it("Snapshot has id + workspace + capturedAt", () => {
    const s: Snapshot = {
      id: "abc123",
      workspace: "workspace-1",
      capturedAt: "2026-04-29T10:00:00Z",
    };
    expect(s.id).toBe("abc123");
    expect(s.workspace).toBe("workspace-1");
    expect(s.capturedAt).toBe("2026-04-29T10:00:00Z");
  });

  it("SnapshotStore has capture / read / list", () => {
    // Type-only assertion — no runtime; the test passes if the impl
    // typechecks against the SnapshotStore interface.
    const store: SnapshotStore = {
      capture: async () => "snap-id",
      read: async () => new Uint8Array(),
      list: async () => [],
    };
    expect(typeof store.capture).toBe("function");
    expect(typeof store.read).toBe("function");
    expect(typeof store.list).toBe("function");
  });

  it("SnapshotErrorCode enum has the 9 documented codes", () => {
    const codes: SnapshotErrorCode[] = [
      "SNAP_NOT_FOUND",
      "SNAP_INVALID_PATH",
      "SNAP_STORE_UNAVAILABLE",
      "SNAP_AUTH_DENIED",
      "SNAP_CAPTURE_FAILED",
      "SNAP_LIMIT_EXCEEDED",
      "SNAP_CHECKSUM_MISMATCH",
      "SNAP_CONTRACT_VIOLATION",
      "SNAP_INTERNAL",
    ];
    expect(codes).toHaveLength(9);
  });

  it("SnapshotError carries code + message + optional cause", () => {
    const err: SnapshotError = {
      code: "SNAP_NOT_FOUND",
      message: "not found",
    };
    const errWithCause: SnapshotError = {
      code: "SNAP_INTERNAL",
      message: "oops",
      cause: new Error("underlying"),
    };
    expect(err.code).toBe("SNAP_NOT_FOUND");
    expect(errWithCause.cause).toBeInstanceOf(Error);
  });

  it("CanonicalManifest has workspace + capturedAt + sorted files", () => {
    const m: CanonicalManifest = {
      workspace: "w1",
      capturedAt: "2026-04-29T10:00:00Z",
      files: [
        { path: "AGENTS.md", sha256: "abc" },
        { path: "SOUL.md", sha256: "def" },
      ],
    };
    expect(m.files).toHaveLength(2);
  });
});

describe("policy-ir — type shape", () => {
  it("Decision is a discriminated union with 4 variants", () => {
    const allow: Decision = { kind: "allow" };
    const deny: Decision = { kind: "deny", reason: "r5-violation" };
    const denyWithRule: Decision = {
      kind: "deny",
      reason: "r5",
      rule: "rule-id-1",
    };
    const requiresApproval: Decision = {
      kind: "requires-approval",
      reason: "human-review",
    };
    const params: Decision = {
      kind: "params",
      mutate: { force_dry_run: true },
    };
    expect(allow.kind).toBe("allow");
    expect(deny.kind).toBe("deny");
    expect(denyWithRule.rule).toBe("rule-id-1");
    expect(requiresApproval.kind).toBe("requires-approval");
    expect(params.mutate).toEqual({ force_dry_run: true });
  });

  it("ToolSpec has id + capabilities + risk + sensitivity", () => {
    const t: ToolSpec = {
      id: "send-email",
      capabilities: ["network:smtp", "data:read"],
      risk: "high",
      sensitivity: "restricted",
    };
    expect(t.capabilities).toContain("network:smtp");
  });

  it("DenyRule has id + when + reason", () => {
    const r: DenyRule = {
      id: "r5-no-external-without-approval",
      when: { tool: "send-email" },
      reason: "R5 tools require external approval",
    };
    expect(r.when.tool).toBe("send-email");
  });

  it("PolicyIR has version + policyId + generatedAt + generatedFrom + tools + denyRules", () => {
    const ir: PolicyIR = {
      version: "1.0.0",
      policyId: "abc123",
      generatedAt: "2026-04-29T10:00:00Z",
      generatedFrom: "snap-id-1",
      tools: [],
      denyRules: [],
    };
    expect(ir.policyId).toBe("abc123");
    expect(ir.generatedFrom).toBe("snap-id-1");
  });

  it("POLICY_IR_PATH is the conventional snapshot-internal path", () => {
    expect(POLICY_IR_PATH).toBe(".openclaw/policy/policy-ir.json");
  });
});

describe("policy-ir-runtime — validatePolicyIR", () => {
  it("accepts a well-formed PolicyIR", () => {
    const ir = {
      version: "1.0.0",
      policyId: "abc",
      generatedAt: "2026-04-29T10:00:00Z",
      generatedFrom: "snap-1",
      tools: [],
      denyRules: [],
    };
    expect(() => validatePolicyIR(ir)).not.toThrow();
  });

  it("throws on null", () => {
    expect(() => validatePolicyIR(null)).toThrow(/non-null object/);
  });

  it("throws on missing required field", () => {
    expect(() => validatePolicyIR({ version: "1.0.0" })).toThrow(/missing required field/);
  });

  it("throws when tools is not an array", () => {
    const bad = {
      version: "1.0.0",
      policyId: "abc",
      generatedAt: "2026-04-29T10:00:00Z",
      generatedFrom: "snap-1",
      tools: "not-an-array",
      denyRules: [],
    };
    expect(() => validatePolicyIR(bad)).toThrow(/tools must be an array/);
  });

  it("throws when denyRules is not an array", () => {
    const bad = {
      version: "1.0.0",
      policyId: "abc",
      generatedAt: "2026-04-29T10:00:00Z",
      generatedFrom: "snap-1",
      tools: [],
      denyRules: { kind: "wrong" },
    };
    expect(() => validatePolicyIR(bad)).toThrow(/denyRules must be an array/);
  });
});
