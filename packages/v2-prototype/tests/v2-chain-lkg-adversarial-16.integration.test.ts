/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 16.
 *
 * Continues `v2-chain-lkg-adversarial{,-2..-15}.integration.test.ts`.
 * Wave 16 categories:
 *
 *   CONF. Upstream config-LKG conformance (synthesized fixtures)  (5)
 *   TS.   Type-shape exhaustiveness                               (5)
 *   FUZZ. Generated random inputs                                 (4)
 *
 * Total: 14 scenarios.
 *
 * The CONF tests synthesize fixture inputs that mirror the
 * documented behavior of upstream's `recoverConfigFromLastKnownGood`
 * (`io.observe-recovery.ts:1063`) and assert the @bic/openclaw-lkg
 * impl matches. When upstream lands, these can be diff'd against
 * upstream's own fixture set as the wire-parity test.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-16
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  lkgStore,
  lkgPathFor,
  clobberedPathFor,
  hashRaw,
  makeFingerprint,
  type AuditRecord,
} from "@bic/openclaw-lkg";
import type { LKGTracker } from "@bic/v2-prototype";

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function makeFsScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-adv16-"));
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
// CONF · Upstream config-LKG conformance (synthesized fixtures)
// ============================================================

describe("CONF · Upstream config-LKG conformance", () => {
  it("CONF1 hash format: sha256 lower-hex over raw bytes — fixed input → fixed output", () => {
    // Conformance fixture: the canonical hash of the canonical config.
    const fixtures = [
      ["{}", "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"],
      ["hello world", "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"],
      ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ] as const;
    for (const [input, expected] of fixtures) {
      expect(hashRaw(input)).toBe(expected);
    }
  });

  it("CONF2 companion suffix: `<full-target-path>.lkg` — no transform on the prefix", () => {
    // Upstream's pattern: `<config-path>.lkg`.
    const fixtures = [
      ["/etc/openclaw/config.json", "/etc/openclaw/config.json.lkg"],
      ["C:\\ProgramData\\openclaw\\cfg.json", "C:\\ProgramData\\openclaw\\cfg.json.lkg"],
      ["/home/user/.openclaw/policy-ir.json", "/home/user/.openclaw/policy-ir.json.lkg"],
    ] as const;
    for (const [target, expected] of fixtures) {
      expect(lkgPathFor(target)).toBe(expected);
    }
  });

  it("CONF3 clobbered file naming: `<target>.clobbered.<ts-with-colons-and-dots-replaced>` — filename-safe", () => {
    const fixtures = [
      // (target, observedAt, expected)
      [
        "/etc/openclaw/config.json",
        "2026-04-29T01:23:45.678Z",
        "/etc/openclaw/config.json.clobbered.2026-04-29T01-23-45-678Z",
      ],
      [
        "/var/log/policy-ir.json",
        "2025-12-31T23:59:59.999Z",
        "/var/log/policy-ir.json.clobbered.2025-12-31T23-59-59-999Z",
      ],
    ] as const;
    for (const [target, ts, expected] of fixtures) {
      expect(clobberedPathFor(target, ts)).toBe(expected);
    }
  });

  it("CONF4 validate-then-promote: first valid observe → outcome=promoted; companion file written byte-for-byte", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    const seed = '{"ok":true,"value":"canonical-fixture"}';
    await fs.writeFile(target, seed);
    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("promoted");
    const lkgRaw = await fs.readFile(lkgPathFor(target), "utf-8");
    expect(lkgRaw).toBe(seed); // byte-for-byte
  });

  it("CONF5 invalid-then-recover: working tree corrupted → outcome=recovered with restoredFrom.hash matching prior promote; clobbered preserves the bad bytes", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    const seed = '{"ok":true,"v":1}';
    const corrupt = '{"ok":false,"injected":"by-agent"}';
    await fs.writeFile(target, seed);
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target); // promote
    const seedHash = hashRaw(seed);

    await fs.writeFile(target, corrupt);
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("recovered");
    if (obs.outcome === "recovered") {
      // restoredFrom.hash == hash of the seed bytes (the LKG).
      expect(obs.restoredFrom.hash).toBe(seedHash);
      // Clobbered file preserves the bad bytes byte-for-byte.
      const clobbered = await fs.readFile(obs.clobberedPath, "utf-8");
      expect(clobbered).toBe(corrupt);
      // Active file is back to seed.
      expect(await fs.readFile(target, "utf-8")).toBe(seed);
    }
  });
});

// ============================================================
// TS · Type-shape exhaustiveness
// ============================================================

describe("TS · Type-shape exhaustiveness", () => {
  it("TS1 LKGFingerprint — every documented field is settable via makeFingerprint", () => {
    const fp = makeFingerprint({
      raw: "hello",
      stat: null,
      observedAt: "2026-04-29T00:00:00.000Z",
    });
    // Required fields.
    expect(fp.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(fp.bytes).toBe(5);
    expect(fp.observedAt).toBe("2026-04-29T00:00:00.000Z");
    // Stat-shape fields (nullable when stat=null).
    expect(fp.mtimeMs).toBeNull();
    expect(fp.ctimeMs).toBeNull();
    expect(fp.dev).toBeNull();
    expect(fp.ino).toBeNull();
    expect(fp.mode).toBeNull();
    expect(fp.nlink).toBeNull();
    expect(fp.uid).toBeNull();
    expect(fp.gid).toBeNull();
  });

  it("TS2 LKGFingerprint with stat — every stat field populated", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const stat = await fs.stat(target);
    const fp = makeFingerprint({ raw: '{"ok":true}', stat });
    expect(typeof fp.mtimeMs).toBe("number");
    expect(typeof fp.ctimeMs).toBe("number");
    // dev/ino are stringified bigints.
    expect(typeof fp.dev).toBe("string");
    expect(typeof fp.ino).toBe("string");
    expect(typeof fp.mode).toBe("number");
    expect(typeof fp.nlink).toBe("number");
    // uid/gid present on POSIX, may be 0 on Windows.
    expect(typeof fp.uid).toBe("number");
    expect(typeof fp.gid).toBe("number");
  });

  it("TS3 LKGEntry — both lastKnownGood and lastPromotedGood reachable across observe lifecycle", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target);
    const entry = store.getEntry(target);
    expect(entry?.lastPromotedGood).toBeDefined();
    expect(entry?.lastKnownGood).toBeDefined();
    expect(entry?.lastPromotedGood?.hash).toBe(entry?.lastKnownGood?.hash);
  });

  it("TS4 AuditRecord — outcome=promoted populates `current` AND `lastKnownGood` (initial promote)", async () => {
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
    expect(r?.outcome).toBe("promoted");
    expect(r?.current).toBeDefined();
    expect(r?.lastKnownGood).toBeDefined();
    // After initial promote, current === lastKnownGood by hash.
    expect(r?.current?.hash).toBe(r?.lastKnownGood?.hash);
  });

  it("TS5 LKGObservation — all 5 outcome variants have at least one field beyond `outcome`", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));

    // promoted
    const p = await store.observe(target);
    expect(p.outcome).toBe("promoted");
    if (p.outcome === "promoted") expect(p.fingerprint).toBeDefined();

    // valid
    const v = await store.observe(target);
    expect(v.outcome).toBe("valid");
    if (v.outcome === "valid") expect(v.fingerprint).toBeDefined();

    // recovered
    await fs.writeFile(target, '{"ok":false}');
    const r = await store.observe(target);
    expect(r.outcome).toBe("recovered");
    if (r.outcome === "recovered") {
      expect(r.reason).toBeDefined();
      expect(r.clobberedPath).toBeDefined();
      expect(r.restoredFrom).toBeDefined();
    }

    // skipped (use a fresh store with shouldRecover=false)
    const scratch2 = await makeFsScratch();
    const t2 = path.join(scratch2, "cfg.json");
    await fs.writeFile(t2, '{"ok":false}'); // invalid + no LKG → skipped
    const store2 = lkgStore();
    store2.register(jsonTracker(t2));
    const s = await store2.observe(t2);
    expect(s.outcome).toBe("skipped");
    if (s.outcome === "skipped") {
      expect(s.reason).toBeDefined();
      expect(s.issues).toBeDefined();
    }

    // failed
    const scratch3 = await makeFsScratch();
    const t3 = path.join(scratch3, "never-written.json");
    const store3 = lkgStore();
    store3.register(jsonTracker(t3));
    const f = await store3.observe(t3);
    expect(f.outcome).toBe("failed");
    if (f.outcome === "failed") {
      expect(f.reason).toBeDefined();
      expect(f.issues).toBeDefined();
    }
  });
});

// ============================================================
// FUZZ · Generated random inputs
// ============================================================

describe("FUZZ · Generated random inputs", () => {
  it("FUZZ1 random valid JSON inputs — all promote successfully", async () => {
    const scratch = await makeFsScratch();
    const targets: string[] = [];
    const store = lkgStore();
    for (let i = 0; i < 20; i++) {
      const target = path.join(scratch, `f-${i}.json`);
      const ok = true;
      const padding = crypto.randomBytes(16).toString("hex");
      await fs.writeFile(target, JSON.stringify({ ok, padding }));
      store.register({
        path: target,
        parse: (raw) => JSON.parse(raw) as { ok: boolean },
        validate: (p) => ({ valid: p.ok === true, issues: [] }),
      });
      targets.push(target);
    }
    for (const t of targets) {
      const obs = await store.observe(t);
      expect(obs.outcome).toBe("promoted");
    }
  });

  it("FUZZ2 random invalid JSON inputs — all unparseable→skipped (no LKG yet)", async () => {
    const scratch = await makeFsScratch();
    const store = lkgStore();
    for (let i = 0; i < 20; i++) {
      const target = path.join(scratch, `bad-${i}.json`);
      // Random non-JSON garbage.
      const garbage = crypto.randomBytes(32).toString("latin1");
      await fs.writeFile(target, `not-json-${garbage}-${i}`);
      store.register({
        path: target,
        parse: (raw) => JSON.parse(raw),
        validate: () => ({ valid: true, issues: [] }),
      });
      const obs = await store.observe(target);
      // Parse fails → unparseable → skipped (no LKG).
      expect(obs.outcome).toBe("skipped");
    }
  });

  it("FUZZ3 random promote-then-corrupt cycles produce consistent recovery state", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    const store = lkgStore();
    store.register(jsonTracker(target));

    for (let i = 0; i < 10; i++) {
      const ok = true;
      const goodBytes = JSON.stringify({ ok, iter: i });
      await fs.writeFile(target, goodBytes);
      const promoted = await store.observe(target);
      expect(promoted.outcome).toBe("promoted");

      const garbage = crypto.randomBytes(16).toString("hex");
      await fs.writeFile(target, `not-json-${garbage}`);
      const recovered = await store.observe(target);
      expect(recovered.outcome).toBe("recovered");
      // After recover, working tree == LKG bytes (the just-promoted goodBytes).
      const restored = await fs.readFile(target, "utf-8");
      expect(restored).toBe(goodBytes);
    }
  });

  it("FUZZ4 random byte sizes (1B to 100KB) — promote+recover preserve exact byte length", async () => {
    const scratch = await makeFsScratch();
    const sizes = [1, 16, 256, 4096, 100_000];
    for (const size of sizes) {
      const target = path.join(scratch, `s-${size}.json`);
      const padding = "X".repeat(Math.max(0, size - 20));
      const goodBytes = JSON.stringify({ ok: true, padding });
      await fs.writeFile(target, goodBytes);
      const store = lkgStore();
      store.register({
        path: target,
        parse: (raw) => JSON.parse(raw) as { ok: boolean; padding: string },
        validate: (p) => ({ valid: p.ok === true, issues: [] }),
      });
      await store.observe(target);
      await fs.writeFile(target, "not json");
      await store.observe(target);
      const restored = await fs.readFile(target, "utf-8");
      expect(restored.length).toBe(goodBytes.length);
    }
  });
});
