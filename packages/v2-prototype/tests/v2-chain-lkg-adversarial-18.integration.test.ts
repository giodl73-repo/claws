/**
 * v2 chain (LKG-shaped) — adversarial scenarios, wave 18.
 *
 * The final wave. Continues `v2-chain-lkg-adversarial{,-2..-17}.integration.test.ts`.
 * Wave 18 categories:
 *
 *   DOC.   Documented examples are runnable        (4)
 *   TYPE.  TypeScript type-level / API tests       (4)
 *   FINAL. Public-export shape lock                (4)
 *
 * Total: 12 scenarios.
 *
 * Closes the 18-wave campaign. The whole point of wave 18 is that
 * any future change to the public surface or documented behavior
 * surfaces as a broken assertion here, making the change
 * intentional.
 *
 * @module @bic/v2-prototype/tests/v2-chain-lkg-adversarial-18
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import * as LkgPkg from "@bic/openclaw-lkg";
import {
  lkgStore,
  lkgPathFor,
  clobberedPathFor,
  isCompanionPath,
  hashRaw,
  makeFingerprint,
  LKGErrorImpl,
} from "@bic/openclaw-lkg";
import type {
  LKGEntry,
  LKGFingerprint,
  LKGObservation,
  LKGStore,
  LKGTracker,
  ValidationIssue,
  ValidationResult,
} from "@bic/v2-prototype";

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function makeFsScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-adv18-"));
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
// DOC · Documented examples are runnable
// ============================================================

describe("DOC · Documented examples are runnable", () => {
  it("DOC1 minimal usage example: register a JSON tracker and observe — works as documented", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');

    // The minimal canonical example from the README:
    const store = lkgStore();
    store.register({
      path: target,
      parse: (raw) => JSON.parse(raw),
      validate: (parsed) => ({ valid: parsed?.ok === true, issues: [] }),
    });
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("promoted");
  });

  it("DOC2 audit hook example: register an audit sink and observe — sink fires", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const audits: unknown[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register(jsonTracker(target));
    await store.observe(target);
    expect(audits).toHaveLength(1);
  });

  it("DOC3 recovery-notice example: install notice hook; corrupt and recover; hook fires", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const notices: unknown[] = [];
    const store = lkgStore({
      onRecoveryNotice: (n) => {
        notices.push(n);
      },
    });
    store.register(jsonTracker(target));
    await store.observe(target); // promote
    await fs.writeFile(target, '{"ok":false}');
    await store.observe(target); // recover
    expect(notices).toHaveLength(1);
  });

  it("DOC4 readLastKnownGood example: read LKG bytes after promote", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    const bytes = '{"ok":true,"value":"documented"}';
    await fs.writeFile(target, bytes);
    const store = lkgStore();
    store.register(jsonTracker(target));
    await store.observe(target);
    const lkg = await store.readLastKnownGood(target);
    expect(new TextDecoder().decode(lkg)).toBe(bytes);
  });
});

// ============================================================
// TYPE · TypeScript type-level / API tests
// ============================================================

describe("TYPE · TypeScript type-level / API tests", () => {
  it("TYPE1 LKGObservation discriminated-union narrowing — exhaustive switch covers all variants", async () => {
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(jsonTracker(target));
    const obs: LKGObservation = await store.observe(target);

    // Exhaustive switch — TS would error if a variant were unhandled.
    const summary = ((o: LKGObservation): string => {
      switch (o.outcome) {
        case "promoted":
          return `promoted:${o.fingerprint.hash}`;
        case "valid":
          return `valid:${o.fingerprint.hash}`;
        case "recovered":
          return `recovered:${o.reason}:${o.clobberedPath}`;
        case "skipped":
          return `skipped:${o.reason}`;
        case "failed":
          return `failed:${o.reason}`;
      }
    })(obs);
    expect(summary).toMatch(/^promoted:/);
  });

  it("TYPE2 LKGTracker<T> generic flows through to validate() parameter type", async () => {
    interface MyShape {
      ok: boolean;
      version: number;
      tags: readonly string[];
    }
    const scratch = await makeFsScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, JSON.stringify({ ok: true, version: 1, tags: ["a", "b"] }));
    const tracker: LKGTracker<MyShape> = {
      path: target,
      parse: (raw) => JSON.parse(raw) as MyShape,
      validate: (parsed) => {
        // `parsed` is typed as MyShape — these accesses must not error.
        const _v: number = parsed.version;
        const _t: readonly string[] = parsed.tags;
        void _v;
        void _t;
        return { valid: parsed.ok === true, issues: [] };
      },
    };
    const store = lkgStore();
    store.register(tracker);
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("promoted");
  });

  it("TYPE3 LKGEntry / LKGFingerprint / ValidationResult / ValidationIssue types are imported and assignable", () => {
    const fp: LKGFingerprint = makeFingerprint({ raw: "x", stat: null });
    const issue: ValidationIssue = { path: "a", message: "b", code: "c" };
    const result: ValidationResult = { valid: false, issues: [issue] };
    const entry: LKGEntry = { lastPromotedGood: fp, lastKnownGood: fp };
    expect(fp.hash).toBeDefined();
    expect(issue.code).toBe("c");
    expect(result.valid).toBe(false);
    expect(entry.lastPromotedGood?.hash).toBe(fp.hash);
  });

  it("TYPE4 LKGStore is structurally-typed with the four contract methods", () => {
    const store: LKGStore = lkgStore();
    expect(typeof store.register).toBe("function");
    expect(typeof store.observe).toBe("function");
    expect(typeof store.readLastKnownGood).toBe("function");
    expect(typeof store.getEntry).toBe("function");
  });
});

// ============================================================
// FINAL · Public-export shape lock
// ============================================================

describe("FINAL · Public-export shape lock", () => {
  it("FINAL1 @bic/openclaw-lkg public exports — exact set documented and stable", () => {
    // Future additions/removals to the public surface MUST update
    // this assertion intentionally.
    const keys = Object.keys(LkgPkg).sort();
    expect(keys).toEqual([
      "LKGErrorImpl",
      "clobberedPathFor",
      "hashRaw",
      "isCompanionPath",
      "lkgPathFor",
      "lkgStore",
      "makeFingerprint",
    ]);
  });

  it("FINAL2 LKGErrorImpl is constructible and carries `code` + `message` (and optional `cause`)", () => {
    const err = new LKGErrorImpl("LKG_TRACKER_PATH_INVALID", "test message");
    expect(err.code).toBe("LKG_TRACKER_PATH_INVALID");
    expect(err.message).toBe("test message");
    expect(err).toBeInstanceOf(Error);

    // With a cause.
    const cause = new Error("underlying");
    const err2 = new LKGErrorImpl("LKG_VALIDATOR_THREW", "wrapper", cause);
    expect((err2 as Error & { cause?: unknown }).cause).toBe(cause);
  });

  it("FINAL3 makeFingerprint output shape — every documented field is reachable on the result", () => {
    const fp = makeFingerprint({
      raw: "hello",
      stat: null,
      observedAt: "2026-04-29T00:00:00.000Z",
    });
    const keys = Object.keys(fp).sort();
    expect(keys).toEqual([
      "bytes",
      "ctimeMs",
      "dev",
      "gid",
      "hash",
      "ino",
      "mode",
      "mtimeMs",
      "nlink",
      "observedAt",
      "uid",
    ]);
  });

  it("FINAL4 isCompanionPath / lkgPathFor / clobberedPathFor / hashRaw — pure-function contract", () => {
    // Pure functions: same input → same output, no side effects, no
    // state. Re-running each twice confirms.
    expect(lkgPathFor("/x.json")).toBe(lkgPathFor("/x.json"));
    expect(clobberedPathFor("/x.json", "2026-04-29T00:00:00.000Z")).toBe(
      clobberedPathFor("/x.json", "2026-04-29T00:00:00.000Z"),
    );
    expect(isCompanionPath("/x.json.lkg")).toBe(isCompanionPath("/x.json.lkg"));
    expect(hashRaw("hello")).toBe(hashRaw("hello"));
  });
});
