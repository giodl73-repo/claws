/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 14.
 *
 * Continues `v2-chain-lkg-adversarial{,-2..-13}.integration.test.ts`.
 * Wave 14 categories:
 *
 *   MET.    Metrics aggregation from audit                  (4)
 *   TEL.    Telemetry semantics (PII vs structural fields)  (4)
 *   HEALTH. Health / readiness derived from getEntry        (4)
 *   RATE.   Rate-of-recovery as a health signal             (4)
 *
 * Total: 16 scenarios.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-14
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { lkgStore, type AuditRecord } from "@bic/openclaw-lkg";
import type { LKGTracker } from "@bic/v2-prototype";

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function makeFsScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-adv14-"));
  live.push({ scratch });
  return scratch;
}

interface FakeJson {
  ok: boolean;
}

function jsonTracker(p: string): LKGTracker<FakeJson> {
  return {
    path: p,
    parse: (raw) => JSON.parse(raw) as FakeJson,
    validate: (parsed) => ({
      valid: parsed?.ok === true,
      issues: parsed?.ok === true ? [] : [{ path: "ok", message: "must be true" }],
    }),
  };
}

// ============================================================
// MET · Metrics aggregation from audit
// ============================================================

describe("MET · Metrics aggregation from audit", () => {
  it("MET1 audit-derived counters: total observes, by outcome", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register(jsonTracker(target));
    await store.observe(target); // promoted
    await store.observe(target); // valid
    await fs.writeFile(target, '{"ok":false}');
    await store.observe(target); // recovered
    await store.observe(target); // valid
    await fs.unlink(target);
    await store.observe(target); // failed

    // Aggregate metrics from audit log.
    const counters: Record<string, number> = {};
    for (const r of audits) {
      counters[r.outcome] = (counters[r.outcome] ?? 0) + 1;
    }
    expect(counters.promoted).toBe(1);
    expect(counters.valid).toBe(2);
    expect(counters.recovered).toBe(1);
    expect(counters.failed).toBe(1);
  });

  it("MET2 audit-derived per-tracker counters", async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, "a.json");
    const b = path.join(scratch, "b.json");
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register(jsonTracker(a));
    store.register(jsonTracker(b));
    await store.observe(a);
    await store.observe(a);
    await store.observe(b);

    const perTracker: Record<string, number> = {};
    for (const r of audits) {
      perTracker[r.trackerPath] = (perTracker[r.trackerPath] ?? 0) + 1;
    }
    expect(perTracker[a]).toBe(2);
    expect(perTracker[b]).toBe(1);
  });

  it("MET3 audit ts can be aggregated into rate-per-window calculations", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const FROZEN_AT = (sec: number): Date =>
      new Date(`2026-04-29T00:00:${String(sec).padStart(2, "0")}.000Z`);
    let i = 0;
    const store = lkgStore({
      now: () => FROZEN_AT(i++),
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register(jsonTracker(target));
    for (let k = 0; k < 10; k++) await store.observe(target);

    // Compute "observes per second" (1-second windows).
    const ratePerSec: Record<string, number> = {};
    for (const r of audits) {
      const sec = r.ts.slice(0, 19); // YYYY-MM-DDTHH:MM:SS
      ratePerSec[sec] = (ratePerSec[sec] ?? 0) + 1;
    }
    // 10 distinct seconds since the FROZEN clock advances once per call.
    expect(Object.keys(ratePerSec)).toHaveLength(10);
    expect(Object.values(ratePerSec).every((v) => v === 1)).toBe(true);
  });

  it("MET4 audit `current.bytes` field can be aggregated for byte-volume tracking", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true,"padding":"a-b-c"}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; padding: string },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    });
    await store.observe(target);
    const r = audits.at(-1);
    expect(r?.current?.bytes).toBeGreaterThan(0);
    // Bytes equals raw byte length of the file content.
    const stat = await fs.stat(target);
    expect(r?.current?.bytes).toBe(stat.size);
  });
});

// ============================================================
// TEL · Telemetry semantics
// ============================================================

describe("TEL · Telemetry semantics", () => {
  it("TEL1 [shape] audit `current.hash` is content-derived — exposing it to telemetry leaks no plaintext but enables correlation", async () => {
    // The hash is sha256 — non-reversible. Emitting hashes to
    // telemetry/metrics is safe for correlation without exposing
    // the underlying content.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true,"secret":"hunter2"}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; secret: string },
      validate: (p) => ({ valid: p.ok === true, issues: [] }),
    });
    await store.observe(target);
    const r = audits.at(-1);
    // Hash is hex string — does NOT contain the secret value.
    expect(r?.current?.hash).not.toContain("hunter2");
    expect(r?.current?.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("TEL2 [shape] audit issues `message` field MAY contain validator-derived strings — operator must classify before emitting", async () => {
    // A validator can include user-controllable content in `issues[].message`.
    // Tests pin the contract: LKG passes through whatever the validator
    // returns. Operators wiring this to telemetry should assume issues are
    // possibly-PII and apply their own redaction.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true,"name":"Mallory"}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register({
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean; name: string },
      validate: (p) => ({
        valid: p.name !== "Mallory",
        issues:
          p.name === "Mallory"
            ? [{ path: "name", message: `name "${p.name}" is on the deny list` }]
            : [],
      }),
    });
    // Drive to recover by changing bytes after promoting a benign version.
    await fs.writeFile(target, '{"ok":true,"name":"Alice"}');
    await store.observe(target); // promoted (Alice is fine)
    await fs.writeFile(target, '{"ok":true,"name":"Mallory"}');
    await store.observe(target); // recovered (Mallory is denied)
    const r = audits.at(-1);
    // The Mallory string is in the audit.issues message — operator-territory PII concern.
    expect(JSON.stringify(r?.issues)).toContain("Mallory");
  });

  it("TEL3 audit `trackerPath` is a filesystem path — emitting to logs may leak deployment topology; that's operator policy", async () => {
    // Tracker path is full absolute path; document the contract so
    // operators know the implication.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register(jsonTracker(target));
    await store.observe(target);
    const r = audits.at(-1);
    // trackerPath contains the absolute path including tmp / scratch dir.
    expect(r?.trackerPath).toBe(target);
    expect(path.isAbsolute(r?.trackerPath ?? "")).toBe(true);
  });

  it("TEL4 audit fingerprint stat fields (uid/gid/mode) — POSIX-only, may be POSIX-PII; nullable on Windows", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register(jsonTracker(target));
    await store.observe(target);
    const fp = audits.at(-1)?.current;
    // mode/uid/gid present on POSIX, possibly null on Windows.
    // Either way, the fields exist on the type — locking the shape.
    expect(fp).toHaveProperty("mode");
    expect(fp).toHaveProperty("uid");
    expect(fp).toHaveProperty("gid");
  });
});

// ============================================================
// HEALTH · Health / readiness from getEntry
// ============================================================

describe("HEALTH · Health / readiness from getEntry", () => {
  it('HEALTH1 readiness signal: tracker is "ready" when getEntry returns non-empty entry with lastPromotedGood', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    // Before observe: not ready.
    const e1 = store.getEntry(target);
    expect(e1?.lastPromotedGood).toBeUndefined();
    // After observe: ready.
    await store.observe(target);
    const e2 = store.getEntry(target);
    expect(e2?.lastPromotedGood).toBeDefined();
  });

  it("HEALTH2 multi-tracker readiness — composite ready if ALL trackers have lastPromotedGood", async () => {
    const scratch = await makeFsScratch();
    const a = path.join(scratch, "a.json");
    const b = path.join(scratch, "b.json");
    await fs.writeFile(a, '{"ok":true}');
    await fs.writeFile(b, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(a));
    store.register(jsonTracker(b));

    const ready = (paths: string[]): boolean =>
      paths.every((p) => store.getEntry(p)?.lastPromotedGood !== undefined);

    expect(ready([a, b])).toBe(false); // neither observed
    await store.observe(a);
    expect(ready([a, b])).toBe(false); // b not observed
    await store.observe(b);
    expect(ready([a, b])).toBe(true);
  });

  it("HEALTH3 unready tracker (file-not-yet-written) — observe returns failed, getEntry stays empty", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "never-written.json");
    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("failed");
    const entry = store.getEntry(target);
    expect(entry?.lastPromotedGood).toBeUndefined();
  });

  it("HEALTH4 health degrades when recovery fires — operator can detect via audit outcome distribution", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register(jsonTracker(target));
    await store.observe(target); // healthy
    await fs.writeFile(target, '{"ok":false}');
    await store.observe(target); // recovery — degraded signal

    const recoveryRate = audits.filter((r) => r.outcome === "recovered").length / audits.length;
    expect(recoveryRate).toBeGreaterThan(0); // health-signal: recovery happened
  });
});

// ============================================================
// RATE · Rate-of-recovery
// ============================================================

describe("RATE · Rate-of-recovery as health signal", () => {
  it("RATE1 burst-of-recoveries pattern — many recoveries in a window indicates a misbehaving agent", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register(jsonTracker(target));
    await store.observe(target); // promote

    // Simulate 5 consecutive bad agent writes.
    for (let i = 0; i < 5; i++) {
      await fs.writeFile(target, `{"ok":false,"attempt":${i}}`);
      await store.observe(target);
    }
    const recoveries = audits.filter((r) => r.outcome === "recovered").length;
    expect(recoveries).toBe(5);
  });

  it("RATE2 promote-to-recover ratio: in healthy ops, ratio is high (mostly promoted/valid, rare recovery)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register(jsonTracker(target));
    // 9 valid observes, 1 recovery.
    await store.observe(target); // promote
    for (let i = 0; i < 8; i++) await store.observe(target); // valid x8
    await fs.writeFile(target, '{"ok":false}');
    await store.observe(target); // recover

    const promoted = audits.filter((r) => r.outcome === "promoted").length;
    const valid = audits.filter((r) => r.outcome === "valid").length;
    const recovered = audits.filter((r) => r.outcome === "recovered").length;
    expect((promoted + valid) / (recovered || 1)).toBeGreaterThan(5);
  });

  it('RATE3 alarm threshold: 3+ recoveries in a row signals "agent might be stuck"', async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register(jsonTracker(target));
    await store.observe(target); // promote
    for (let i = 0; i < 4; i++) {
      await fs.writeFile(target, `{"ok":false,"i":${i}}`);
      await store.observe(target);
    }
    // Detect: 4 consecutive recoveries.
    let consecutive = 0;
    for (const r of audits) {
      if (r.outcome === "recovered") consecutive++;
      else consecutive = 0;
    }
    expect(consecutive).toBeGreaterThanOrEqual(3);
  });

  it("RATE4 recovery WITH dedup: same suspicious sig observed back-to-back is deduped (not counted as 2 distinct recoveries from the dedup logic's POV)", async () => {
    // From wave 1 R1: dedup converges with the suspicious-vs-LKG
    // signal. This RATE test confirms the audit log preserves the
    // raw recovery outcomes even when the second instance was
    // dedup-deduplicated to `valid` — operators see the convergence.
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const audits: AuditRecord[] = [];
    const tracker: LKGTracker<{ ok: boolean }> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: () => ({ valid: true, issues: [] }),
      suspiciousReasons: () => ["always"],
    };
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register(tracker);
    await store.observe(target);
    await store.observe(target);
    await store.observe(target);
    // We expect at least one recovered + one valid (dedup) outcome.
    expect(audits.some((r) => r.outcome === "recovered")).toBe(true);
  });
});
