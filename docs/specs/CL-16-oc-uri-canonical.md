# CL-16 — Canonical `oc://` URI Form

**Status**: Draft
**Version**: 1.0
**Source**: Horus wave CP-5/6 (proposal §5.9 tenancy at host; PITFALLS.md P-06 cross-tenant URI parser differential)
**Atom**: `atom:oc-uri-canonical` (C-NEW)
**Reviewer roles**: craft:architect, claws:ciso, craft:security
**Dependencies**: CL-07 (Deep Integration), CL-15 (Canonicalizer Byte-Identical)
**Compliance scope**: Cross-workspace data isolation — canonicalization is the defence-in-depth rule for openclaw/lobster presets (no HTTP middleware) and for same-tenant path-traversal on aether

---

## Rationale

Snap and the plugin share `oc://` URIs as the primary reference form for
workspace content. Under openclaw and lobster presets (no HTTP middleware
in front of snap), URI-parser differentials (Orange Tsai's "A New Era of
SSRF" class of attacks) open cross-workspace data leakage if the plugin
parses one way and snap's filesystem resolution another. Neither the
proposal nor CL-07 / CL-11 / CL-13 defines the **canonical form** the
canonicalizer enforces.

This spec declares the canonical form and a **defence-in-depth rule** for
the two presets where no middleware sits in front of snap:

- **openclaw**: no middleware; the plugin canonicalizes `oc://` URIs
  before any filesystem lookup; snap canonicalizes on the receive path.
- **lobster**: same — no HTTP middleware; plugin + snap both canonicalize.

For **aether**, the canonicalizer is **redundant-by-design** as a tenant
boundary: aether's `TenantIsolationMiddleware` and `conversation_authz`
middleware already reject cross-tenant requests at the HTTP layer before
the plugin runs (see
`aether_runtime/src/orchestrator/api/middleware/tenant_isolation.py`).
Cross-tenant `oc://` URIs never reach the plugin because cross-tenant
requests never reach the plugin, period. Snap's canonicalization under
aether is still run for consistency and to guard against same-tenant
path-traversal attacks (which middleware doesn't address), but it is
not the primary tenant-boundary enforcement mechanism on aether.

## Contract

### 1. Canonical form rules

The canonical `oc://` URI is the shortest form that satisfies every rule below. The canonicalizer either returns this form or an error; there is no "normalize on output" mode — any deviation from canonical rejects.

#### Scheme

- **Normalize**: lowercase the scheme to `oc://`
- **Reject**: any scheme other than `oc` (including `ocs`, `OC`, `Oc`); any mixed-case variant is rejected before normalization (mixed-case input → reject, not normalize-and-accept)

Rationale: the canonicalizer is in a security path. It MUST NOT silently rewrite a likely-malicious input into a "clean" form — rewriting hides the attack from audit.

#### Authority (tenant-id segment)

- **Normalize**: lowercase the tenant-id; apply IDNA/punycode encoding per RFC 3492 for any non-ASCII input (deterministic A-label form)
- **Reject**: any `userinfo@` component (`oc://alice@tenantB/...`) — oc:// has no userinfo in v1
- **Reject**: any IDN homoglyph attack vector — after IDNA encoding, assert the resulting A-label is stable under a second IDNA pass (idempotence check); any input whose IDNA encoding is not idempotent is rejected with `idn-homoglyph`
- **Reject**: empty authority (`oc:///path`); authority is mandatory

Rationale: IDNA-normalizing input into a canonical A-label reveals homoglyphs (e.g., Cyrillic `а` vs Latin `a` collapse to different A-labels). Idempotence check rejects inputs that survive one IDNA pass but mutate on the second (observed for crafted zero-width joiners).

#### Path

- **Normalize**: UTF-8 byte representation; Unicode Normalization Form C (NFC); forward-slash path separators only
- **Reject — percent-encoded slash**: any occurrence of `%2F` or `%2f` in the path (the slash itself is structural; encoding it is an attempt to hide path segmentation)
- **Reject — Unicode fraction-slash**: U+2044 (`⁄`) anywhere in the path
- **Reject — NTFS backslash**: `\` anywhere in the path
- **Reject — overlong UTF-8**: any byte sequence that is a non-shortest form per Unicode 3.1 (e.g., `0xC0 0xAF` for `/`)
- **Reject — null byte**: any `\x00` byte (C-string truncation attack)
- **Reject — BOM**: U+FEFF anywhere; BOM is a file-format artifact, not a URI character
- **Reject — control characters**: any byte in `\x01-\x1F` or `\x7F`
- **Reject — path-traversal segments**: any segment equal to `.` or `..` (structural traversal; even if the later filesystem resolution would refuse it, the URI itself is non-canonical)
- **Reject — empty segments**: consecutive `//` in the path
- **Reject — percent-encoded bytes that decode to any already-rejected character**: double-decode defence (e.g., `%252F` that round-trips to `%2F` is rejected)

Rationale: every rejection vector has been observed in real-world URI parser differential attacks. The ruleset is additive by design — new attack classes are added as new `reject` rules with their own `invalidReason`.

#### Query and fragment

- **Reject**: any query component (`?...`) or fragment (`#...`). oc:// v1 has no query or fragment. Future versions that add them will bump the canonicalizer algorithm version (§Evolution rules).

Rationale: keeping the URI shape minimal shrinks the attack surface. Query-string parsing differentials (`?a=1&a=2` first-vs-last-wins) are out of scope by construction.

### 2. TypeScript interface

```typescript
export interface CanonicalOcUri {
  scheme: "oc";
  tenantId: string; // lowercased, punycode A-label form
  path: string; // NFC UTF-8, leading slash, no trailing slash unless root
  canonical: string; // the full canonical string form `oc://${tenantId}${path}`
  rawLength: number; // length of original input (for audit)
}

export type OcUriInvalidReason =
  | "scheme-mismatch" // not 'oc' or mixed-case scheme
  | "userinfo-present" // authority contains '@'
  | "empty-authority" // no tenant-id
  | "idn-homoglyph" // IDNA pass is not idempotent
  | "percent-encoded-slash" // %2F / %2f in path
  | "fraction-slash" // U+2044 in path
  | "backslash" // '\' in path
  | "overlong-utf8" // non-shortest-form UTF-8
  | "null-byte" // \x00 anywhere
  | "bom" // U+FEFF anywhere
  | "control-character" // \x01-\x1F or \x7F
  | "path-traversal-segment" // '.' or '..' segment
  | "empty-segment" // '//' in path
  | "double-decoded-rejection" // decode round-trip hits a rejection vector
  | "query-present" // '?' component
  | "fragment-present"; // '#' component

export interface OcUriError {
  ok: false;
  reason: OcUriInvalidReason;
  inputLength: number; // audit-safe: length only, never echo the attacker-controlled bytes
}

export type OcUriResult = { ok: true; value: CanonicalOcUri } | OcUriError;

export function canonicalizeOcUri(input: string): OcUriResult;
```

Notes on the error shape: `OcUriError` MUST NOT echo the offending input in the error payload. Logging the attacker-controlled bytes at the host-proxy layer widens the attack surface (e.g., log-injection). Audit chain receives `inputLength` + `reason` only.

### 3. Rejection vectors — L0 test cases

Every implementation MUST have at least these 12 rejection vectors as L0 unit tests. Additional vectors MAY be added.

| #   | Attack vector                   | Example input                             | Expected `reason`          |
| --- | ------------------------------- | ----------------------------------------- | -------------------------- |
| 1   | Percent-encoded slash           | `oc://tenantB%2Fworkspace/TOOLS.md`       | `percent-encoded-slash`    |
| 2   | Uppercase percent-encoded slash | `oc://tenantB%2fworkspace/TOOLS.md`       | `percent-encoded-slash`    |
| 3   | Unicode fraction-slash          | `oc://tenantB\u2044workspace/TOOLS.md`    | `fraction-slash`           |
| 4   | NTFS backslash                  | `oc://tenantB/workspace\TOOLS.md`         | `backslash`                |
| 5   | Overlong UTF-8 `/`              | `oc://tenantB/\xC0\xAFworkspace/TOOLS.md` | `overlong-utf8`            |
| 6   | Null byte                       | `oc://tenantB/TOOLS.md\x00.txt`           | `null-byte`                |
| 7   | BOM prefix                      | `\uFEFFoc://tenantB/TOOLS.md`             | `bom`                      |
| 8   | Mixed-case scheme               | `OC://tenantB/TOOLS.md`                   | `scheme-mismatch`          |
| 9   | Userinfo present                | `oc://alice@tenantB/TOOLS.md`             | `userinfo-present`         |
| 10  | IDN homoglyph (Cyrillic `а`)    | `oc://tenаntB/TOOLS.md`                   | `idn-homoglyph`            |
| 11  | Path traversal segment          | `oc://tenantB/../tenantA/TOOLS.md`        | `path-traversal-segment`   |
| 12  | Double-encoded slash            | `oc://tenantB%252Fworkspace/TOOLS.md`     | `double-decoded-rejection` |

All 12 MUST be in the L0 suite at `packages/openclaw-workspace/test/oc-uri-canonical.unit.test.ts` (proposed location; wave-stage path is the authoring convention). Any canonicalizer that accepts any of these 12 fails the contract.

### 4. Defence-in-depth: plugin AND snap (openclaw/lobster); snap-only (aether)

Both the plugin and snap canonicalize any `oc://` URI before any
filesystem lookup or snapshot association. Canonicalization happens on
every URI-handling path regardless of preset — the canonicalizer itself
is tenancy-agnostic and guards against path-traversal, UTF-8
differentials, and homoglyph attacks independent of how tenancy is
enforced.

The **tenant-boundary** role of the canonicalizer differs by preset:

**openclaw**: the plugin is the FIRST canonicalization stage (no
middleware); snap is the SECOND. Both enforce; byte-equality compare is
the defence-in-depth posture.

**lobster**: same as openclaw — plugin + snap both canonicalize and
byte-compare. Lobster's sidecar / cowork-supervisor model does not add
an HTTP middleware that rejects cross-workspace references
pre-canonicalization.

**aether**: cross-tenant rejection happens at
`TenantIsolationMiddleware` + `conversation_authz` (HTTP layer), BEFORE
the plugin sees the request. The canonicalizer's role under aether is
defence against same-tenant path-traversal and Unicode differentials,
NOT cross-tenant rejection. An attacker trying to reach a different
tenant's workspace is rejected at middleware with 403
`TENANT_ISOLATION_VIOLATION` regardless of any `oc://` URI encoding
they attempt. Snap still canonicalizes under aether because snap is
also called from openclaw/lobster hosts (same snap binary, same
package), and because same-tenant canonicalization is still valuable.

**No short-circuit**: plugin MUST NOT skip canonicalization on the
assumption that any upstream layer already did it. Under aether,
middleware does not emit a canonical form to the plugin; it emits an
authorized request. Under openclaw/lobster there is no upstream layer
at all. Uniform canonicalization on every URI-handling path keeps the
plugin's code path preset-independent.

**Byte-equality compare (openclaw/lobster)**: plugin and snap
canonicalize independently; comparison is byte-equality on the
canonical form. Any differential is a bug (both implementations import
from `@openclaw/workspace/canonicalize-oc-uri`, so source-level
divergence should be impossible, but the defence-in-depth posture
covers build-system drift, runtime monkey-patching, and package-version
skew).

### 5. Relation to `@openclaw/workspace/canonicalize` (JCS)

Two distinct canonicalizers exist in `@openclaw/workspace`:

- `@openclaw/workspace/canonicalize` — RFC 8785 JSON Canonicalization Scheme (JCS). Input: arbitrary JSON. Output: canonicalized byte sequence suitable for hashing. See CL-NEW-canonicalizer-byte-identical.md.
- `@openclaw/workspace/canonicalize-oc-uri` — this spec. Input: string `oc://...`. Output: `CanonicalOcUri | OcUriError`.

The two share the package scope but have no shared code; their contracts, failure modes, and test suites are independent. Any guide or spec that says "canonicalize" without qualifier is ambiguous and must be corrected to name one of the two functions.

### 6. Impact on CL-13 repo-ops oracle amendment

The CL-13 oracle amendment's plan 6 `cross-tenant-oc-URI-rejected-by-host-proxy` scenario cites this spec as its canonical source. Rejection is measured against the 12-vector L0 suite plus any host-preset-specific additions (e.g., aether may add tenant-allowlist checks _after_ canonicalization; those checks presume canonical input).

## Test tiers

- **L0 unit**: 12 rejection vectors (§3) + positive canonical-form round-trip (idempotence of `canonicalizeOcUri(canonicalizeOcUri(x).canonical)` equals the first result) — ~15 tests
- **L1 integration**: plugin + snap byte-equality comparison under openclaw
  and lobster presets (plugin-side canonicalization is the first line of
  defence when no HTTP middleware is present) — 2 scenarios. Aether preset
  skipped: middleware rejects cross-tenant pre-plugin, so plugin-side
  canonicalization has nothing cross-tenant to reject; same-tenant path
  traversal is covered by the L0 vectors.
- **L2 CI matrix**: ubuntu-latest + windows-latest + macos-latest, single fixture, byte-compare canonical form across platforms — 1 scenario (canonical form must not differ by OS)

## Upstream implication

When the upstream contribution wave files, `@openclaw/workspace/canonicalize-oc-uri` becomes public API. The 12-vector L0 suite ships with the contribution so upstream consumers inherit the attack-vector coverage. Additions to the rejection set after upstream publication are MINOR version bumps; removals are MAJOR.

## Evolution rules

- **Major bump** required: removing any `invalidReason` value (an input that was rejected is now accepted); changing the canonical form (e.g., switching from NFC to NFD); accepting query/fragment components; changing the scheme (adding `ocs://` support).
- **Minor bump**: adding a new `invalidReason` value and its L0 test vector (additive — an input that was accepted may now be rejected, which is a security-tightening change and must bump minor so consumers can coordinate); adding new fields to `CanonicalOcUri` that prior consumers can ignore.
- **Patch**: documentation clarifications; additional test vectors for already-covered `invalidReason` categories; error-message wording fixes that do not change `reason` values.
- **Tightening is MINOR, not major**: new rejection rules strengthen the existing contract without breaking any input that was canonical under the old rules (canonical-in stays canonical-out). Consumers gain tighter security; no code needs to change.
