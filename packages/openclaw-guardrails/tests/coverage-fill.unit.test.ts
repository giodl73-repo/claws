/**
 * Coverage-fill L0 tests — exercise remaining branches to meet 95/90/95/95
 * per-file after the CM1+CM2 spec-parity rewrites. Mix of audit retention,
 * approvals round-trip, /identity wrappers, /siem dispatch edge cases, and
 * /secrets entropy + pattern dedupe.
 */

import { describe, expect, test } from "vitest";
import { canonicalize } from "@bic/openclaw-workspace/canonicalize";

import {
  append,
  cefExport,
  createChainStore,
  exportEvents,
  GENESIS_HASH,
  jsonlExport,
  prune,
  query,
  syslogExport,
  verifyChain,
} from "../src/audit/index.js";
import type { AuditEntry } from "../src/audit/index.js";
import {
  createWALStore,
  deserialize,
  serialize,
  writeComplete,
  writePending,
} from "../src/audit/index.js";
import { parseHandle, signHandle, verifyHandle } from "../src/approvals/index.js";
import {
  createIdentityBridge,
  validateOidc,
  validateSaml,
  revokePrincipal,
  createRevocationCache,
} from "../src/identity/index.js";
import { emit, emitBatch, toCef, toSyslog } from "../src/siem/index.js";
import { createSecretScanner, matchPatterns } from "../src/secrets/index.js";

const KEY = Buffer.from("e".repeat(64), "hex");

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const v of iter) out.push(v);
  return out;
}

async function* toAsync<T>(items: readonly T[]): AsyncIterable<T> {
  for (const i of items) yield i;
}

describe("coverage-fill — audit chain + WAL", () => {
  test("canonicalize (peer dep) handles primitives / null / arrays", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
    expect(canonicalize("s")).toBe('"s"');
    expect(canonicalize(1)).toBe("1");
    expect(canonicalize(true)).toBe("true");
  });

  test("prune to empty resets latestHash to GENESIS_HASH", () => {
    let s = createChainStore();
    s = append(
      s,
      {
        timestamp: new Date("2020-01-01").toISOString(),
        source: "t",
        action: "a",
        target: "tg",
        scope: "ss",
        outcome: "success",
      },
      KEY,
    ).store;
    const { store: pruned, result } = prune(s, 30);
    expect(result.pruned).toBe(1);
    expect(pruned.latestHash).toBe(GENESIS_HASH);
  });

  test("query applies scope substring filter", () => {
    let s = createChainStore();
    s = append(
      s,
      {
        timestamp: "2026-04-18T00:00:00Z",
        source: "t",
        action: "a",
        target: "tg",
        scope: "prod/us-west",
        outcome: "success",
      },
      KEY,
    ).store;
    s = append(
      s,
      {
        timestamp: "2026-04-18T00:00:01Z",
        source: "t",
        action: "a",
        target: "tg",
        scope: "staging/us-east",
        outcome: "success",
      },
      KEY,
    ).store;
    expect(query(s, { scope: "prod" }).length).toBe(1);
    expect(query(s, { scope: "absent" }).length).toBe(0);
  });

  test("writeComplete records reason", () => {
    let wal = createWALStore();
    const pending = writePending(
      wal,
      {
        timestamp: "2026-04-18T00:00:00Z",
        source: "t",
        action: "x",
        target: "tg",
        scope: "s",
      },
      KEY,
    );
    wal = pending.store;
    const complete = writeComplete(wal, pending.event.id, "failed", KEY, "disk full");
    expect(complete.event.reason).toBe("disk full");
    expect(complete.event.outcome).toBe("failed");
  });

  test("verifyChain short-circuits on length-mismatched hash", () => {
    const events: AuditEntry[] = [
      {
        id: "x",
        timestamp: "2026-04-18T00:00:00Z",
        source: "t",
        action: "a",
        target: "t",
        scope: "s",
        outcome: "success",
        hash: "short",
        previousHash: GENESIS_HASH,
      },
    ];
    const r = verifyChain(events, KEY);
    expect(r.valid).toBe(false);
  });

  test("WAL deserialize tracks latestHash with a trailing pending entry", () => {
    let wal = createWALStore();
    const p1 = writePending(
      wal,
      {
        timestamp: "2026-04-18T00:00:00Z",
        source: "t",
        action: "a",
        target: "tg",
        scope: "s",
      },
      KEY,
    );
    wal = p1.store;
    const p2 = writePending(
      wal,
      {
        timestamp: "2026-04-18T00:00:01Z",
        source: "t",
        action: "b",
        target: "tg",
        scope: "s",
      },
      KEY,
    );
    wal = p2.store;
    const done = writeComplete(wal, p1.event.id, "success", KEY);
    wal = done.store;

    const serialized = serialize(wal);
    const hydrated = deserialize(serialized);
    expect(hydrated.latestHash).toBe(p2.event.hash);
    expect(hydrated.entries.length).toBe(2);
  });
});

describe("coverage-fill — audit export branches (empty + reason)", () => {
  test("exportEvents handles empty input for all 3 spec formats", async () => {
    expect(await exportEvents([], "cef")).toBe("");
    expect(await exportEvents([], "jsonl")).toBe("");
    expect(await exportEvents([], "syslog")).toBe("");
  });

  test("cefExport async-iterable yields msg=<reason> when set", async () => {
    let s = createChainStore();
    s = append(
      s,
      {
        timestamp: "2026-04-18T00:00:00Z",
        source: "api",
        action: "tool.deny",
        target: "x",
        scope: "prod",
        outcome: "failed",
        actor: "alice",
        reason: "policy violation",
      },
      KEY,
    ).store;
    const lines = await collect(cefExport(toAsync(s.events)));
    expect(lines[0]).toContain("msg=policy violation");
    expect(lines[0]).toContain("suser=alice");
    const jsonlLines = await collect(jsonlExport(toAsync(s.events)));
    expect(jsonlLines[0]).toContain("policy violation");
    const syslogLines = await collect(syslogExport(toAsync(s.events)));
    expect(syslogLines[0]).toMatch(/^<\d+>1 /);
  });
});

describe("coverage-fill — approvals/handle canonical branches", () => {
  test("signHandle + parseHandle round-trip preserves binding + issuedAt", () => {
    const now = new Date("2026-04-18T00:00:00Z");
    const handle = signHandle(
      {
        providerId: "p",
        contentHash: "c",
        sequenceNumber: 0,
        approverPrincipal: "u",
        keyId: "k",
        ttlSeconds: 60,
        nonce: "n",
      },
      KEY,
      now,
    );
    const parsed = parseHandle(handle);
    expect(parsed.payload.issuedAt).toBe(Math.floor(now.getTime() / 1000));
  });

  test("verifyHandle succeeds at exactly-TTL boundary", () => {
    const issued = new Date("2026-04-18T00:00:00Z");
    const h = signHandle(
      {
        providerId: "p",
        contentHash: "c",
        sequenceNumber: 0,
        approverPrincipal: "u",
        keyId: "k",
        ttlSeconds: 60,
        nonce: "n",
      },
      KEY,
      issued,
    );
    const r = verifyHandle(h, KEY, new Date(issued.getTime() + 60_000));
    expect(r.valid).toBe(true);
  });
});

describe("coverage-fill — identity", () => {
  test("validateOidc + validateSaml return valid identities", () => {
    const payload = {
      sub: "a",
      iss: "i",
      aud: "x",
      exp: 2_000_000_000,
      iat: 1_800_000_000,
    };
    const now = new Date(1_900_000_000 * 1000);
    expect(validateOidc(payload, { issuer: "i", audience: "x" }, now).valid).toBe(true);
    expect(validateSaml(payload, { issuer: "i", audience: "x" }, now).valid).toBe(true);
  });

  test("createIdentityBridge maps TokenIdentity to AgentIdentity via tokenDecoder", async () => {
    const bridge = createIdentityBridge({
      issuer: "i",
      audience: "x",
      tokenDecoder: (_t) => ({
        sub: "agent-42",
        iss: "i",
        aud: "x",
        tid: "tenant-A",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) - 60,
      }),
      resolveAgentId: (p) => String(p.sub),
    });
    const id = await bridge.verify("anything");
    expect(id.agentId).toBe("agent-42");
    expect(id.tenantId).toBe("tenant-A");
    expect(id.principal).toBe("agent-42");
    expect(id.obo?.issuedAt).toMatch(/^\d{4}-/);
  });

  test("createIdentityBridge.exchange delegates to configured exchangeFn", async () => {
    const bridge = createIdentityBridge({
      issuer: "i",
      audience: "x",
      tokenDecoder: () => ({
        sub: "s",
        iss: "i",
        aud: "x",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) - 60,
      }),
      exchangeFn: async (u, a) => `custom:${u}:${a}`,
    });
    expect(await bridge.exchange("user", "agent-7")).toBe("custom:user:agent-7");
  });

  test("createIdentityBridge.revoke adds principal to cache, subsequent verify rejects", async () => {
    const bridge = createIdentityBridge({
      issuer: "i",
      audience: "x",
      tokenDecoder: () => ({
        sub: "kate",
        iss: "i",
        aud: "x",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) - 60,
      }),
    });
    await bridge.revoke("kate");
    await expect(bridge.verify("t")).rejects.toThrow(/revoked/);
  });

  test("createIdentityBridge default resolveAgentId uses payload.sub; SAML protocol works", async () => {
    const bridge = createIdentityBridge({
      issuer: "i",
      audience: "x",
      protocol: "saml",
      tokenDecoder: () => ({
        sub: "saml-user",
        iss: "i",
        aud: "x",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) - 60,
      }),
    });
    const id = await bridge.verify("t");
    expect(id.agentId).toBe("saml-user");
    // no tid in token → tenantId defaults to ''
    expect(id.tenantId).toBe("");
  });

  test("createIdentityBridge surfaces validateOidc errors", async () => {
    const bridge = createIdentityBridge({
      issuer: "right",
      audience: "x",
      clockSkewSeconds: 60,
      tokenDecoder: () => ({
        sub: "s",
        iss: "wrong",
        aud: "x",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) - 60,
      }),
    });
    await expect(bridge.verify("t")).rejects.toThrow(/Issuer/);
  });

  test("createIdentityBridge.revoke + verify throws on revoked principal", async () => {
    const cache = revokePrincipal(createRevocationCache(), "revoked-sub");
    const bridge = createIdentityBridge({
      issuer: "i",
      audience: "x",
      tokenDecoder: () => ({
        sub: "revoked-sub",
        iss: "i",
        aud: "x",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) - 60,
      }),
      revocationCache: cache,
    });
    await expect(bridge.verify("t")).rejects.toThrow(/revoked/);
  });
});

describe("coverage-fill — siem dispatcher edge cases", () => {
  function e(overrides: Partial<AuditEntry> = {}): AuditEntry {
    return {
      id: "i",
      timestamp: "2026-04-18T00:00:00Z",
      source: "s",
      action: "a",
      target: "tg",
      scope: "sc",
      outcome: "success",
      hash: "0".repeat(64),
      previousHash: "0".repeat(64),
      ...overrides,
    };
  }

  test("emit + emitBatch dispatch for all 3 spec formats", () => {
    const ev = e();
    expect(emit(ev, "cef")).toContain("CEF:0");
    expect(emit(ev, "ndjson")).toContain('"i"');
    expect(emit(ev, "syslog")).toMatch(/^<\d+>1 /);

    expect(emitBatch([ev], "cef")).toContain("CEF:0");
    expect(emitBatch([ev], "ndjson")).toContain('"i"');
    expect(emitBatch([ev], "syslog")).toMatch(/^<\d+>1 /);
  });

  test("toCef handles missing actor / reason", () => {
    const bare = toCef(e());
    expect(bare).not.toContain("suser=");
    expect(bare).not.toContain("msg=");
    const full = toCef(e({ actor: "u", reason: "r" }));
    expect(full).toContain("suser=u");
    expect(full).toContain("msg=r");
  });

  test("toSyslog omits actor when absent", () => {
    expect(toSyslog(e())).not.toContain("actor=");
    expect(toSyslog(e({ actor: "u" }))).toContain('actor="u"');
  });
});

describe("coverage-fill — secrets", () => {
  test("scan() dedupes entropy + pattern overlap on a single input", () => {
    const scanner = createSecretScanner();
    const { findings } = scanner.scan("AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE", {
      entropyThreshold: 3.5,
      minEntropyLength: 8,
    });
    const awsCount = findings.filter((f) => f.ruleId === "aws-access-key").length;
    const entropyCount = findings.filter((f) => f.ruleId === "entropy").length;
    expect(awsCount).toBe(1);
    expect(entropyCount).toBe(0);
  });

  test("scan() surfaces standalone high-entropy tokens as a finding", () => {
    const scanner = createSecretScanner();
    const { findings } = scanner.scan("opaque = X7pQ9bK2mR8vL3yT5wN1fZ6jH4cD0gM", {
      entropyThreshold: 3.5,
      minEntropyLength: 16,
    });
    const entropyHit = findings.find((f) => f.ruleId === "entropy");
    expect(entropyHit).toBeDefined();
    expect(entropyHit!.type).toBe("high-entropy");
  });

  test("matchPatterns returns matches with span + confidence", () => {
    const matches = matchPatterns("ACME-abcdef\nAKIAIOSFODNN7EXAMPLE");
    const aws = matches.find((m) => m.patternId === "aws-access-key");
    expect(aws).toBeDefined();
    expect(aws!.end).toBeGreaterThan(aws!.start);
  });

  test("matchPatterns defaults confidence to medium when pattern omits it", () => {
    const custom = [
      {
        id: "x",
        label: "X",
        type: "token" as const,
        regex: /XYZ-[A-Z]{3}/,
      },
    ];
    const [m] = matchPatterns("prefix XYZ-ABC suffix", custom);
    expect(m!.confidence).toBe("medium");
  });

  test("matchPatterns exits after first match for non-global patterns", () => {
    const nonGlobal = [
      {
        id: "ng",
        label: "NG",
        type: "token" as const,
        confidence: "high" as const,
        regex: /AAA/,
      },
    ];
    const results = matchPatterns("AAA-AAA-AAA", nonGlobal);
    expect(results).toHaveLength(1);
  });
});

describe("coverage-fill — approvals/guards non-object branch", () => {
  test("isApprovalRequest + isApprovalResponse reject non-object primitives", async () => {
    const { isApprovalRequest, isApprovalResponse } = await import("../src/approvals/index.js");
    expect(isApprovalRequest("not-an-object")).toBe(false);
    expect(isApprovalRequest(42)).toBe(false);
    expect(isApprovalResponse(undefined)).toBe(false);
    expect(isApprovalResponse(false)).toBe(false);
  });
});
