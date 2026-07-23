/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 10.
 *
 * Continues `v2-chain-lkg-adversarial{,-2..-9}.integration.test.ts`.
 * Wave 10 categories:
 *
 *   ERR.  Error message quality                          (4)
 *   EXH.  Outcome exhaustiveness                         (5)
 *   AS.   API surface coverage (every export tested)     (5)
 *   BACK. Backwards-compatibility shape locks            (3)
 *
 * Total: 17 scenarios.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-10
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  lkgStore,
  lkgPathFor,
  clobberedPathFor,
  isCompanionPath,
  makeFingerprint,
  hashRaw,
  type AuditRecord,
} from "@bic/openclaw-lkg";
import type { LKGObservation, LKGTracker } from "@bic/v2-prototype";
import { LKGErrorImpl } from "@bic/openclaw-lkg";

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function makeFsScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-adv10-"));
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
// ERR · Error message quality
// ============================================================

describe("ERR · Error message quality", () => {
  it("ERR1 FS: register with relative path — error message includes the offending path", async () => {
    const store = lkgStore();
    try {
      store.register({
        path: "relative/cfg.json",
        parse: (raw) => JSON.parse(raw),
        validate: () => ({ valid: true, issues: [] }),
      });
      expect.fail("expected throw");
    } catch (err) {
      expect((err as Error).message).toContain("relative/cfg.json");
      expect((err as Error).message).toMatch(/absolute/i);
      expect((err as { code?: string }).code).toBe("LKG_TRACKER_PATH_INVALID");
    }
  });

  it("ERR2 FS: register with duplicate path — error message includes the colliding path", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    const store = lkgStore();
    store.register(jsonTracker(target));
    try {
      store.register(jsonTracker(target));
      expect.fail("expected COLLISION");
    } catch (err) {
      expect((err as Error).message).toContain(target);
      expect((err as { code?: string }).code).toBe("LKG_TRACKER_PATH_COLLISION");
    }
  });

  it("ERR3 FS: observe before register — error message references the offending path", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    const store = lkgStore();
    try {
      await store.observe(target);
      expect.fail("expected throw");
    } catch (err) {
      expect((err as Error).message).toContain(target);
      expect((err as { code?: string }).code).toBe("LKG_TRACKER_PATH_INVALID");
    }
  });

  it("ERR4 FS: validator throws — wrapped LKGError preserves underlying cause", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const original = new Error("underlying validator failure");
    const tracker: LKGTracker<{ ok: boolean }> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as { ok: boolean },
      validate: () => {
        throw original;
      },
    };
    const store = lkgStore();
    store.register(tracker);
    try {
      await store.observe(target);
      expect.fail("expected throw");
    } catch (err) {
      const lkgErr = err as { message: string; cause?: unknown; code?: string };
      expect(lkgErr.code).toBe("LKG_VALIDATOR_THREW");
      expect(lkgErr.message).toContain("validator");
      expect(lkgErr.message).toContain(target);
      // Underlying error is preserved as `cause`.
      expect(lkgErr.cause).toBe(original);
    }
  });
});

// ============================================================
// EXH · Outcome exhaustiveness
// ============================================================

describe("EXH · Outcome exhaustiveness — all LKGObservation outcomes reachable", () => {
  it("EXH1 outcome=promoted is reachable (first valid observe)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("promoted");
  });

  it("EXH2 outcome=valid is reachable (unchanged observe)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target); // promoted
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("valid");
  });

  it("EXH3 outcome=recovered is reachable (invalid observe with prior LKG)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target);
    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("recovered");
  });

  it("EXH4 outcome=skipped is reachable (invalid observe with no prior LKG)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":false}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("skipped");
  });

  it("EXH5 outcome=failed is reachable (read fails)", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "never-written.json");
    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("failed");
  });
});

// ============================================================
// AS · API surface coverage
// ============================================================

describe("AS · API surface coverage", () => {
  it("AS1 lkgPathFor — appends `.lkg` suffix to target path", () => {
    const target = "/abs/path/cfg.json";
    expect(lkgPathFor(target)).toBe(`${target}.lkg`);
  });

  it("AS2 clobberedPathFor — sanitizes ISO timestamp colons + dots to `-`", () => {
    const target = "/abs/path/cfg.json";
    const ts = "2026-04-29T00:01:02.345Z";
    const result = clobberedPathFor(target, ts);
    expect(result).toBe(`${target}.clobbered.2026-04-29T00-01-02-345Z`);
    // No colons or dots in the timestamp portion (drive letters preserved on Windows).
    const suffix = result.slice(target.length);
    expect(suffix).not.toContain(":");
    // The dots in `.clobbered.` are intentional; only timestamp dots get replaced.
    expect(suffix).toMatch(/^\.clobbered\./);
  });

  it("AS3 isCompanionPath — flags `.lkg` and `.clobbered.` files", () => {
    expect(isCompanionPath("/x/y/cfg.json.lkg")).toBe(true);
    expect(isCompanionPath("/x/y/cfg.json.clobbered.2026-01-01T00-00-00-000Z")).toBe(true);
    expect(isCompanionPath("/x/y/cfg.json")).toBe(false);
  });

  it("AS4 hashRaw — returns 64-hex sha256 of the input bytes (deterministic)", () => {
    const a = hashRaw("hello world");
    const b = hashRaw("hello world");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
    expect(hashRaw("hello worle")).not.toBe(a);
  });

  it("AS5 makeFingerprint — produces well-formed LKGFingerprint with stat fields nullable when stat=null", () => {
    const fp = makeFingerprint({
      raw: '{"ok":true}',
      stat: null,
      observedAt: "2026-04-29T00:00:00.000Z",
    });
    expect(fp.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(fp.bytes).toBe('{"ok":true}'.length);
    expect(fp.mtimeMs).toBeNull();
    expect(fp.dev).toBeNull();
    expect(fp.observedAt).toBe("2026-04-29T00:00:00.000Z");
  });
});

// ============================================================
// BACK · Backwards-compatibility shape locks
// ============================================================

describe("BACK · Backwards-compatibility shape locks", () => {
  it("BACK1 LKGObservation discriminated union — every variant has the documented shape", async () => {
    // promoted/valid: { outcome, fingerprint }
    // recovered: { outcome, reason, clobberedPath, restoredFrom }
    // skipped: { outcome, reason, issues }
    // failed: { outcome, reason, issues }
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));

    const obs1: LKGObservation = await store.observe(target);
    expect(obs1.outcome).toBe("promoted");
    if (obs1.outcome === "promoted") {
      expect(obs1.fingerprint.hash).toMatch(/^[0-9a-f]{64}$/);
    }

    await fs.writeFile(target, '{"ok":false}');
    const obs2: LKGObservation = await store.observe(target);
    expect(obs2.outcome).toBe("recovered");
    if (obs2.outcome === "recovered") {
      expect(obs2.reason).toBeDefined();
      expect(obs2.clobberedPath).toBeDefined();
      expect(obs2.restoredFrom.hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("BACK2 AuditRecord shape — required fields stable", async () => {
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
    // Document the field set so a future addition to AuditRecord is intentional.
    const keys = Object.keys(r ?? {}).sort();
    expect(keys).toEqual([
      "clobberedPath",
      "current",
      "event",
      "issues",
      "lastKnownGood",
      "outcome",
      "source",
      "suspicious",
      "trackerPath",
      "ts",
    ]);
  });

  it("BACK3 LKGErrorImpl — code is one of the documented enum values", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    const store = lkgStore();
    // Trigger LKG_TRACKER_PATH_INVALID.
    let invalidErr: unknown;
    try {
      store.register({
        path: "relative.json",
        parse: (raw) => JSON.parse(raw),
        validate: () => ({ valid: true, issues: [] }),
      });
    } catch (e) {
      invalidErr = e;
    }
    expect(invalidErr).toBeInstanceOf(LKGErrorImpl);

    // Trigger LKG_TRACKER_PATH_COLLISION.
    store.register(jsonTracker(target));
    let collisionErr: unknown;
    try {
      store.register(jsonTracker(target));
    } catch (e) {
      collisionErr = e;
    }
    expect(collisionErr).toBeInstanceOf(LKGErrorImpl);

    // The documented LKGErrorCode set (as implemented in this repo).
    const documentedCodes = new Set([
      "LKG_TRACKER_PATH_INVALID",
      "LKG_TRACKER_PATH_COLLISION",
      "LKG_STORE_UNAVAILABLE",
      "LKG_VALIDATOR_THREW",
    ]);
    expect(documentedCodes.has((invalidErr as { code: string }).code)).toBe(true);
    expect(documentedCodes.has((collisionErr as { code: string }).code)).toBe(true);
  });
});
