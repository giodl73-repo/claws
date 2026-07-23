/**
 * /audit — hash-chain verify (6 L0 unit tests per pulse 48).
 */

import { describe, expect, test } from "vitest";
import { canonicalize } from "@bic/openclaw-workspace/canonicalize";
import {
  append,
  cefExport,
  computeHmac,
  createChainStore,
  exportEvents,
  GENESIS_HASH,
  jsonlExport,
  prune,
  query,
  syslogExport,
  verifyChain,
} from "../src/audit/index.js";
import type { AuditEntry, AuditEvent } from "../src/audit/index.js";
import {
  createWALStore,
  deserialize,
  findIncomplete,
  serialize,
  writeComplete,
  writePending,
} from "../src/audit/index.js";

async function collect(iter: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const line of iter) out.push(line);
  return out;
}

async function* toAsync<T>(items: readonly T[]): AsyncIterable<T> {
  for (const item of items) yield item;
}

const KEY = Buffer.from("a".repeat(64), "hex");

function appendMany(count: number): AuditEvent[] {
  let store = createChainStore();
  const events: AuditEvent[] = [];
  for (let i = 0; i < count; i++) {
    const result = append(
      store,
      {
        timestamp: new Date(2026, 3, 1, 0, 0, i).toISOString(),
        source: "test",
        action: "tool.call",
        target: `tool-${i}`,
        scope: "unit",
        outcome: "success",
      },
      KEY,
    );
    store = result.store;
    events.push(result.event);
  }
  return events;
}

describe("/audit — hash-chain (6 L0)", () => {
  test("canonicalize (peer dep) sorts keys deterministically", () => {
    const a = canonicalize({ b: 1, a: 2, c: { y: 1, x: 2 } });
    const b = canonicalize({ c: { x: 2, y: 1 }, a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1,"c":{"x":2,"y":1}}');
  });

  test("append produces GENESIS_HASH on first entry", () => {
    const { event } = append(
      createChainStore(),
      {
        timestamp: "2026-04-18T00:00:00.000Z",
        source: "test",
        action: "created",
        target: "t",
        scope: "s",
        outcome: "success",
      },
      KEY,
    );
    expect(event.previousHash).toBe(GENESIS_HASH);
    expect(event.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("verifyChain succeeds on a well-formed chain", () => {
    const events = appendMany(5);
    const result = verifyChain(events, KEY);
    expect(result.valid).toBe(true);
    expect(result.length).toBe(5);
  });

  test("verifyChain detects hash tampering", () => {
    const events = appendMany(4);
    const tampered = events.map((e, i) => (i === 2 ? { ...e, target: "mutated" } : e));
    const result = verifyChain(tampered, KEY);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(tampered[2]!.id);
  });

  test("prune drops events older than retention, retains recent ones", () => {
    let store = createChainStore();
    const old = append(
      store,
      {
        timestamp: new Date("2020-01-01").toISOString(),
        source: "test",
        action: "old",
        target: "t",
        scope: "s",
        outcome: "success",
      },
      KEY,
    );
    store = old.store;
    const recent = append(
      store,
      {
        timestamp: new Date().toISOString(),
        source: "test",
        action: "recent",
        target: "t",
        scope: "s",
        outcome: "success",
      },
      KEY,
    );
    store = recent.store;

    const { store: pruned, result } = prune(store, 30);
    expect(result.pruned).toBe(1);
    expect(result.retained).toBe(1);
    expect(pruned.events.map((e) => e.action)).toEqual(["recent"]);
  });

  test("query filters by actor + scope AND semantics", () => {
    let store = createChainStore();
    const r1 = append(
      store,
      {
        timestamp: "2026-04-18T00:00:00.000Z",
        source: "test",
        actor: "alice",
        action: "a",
        target: "t",
        scope: "prod",
        outcome: "success",
      },
      KEY,
    );
    store = r1.store;
    const r2 = append(
      store,
      {
        timestamp: "2026-04-18T00:00:01.000Z",
        source: "test",
        actor: "bob",
        action: "a",
        target: "t",
        scope: "prod",
        outcome: "success",
      },
      KEY,
    );
    store = r2.store;
    const results = query(store, { actor: "alice", scope: "prod" });
    expect(results.length).toBe(1);
    expect(results[0]!.actor).toBe("alice");
  });
});

// Supporting coverage for export + WAL + HMAC helpers (non-gated extras).
describe("/audit — supporting surfaces (coverage fill)", () => {
  test("exportEvents dispatches all three spec formats", async () => {
    const events = appendMany(1);
    expect(await exportEvents(events, "cef")).toContain("CEF:0");
    expect(await exportEvents(events, "jsonl")).toContain(events[0]!.id);
    expect(await exportEvents(events, "syslog")).toMatch(/^<\d+>1 /);
  });

  test("async-iterable exporters delegate to /siem formatters", async () => {
    const events = appendMany(2) as readonly AuditEntry[];
    const cefLines = await collect(cefExport(toAsync(events)));
    expect(cefLines).toHaveLength(2);
    expect(cefLines[0]).toContain("CEF:0|OpenClaw|guardrails-audit|");

    const jsonlLines = await collect(jsonlExport(toAsync(events)));
    expect(jsonlLines[0]).toContain(events[0]!.hash);

    const syslogLines = await collect(syslogExport(toAsync(events)));
    expect(syslogLines[0]).toMatch(/^<\d+>1 /);
  });

  test("computeHmac is deterministic for the same inputs", () => {
    const { event } = append(
      createChainStore(),
      {
        timestamp: "2026-04-18T00:00:00.000Z",
        source: "t",
        action: "a",
        target: "tg",
        scope: "s",
        outcome: "success",
      },
      KEY,
    );
    const { hash, ...rest } = event;
    const again = computeHmac(rest as Omit<AuditEvent, "hash">, event.previousHash, KEY);
    expect(again).toBe(hash);
  });

  test("WAL round-trip: writePending + writeComplete + serialize/deserialize", () => {
    let wal = createWALStore();
    const { store: s1, event: pending } = writePending(
      wal,
      {
        timestamp: "2026-04-18T00:00:00.000Z",
        source: "t",
        action: "x",
        target: "tg",
        scope: "s",
      },
      KEY,
    );
    wal = s1;
    expect(findIncomplete(wal).length).toBe(1);

    const { store: s2 } = writeComplete(wal, pending.id, "success", KEY);
    wal = s2;
    expect(findIncomplete(wal).length).toBe(0);

    const serialized = serialize(wal);
    const hydrated = deserialize(serialized);
    expect(hydrated.entries.length).toBe(1);
    expect(hydrated.latestHash).toBe(wal.latestHash);
  });

  test("writeComplete throws on unknown pendingId", () => {
    expect(() => writeComplete(createWALStore(), "missing", "success", KEY)).toThrow();
  });

  test("verifyChain on empty chain returns valid: true with length 0", () => {
    const result = verifyChain([], KEY);
    expect(result.valid).toBe(true);
    expect(result.length).toBe(0);
  });

  test("verifyChain detects broken previousHash linkage", () => {
    const events = appendMany(3);
    // break the 2nd event's previousHash so it no longer links to #1
    const broken = events.map((e, i) => (i === 1 ? { ...e, previousHash: "0".repeat(64) } : e));
    const result = verifyChain(broken, KEY);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(broken[1]!.id);
  });

  test("prune respects retentionDays override", () => {
    let store = createChainStore();
    const ev = append(
      store,
      {
        timestamp: new Date("2020-01-01").toISOString(),
        source: "test",
        action: "old",
        target: "t",
        scope: "s",
        outcome: "success",
        retentionDays: 365_000,
      },
      KEY,
    );
    store = ev.store;
    const { result } = prune(store, 30);
    expect(result.blockedByRetention).toBe(1);
    expect(result.pruned).toBe(0);
  });

  test("query supports from/to/action/source filters", () => {
    let store = createChainStore();
    const r1 = append(
      store,
      {
        timestamp: "2026-04-18T00:00:00.000Z",
        source: "api",
        action: "login",
        target: "t",
        scope: "s",
        outcome: "success",
      },
      KEY,
    );
    store = r1.store;
    const r2 = append(
      store,
      {
        timestamp: "2026-04-18T10:00:00.000Z",
        source: "api",
        action: "logout",
        target: "t",
        scope: "s",
        outcome: "success",
      },
      KEY,
    );
    store = r2.store;
    expect(query(store, { action: "login" }).length).toBe(1);
    expect(query(store, { source: "api" }).length).toBe(2);
    expect(query(store, { from: "2026-04-18T05:00:00.000Z" }).length).toBe(1);
    expect(query(store, { to: "2026-04-18T05:00:00.000Z" }).length).toBe(1);
  });
});
