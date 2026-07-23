/**
 * v2 chain — snap-shape adversarial scenarios, pass 2 (S31..S60).
 *
 * **Scope (post-2026-04-30 pivot to LKG-as-carrier):** downstream-only
 * coverage for `@bic/openclaw-snap`. Upstream adversarial evidence is
 * the 18-wave LKG suite — see `v2-chain-lkg-adversarial-*.integration.test.ts`.
 *
 * Companion to v2-chain-adversarial.integration.test.ts. Covers axes
 * the first pass didn't:
 *
 *   K. Encoding & bytes (6)              — byte-correctness for non-text content
 *   L. Path & filename edge cases (4)    — robustness against weird names
 *   M. RefStore full lifecycle (5)       — promote/rollback/discard/history
 *   N. Cross-impl parity (3)             — inMemory vs filesystem equivalence
 *   O. Concurrency (3)                   — parallel capture/read safety
 *   P. Generator determinism (3)         — byte-identical emit on re-run
 *   Q. PolicyIR shape edge cases (3)     — empty, forward-compat, malformed
 *   R. Capture sensitivity (3)           — content addressing actually works
 *
 * As before: tests with `[GAP]` in the title document current limits we
 * notice but choose not to fix in this wave; tests with `[DECISION]` mark
 * deliberate architectural choices.
 *
 * @module @bic/v2-prototype/tests/v2-chain-adversarial-2
 */

import { spawn } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { generateInMemory } from "@bic/openclaw-policy";
import {
  filesystemStore,
  inMemoryStore,
  inMemoryRefStore,
  workspaceRefStore,
  computeSnapshotId,
  type SnapshotId,
  type SnapshotStore,
} from "@bic/openclaw-snap";
import { validatePolicyIR, type PolicyIR } from "@bic/v2-prototype";

const TEXT_DECODER = new TextDecoder("utf-8");
const TEXT_ENCODER = new TextEncoder();

const live: Array<{ scratch: string }> = [];
afterEach(async () => {
  for (const f of live.splice(0)) {
    await fs.rm(f.scratch, { recursive: true, force: true });
  }
});

async function makeWorkspace(files: Record<string, string | Uint8Array>): Promise<{
  scratch: string;
  workspace: string;
  storeRoot: string;
}> {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "v2-adv2-"));
  live.push({ scratch });
  const workspace = path.join(scratch, "workspace");
  const storeRoot = path.join(scratch, "snap-store");
  await fs.mkdir(workspace, { recursive: true });
  await fs.mkdir(storeRoot, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(workspace, rel);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }
  return { scratch, workspace, storeRoot };
}

// ─────────────────────────────────────────────────────────────────────────
// K. Encoding & bytes (6)
// ─────────────────────────────────────────────────────────────────────────

describe("K. Encoding & bytes (6)", () => {
  it("S31 binary content (PNG-shaped header) is preserved byte-exactly through capture/read", async () => {
    // PNG magic + a few bytes — contains 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    // plus arbitrary continuation bytes including high-bit and NUL.
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52, 0xff, 0xfe, 0xfd, 0xfc, 0xff, 0x00, 0xff, 0x00,
    ]);
    const { workspace, storeRoot } = await makeWorkspace({ "logo.png": pngBytes });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const round = await store.read(id, "logo.png");
    expect(round.byteLength).toBe(pngBytes.byteLength);
    for (let i = 0; i < pngBytes.byteLength; i++) {
      expect(round[i]).toBe(pngBytes[i]);
    }
  });

  it("S32 UTF-8 BOM is preserved (not stripped) during capture/read", async () => {
    // BOM = 0xEF, 0xBB, 0xBF — present in many Windows-saved text files.
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...TEXT_ENCODER.encode("hello")]);
    const { workspace, storeRoot } = await makeWorkspace({ "doc.txt": withBom });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const round = await store.read(id, "doc.txt");
    expect(round[0]).toBe(0xef);
    expect(round[1]).toBe(0xbb);
    expect(round[2]).toBe(0xbf);
    expect(TEXT_DECODER.decode(round.slice(3))).toBe("hello");
  });

  it("S33 empty file (0 bytes) captures and reads as empty", async () => {
    const { workspace, storeRoot } = await makeWorkspace({ "empty.txt": new Uint8Array(0) });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const round = await store.read(id, "empty.txt");
    expect(round.byteLength).toBe(0);
  });

  it("S34 NUL bytes embedded in file content are preserved", async () => {
    const withNul = new Uint8Array([0x68, 0x69, 0x00, 0x00, 0x62, 0x79, 0x65]); // "hi\0\0bye"
    const { workspace, storeRoot } = await makeWorkspace({ "data.bin": withNul });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const round = await store.read(id, "data.bin");
    expect([...round]).toEqual([0x68, 0x69, 0x00, 0x00, 0x62, 0x79, 0x65]);
  });

  it("S35 CRLF line endings preserved (not normalized to LF)", async () => {
    const crlf = TEXT_ENCODER.encode("line1\r\nline2\r\nline3");
    const { workspace, storeRoot } = await makeWorkspace({ "doc.txt": crlf });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const round = await store.read(id, "doc.txt");
    expect(TEXT_DECODER.decode(round)).toBe("line1\r\nline2\r\nline3");
  });

  it("S36 same content at two different paths → captured separately, ids depend on path map", async () => {
    // Two workspaces: identical bytes but at different paths.
    const ws1 = await makeWorkspace({ "a.txt": "shared-content" });
    const ws2 = await makeWorkspace({ "b.txt": "shared-content" });
    const store1 = filesystemStore({ root: ws1.storeRoot });
    const store2 = filesystemStore({ root: ws2.storeRoot });
    const id1 = await store1.capture(ws1.workspace);
    const id2 = await store2.capture(ws2.workspace);
    expect(id1).not.toBe(id2);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// L. Path & filename edge cases (4)
// ─────────────────────────────────────────────────────────────────────────

describe("L. Path & filename edge cases (4)", () => {
  it("S37 filename with spaces captured + read correctly", async () => {
    const { workspace, storeRoot } = await makeWorkspace({ "my doc.txt": "spacing ok" });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const bytes = await store.read(id, "my doc.txt");
    expect(TEXT_DECODER.decode(bytes)).toBe("spacing ok");
  });

  it("S38 filename with non-ASCII unicode preserved", async () => {
    const { workspace, storeRoot } = await makeWorkspace({ "日本語.txt": "unicode ok" });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const list = await store.list(workspace);
    expect(list).toHaveLength(1);
    const bytes = await store.read(id, "日本語.txt");
    expect(TEXT_DECODER.decode(bytes)).toBe("unicode ok");
  });

  it("S39 dotfile not on default-ignore list is captured", async () => {
    // Default ignore is ['', node_modules*, .git*, dist*]. `.env` is NOT ignored.
    const { workspace, storeRoot } = await makeWorkspace({ ".env": "KEY=value" });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const bytes = await store.read(id, ".env");
    expect(TEXT_DECODER.decode(bytes)).toBe("KEY=value");
  });

  it("S40 read with backslash separator (Windows-style) does not escape the bundle", async () => {
    // Backslashes shouldn't be treated as separators on POSIX; on Windows
    // they could resolve to host paths. The path-traversal guard in `read`
    // resolves against the bundle dir, so a backslash-laden path either
    // fails closed or is treated as a literal path component.
    const { workspace, storeRoot } = await makeWorkspace({ "a.txt": "hi" });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    let escaped = false;
    try {
      const bytes = await store.read(id, "..\\..\\..\\etc\\passwd");
      const content = TEXT_DECODER.decode(bytes);
      if (content.includes("root:")) escaped = true;
    } catch {
      // Expected — fail closed.
    }
    expect(escaped).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// M. RefStore full lifecycle (5)
// ─────────────────────────────────────────────────────────────────────────

describe("M. RefStore full lifecycle (5)", () => {
  it("S41 full cycle: capture → stage → promote → recapture → promote → rollback → history reflects", async () => {
    const refs = inMemoryRefStore();
    const ws = "demo";
    // 1st capture
    await refs.setStage(ws, "sha256-A");
    expect(await refs.getStage(ws)).toBe("sha256-A");
    expect(await refs.getHead(ws)).toBeNull();
    // promote
    await refs.setHead(ws, "sha256-A");
    expect(await refs.getHead(ws)).toBe("sha256-A");
    // setHead clears STAGE if it matched
    expect(await refs.getStage(ws)).toBeNull();
    // 2nd capture
    await refs.setStage(ws, "sha256-B");
    await refs.setHead(ws, "sha256-B");
    // history now has the prior HEAD
    expect(await refs.history(ws)).toEqual(["sha256-A"]);
    // rollback to first
    await refs.setHead(ws, "sha256-A");
    expect(await refs.getHead(ws)).toBe("sha256-A");
    // history now has B then A's predecessor (which was A pre-promote, but
    // promotion of A pushed nothing because there was no prior HEAD)
    expect(await refs.history(ws)).toEqual(["sha256-B", "sha256-A"]);
  });

  it("S42 setHead with same id twice does not grow history", async () => {
    const refs = inMemoryRefStore();
    await refs.setHead("w", "sha256-X");
    await refs.setHead("w", "sha256-X");
    await refs.setHead("w", "sha256-X");
    expect(await refs.history("w")).toEqual([]);
  });

  it("S43 discard (setStage null) clears STAGE; bundle remains readable from store", async () => {
    const { workspace, storeRoot } = await makeWorkspace({ "a.txt": "hi" });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const refs = workspaceRefStore({ root: storeRoot });
    await refs.setStage(workspace, id);
    await refs.setStage(workspace, null);
    expect(await refs.getStage(workspace)).toBeNull();
    // Bundle remains
    const bytes = await store.read(id, "a.txt");
    expect(TEXT_DECODER.decode(bytes)).toBe("hi");
  });

  it("S44 rollback to id NOT in history still works (refs are pointers)", async () => {
    const refs = inMemoryRefStore();
    await refs.setHead("w", "sha256-A");
    await refs.setHead("w", "sha256-B");
    // 'sha256-Z' was never seen — but RefStore allows any id; the store
    // doesn't validate against itself (separation of concerns).
    await refs.setHead("w", "sha256-Z");
    expect(await refs.getHead("w")).toBe("sha256-Z");
    expect(await refs.history("w")).toEqual(["sha256-B", "sha256-A"]);
  });

  it("S45 history is capped at historyLimit (default 100, override via opts)", async () => {
    const refs = inMemoryRefStore({ historyLimit: 3 });
    for (let i = 0; i < 10; i++) await refs.setHead("w", `sha256-${i}`);
    const history = await refs.history("w");
    // Newest-first, capped at 3.
    expect(history).toHaveLength(3);
    expect(history[0]).toBe("sha256-8"); // prior HEAD before sha256-9
    expect(history[1]).toBe("sha256-7");
    expect(history[2]).toBe("sha256-6");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// N. Cross-impl parity (3)
// ─────────────────────────────────────────────────────────────────────────

describe("N. Cross-impl parity (3)", () => {
  it("S46 inMemoryStore + filesystemStore produce SAME id for byte-identical content", async () => {
    const files = { "a.txt": "hello", "sub/b.txt": "world" };
    const { workspace, storeRoot } = await makeWorkspace(files);
    const fsStoreInst = filesystemStore({ root: storeRoot });
    const fsId = await fsStoreInst.capture(workspace);
    const memStore = inMemoryStore({ workspaces: { demo: files } });
    const memId = await memStore.capture("demo");
    expect(fsId).toBe(memId);
  });

  it("S47 both impls error-code-equal on missing snapshot", async () => {
    const { storeRoot } = await makeWorkspace({});
    const fsStoreInst = filesystemStore({ root: storeRoot });
    const memStore = inMemoryStore();
    await expect(fsStoreInst.read("sha256-missing", "a.txt")).rejects.toMatchObject({
      code: "SNAP_NOT_FOUND",
    });
    await expect(memStore.read("sha256-missing", "a.txt")).rejects.toMatchObject({
      code: "SNAP_NOT_FOUND",
    });
  });

  it("S48 inMemoryRefStore + workspaceRefStore have equivalent semantics for HEAD/STAGE/history", async () => {
    const { storeRoot } = await makeWorkspace({});
    const memRefs = inMemoryRefStore();
    const fsRefs = workspaceRefStore({ root: storeRoot });
    const ws = "workspace-key";
    for (const refs of [memRefs, fsRefs]) {
      await refs.setHead(ws, "sha256-1");
      await refs.setStage(ws, "sha256-2");
      await refs.setHead(ws, "sha256-3");
      expect(await refs.getHead(ws)).toBe("sha256-3");
      // 'sha256-2' is still STAGE because it didn't match the new HEAD.
      expect(await refs.getStage(ws)).toBe("sha256-2");
      expect(await refs.history(ws)).toEqual(["sha256-1"]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// O. Concurrency (3)
// ─────────────────────────────────────────────────────────────────────────

describe("O. Concurrency (3)", () => {
  it("S49 two parallel captures of byte-identical workspace produce same id", async () => {
    const { workspace, storeRoot } = await makeWorkspace({ "a.txt": "racey" });
    const store = filesystemStore({ root: storeRoot });
    const [id1, id2] = await Promise.all([store.capture(workspace), store.capture(workspace)]);
    expect(id1).toBe(id2);
  });

  it("S50 parallel reads of same snapshot path do not interfere", async () => {
    const { workspace, storeRoot } = await makeWorkspace({ "a.txt": "parallel" });
    const store = filesystemStore({ root: storeRoot });
    const id = await store.capture(workspace);
    const reads = await Promise.all(Array.from({ length: 20 }, () => store.read(id, "a.txt")));
    for (const bytes of reads) expect(TEXT_DECODER.decode(bytes)).toBe("parallel");
  });

  it("S51 capture in flight + read of older unrelated snapshot stays consistent", async () => {
    const { workspace, storeRoot } = await makeWorkspace({ "a.txt": "v1" });
    const store = filesystemStore({ root: storeRoot });
    const id1 = await store.capture(workspace);
    // Mutate then capture again, racing a read of the old id.
    await fs.writeFile(path.join(workspace, "a.txt"), "v2");
    const [, oldBytes] = await Promise.all([store.capture(workspace), store.read(id1, "a.txt")]);
    // Old read must still see v1 — bundles are immutable.
    expect(TEXT_DECODER.decode(oldBytes)).toBe("v1");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// P. Generator determinism (3)
// ─────────────────────────────────────────────────────────────────────────

describe("P. Generator determinism (3)", () => {
  function basicDraft(): Parameters<typeof generateInMemory>[0]["draft"] {
    return {
      soul: { denyRules: [], modelAllowlist: [], tone: "" },
      user: { oboScope: [], authorityBounds: [] },
      agents: { delegationMap: {}, architectureBoundaries: [] },
      tools: [
        { name: "one", riskLevel: 1, capabilities: ["READ"] },
        { name: "two", riskLevel: 2, capabilities: ["WRITE"] },
      ],
      skills: [],
      governance: { rules: [], sensitivityPropagation: [], governanceSurface: [] },
      identity: { name: "det" },
    };
  }

  it("S52 same draft + same `now` → byte-identical policyIr", async () => {
    const FROZEN = (): Date => new Date("2026-01-01T00:00:00.000Z");
    const a = generateInMemory({ workspaceRoot: ".", draft: basicDraft(), now: FROZEN });
    const b = generateInMemory({ workspaceRoot: ".", draft: basicDraft(), now: FROZEN });
    expect(a.policyIr).toBe(b.policyIr);
  });

  it("S53 same draft + different `now` → only generatedAt differs; policyId stable", async () => {
    const a = generateInMemory({
      workspaceRoot: ".",
      draft: basicDraft(),
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });
    const b = generateInMemory({
      workspaceRoot: ".",
      draft: basicDraft(),
      now: () => new Date("2030-12-31T23:59:59.000Z"),
    });
    const irA = JSON.parse(a.policyIr) as PolicyIR;
    const irB = JSON.parse(b.policyIr) as PolicyIR;
    expect(irA.policyId).toBe(irB.policyId);
    expect(irA.generatedAt).not.toBe(irB.generatedAt);
    // Tools + denyRules byte-identical.
    expect(JSON.stringify(irA.tools)).toBe(JSON.stringify(irB.tools));
    expect(JSON.stringify(irA.denyRules)).toBe(JSON.stringify(irB.denyRules));
  });

  it("S54 tool order in input is preserved through projection", async () => {
    const FROZEN = (): Date => new Date("2026-01-01T00:00:00.000Z");
    const tools = [
      { name: "zebra", riskLevel: 1 as const, capabilities: ["READ"] as const },
      { name: "apple", riskLevel: 2 as const, capabilities: ["WRITE"] as const },
      { name: "mango", riskLevel: 3 as const, capabilities: ["READ"] as const },
    ];
    const out = generateInMemory({
      workspaceRoot: ".",
      draft: { ...basicDraft(), tools: tools as never },
      now: FROZEN,
    });
    const ir = JSON.parse(out.policyIr) as PolicyIR;
    expect(ir.tools.map((t) => t.id)).toEqual(["zebra", "apple", "mango"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Q. PolicyIR shape edge cases (3)
// ─────────────────────────────────────────────────────────────────────────

describe("Q. PolicyIR shape edge cases (3)", () => {
  it("S55 PolicyIR with empty tools + empty denyRules is valid", async () => {
    const minimal: PolicyIR = {
      version: "1",
      policyId: "sha256-empty",
      generatedAt: "2026-01-01T00:00:00.000Z",
      generatedFrom: "sha256-snap",
      tools: [],
      denyRules: [],
    };
    expect(() => validatePolicyIR(minimal)).not.toThrow();
  });

  it("S56 [DECISION] PolicyIR with extra unknown fields passes validation (forward-compat)", async () => {
    const withExtra = {
      version: "1",
      policyId: "sha256-x",
      generatedAt: "2026-01-01T00:00:00.000Z",
      generatedFrom: "sha256-snap",
      tools: [],
      denyRules: [],
      // Future-version fields. Validation should not reject these.
      futureField: { whatever: true },
      anotherFuture: 42,
    };
    expect(() => validatePolicyIR(withExtra)).not.toThrow();
  });

  it("S57 [DECISION] validatePolicyIR is shape-only — malformed denyRule entries pass through", async () => {
    // The v2-prototype validatePolicyIR docstring is explicit: it checks
    // top-level shape (required fields present, tools/denyRules are arrays)
    // but does NOT validate per-rule structure. Per-rule validation is
    // the consumer's responsibility — different evaluators have different
    // requirements (a rule that's malformed for one evaluator might be
    // intentionally extension-shaped for another). This test pins the
    // current contract behavior.
    const looselyValid = {
      version: "1",
      policyId: "sha256-x",
      generatedAt: "2026-01-01T00:00:00.000Z",
      generatedFrom: "sha256-snap",
      tools: [],
      denyRules: [{ id: "r1" /* missing `when`, `reason` — would crash a strict evaluator */ }],
    };
    expect(() => validatePolicyIR(looselyValid)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// R. Capture sensitivity to change (3)
// ─────────────────────────────────────────────────────────────────────────

describe("R. Capture sensitivity to change (3)", () => {
  it("S58 adding a file → different snapshot id", async () => {
    const { workspace, storeRoot } = await makeWorkspace({ "a.txt": "hi" });
    const store = filesystemStore({ root: storeRoot });
    const id1 = await store.capture(workspace);
    await fs.writeFile(path.join(workspace, "b.txt"), "new", "utf8");
    const id2 = await store.capture(workspace);
    expect(id1).not.toBe(id2);
  });

  it("S59 modifying ONE byte of one file → different snapshot id", async () => {
    const { workspace, storeRoot } = await makeWorkspace({ "a.txt": "hello" });
    const store = filesystemStore({ root: storeRoot });
    const id1 = await store.capture(workspace);
    await fs.writeFile(path.join(workspace, "a.txt"), "hellp", "utf8"); // 'o' → 'p'
    const id2 = await store.capture(workspace);
    expect(id1).not.toBe(id2);
  });

  it("S60 capture from a separate node subprocess produces same id (deterministic across processes)", async () => {
    const { workspace, storeRoot } = await makeWorkspace({
      "a.txt": "cross-process",
      "sub/b.txt": "nested",
    });
    const store = filesystemStore({ root: storeRoot });
    const inProcId = await store.capture(workspace);

    // Spawn a node subprocess that imports our package and captures the
    // same workspace into a different store. Compare the resulting id.
    // Uses dynamic import via `node --input-type=module` for simplicity.
    const otherRoot = path.join(path.dirname(storeRoot), "snap-store-2");
    await fs.mkdir(otherRoot, { recursive: true });
    const snapPkg = path
      .resolve(__dirname, "../../openclaw-snap/dist/index.js")
      .replace(/\\/g, "/");
    const script = `
      import('file:///${snapPkg}').then(async ({ filesystemStore }) => {
        const store = filesystemStore({ root: ${JSON.stringify(otherRoot)} });
        const id = await store.capture(${JSON.stringify(workspace)});
        process.stdout.write(id);
      }).catch((e) => { process.stderr.write(String(e)); process.exit(1); });
    `;
    const stdout = await new Promise<string>((resolve, reject) => {
      const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let out = "";
      let err = "";
      child.stdout.on("data", (b) => (out += b.toString()));
      child.stderr.on("data", (b) => (err += b.toString()));
      child.on("exit", (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(err))));
    });
    expect(stdout).toBe(inProcId);
  });
});
