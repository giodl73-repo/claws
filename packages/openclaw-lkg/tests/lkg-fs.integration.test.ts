/**
 * LKG fs-backed lifecycle — exercises the on-disk shape (atomic write,
 * `.lkg` companion file, `.clobbered.<ts>` preservation, audit
 * emission, recovery notice).
 *
 * Conformance-shape: mirrors the upstream config-LKG behavior at
 * `openclaw-core/src/config/io.observe-recovery.ts:1063` so future
 * maintainers can verify byte-for-byte parity.
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { lkgStore } from "../src/index.js";
import { lkgPathFor } from "../src/paths.js";
import type { AuditRecord, RecoveryNotice } from "../src/index.js";
import type { LKGTracker } from "../src/index.js";

const TEXT_DECODER = new TextDecoder("utf-8");

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true });
  }
});

async function makeScratch(): Promise<string> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "lkg-fs-"));
  live.push({ scratch });
  return scratch;
}

interface FakeJson {
  ok: boolean;
  size?: number;
}

function makeJsonTracker(p: string): LKGTracker<FakeJson> {
  return {
    path: p,
    parse: (raw) => JSON.parse(raw) as FakeJson,
    validate: (parsed) => ({
      valid: parsed?.ok === true,
      issues: parsed?.ok === true ? [] : [{ path: "ok", message: "must be true" }],
    }),
  };
}

describe("LKG filesystem lifecycle", () => {
  it("first valid observe writes <path>.lkg with byte-identical content", async () => {
    const scratch = await makeScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');

    const store = lkgStore();
    store.register(makeJsonTracker(target));
    const obs = await store.observe(target);

    expect(obs.outcome).toBe("promoted");
    const lkgRaw = await fs.readFile(lkgPathFor(target), "utf-8");
    expect(lkgRaw).toBe('{"ok":true}');
  });

  it("invalid observe preserves bad bytes as <path>.clobbered.<ts> and copies LKG back", async () => {
    const scratch = await makeScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');

    const store = lkgStore();
    store.register(makeJsonTracker(target));
    await store.observe(target); // promoted

    // Agent breaks the file.
    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);

    expect(obs.outcome).toBe("recovered");
    if (obs.outcome === "recovered") {
      // Active is back to LKG.
      const restored = await fs.readFile(target, "utf-8");
      expect(restored).toBe('{"ok":true}');
      // Clobbered file exists with the bad bytes.
      const clobbered = await fs.readFile(obs.clobberedPath, "utf-8");
      expect(clobbered).toBe('{"ok":false}');
    }
  });

  it("audit sink receives a record per observe; recovery notice fires on outcome=recovered", async () => {
    const scratch = await makeScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');

    const audits: AuditRecord[] = [];
    const notices: RecoveryNotice[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
      onRecoveryNotice: (n) => {
        notices.push(n);
      },
    });
    store.register(makeJsonTracker(target));

    await store.observe(target); // promoted
    expect(audits.at(-1)?.outcome).toBe("promoted");
    expect(notices).toHaveLength(0);

    await fs.writeFile(target, '{"ok":false}');
    await store.observe(target); // recovered

    expect(audits.at(-1)?.outcome).toBe("recovered");
    expect(audits.at(-1)?.clobberedPath).toContain(".clobbered.");
    expect(notices).toHaveLength(1);
    expect(notices[0]?.reason).toBe("invalid");
  });

  it("readLastKnownGood returns the bytes from <path>.lkg", async () => {
    const scratch = await makeScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');
    const store = lkgStore();
    store.register(makeJsonTracker(target));
    await store.observe(target);

    const lkg = await store.readLastKnownGood(target);
    expect(TEXT_DECODER.decode(lkg)).toBe('{"ok":true}');
  });

  it("observe on a missing file emits audit outcome=failed without crashing", async () => {
    const scratch = await makeScratch();
    const target = path.join(scratch, "never-written.json");
    const audits: AuditRecord[] = [];
    const store = lkgStore({
      onAudit: (r) => {
        audits.push(r);
      },
    });
    store.register(makeJsonTracker(target));
    const obs = await store.observe(target);
    expect(obs.outcome).toBe("failed");
    expect(audits.at(-1)?.outcome).toBe("failed");
  });

  it("register requires absolute path; relative path throws LKG_TRACKER_PATH_INVALID", async () => {
    const store = lkgStore();
    try {
      store.register({ ...makeJsonTracker("relative/path.json") });
      expect.fail("register should have thrown");
    } catch (err) {
      expect((err as { code?: string }).code).toBe("LKG_TRACKER_PATH_INVALID");
    }
  });

  it("clobbered suffix has no colons (Windows-safe; drive-letter colon is path-prefix, not suffix)", async () => {
    const scratch = await makeScratch();
    const target = path.join(scratch, "cfg.json");
    await fs.writeFile(target, '{"ok":true}');

    const store = lkgStore();
    store.register(makeJsonTracker(target));
    await store.observe(target);

    await fs.writeFile(target, '{"ok":false}');
    const obs = await store.observe(target);
    if (obs.outcome === "recovered") {
      // The suffix portion (after target path) must not contain colons —
      // the drive letter prefix `C:\` is allowed.
      const suffix = obs.clobberedPath.slice(target.length);
      expect(suffix).not.toContain(":");
      expect(suffix).toMatch(/^\.clobbered\./);
    }
  });
});
