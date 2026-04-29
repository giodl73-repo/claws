# PR-DRAFT 1 — Architect Review

**Reviewer role**: architect (cross-cutting design coherence, module boundaries, dependency direction, abstraction seams)
**PR**: `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/pr-drafts/PR-1.md`
**Date**: 2026-04-28
**Verdict**: **APPROVE-WITH-WARNINGS**

---

## Summary

The package boundary is sound, the dependency direction is clean (`@openclaw/workspace` has no `@openclaw/*` peers — `index.ts:25-31`), and the schema-DI seam in `lint/types.ts:88-102` is the right shape for a schema-agnostic engine. Two structural concerns and one framing concern keep this short of a clean APPROVE.

---

## Findings

### S1 — `DiagnosticLocation.kind: 'uri'` is the right granularity (no change requested)

The single `'uri'` discriminator in `PR-1.md:121-124` is correctly layered: `DiagnosticLocation` discriminates *transport* (legacy file/line tuple vs canonical URI string), and `ParsedOcUri` (`PR-1.md:137-139`) discriminates *URI semantics*. Splitting `DiagnosticLocation` into `'workspace-uri' | 'config-uri'` would leak URI-scheme internals into the diagnostic vocabulary and force every renderer to re-discriminate after parsing. The current shape lets renderers treat URIs as opaque strings until they need structure — at which point `parseOcUri()` provides the second-tier discriminator. This is properly layered, not redundant. **Keep as is.**

### S2 — `resolveConfigUri()` return shape is inconsistent with the rest of the package (WARNING)

`PR-1.md:144-150` mixes three failure conventions in one signature:
- success: `{found: true, value, parentNode, leafKey}`
- soft-miss: `{found: false}`
- hard error: `OcUriError` (thrown? returned?)

The package elsewhere uses thrown `OcConfigUriError` (`oc-config-uri.ts:30-39, 57`) for malformed input and structured diagnostics for parser issues (`ast-types.ts:107-124`). The proposed `resolveConfigUri` blends "boolean-tagged result" with "error-as-value-or-throw" ambiguously. Pick one:
- If errors throw, signature should be `{found:true,...} | {found:false}`.
- If errors are values, use a uniform `Result<T,E>` (or three-arm union with `{kind:'ok'|'miss'|'error'}`).

The current draft's `| OcUriError` arm is the worst of both worlds — callers must `instanceof` check AND boolean-narrow. **Recommend**: drop the `| OcUriError` return arm; let `parseOcUri` (called internally) throw for malformed URIs, and reserve the boolean discriminator for the path-walk outcome. This matches `parseOcConfigUri` throwing in `oc-config-uri.ts:57`.

### S3 — `/staging` and `/path-canonical` subpaths shipped without consumers (WARNING)

`index.ts:30-31` and `package.json:39-48` export two subpaths that PR-1.md:87 admits "ride along" without earning their keep until PR-5/PR-6. Architecturally this is defensible (publishing the package once is cheaper than re-publishing twice for filler subpaths), BUT: shipping public exports without exercised consumers means their API shape is locked by SemVer before any caller has stress-tested it. If PR-5 needs to evolve `/staging`'s surface, it costs a major version on a package that just hit 0.1.0.

**Recommend one of**:
1. Mark `/staging` and `/path-canonical` `"private": true` or via a `// @internal` JSDoc tag, with a note that PR-5/PR-6 will promote them.
2. Drop the subpath exports from `package.json:39-48` for this PR; add them back when PR-5/PR-6 lands.
3. Keep as-is but call out in CHANGELOG that `0.x` minors may break these two subpaths.

Option 2 is cleanest for a forward-compat lens.

### S4 — Naming asymmetry: `ParsedOcUri` vs `ParsedOcConfigUri` (MINOR)

`PR-1.md:137` documents a unified `ParsedOcUri` discriminated union, but the actual implementation in `oc-config-uri.ts:26-28` defines a separate `ParsedOcConfigUri` — config-only, no `kind` discriminator. The PR description and the code are out of sync. Either:
- The PR ships TWO parsers (`parseOcUri` for workspace, `parseOcConfigUri` for config) with no unified type — fine, but PR-1.md:137-141 misrepresents this.
- The PR ships ONE parser with the union, and `oc-config-uri.ts` is a delegated helper — then `ParsedOcConfigUri` should be `Extract<ParsedOcUri, {kind:'config'}>`.

This must be reconciled before merge; reviewers will notice.

### S5 — `LintSchema` interface (`lint/types.ts:88-102`) — stable enough? (APPROVE)

Six accessors, all path-keyed, all returning plain data structures (`ReadonlyMap`, `readonly string[]`, `SchemaKind` literal union at `lint/types.ts:104-111`). No callbacks into the schema library, no library-specific types leak. A Zod adapter is `(z) => ({kindOf: p => zodKindAt(z, p), ...})`; a JSON Schema adapter is the same shape. **The DI seam holds.** One latent concern: `pluginIdSources(doc)` (`lint/types.ts:98-101`) takes a `JsoncDocument` rather than a path — the only accessor that does. This is correct (plugin IDs are scattered across the doc) but worth a comment noting the asymmetry isn't an oversight.

### S6 — "Earns its keep four ways" (`PR-1.md:169-176`) — overlap is real but acceptable (APPROVE)

Way 2 (lint) and way 3 (URI vocabulary) overlap: lint findings are the primary consumer of `oc://config/...`. But way 3 also covers `oc://TOOLS.md/...` (workspace files, separate URI shape) and the doctor migration (`PR-1.md:154-163`), so it's not pure subsetting. Ways 1 (lossless) and 4 (canonicalize) are independently justified. The pitch is honest if slightly over-counted; the four-way framing helps reviewers see the package isn't gold-plating.

### S7 — "Proto vs canonical" framing (PR-1.md:18-19 of `oc-config-uri.ts`) — drop it (MINOR)

Now that the URI scheme ships in PR-1, the "proto for PR-2 canonicalization" comment in `oc-config-uri.ts:17-19` is stale. Re-frame as "canonical implementation; upstream RFC pending." This avoids signaling to reviewers that they're approving a placeholder.

### S8 — PR description footer disclosure (`PR-1.md:278`) — keep it (APPROVE)

The "originally planned as PR-2 ... folded on 2026-04-28" disclosure is helpful, not distracting. Reviewers tracking the wave know to expect a PR-2; without the note they'd ask "where's PR-2?" Keep the footer.

---

## Forward-compat gate (next 5 PRs)

- PR-2 (now absorbed): N/A.
- PR-3+ governance plugins: depend on `DiagnosticLocation` discriminator — current shape supports adding new `kind` variants without breaking existing `'file'`/`'uri'` consumers. **Holds.**
- PR-5 `/staging`, PR-6 `/path-canonical`: API not yet validated by consumers. See S3.
- Any future URI scheme (e.g. `oc://snapshot/...`): `ParsedOcUri` union extends cleanly. **Holds** *if* S4 is reconciled toward the unified union.

## Pre-push gate

**APPROVE-WITH-WARNINGS** conditional on S2 (resolve return shape), S3 (decide subpath visibility), S4 (reconcile parser naming). S1, S5, S6, S8 are clean. S7 is cosmetic.
