# Pulse Review · Hapi the Bringer · R1

**Reviewer**: type-system
**Date**: 2026-04-27
**Verdict**: APPROVE-WITH-WARNINGS

## Summary

All four pulses with public-API impact (PR-1 workspace, PR-2 URI scheme, PR-4 guardrails, PR-5 OC-7 merger) have sound architectural intent but expose type-system vagueness that creates implementation friction. Corrections are light-editorial — explicit type signatures + discriminated unions in PR descriptions — but should land before each PR opens to avoid mid-review type-narrowing churn.

## Findings

### HC-WARN (3)

1. **Diagnostic location should be discriminated union (PR-1)** — Pulse 04 says location "accepts `{file, line}` OR `{ uri }`" but doesn't mandate discriminated-union typing. Without an explicit discriminator (e.g., `kind: 'file' | 'uri'` or a presence-tag like `'file' in loc`), TS can't narrow safely; callers write defensive runtime guards instead of compile-time narrowing. **Consequence**: adoption-side code accumulates `if (loc.uri) { ... } else { ... }` runtime checks where the type system could have proved correctness. **Suggested fix**: explicit type definition in pulse 04 — `type DiagnosticLocation = { kind: 'file', file: string, line?: number } | { kind: 'uri', uri: string }`.

2. **`parseOcUri()` return type lacks `kind` discriminator (PR-2)** — Pulse 05 shows the parser handles both `oc://{file}/...` and `oc://config/...` but doesn't spell out the return type. Without `kind: 'workspace' | 'config'`, switch-on-shape consumers can't narrow. **Suggested fix**: include explicit typedef in pulse 05's verification gate: `type ParsedOcUri = { kind: 'workspace'; file: string; path?: string[] } | { kind: 'config'; path: string[] }`.

3. **`sourcePluginId` mandatory is runtime-flagged, not type-safe (PR-4)** — Pulse 07's lenient mode (per amendment §6.2) accepts pre-v0.2 entries; this is runtime-only, not a type union. Audit-stream consumers iterating mixed streams can't distinguish strict vs legacy entries at compile time. **Suggested fix**: explicitly note "lenient mode is runtime-only" in pulse 07 + provide a runtime-safe accessor pattern (e.g., `getSourcePluginId(entry): string | undefined`) for consumers.

### HC-NOTE (4)

1. **PR-1 JSONC AST interface needs explicit type signature** — pulse 04 cites "PEG AST round-trip per WorkspaceFileKind" but doesn't define the AST node type. Is it shared with markdown AST or separate? Emit signatures must be symmetric across formats. Recommend: define `WorkspaceAstNode` shape in pulse 04 deliverables.

2. **PR-2 public-API surface list missing** — pulse 05 promises `plugin-sdk-api-baseline.sha256` refresh but doesn't list which exports change. Recommend: include explicit list of new public symbols (`parseOcUri`, `formatOcUri`, `resolveConfigUri` + their full type signatures) in the verification gate.

3. **OC-7 codemod migration explicit** — PR-5 codemod `Array.isArray(x) ? x : x ? [x] : []` is testable and operationally clear. Pulse 08 line 56 verifies "internal consumers compile clean" — should clarify this means BOTH (a) `tsc --noEmit` succeeds AND (b) widened field is safely narrowed in `@bic/openclaw-policy` and `@bic/openclaw-snap` per code inspection.

4. **All PRs should explicitly list affected exports** in the baseline-hash refresh sections so reviewers can verify the hash actually covers the right surface.

## Strengths

- **OC-7 codemod migration is explicit** — `Array.isArray(x) ? x : x ? [x] : []` is specific, testable, operationally clear. Pulse 08 codemod note plus the test assertion together form a complete migration contract.
- **Field-widening correctly framed** — Plan H5 wording correction (W8 fix from R1) means all pulses now describe the OC-7 change as array adoption, not boolean-deprecation. Matches reality at `hook-types.ts:402-410`.
- **Spec amendment §6 + §10a are tightly coupled** — Mandatory `sourcePluginId` in §6 + URI scheme extension in §10a give the type-system enough information to implement; the gap is in pulse-level explicitness, not spec design.

## Apply-back actions

1. PR-1 amendment: define `DiagnosticLocation` as discriminated union in pulse 04 deliverables.
2. PR-2 amendment: explicit `ParsedOcUri` type in pulse 05; list affected exports.
3. PR-4 amendment: document lenient mode as runtime-only; provide accessor pattern.
4. PR-5 amendment: clarify "compile clean" semantics in pulse 08 verification gate.
5. All PRs: list affected exports in baseline-hash refresh deliverables.
