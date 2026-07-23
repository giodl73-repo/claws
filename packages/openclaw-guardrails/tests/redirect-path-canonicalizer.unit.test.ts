/**
 * L0 unit tests for `canonicalizeRedirect` — P-03 path-traversal defence for
 * `FileIngestProvider.modify.redirectPath` (pulse 56 D1).
 *
 * The canonicalizer lives in `@bic/openclaw-workspace/path-canonical` but its
 * invariants are governance-critical (SC-14 F-01..F-11), so the canonical
 * test suite sits with the guardrails tests — the governance team owns the
 * spec, the workspace team owns the implementation.
 *
 * Each rejection test asserts the specific `invalidReason` so a regression
 * that collapses all four modes into a generic `'redirect-path-escape'`
 * fails loudly instead of passing silently (SC-14 F-01..F-04 each carry a
 * distinct value in `DecisionEntry.invalidReason`).
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  canonicalizeRedirect,
  type CanonicalizeRedirectResult,
} from "@bic/openclaw-workspace/path-canonical";

describe("canonicalizeRedirect — P-03 path-traversal defence", () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "oc-redirect-canon-"));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it("accepts a valid `.openclaw/.stage/file.md` redirect path", () => {
    const result = canonicalizeRedirect(".openclaw/.stage/file.md", workspaceRoot, {
      skipRealpath: true,
    });
    expectOk(result);
    expect(result.path.endsWith(`.openclaw${sep}.stage${sep}file.md`)).toBe(true);
  });

  it("rejects `../outside/escape.txt` with invalidReason 'redirect-path-escape'", () => {
    const result = canonicalizeRedirect("../outside/escape.txt", workspaceRoot, {
      skipRealpath: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.invalidReason).toBe("redirect-path-escape");
    }
  });

  it("rejects absolute path `C:\\tmp\\x` with invalidReason 'redirect-path-escape' (backslash-triage)", () => {
    // Absolute path with backslashes trips the backslash check FIRST
    // (step 1), before the is-absolute check. Both yield
    // 'redirect-path-escape' — the behaviour callers observe.
    const result = canonicalizeRedirect("C:\\tmp\\x", workspaceRoot, { skipRealpath: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.invalidReason).toBe("redirect-path-escape");
    }

    // And a POSIX-style absolute path also rejects under escape.
    const posixResult = canonicalizeRedirect("/tmp/x", workspaceRoot, { skipRealpath: true });
    expect(posixResult.ok).toBe(false);
    if (!posixResult.ok) {
      expect(posixResult.invalidReason).toBe("redirect-path-escape");
    }
  });

  it("rejects Windows 8.3 short-name segments (`STAGE~1`, `STAGE~9`) with 'redirect-path-short-name'", () => {
    // Two sub-cases proving the `~\d+` regex, not a literal `~1` match.
    // Windows generates `~2..~9` on name collisions; a regression that
    // checks only `~1` is a silent platform-conditional gap (SC-14 F-02,
    // R1 invariants F-06).
    for (const raw of ["STAGE~1.FOO/x", "STAGE~9.FOO/x"]) {
      const result = canonicalizeRedirect(raw, workspaceRoot, {
        skipRealpath: true,
      });
      expect(result.ok, `input ${raw}`).toBe(false);
      if (!result.ok) {
        expect(result.invalidReason, `input ${raw}`).toBe("redirect-path-short-name");
      }
    }
  });

  it("rejects UNC path `\\\\server\\share\\x` with 'redirect-path-escape' (backslash guard)", () => {
    const result = canonicalizeRedirect("\\\\server\\share\\x", workspaceRoot, {
      skipRealpath: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.invalidReason).toBe("redirect-path-escape");
    }
  });

  it("rejects NTFS Alternate Data Stream `.openclaw/.stage/SECRETS.md:hidden` with 'redirect-path-ads'", () => {
    const result = canonicalizeRedirect(".openclaw/.stage/SECRETS.md:hidden", workspaceRoot, {
      skipRealpath: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.invalidReason).toBe("redirect-path-ads");
    }
  });

  it("accepts `./` prefix — normalized to `.openclaw/.stage/...`", () => {
    const result = canonicalizeRedirect("./.openclaw/.stage/file.md", workspaceRoot, {
      skipRealpath: true,
    });
    expectOk(result);
    expect(result.path.endsWith(`.openclaw${sep}.stage${sep}file.md`)).toBe(true);
  });

  it("normalizes duplicate slashes `.openclaw//.stage/file.md` to single-slash form", () => {
    const result = canonicalizeRedirect(".openclaw//.stage/file.md", workspaceRoot, {
      skipRealpath: true,
    });
    expectOk(result);
    // Node's path.normalize collapses duplicate separators; assert the
    // result does NOT contain a double-separator segment.
    expect(result.path.includes(sep + sep)).toBe(false);
    expect(result.path.endsWith(`.openclaw${sep}.stage${sep}file.md`)).toBe(true);
  });
});

function expectOk(
  result: CanonicalizeRedirectResult,
): asserts result is Extract<CanonicalizeRedirectResult, { ok: true }> {
  expect(result.ok).toBe(true);
}
