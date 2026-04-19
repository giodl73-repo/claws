# `@openclaw/workspace` — Package Spec

**Package**: `@openclaw/workspace`
**Status**: Proposal (draft)
**Date**: 2026-04-18
**Companion to**: `openclaw-upstream-spec.md` (main spec, §2) · `openclaw-upstream-brief.md` (Peter-facing brief)

---

## Summary

`@openclaw/workspace` is the single package holding everything that reads, addresses, or canonicalizes OC workspace content. Three subpaths — `/path` (oc:// URIs), `/ast` (PEG grammars + AST + emitters), `/canonicalize` (RFC 8785 JCS) — covering the shared utilities policy + snap + guardrails all depend on.

One install, one version across three related concerns. Consumers tree-shake what they need.

---

## Structure

```
@openclaw/workspace
├── /path         — oc:// URI scheme + workspace file classifier
├── /ast          — PEG grammars + typed AST + emitters for OC workspace files
└── /canonicalize — RFC 8785 JCS canonicalization helper
```

---

## `/path` — oc:// URIs + workspace file registry + chunk types

The `oc://` URI scheme addresses a location inside an OC workspace. A single URI — `oc://TOOLS.md/Tools/send-email/args_from` — addresses the same thing in an editor diagnostic, an audit entry, a supervisor approval request, and an HTTP endpoint. No parallel naming schemes to keep in sync.

```ts
export interface OcPath {
  readonly file: string;                 // e.g. 'TOOLS.md'
  readonly section?: string;             // H2 heading (e.g. 'Tools')
  readonly item?: string;                // item under section (e.g. 'send-email')
  readonly field?: string;               // field on item (e.g. 'args_from')
  readonly session?: string;             // optional ?session=... scope
}

export class OcPathError extends Error { readonly code: string; readonly input: string; }

export function parseOcPath(uri: string): OcPath;                 // throws OcPathError
export function formatOcPath(path: OcPath): string;               // throws OcPathError
export function isValidOcPath(input: unknown): input is string;   // never throws

// -- Workspace file registry --
export const OC_WORKSPACE_FILES: readonly string[];               // 9 entries
export const OC_PARSED_FILES: readonly string[];                  // 7 markdown files

// -- Chunk contracts (authoritative wire shape for the CAP API) --
export const CHUNK_TABS: readonly ChunkTab[];                     // 9 entries
export type Chunk<K extends ChunkTab = ChunkTab> = …;
export type ChunkAssemblyResult = …;
// + all per-tab data shapes, RiskClassification, ItemLock, etc.
```

`resolveOcPath`, `extractChunks`, `insertChunk`, `updateChunk`, and `diagnose` are **not** exposed from `/path`. The serve-layer chunk runtime (`assembleChunks`) lives inside `claws-sdk` because it depends on `GovernanceIR`, `CapabilityManifest`, `FleetOverride` — types that belong in the compiler-side family, not in `@bic/openclaw-workspace`. `/path` ships the typed *contracts* (shapes the serve layer produces) while the *runtime assembler* stays in `claws-sdk/src/workspace/chunk-assembler.ts` and imports its type contract from `@bic/openclaw-workspace/path`.

Removed from the earlier draft:
- `resolveOcPath(uri, workspaceRoot, snapshot)` — serve-layer concern, belongs in claws-sdk.
- `extractChunks` / `insertChunk` / `updateChunk` — replaced by the real `assembleChunks` which assembles all 9 chunks from a `WorkspaceState` + `GovernanceIR` in one call (see `claws-sdk/src/workspace/chunk-assembler.ts`).
- `diagnose(kind, content)` — never implemented; AST-level diagnostics surface via `parse(...).diagnostics` on `/ast`.

---

## `/ast` — PEG grammars + typed AST + emitters

```ts
export function parse(kind: WorkspaceFileKind, content: string):
  { ast: WorkspaceAst; diagnostics: Diagnostic[] };
export function emit(kind: WorkspaceFileKind, ast: WorkspaceAst): string;
export const grammars: Record<WorkspaceFileKind, string>;  // raw PEG

export type WorkspaceFileKind =
  | 'agents' | 'config' | 'entities' | 'governance' | 'memory'
  | 'roles' | 'skills' | 'soul' | 'tasks' | 'tools' | 'workflows';
```

Parse is lossless (round-trip to byte-identical markdown for well-formed input). Emit for newly-authored AST produces a canonical shape. `WorkspaceFileKind` is owned here; `/path` imports it type-only.

**Consumers**: OC-core's workspace loader, editors (structural highlighting + autocomplete), supervisor companion apps (round-trip when users edit policy), migration tools, `@openclaw/policy`'s Parse and Extract phases.

---

## `/canonicalize` — RFC 8785 JCS

Deterministic JSON serialization. **One canonicalizer, shared across the family**: `@openclaw/policy` (PolicyIR → policyId), `@openclaw/snap` (workspace files → snapshotId + promote-time PolicyIR self-consistency), `@openclaw/guardrails/audit` (AuditEntry before hashing) all call this.

```ts
export function canonicalize(obj: unknown): string;
export function canonicalHash(obj: unknown): string;
export const CANONICALIZER_VERSION: string;
```

RFC 8785 compliance: lexicographic key ordering (UTF-16 code unit), UTF-8 output, NFC Unicode normalization, no insignificant whitespace, RFC 8785 number formatting. Two hosts on different OSes produce byte-identical output for the same logical input — CI-enforced across Linux / Windows / macOS.

### Formatting rules

RFC 8785 alone is insufficient to guarantee cross-consumer byte-parity — it defers number formatting to ECMAScript and is silent on error handling, depth limits, and non-JSON JavaScript values. The following rules make the contract explicit. Three independent implementations written against these rules MUST produce identical bytes for every valid input.

| Rule | Description |
|------|-------------|
| C-1 | Input strings (keys and values) are NFC-normalized before serialization; already-NFC input is a no-op. Additionally, keys that are NFC-stable but collapse under NFKC / compatibility decomposition (e.g. `"ﬁle"` U+FB01 vs `"file"`, `"ı"` U+0131 vs `"i"`) throw `E_NFKC_COLLAPSIBLE` — they would be distinct under `canonicalize` but equivalent under downstream case-folding / locale-normalizing consumers (filesystem layers, IdP user-name normalizers, log viewers), opening a cross-layer forgery window. Consumers MUST NOT post-process canonicalizer output with NFKC or collation transforms before hashing. |
| C-2 | Object keys sorted by UTF-16 code-unit sequence (RFC 8785 §3.2.3); not byte-wise, not locale-aware. |
| C-3 | Output is UTF-8 bytes; no BOM, no trailing newline. |
| C-4 | `NaN`, `+Infinity`, `-Infinity` throw `CanonicalizeError` code `E_NON_FINITE`. Never silently become `null` or `"NaN"`. |
| C-5 | Integer doubles in ±2⁵³ range serialize without a decimal point (`42`, not `42.0`). `-0` serializes as `0`. |
| C-6 | Non-integer finite doubles use RFC 8785 / ES6 shortest-round-trip stringification. |
| C-7 | Subnormal doubles round-trip as their shortest form. No flush-to-zero. |
| C-8 | Arrays preserve element order exactly. No sorting. |
| C-9 | Empty object `{}` and empty array `[]` emit exactly `{}` / `[]`, no whitespace. |
| C-10 | Input depth > 100 throws `CanonicalizeError` code `E_DEPTH`. Defends against DoS via unbounded recursion on the audit verifier. |
| C-11 | `undefined` inside an object drops the key. `undefined` inside an array throws `E_UNDEFINED_IN_ARRAY` (never `null`-replaces). |
| C-12 | `BigInt`, `Symbol`-keyed entries, `Function`, and class instances (non-plain objects) throw `E_BIGINT`, `E_NON_PLAIN_OBJECT`, etc. — typed codes per kind. |
| C-13 | `Date` objects throw `E_NON_PLAIN_OBJECT`. Callers serialize to ISO-8601 `Z` strings before calling `canonicalize()`. |
| C-14 | Two input keys that collapse to the same NFC form throw `E_DUPLICATE_KEY_AFTER_NFC`. Never silently merge or drop — silent merge is an audit-chain forgery vector. |
| C-15 | Callers MUST invoke `safeParse(bytes, { maxDepth: 100 }): unknown` at the tokenizer boundary before handing untrusted JSON to `canonicalize()`. Direct `JSON.parse` of untrusted input is a spec violation: `JSON.parse` has no depth ceiling and a depth-10⁶ input stack-overflows the V8 parser before C-10 ever runs — consuming the DoS budget at the wrong layer. `safeParse` rejects at the tokenizer with `E_DEPTH` in ≤1ms and does not recurse. Applies to every untrusted-bytes boundary: `snap` promote/upload parsing `policy-ir.json`, `guardrails/audit.verify()` parsing persisted entries, any other caller that canonicalizes parsed-from-bytes input. |

Errors are a typed enum exported from the subpath:

```ts
export const CanonicalizeErrorCode = {
  NON_FINITE: 'E_NON_FINITE',
  UNDEFINED_IN_ARRAY: 'E_UNDEFINED_IN_ARRAY',
  BIGINT: 'E_BIGINT',
  NON_PLAIN_OBJECT: 'E_NON_PLAIN_OBJECT',
  DUPLICATE_KEY_AFTER_NFC: 'E_DUPLICATE_KEY_AFTER_NFC',
  NFKC_COLLAPSIBLE: 'E_NFKC_COLLAPSIBLE',
  DEPTH: 'E_DEPTH',
} as const;
export class CanonicalizeError extends Error { code: keyof typeof CanonicalizeErrorCode; }

export function safeParse(bytes: Uint8Array | string, options: { maxDepth: number }): unknown;
```

### `canonicalHash` output format

`canonicalHash(obj)` returns a prefixed string: `sha256-<base64url>`. The prefix is load-bearing — any future algorithm change (SHA-3, BLAKE3) is a major version bump AND produces a visually distinguishable prefix, so orphaned-vs-current hashes are obvious in logs. `canonicalHash` never emits a bare hex digest.

**Versioning**: strictest SemVer contract in the family. Any change that alters output bytes for any valid input is a major bump — even "bug fix" changes that bring output closer to RFC 8785 compliance, because they break `policyId` / `snapshotId` stability. A CI job `canonicalize-stability` runs the fixture vector set against the merge-base `canonicalize.ts` and the PR's; any vector producing different bytes without a major-bump fails the PR.

---

## Dependencies

Zero runtime deps. Zero `@microsoft/*` imports. CI-enforced.

---

## Versioning

Semver across the whole package. Because `/canonicalize` carries a strict byte-stability contract, the package version conservatively bumps major when canonicalize output changes, even if `/path` and `/ast` are purely additive.

---

## Testing

- **L0 unit** — each subpath independently. URI round-trips, grammar round-trips, canonicalize against RFC 8785 test vectors.
- **L1 integration** — `/path` + `/ast` (classifier + parser consistency). `/canonicalize` byte-identicality across Linux / Windows / macOS on every PR (not nightly — this is the determinism-load-bearing invariant).
- **L2 E2E** — consumer-side: `@openclaw/policy` generate round-trip (canonical output stable across processes); `@openclaw/snap` promote precondition (re-canonicalize + re-hash); `@openclaw/guardrails/audit` chain-verify against re-canonicalized entries.

**Supported runtimes** (blocking matrix): Node 20 LTS + Node 22 LTS on Linux x64 + Windows x64 per-PR; macOS arm64 nightly against trunk. Bun and Deno are tracked as non-blocking informational matrix only — their `Number.prototype.toString` historically differs from V8 for subnormals and large-exponent edge cases, and we do not declare support until the full fixture set + 500 randomly-generated `AuditEntry` variants pass under the alternate runtime.

---

## Open items

- Whether `/canonicalize` should eventually split out as its own tiny package (`@openclaw/canonicalize`) if the family grows consumers outside the openclaw scope. Current shape keeps it in `/workspace` for one-install simplicity.
- Streaming canonicalize for very large AuditEntry batches — deferred to a future minor.
- Grammar dialect choice (peggy vs ts-pegjs vs canopy) for `/ast` — see main spec §9 (Open items).
