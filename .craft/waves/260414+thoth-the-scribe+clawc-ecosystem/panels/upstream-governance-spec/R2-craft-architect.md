# Panel Review: Architect on Upstream Governance Spec (R2)

**Type**: spec
**Role**: craft/architect
**Round**: 2
**Date**: 2026-04-15

---

## R1 Finding Resolution

| R1 ID | Status | Notes |
|-------|--------|-------|
| M1 | RESOLVED | ShellExecProvider now has `import { readFileSync } from 'node:fs';` on line 429 of the canonical spec. The code block is copy-paste runnable with only `node:fs` + `@openclaw/*` types. |
| M2 | RESOLVED | `approval-event-schema.md` has been fully rewritten. All decision references now use `{ decision: 'allow' }` / `{ decision: 'deny' }` matching the canonical `AuthorizationDecision` type. The flow diagram (lines 31-37) and the "Relationship to Existing Specs" diagram (lines 239-264) both use the `decision` field consistently. Zero `allowed: true/false` references remain. |
| M3 | RESOLVED | `claws-aether-integration.md` H3 validation bullets (lines 29-32) now use `{ decision: 'allow', requiresExternalApproval: true }`, `{ decision: 'deny' }`, etc. Grep for `allowed:` returns zero matches. The stale boolean convention is fully eradicated. |
| M4 | RESOLVED | Section 8 of the canonical spec (lines 1115-1134) now documents a concrete JSON Schema generation strategy: TypeScript types are the source of truth, `typescript-json-schema` generates `approval-request.json`, `approval-response.json`, and `timeout-policy.json`. The directory layout includes `schema-gen.ts` for generation. The spec states "The JSON Schema files are the cross-language contract; the TypeScript types are the source of truth from which they are generated." This is sufficient -- the generation strategy is named, the constraint propagation (RiskClassification, extensions size limit, `contains: { const: 5 }` for alwaysDenyRiskLevels) is explicit. |
| W1 | RESOLVED | Section 3 (audit-chain, lines 688-695) now explicitly explains the overlap: "The export functionality covers historical chain data (full trail replay). For live event streaming to SIEM systems, see `@openclaw/siem-emitter` (Section 6)." Section 6 (siem-emitter, lines 947-949) mirrors this: "Handles live event dispatch with batching and buffering. For historical chain export, see `@openclaw/audit-chain`. Both packages share the `ExportFormat` type." The `ExportFormat` type (line 769) is defined once and marked as shared across both packages. The architectural boundary (historical vs. live) is clear. |
| W2 | RESOLVED | Lines 117-119 now state: "The 100ms SLA on `preAuthorize()` exists because governance must not add perceptible latency to tool execution. If a provider exceeds 100ms, the registry treats it as a provider exception and applies the fail-mode table above." The SLA is now enforceable via the fail-mode table, not merely advisory. Provider timeout = provider exception = fail-mode logic triggers (R5 = fail-closed, R1-R2 = fail-open). |
| W3 | RESOLVED | `claws-upstream-contrib.md` H1 (line 16) now reads "6 runtime packages" and enumerates all 6, including `@openclaw/approval-events` with its description. The H1 package list matches the canonical spec's 6 packages exactly. |
| W4 | PARTIALLY RESOLVED | Line 38 of the Aether integration plan now states: "the same @openclaw/audit-chain infrastructure from Thoth CP-5." Line 173 elaborates: "The verification LOGIC lives in claws-sdk (or @openclaw/audit-chain), but the CALL SITE is in the adapter. This means the Aether repo gets a small PR that imports the verification function." This clarifies the integration pattern (the adapter calls a verification function from the SDK/package), but the original concern about a Python adapter calling a TypeScript function remains imprecise. The plan says "or @openclaw/audit-chain" which is a TypeScript npm package, and `blob_mount.py` is Python. The "(or @openclaw/audit-chain)" suggests the pattern may be either a claws-sdk TS call or a Python re-implementation, but does not commit to one. See W2 below. |
| W5 | RESOLVED | The deck (line 708) now reads "CONTRIBUTE (10)" and lists exactly 10 items. The count matches the enumerated list. The prior "(19)" inflation is eliminated. |
| W6 | RESOLVED | Section 5 (identity-bridge, lines 876-882) now explicitly states: "Token validation is signature-check only using pre-loaded keys. The bridge does NOT fetch JWKS endpoints at runtime -- keys are provided at construction time via the `signingKeys` config, either loaded from a local file or pre-fetched during application startup." The constructor example (line 891) shows `signingKeys: preloadedJwks`. The "zero dependencies" claim is now qualified and architecturally coherent with the `preAuthorize()` no-network constraint. |
| N1 | ACKNOWLEDGED | The `modify` outcome's coupling to tool argument schemas remains undocumented. The `ModifyDecision` (lines 262-276) requires `modifiedArguments: Record<string, unknown>` but there is no discussion of how providers discover argument schemas. This is a design note, not a blocker. |
| N2 | PARTIALLY RESOLVED | The canonical spec's roadmap (Section 10, lines 1167-1176) lists `@openclaw/approval-events` in Wave 1, Week 2. The plan's H3 (line 26) lists Wave 1 as "GuardrailProvider spec PR + `@openclaw/identity-bridge` + `@openclaw/budget-meter` + `@openclaw/audit-chain`" with validation "spec PR + 3 packages" (line 27). This is 4 Wave 1 deliverables in the plan vs. 6 in the canonical spec (which adds approval-events and the companion RFC in Week 1-2). Minor sequencing drift persists. |
| N3 | RESOLVED | The `host-approval-policies.json` schema in `claws-aether-integration.md` (line 110) now uses `"generatorVersion": "0.36.0"` instead of `"compilerVersion"`. This is OC-portable -- no Craftworks-internal concept leaks into the artifact. |

---

## New Findings (R2)

### Major (M)

| # | File | Section | Finding | Suggested fix |
|---|------|---------|---------|---------------|
| (none) | | | | |

### Warning (W)

| # | File | Section | Finding | Suggested fix |
|---|------|---------|---------|---------------|
| W1 | `openclaw-governance-spec.md` | Section 3, line 944 | `@openclaw/siem-emitter` header (line 942) says "5 standard formats" but the `ExportFormat` type lists 5 (`sarif`, `cef`, `json`, `ndjson`, `syslog`) and the H1 description in `claws-upstream-contrib.md` (line 16) says "4 standard formats (CEF, NDJSON, syslog, SARIF)". The plan omits `json` from the siem-emitter's format list while the canonical spec includes it. The plan and spec are counting differently for siem-emitter. | Update the plan's siem-emitter description to list 5 formats matching the canonical spec, or explicitly state that `json` is an alias/convenience and the "4 formats" count refers to the standards-body formats (CEF, NDJSON, syslog, SARIF). |
| W2 | `claws-aether-integration.md` | Lines 38, 147-149, 173 | The blob integrity verification still has an ambiguous implementation boundary. Line 147 says "Signature verification function that checks `.claws-manifest.json`" and line 173 says "The verification LOGIC lives in claws-sdk (or @openclaw/audit-chain)." The "or" is uncommitted -- it should be "and" (claws-sdk wraps the @openclaw/audit-chain verify function) or just one of the two. Furthermore, `blob_mount.py` is Python but the verification function is TypeScript, and the plan does not name the FFI/sidecar/subprocess strategy. This is a carryover from W4 R1 -- clearer than before but not fully resolved. | Commit to a specific integration path: (a) "claws-sdk exports a `verifyManifest()` function that blob_mount.py calls via a Node.js subprocess" or (b) "a Python implementation of HMAC-SHA256 manifest verification ships in the Aether adapter, tested against the same fixtures as the TS implementation." Remove the "or" ambiguity. |
| W3 | `claws-upstream-contrib.md` | H3, line 26-27 | The plan's H3 says "Wave 1 (weeks 1-4): GuardrailProvider spec PR + 3 packages" but the canonical spec's Wave 1 (Section 10, lines 1167-1176) delivers 6 items: spec PR, companion RFC, approval-events, identity-bridge, budget-meter, audit-chain. The plan's H3 count of "3 packages" for Wave 1 is stale -- it should be 4 packages (approval-events was added to the spec but not to the plan's Wave 1 enumeration). The H3 validation bullet says "spec PR + 3 packages" but should say "spec PR + companion RFC + 4 packages". | Update H3 to enumerate `@openclaw/approval-events` in the Wave 1 package list and update the validation to "spec PR + companion RFC + 4 packages". |

### Notes (N)

| # | File | Section | Finding |
|---|------|---------|---------|
| N1 | `openclaw-governance-spec.md` | Section 3, lines 733-737 | `audit-chain.export()` now supports 5 formats (sarif, cef, ndjson, json, syslog) while the H1 plan description says "export to SARIF/CEF/JSON/syslog" (4 formats, omitting ndjson). This is a minor documentation count inconsistency in the plan only -- the canonical spec is correct. |
| N2 | `why-claws.md` | Line 467 | The deck says "Ed25519 available in @claws/audit (enterprise tier)" while the canonical spec (Section 3, lines 707-710) documents Ed25519 as an option in `@openclaw/audit-chain` (the contributed package). These are different packages -- @claws/audit vs @openclaw/audit-chain. The deck's claim is architecturally correct (Ed25519 in the @claws tier), but a reader who just read the canonical spec might expect Ed25519 in the contributed @openclaw package. The canonical spec already documents Ed25519 in @openclaw/audit-chain, so the deck's positioning as "enterprise tier" is slightly misleading -- it is available in both tiers. |
| N3 | `openclaw-governance-spec.md` | Section 1, line 401 | `register()` now documents "Throws on duplicate name" (line 401). This addresses the consolidated R1 finding U-N8 about register() returning void with no error on duplicates. The error behavior is now explicit. |

---

## Lens Checklist (R2)

| Verify item | Pass? | Notes |
|-------------|-------|-------|
| SDK-owns-logic boundary respected | PASS | No change from R1. All 6 `@openclaw/*` packages are runtime primitives. The contribute/keep boundary (Section 9) is unchanged and correct. |
| Dependency arrows point inward | PASS | W4 from R1 is largely resolved. The cross-language ambiguity in the Aether plan (W2 above) is a plan-level documentation gap, not an architectural violation. The dependency direction (CLI -> SDK -> types -> @openclaw/*) is correct. |
| Module responsibilities clear from location | PASS | No change. Package names map to single responsibilities. |
| One responsibility per module | PASS | audit-chain and siem-emitter now have explicit, documented responsibility boundaries: historical export vs. live dispatch. The `ExportFormat` type is shared and unified. |
| Boundaries self-explanatory | PASS | The Quick Start section (lines 26-31) and Contribute/Keep Boundary (Section 9) make the spec navigable and the boundary clear. |

---

## Summary

The R1 fixes are thorough. All 4 major findings (M1-M4) are resolved: the `decision` field is consistent across all documents, the ShellExecProvider has its import, and the JSON Schema generation strategy is explicit with constraint propagation documented. 5 of 6 warnings are fully resolved and W4 is substantially improved. The remaining R2 issues are plan-level documentation drift (Wave 1 package count in H3, siem-emitter format count mismatch between plan and spec, and the Aether adapter verification path still using "or" instead of committing to a specific integration pattern). None are architectural blockers -- the canonical spec itself is clean and ready for the OC community.
