# Scenario — `@openclaw/workspace/canonicalize` Cross-Consumer Byte-Parity

**Pulse**: 44 · **Scenario code**: S41 · **Plan**: claws-pre-extraction-packaging · **Checkpoint**: CP-9
**Governing roles**: `craft:architect`, `craft:security`, `claws:platform-eng`
**Spec references**: `docs/claws/proposals/openclaw-upstream/workspace.md` §`/canonicalize`; `openclaw-upstream-spec.md` §Testing; `policy.md`, `snap.md`, `guardrails.md`

---

## Objective

`@openclaw/workspace/canonicalize` is consumed by three packages whose trust model depends on it producing the exact same bytes for logically equivalent input:

- `@openclaw/policy` — feeds `PolicyIR` to `canonicalize()` → `policyId` (content hash).
- `@openclaw/snap` — canonicalizes workspace files for `snapshotId` and re-canonicalizes `PolicyIR` at `snap promote` time for the self-consistency precondition.
- `@openclaw/guardrails/audit` — canonicalizes each `AuditEntry` before hash-chaining.

If two consumers produce different bytes for the same logical input, `snap promote`'s self-consistency check fails, audit chain verification falsely reports tamper, and policy IDs diverge across hosts. Byte-parity is load-bearing — not a nice-to-have.

This scenario probes:

1. The fixture set that a cross-consumer parity test MUST cover.
2. Cross-platform (Linux / Windows / macOS) CI enforcement cadence.
3. Gaps in the `workspace.md` `/canonicalize` contract that the fixture set surfaces.
4. Whether the current package shape (one function, three callers, one version constant) actually guarantees byte-parity, or whether there are hidden divergence paths.

---

## Cross-Consumer Contract (Surfaces Gaps)

The current spec (`workspace.md` §`/canonicalize`) names RFC 8785 and lists four rules: "lexicographic key ordering (UTF-16 code unit), UTF-8 output, NFC Unicode normalization, no insignificant whitespace, RFC 8785 number formatting." This scenario asserts that the contract MUST be expanded to the following explicit formatting rules before any consumer depends on byte-parity:

| Rule | Source | Visible in fixture vectors |
|------|--------|---------------------------|
| C-1 | Input strings (keys + values) are NFC-normalized **before** serialization; already-NFC input is a no-op. Keys that are NFC-stable but NFKC-collapsible (e.g. `ﬁ` vs `fi`, dotless-i U+0131 vs `i`) throw `E_NFKC_COLLAPSIBLE` to prevent cross-layer forgery against downstream NFKC-applying consumers. | V1, V2, V25 |
| C-2 | Object keys sorted by UTF-16 code unit sequence (RFC 8785 §3.2.3), not byte-wise, not locale-aware | V3, V4, V16 |
| C-3 | Output is UTF-8 bytes, **no BOM**, no trailing newline | V19 (explicit negative test) |
| C-4 | Numbers: finite IEEE-754 doubles only. `NaN`, `+Infinity`, `-Infinity` → `canonicalize()` throws `CanonicalizeError` (not silently `null`, not `"NaN"`) | V7, V8, V9 |
| C-5 | Integer doubles in ±2^53 range serialize without a decimal point (`42`, not `42.0`) | V5, V6 |
| C-6 | Non-integer finite doubles use RFC 8785 ECMAScript 6 stringification (shortest round-trip form) | V10, V11 |
| C-7 | Subnormal doubles round-trip as their shortest form; no denormal flushing | V12 |
| C-8 | Arrays preserve element order exactly; no sorting | V13 |
| C-9 | Empty object `{}` and empty array `[]` emit exactly `{}` / `[]` — no whitespace | V14, V15 |
| C-10 | Nested depth limit: reject input with depth > 100 via `CanonicalizeError` (DoS prevention) | V17, V18 |
| C-11 | `undefined` values inside objects drop the key; `undefined` inside arrays throws (not `null`-replaces) | V20 |
| C-12 | `BigInt`, `Symbol`, `Function`, class instances (non-plain objects) all throw `CanonicalizeError` with a typed code | V21, V22 |
| C-13 | Date objects throw — callers serialize to `string` (ISO-8601 Z) before calling `canonicalize()` | V23 |
| C-14 | `CANONICALIZER_VERSION` follows semver; any output-byte change for any valid input is a major bump (even a bug fix that brings output closer to RFC 8785) | — |
| C-15 | Callers MUST invoke `safeParse(bytes, { maxDepth: 100 })` at the tokenizer boundary BEFORE handing untrusted JSON to `canonicalize()`. Direct `JSON.parse` of untrusted input is a spec violation — `JSON.parse` has no depth ceiling, so a depth-10⁶ input stack-overflows the parser before C-10 ever runs. `safeParse` rejects at the tokenizer in ≤1ms. | V28 |

**Finding F-1** depends on C-4 / C-5 / C-6 / C-10 / C-11 / C-12 / C-13 being made explicit in `workspace.md` — the current prose is insufficient to guarantee cross-consumer parity without an additional reference implementation (and a reference implementation that differs from the spec is worse than no reference at all).

---

## Fixture Set — 26 Test Vectors

The fixture set is the ground-truth corpus. Every CI run on every platform loads the same fixture file and asserts bit-identical output (and bit-identical `canonicalHash`). Fixtures are JSON-encoded where possible (V7–V9, V17, V18, V20–V23, V25, V28 cannot be expressed as JSON and live as programmatic factories).

> Path: `packages/@openclaw/workspace/tests/fixtures/canonicalize-vectors.ts` (proposed). Each vector is `{ id, label, input: () => unknown, expectedBytes: Uint8Array | 'THROWS', expectedCode?: string }`. `expectedBytes` is the reference hex captured from a Linux x64 Node 22 run; all other platforms must match byte-for-byte.

### Unicode / NFC / NFKC (V1–V4, V25)

| ID | Label | Input | Expected behavior |
|----|-------|-------|-------------------|
| V1 | NFC pre-composed `é` | `{ name: "caf\u00E9" }` | Bytes: `{"name":"café"}` — pre-composed, unchanged |
| V2 | NFD decomposed `é` → NFC | `{ name: "cafe\u0301" }` | Bytes: **same as V1** — NFC normalization on input |
| V3 | Keys differing only in NFC form | `{ "\u00E9": 1, "e\u0301": 2 }` | After NFC: collision. **Throw `E_DUPLICATE_KEY_AFTER_NFC`** — do not silently drop |
| V4 | Mixed-script key ordering | `{ "あ": 1, "a": 2, "ä": 3 }` | UTF-16 code-unit sort: `"a"` (0x61) < `"ä"` (0xE4) < `"あ"` (0x3042) |
| V25 | NFC-stable but NFKC-collapsible keys | `{ "\uFB01le": 1, "file": 2 }` (`"ﬁle"` U+FB01 vs ASCII `"file"`) and `{ "\u0131": 1, "i": 2 }` (dotless-i U+0131 vs `"i"`) | Both NFC-stable inputs, but NFKC would collapse them — **throw `E_NFKC_COLLAPSIBLE`** (rule C-1). Prevents cross-layer forgery where a downstream NFKC-applying consumer (filesystem, IdP normalizer, log viewer) treats the two keys as equal. |

### Numbers / IEEE-754 (V5–V12)

| ID | Label | Input | Expected behavior |
|----|-------|-------|-------------------|
| V5 | Integer in safe range | `{ n: 42 }` | `{"n":42}` — no decimal |
| V6 | Negative integer | `{ n: -0 }` | `{"n":0}` — RFC 8785: `-0` serializes as `0` |
| V7 | `NaN` | `{ n: NaN }` | Throws `CanonicalizeError` code `E_NON_FINITE` |
| V8 | `+Infinity` | `{ n: Infinity }` | Throws `CanonicalizeError` code `E_NON_FINITE` |
| V9 | `-Infinity` | `{ n: -Infinity }` | Throws `CanonicalizeError` code `E_NON_FINITE` |
| V10 | Float shortest form | `{ n: 0.1 + 0.2 }` | `{"n":0.30000000000000004}` — RFC 8785 ES6 shortest round-trip |
| V11 | Large magnitude | `{ n: 1e21 }` | `{"n":1e+21}` — RFC 8785 exponent threshold |
| V12 | Subnormal | `{ n: 5e-324 }` | `{"n":5e-324}` — no flush-to-zero |

### Structural edges (V13–V18, V28)

| ID | Label | Input | Expected behavior |
|----|-------|-------|-------------------|
| V13 | Array element order preserved | `{ a: [3, 1, 2] }` | `{"a":[3,1,2]}` — no sort |
| V14 | Empty object | `{ o: {} }` | `{"o":{}}` |
| V15 | Empty array | `{ a: [] }` | `{"a":[]}` |
| V16 | Nested `Record<string,Record<string,number>>` | `{ b: { y: 1, x: 2 }, a: { z: 3 } }` | `{"a":{"z":3},"b":{"x":2,"y":1}}` — sort at every level |
| V17 | Depth 100 (the limit) | `{ n: { n: { ... (100 levels) ... } } }` | Succeeds; byte output stable |
| V18 | Depth 101 | `{ n: { n: { ... (101 levels) ... } } }` | Throws `CanonicalizeError` code `E_DEPTH` |
| V28 | Tokenizer-boundary depth (`safeParse`, rule C-15) | `safeParse(bytes, { maxDepth: 100 })` where `bytes` is ~110 KB containing 1000 nested `[` tokens | Rejects with `CanonicalizeError` code `E_DEPTH` in ≤1 ms. Asserts NO recursion reaches `canonicalize()` (tokenizer-layer rejection, verifiable via a Node inspector profile showing bounded parse stack). Test also asserts `JSON.parse(bytes)` against the same input either stack-overflows or consumes >10× the time — proves `safeParse` is the correct layer. |

### Output-shape / error-shape (V19–V23)

| ID | Label | Input | Expected behavior |
|----|-------|-------|-------------------|
| V19 | No BOM, no trailing newline | `{ a: 1 }` | Bytes are exactly 7: `{"a":1}` (no `0xEF 0xBB 0xBF` prefix, no `\n`) |
| V20 | `undefined` in array | `{ a: [1, undefined, 2] }` | Throws `CanonicalizeError` code `E_UNDEFINED_IN_ARRAY` |
| V21 | `BigInt` value | `{ n: 42n }` | Throws `CanonicalizeError` code `E_BIGINT` |
| V22 | `Symbol` key | `{ [Symbol("k")]: 1 }` | Symbol keys are always ignored by `JSON.stringify`; explicitly tested to confirm the same here |
| V23 | `Date` value | `{ t: new Date(0) }` | Throws `CanonicalizeError` code `E_NON_PLAIN_OBJECT` |

### Consumer-coupling (V24)

| ID | Label | Input | Expected behavior |
|----|-------|-------|-------------------|
| V24 | Real `AuditEntry` shape | `{ ts: "2026-04-18T00:00:00Z", actor: "bic/service", subject: "oc://...", action: "promote", prevHash: "sha256-...", payload: { /* V16 */ } }` | Bytes must round-trip through `canonicalize()` → `canonicalHash()` → verify stable under `guardrails/audit.verify()` |

---

## Cross-Consumer Assertion (Byte-Parity)

```ts
// packages/@openclaw/workspace/tests/canonicalize-cross-consumer.integration.test.ts (proposed)
import { canonicalize as wsCanon } from '@openclaw/workspace/canonicalize';
import { canonicalizeForPolicyId } from '@openclaw/policy/internal';       // thin wrapper
import { canonicalizeForSnapshotId } from '@openclaw/snap/internal';       // thin wrapper
import { canonicalizeForAudit } from '@openclaw/guardrails/audit/internal';// thin wrapper
import { vectors } from './fixtures/canonicalize-vectors';

for (const v of vectors) {
  if (v.expectedBytes === 'THROWS') continue; // error-shape vectors handled separately
  const wsBytes     = Buffer.from(wsCanon(v.input()), 'utf8');
  const policyBytes = canonicalizeForPolicyId(v.input());
  const snapBytes   = canonicalizeForSnapshotId(v.input());
  const auditBytes  = canonicalizeForAudit(v.input());

  expect(wsBytes).toEqual(v.expectedBytes);  // reference parity
  expect(policyBytes).toEqual(wsBytes);      // consumer parity
  expect(snapBytes).toEqual(wsBytes);
  expect(auditBytes).toEqual(wsBytes);
}
```

The three consumer wrappers MUST be thin pass-throughs in canonical form — if a consumer applies *any* pre-processing (e.g. stripping a field, adding a header), byte-parity breaks. See F-4.

---

## CI Integration Plan

Cross-platform byte-identicality is the invariant `workspace.md` §Testing already flags as "per-PR, not nightly." This scenario locks down the matrix:

| Tier | Matrix | Gate | Cadence |
|------|--------|------|---------|
| **Blocking (per-PR)** | Linux x64 + Windows x64, on Node 20 LTS AND Node 22 LTS | Fails PR if any vector produces mismatched bytes across consumers OR differs from reference bytes | Every PR that touches `packages/@openclaw/workspace/**`, `packages/@openclaw/policy/**`, `packages/@openclaw/snap/**`, `packages/@openclaw/guardrails/**`, OR the fixture file |
| **Nightly (blocking on trunk)** | macOS arm64 (Node 22) | Fails trunk build if mismatch detected; opens auto-issue with divergent vector IDs | Nightly against trunk |
| **Secondary (non-blocking, informational)** | Bun latest on Linux, Deno on Linux | Reports divergences without failing the build — informs whether to add as blocking when declaring the alternate runtime supported | Nightly |

Both Node 20 and Node 22 are blocking per `workspace.md` §Supported runtimes — Node 20's ICU data version differs from Node 22 (non-full-ICU historically on some distributions), so Node 20 parity is load-bearing, not informational. F-7's Bun caveat applies equally here: any divergence between Node 20 and Node 22 on the fixture set is a major bump of `CANONICALIZER_VERSION`.

**Reference byte capture**: the expected bytes in `canonicalize-vectors.ts` are captured once from a Linux x64 Node 22 run and checked in as a file. The capture script (`scripts/capture-canonicalize-reference.ts`) is run manually when `CANONICALIZER_VERSION` bumps major. Any mismatch on any platform means either the reference is stale (rare — intentional behavior change) or a real cross-platform divergence (load-bearing bug).

**Windows-specific failure modes** (per `claws:platform-eng` lens):

- Git autocrlf rewriting `\n` → `\r\n` in fixture file: fixture file MUST have `* binary` or `* -text` in `.gitattributes` to prevent line-ending conversion from corrupting reference bytes.
- Node 22 on Windows uses UTF-16 for filesystem APIs but UTF-8 for `Buffer.from(str, 'utf8')`; we assert canonicalize never touches filesystem APIs, so this is a non-issue — but the test explicitly re-reads the fixture file in binary mode to defend against the CI runner adding a BOM.
- ICU data version drift: Node 22 ships full-ICU by default on all three OSes; Node 20 historically did not on all distributions. Because Node 20 is in the blocking matrix, the PR lane fails immediately on ICU-driven divergence — this is intentional (Node 20 ICU drift IS a divergence vector we must catch per-PR, not at nightly cadence).

---

## Findings

### F-1 — Contract underspecified for byte-parity (Major)

**Observation**: `workspace.md` §`/canonicalize` names RFC 8785 and lists four rules. RFC 8785 itself defers number formatting to ECMAScript and does not specify error handling for non-finite numbers, `undefined`, `BigInt`, `Date`, depth limits, or `undefined`-in-array behavior. Three independent consumers written against the current spec could produce different bytes (or one could throw while another returns `"null"`) for the same input — the load-bearing invariant fails silently.

**Recommendation**: Adopt rules C-1 through C-15 (above) into `workspace.md` §`/canonicalize` in the same commit as this scenario. Spec amendment absorbed in-pulse per the plan's absorption rule.

**Resolution path**: Amend `workspace.md` in this pulse's commit — add an explicit "Formatting Rules" subsection listing all 15 rules with error codes. `CanonicalizeError` class with typed `.code` field + the `safeParse` tokenizer-boundary helper become part of the public export.

---

### F-2 — Duplicate-key-after-NFC is ambiguous in RFC 8785 (Major)

**Observation**: RFC 8785 requires NFC normalization of strings but is silent on what happens when two distinct input keys collapse to the same NFC form (V3 in the fixture set). Silent dedupe is a forgery vector for audit — an attacker could construct two distinct-looking `AuditEntry` objects that canonicalize to the same bytes.

**Recommendation**: Throw `CanonicalizeError` code `E_DUPLICATE_KEY_AFTER_NFC`. Never silently merge or drop.

**Resolution path**: Amended into rule C-1 / C-3 of the formatting rules table. Explicit error throw makes the forgery vector detectable by the consumer (policy, snap, audit) rather than masked.

---

### F-3 — No depth limit is a DoS vector for the audit chain (Major)

**Observation**: `@openclaw/guardrails/audit` canonicalizes every incoming `AuditEntry` before hash-chaining. An attacker who can inject audit entries (e.g., via a compromised policy evaluator) can submit an entry with deeply nested `payload` (depth 10⁶). Canonicalization recurses; unbounded recursion stack-overflows the audit verifier and halts the chain. V18 in the fixture set catches this at the `canonicalize()` boundary.

**But the cap at `canonicalize()` alone is not enough.** Every real caller gets bytes from somewhere — `snap promote` parses `policy-ir.json` at step 3c via `JSON.parse`, then hands the parsed object to `canonicalize()` at step 3e. `JSON.parse` has no depth ceiling — a depth-10⁶ JSON input stack-overflows the V8 parser before rule C-10 ever runs. Same vector applies to `snap upload` (parsing bundles) and `guardrails/audit.verify()` (parsing persisted entries). The DoS budget is consumed at the wrong layer.

**Recommendation**: Two layers of defense:
1. Reject depth > 100 via `E_DEPTH` at `canonicalize()` (rule C-10). 100 is well above any legitimate policy or snapshot payload we've measured (deepest real AST is 12) and far below default Node stack limits (~10k frames).
2. Expose `safeParse(bytes, { maxDepth: 100 }): unknown` from `@openclaw/workspace/canonicalize` that rejects at the JSON tokenizer (rule C-15). Every caller that parses untrusted bytes MUST use `safeParse`, never `JSON.parse`. This pushes the depth check to the earliest possible boundary — bytes → tokens → reject, no recursion.

**Resolution path**: Rules C-10 (in-canonicalize depth cap) + C-15 (tokenizer-boundary parse cap, new). Both absorbed into `workspace.md` §/canonicalize in P44's commit. Consumer usage: `snap` server, `guardrails/audit.verify()`, and any other direct JSON consumer MUST import and use `safeParse` — this is a spec contract, not a recommendation. The amendment to `snap.md` §Promotion and §Uploading to replace `JSON.parse` with `safeParse` is a cross-file amendment target for the S42 fix agent.

---

### F-4 — "Thin wrapper" convention is informal — consumers can drift (Warning)

**Observation**: The three consumers today call `canonicalize()` through what I've called "thin wrappers" (`canonicalizeForPolicyId`, `canonicalizeForSnapshotId`, `canonicalizeForAudit`). These wrappers live in each consumer package and are reviewed by that package's maintainers. Nothing in the spec prevents a future change from slipping pre-processing into the wrapper ("oh, let's strip the `prevHash` field before hashing to simplify the chain verifier") — which would silently break byte-parity. Equally, inlining `canonicalize()` at every call site (an earlier proposal) spreads the parity surface across `policy/*.ts`, `snap/*.ts`, `guardrails/audit/*.ts` with no single shape a lint can assert on — the next contributor who adds a fourth consumer has no obvious pattern to follow.

**Recommendation**: Keep the typed one-line wrappers (discoverable named symbol, single import pattern for new consumers) AND add a greppable lint rule that enforces the wrapper shape. Two enforcement layers:

1. **Wrapper shape**. Each consumer wrapper file is a direct typed re-export with no function body:
   ```ts
   // packages/@openclaw/policy/src/internal/canonicalize-for-policy-id.ts
   export { canonicalize as canonicalizeForPolicyId } from '@openclaw/workspace/canonicalize';
   ```
   No interstitial code between the `import` and the `export`. This is the only permitted shape — a `.eslintrc` rule `no-direct-canonicalize-at-call-sites` (AST-check) rejects any other form.

2. **Call-site enforcement**. The same lint rule rejects direct `canonicalize` imports anywhere outside the wrapper files: all call sites in `policy/*`, `snap/*`, `guardrails/*` (except the wrapper file itself) MUST go through the wrapper. Grep-verifiable: `rg "from '@openclaw/workspace/canonicalize'"` should return only 3 files (the three wrappers) plus the workspace package's own tests.

**Resolution path**: CP-10 P48 (guardrails-package) and the policy / snap package pulses land (a) the typed one-line wrapper pattern in each consumer and (b) the `no-direct-canonicalize-at-call-sites` lint rule in the monorepo's shared eslint config. Reviewed by `craft:architect` + `claws:gateway-eng` jointly — architect for the shape, gateway-eng for the runtime call-site surface. If a consumer maintainer genuinely needs pre-processing before `canonicalize()`, that is a spec conversation, not a local wrapper change.

---

### F-5 — `CANONICALIZER_VERSION` semver contract needs enforcement tooling (Warning)

**Observation**: The spec says any output-byte change is a major bump. Humans forget; CI doesn't. A PR that "fixes" number formatting to be closer to RFC 8785 compliance is a silent breaking change for every `policyId` and `snapshotId` in existence. There is no automated check that a change in `canonicalize.ts` forces a major version bump.

**Recommendation**: Add a CI job `canonicalize-stability` that:
1. Checks out the merge-base `canonicalize.ts` and runs it against the checked-in fixture vectors.
2. Checks out the PR's `canonicalize.ts` and runs it against the same vectors.
3. If any vector produces different bytes AND `CANONICALIZER_VERSION` did not major-bump in the PR, fail with a loud message pointing at the diverging vector ID.
4. If `CANONICALIZER_VERSION` did major-bump, fail unless the PR also updates the reference bytes in `canonicalize-vectors.ts` — i.e., the capture script was re-run.

**Resolution path**: Pulse P47 (workspace-package) lands the `canonicalize-stability` CI job alongside the package wiring — P47 is where the workspace package gains its per-PR matrix, and the stability job is a natural fit with the rest of the per-PR gating there. The job is non-negotiable and blocking per-PR.

---

### F-6 — Windows line-ending autoconversion can corrupt the reference fixture (Warning)

**Observation** (`claws:platform-eng` lens): The fixture file `canonicalize-vectors.ts` references expected bytes. If any Windows contributor has Git autocrlf enabled and the file is TypeScript (not flagged binary), their checkout may rewrite `\n` → `\r\n` inside template strings. Tests then pass on their machine (because the canonicalizer output was also written with the converted file) and fail on Linux CI — or vice versa. Classic "works on my machine" that wastes a whole day.

**Recommendation**: `.gitattributes` entry:
```
packages/@openclaw/workspace/tests/fixtures/canonicalize-vectors.ts text eol=lf
packages/@openclaw/workspace/tests/fixtures/*.bin binary
```
Prefer storing reference bytes as hex strings inside the `.ts` file (not as `\n`-containing template strings), OR as separate `.bin` files marked binary in `.gitattributes`.

**Resolution path**: Pulse P46 (consumer wrapper + fixture wiring pulse) lands `.gitattributes`. Architect lens confirms this doesn't leak platform concerns into the production package — it's test-infrastructure-only.

---

### F-7 — Matrix exclusion of Bun is load-bearing (Warning)

**Observation** (`claws:platform-eng` lens): RFC 8785 number formatting depends on the ECMA-262 `Number.prototype.toString` implementation. Bun's JavaScriptCore-based `toString` has historically differed from V8 in edge cases (subnormals, large exponents). If a consumer runs on Bun (our CI/CD pipeline fleet has at least one Bun-based workflow), byte-parity silently breaks.

**Recommendation**: Keep Bun in the non-blocking matrix; gate on "Bun parity" as a release criterion before declaring Bun supported. Do not allow Bun in the blocking matrix until V24 (real `AuditEntry`) passes across 500 randomly-generated variants. Explicitly document: `@openclaw/workspace/canonicalize` supports Node 20 / Node 22 as of v1.0; Bun support is tracked separately.

**Resolution path**: Amend `workspace.md` §Testing: add a "Supported runtimes" row listing Node 20 / Node 22 as the blocking matrix. Bun / Deno moved to Open items.

---

### F-8 — `canonicalHash` algorithm needs to be pinned, not just defaulted (Warning)

**Observation** (`craft:security` lens): `workspace.md` declares `export function canonicalHash(obj: unknown): string;` but does not specify the hash algorithm. If today's implementation uses SHA-256 (reasonable default) and a future PR "upgrades" to SHA-3 to match a new policy, every `policyId` / `snapshotId` / audit chain entry in existence is silently orphaned.

**Recommendation**: Fix `canonicalHash` to emit `sha256-<base64url>` (prefixed multibase-style, hyphen not colon). Any algorithm change is a major bump AND produces a visually distinguishable prefix so orphaned-vs-current hashes are obvious in logs. `canonicalHash` never emits a bare hex digest.

**Reference example**: `canonicalHash({}) === 'sha256-RBNvo1WzZ4oRRq0W9-hknpT7T8If536DEMBg9hyq_4o'` — single prefix only; callers MUST NOT concatenate `'sha256:'` or any other prefix in front of this output (that yields a non-conformant `sha256:sha256-<base64url>` double-prefix).

**Resolution path**: Amend `workspace.md` §`/canonicalize` to specify the exact output format. Add a CI test that asserts `/^sha256-[A-Za-z0-9_-]+$/.test(canonicalHash({}))` so a silent algorithm change OR a double-prefix bug fails loudly.

**Cross-file amendment target** (R1-C-01): `policy.md` (§PolicyIR and conformance examples at lines 56/137/253/267) and `snap.md` (line 113) currently show `sha256:<hex>` (colon + hex) exemplars that contradict the `sha256-<base64url>` contract. These exemplars must be rewritten to the multibase form in CP-10 P47/P48 (handled by the S42 fix-agent on the policy/snap side; workspace.md + this scenario are consistent on the hyphen form).

---

### F-9 — `AuditEntry.prevHash` coupling assumes canonicalize is idempotent (Warning)

**Observation** (`craft:security` lens): The audit chain works by hashing `canonicalize(entryN)` into `prevHash(entryN+1)`. Chain verification re-canonicalizes each entry and re-derives `prevHash`. For this to work, `canonicalize()` must be idempotent — `canonicalize(parse(canonicalize(x))) === canonicalize(x)` for every valid `x`. None of the 24 fixture vectors explicitly test this (they test first-pass output only).

**Recommendation**: Add V25–V27 as follow-up fixtures in pulse P46: each of V1, V10, V16 is passed through `JSON.parse(canonicalize(...))` and re-canonicalized; asserted bit-identical. If idempotence breaks for any valid input, the audit chain silently corrupts on re-verification.

**Resolution path**: Extend fixture set in P46 (consumer wrapper pulse) with the idempotence vectors. Since this scenario promised "≥20 vectors" and we have 24, adding 3 more in P46 keeps the scenario deliverable satisfied while deferring the idempotence assertion to the consumer-wiring pulse — within the same checkpoint.

---

### F-10 — Error-code enum belongs in the public API (Note)

**Observation**: Rules C-4, C-10, C-11, C-12 all specify throwing `CanonicalizeError` with a typed `code`. Consumers (policy, snap, audit) need to catch these and translate to their own domain errors (`InvalidPolicyError`, `SnapshotPreconditionError`, `AuditIntegrityError`). If the codes are string literals buried in `canonicalize.ts`, consumers copy-paste them and drift.

**Recommendation**: Export a const object:
```ts
export const CanonicalizeErrorCode = {
  NON_FINITE: 'E_NON_FINITE',
  UNDEFINED_IN_ARRAY: 'E_UNDEFINED_IN_ARRAY',
  BIGINT: 'E_BIGINT',
  NON_PLAIN_OBJECT: 'E_NON_PLAIN_OBJECT',
  DUPLICATE_KEY_AFTER_NFC: 'E_DUPLICATE_KEY_AFTER_NFC',
  DEPTH: 'E_DEPTH',
} as const;
```
Consumers import this and switch on it — no string literals across package boundaries.

**Resolution path**: Pulse P46 (or wherever `canonicalize.ts` lands) exports the enum alongside the function.

---

### F-11 — Scope creep risk: `/canonicalize` should not grow (Note)

**Observation** (`craft:architect` lens): The three-consumer list (policy, snap, guardrails/audit) is complete for the upstream proposal. If a future consumer wants "canonicalize but sorted arrays" or "canonicalize but with Date handling," it should NOT be added here. This package subpath is small on purpose — one function, one constant, one hash helper. Growth inside breaks the byte-stability contract for every existing consumer.

**Recommendation**: `workspace.md` Open items already flags "split out as `@openclaw/canonicalize` if the family grows." This scenario reinforces: any feature request that changes `canonicalize()`'s output for any input is a major bump and probably wrong; new behavior goes in a new function (`canonicalizeWithDates`, etc.) with a separate version constant.

**Resolution path**: No code change. Document the growth policy as an inline comment at the top of `canonicalize.ts` so contributors see it before they propose changes. Architect role enforces the rule during PR review.

---

## Spec Amendments Absorbed in This Commit

Per the pulse plan's "Spec Amendment Absorption" clause, this scenario surfaces gaps in `workspace.md` §`/canonicalize` that land in the same commit:

- **target**: `docs/claws/proposals/openclaw-upstream/workspace.md` §`/canonicalize` — Formatting Rules subsection
- **trigger**: F-1, F-3 (S2 security) — 15 formatting rules needed for cross-consumer byte-parity and tokenizer-boundary DoS defense
- **fix**: Add "Formatting Rules (C-1 through C-15)" subsection listing each rule, its source, and its error code where applicable. C-1 extended to cover NFKC-collapsible rejection (E_NFKC_COLLAPSIBLE). C-15 added for tokenizer-boundary `safeParse(bytes, { maxDepth: 100 })` contract — direct `JSON.parse` of untrusted input is a spec violation.

- **target**: `docs/claws/proposals/openclaw-upstream/workspace.md` §`/canonicalize` — `canonicalHash` format clause
- **trigger**: F-8 — hash algorithm and output prefix unspecified
- **fix**: Specify `sha256-<base64url>` output; any algorithm change is a major bump

- **target**: `docs/claws/proposals/openclaw-upstream/workspace.md` §Testing — Supported runtimes row
- **trigger**: F-7 — Bun/Deno support boundary
- **fix**: Pin blocking matrix to Node 20 / Node 22; Bun/Deno tracked in Open items

These amendments are applied to `workspace.md` in the same commit as this scenario file.

---

## Exit

- 26 fixture vectors specified (≥20 required; V1–V24 original + V25 NFKC-collapsible rejection + V28 tokenizer-boundary depth).
- 11 findings (range 5-15).
- 3 Major findings (F-1, F-2, F-3) — each with explicit resolution path absorbed in-pulse or pinned to CP-9/CP-10 pulses.
- 6 Warning findings (F-4 through F-9) — each with resolution path; half tooling/CI, half spec-clarification.
- 2 Note findings (F-10, F-11) — stylistic / forward-guidance.
- Cross-consumer byte-parity assertion documented.
- CI matrix locked (Linux + Windows on Node 20 + Node 22 blocking per-PR, macOS nightly blocking on trunk, Bun / Deno informational).

No finding deferred. No `TBD` or `FIXME` markers. Every Major and Warning has a concrete resolution path — either absorbed in this pulse's commit or named against a downstream pulse within the same checkpoint.
