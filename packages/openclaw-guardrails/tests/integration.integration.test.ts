/**
 * L1 integration tests — 8 seams exercised post-CM2:
 *   2 audit ↔ canonicalize (peer-dep) chain
 *   2 approvals ↔ canonicalize (peer-dep) HandleBinding
 *   2 identity ↔ budget (per-principal metering via BudgetMeter)
 *   2 siem ↔ audit export round-trip (one CEF dialect, spec formats only)
 */

import { describe, expect, test } from "vitest";
import { canonicalize } from "@bic/openclaw-workspace/canonicalize";

import {
  append,
  cefExport,
  createChainStore,
  exportEvents,
  jsonlExport,
  syslogExport,
  verifyChain,
} from "../src/audit/index.js";
import type { AuditEntry } from "../src/audit/index.js";
import { signHandle, verifyHandle } from "../src/approvals/index.js";
import type { HandleBinding } from "../src/approvals/index.js";
import { createBudgetMeter } from "../src/budget/index.js";
import type { BudgetEvent } from "../src/budget/index.js";
import { resolveIdentity } from "../src/identity/index.js";
import type { TokenPayload } from "../src/identity/index.js";
import { emitBatch, toCef, toNdjson, toSyslog } from "../src/siem/index.js";

const KEY = Buffer.from("d".repeat(64), "hex");

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const v of iter) out.push(v);
  return out;
}

async function* toAsync<T>(items: readonly T[]): AsyncIterable<T> {
  for (const i of items) yield i;
}

describe("L1 — audit ↔ canonicalize (2)", () => {
  test("canonicalize (peer) produces key-order-stable bytes for audit-shaped inputs", () => {
    const a = canonicalize({ target: "t", action: "go", scope: "s" });
    const b = canonicalize({ scope: "s", action: "go", target: "t" });
    expect(a).toBe(b);
  });

  test("audit chain end-to-end: append → verify → exportEvents in all 3 spec formats", async () => {
    let s = createChainStore();
    for (let i = 0; i < 3; i++) {
      s = append(
        s,
        {
          timestamp: `2026-04-18T00:0${i}:00Z`,
          source: "api",
          action: "tool.call",
          target: `t-${i}`,
          scope: "prod",
          outcome: "success",
          actor: "alice",
        },
        KEY,
      ).store;
    }
    expect(verifyChain(s.events, KEY).valid).toBe(true);
    expect(await exportEvents(s.events, "cef")).toContain("CEF:0");
    expect((await exportEvents(s.events, "jsonl")).split("\n")).toHaveLength(3);
    expect((await exportEvents(s.events, "syslog")).split("\n")).toHaveLength(3);
  });
});

describe("L1 — approvals ↔ canonicalize HandleBinding (2)", () => {
  test("HandleBinding signature is stable across field-order variations", () => {
    const now = new Date("2026-04-18T00:00:00Z");
    const a: HandleBinding = {
      providerId: "p",
      contentHash: "c",
      sequenceNumber: 7,
      approverPrincipal: "u@x",
      keyId: "k-1",
      ttlSeconds: 300,
      nonce: "n",
    };
    const b: HandleBinding = {
      nonce: "n",
      ttlSeconds: 300,
      keyId: "k-1",
      approverPrincipal: "u@x",
      sequenceNumber: 7,
      contentHash: "c",
      providerId: "p",
    };
    expect(signHandle(a, KEY, now)).toBe(signHandle(b, KEY, now));
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  test("Replay protection: verify succeeds within TTL, fails after expiry", () => {
    const binding: HandleBinding = {
      providerId: "p",
      contentHash: "sha256-abc",
      sequenceNumber: 1,
      approverPrincipal: "u",
      keyId: "k",
      ttlSeconds: 60,
      nonce: "n1",
    };
    const issued = new Date("2026-04-18T00:00:00Z");
    const handle = signHandle(binding, KEY, issued);

    const fresh = verifyHandle(handle, KEY, new Date("2026-04-18T00:00:30Z"));
    expect(fresh.valid).toBe(true);

    const stale = verifyHandle(handle, KEY, new Date("2026-04-18T00:02:00Z"));
    expect(stale.valid).toBe(false);
    if (!stale.valid) expect(stale.reason).toBe("expired");
  });
});

describe("L1 — identity ↔ budget (per-tenant budget via principal) (2)", () => {
  function evt(cost: { tokens?: number; costUsd?: number }): BudgetEvent {
    return {
      server: "s",
      tool: "t",
      context: { conversationId: "c-1" },
      extensions: { cost },
    };
  }

  test("per-principal meters isolate spend by identity subject", async () => {
    const aliceId = resolveIdentity(tokenFor("alice", "tenant-A"), "oidc");
    const bobId = resolveIdentity(tokenFor("bob", "tenant-A"), "oidc");

    const aliceMeter = createBudgetMeter({
      window: "day",
      limits: { tokens: 100 },
      onExhausted: "deny",
      label: aliceId.subject,
    });
    const bobMeter = createBudgetMeter({
      window: "day",
      limits: { tokens: 100 },
      onExhausted: "deny",
      label: bobId.subject,
    });

    await aliceMeter.record(evt({ tokens: 0 }), { tokens: 60 });
    await bobMeter.record(evt({ tokens: 0 }), { tokens: 10 });

    expect(aliceMeter.window().spent.tokens).toBe(60);
    expect(bobMeter.window().spent.tokens).toBe(10);
  });

  test("BudgetMeter.check() transitions ok → threshold → exceeded per principal", async () => {
    const id = resolveIdentity(tokenFor("carol", "tenant-B"), "oidc");
    const meter = createBudgetMeter({
      window: "day",
      limits: { costUsd: 50 },
      thresholds: [{ at: 0.8, action: "alert" }],
      onExhausted: "deny",
      label: id.subject,
    });
    await meter.record(evt({}), { costUsd: 30 });
    const ok = await meter.check(evt({ costUsd: 0 }));
    expect(ok.status).toBe("ok");

    await meter.record(evt({}), { costUsd: 12 });
    const threshold = await meter.check(evt({ costUsd: 0 }));
    expect(threshold.status).toBe("threshold");

    await meter.record(evt({}), { costUsd: 10 });
    const exceeded = await meter.check(evt({ costUsd: 0 }));
    expect(exceeded.status).toBe("exceeded");
  });
});

describe("L1 — siem ↔ audit export round-trip (2)", () => {
  test("/siem per-entry and /audit async-iterable exporters agree on content", async () => {
    const entries: AuditEntry[] = [
      fakeEntry("a1", KEY),
      fakeEntry("a2", KEY),
      fakeEntry("a3", KEY),
    ];

    const perEntryCef = entries.map(toCef);
    const batchCef = emitBatch(entries, "cef").split("\n");
    expect(batchCef).toEqual(perEntryCef);

    const fromAudit = await collect(cefExport(toAsync(entries)));
    expect(fromAudit).toEqual(perEntryCef);

    // One CEF dialect: product must be `guardrails-audit` everywhere.
    for (const line of batchCef) {
      expect(line).toContain("CEF:0|OpenClaw|guardrails-audit|");
    }
  });

  test("NDJSON + syslog line counts + prefixes agree across /siem and /audit", async () => {
    const entries: AuditEntry[] = [
      fakeEntry("b1", KEY),
      fakeEntry("b2", KEY),
      fakeEntry("b3", KEY),
    ];

    const ndSiem = emitBatch(entries, "ndjson").split("\n");
    const ndAudit = await collect(jsonlExport(toAsync(entries)));
    expect(ndSiem).toEqual(ndAudit);
    expect(ndSiem[0]).toContain(entries[0]!.id);
    // toNdjson per-entry agrees with batch
    expect(entries.map(toNdjson)).toEqual(ndSiem);

    const sysSiem = emitBatch(entries, "syslog").split("\n");
    const sysAudit = await collect(syslogExport(toAsync(entries)));
    expect(sysSiem).toEqual(sysAudit);
    for (const line of sysSiem) expect(line).toMatch(/^<\d+>1 /);
    // per-entry toSyslog agrees with batch
    expect(entries.map((e) => toSyslog(e))).toEqual(sysSiem);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeEntry(tag: string, key: Buffer): AuditEntry {
  const { event } = append(
    createChainStore(),
    {
      timestamp: "2026-04-18T00:00:00Z",
      source: "t",
      actor: "u",
      action: tag,
      target: `oc://t/${tag}`,
      scope: "prod",
      outcome: "success",
    },
    key,
  );
  return event;
}

function tokenFor(sub: string, tenantId: string): TokenPayload {
  return {
    sub,
    iss: "https://login.example.com",
    aud: "openclaw-host",
    exp: 2_000_000_000,
    iat: 1_800_000_000,
    groups: ["user"],
    tid: tenantId,
  };
}
