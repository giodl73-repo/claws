# pre-RFC: Snapshot contract for OpenClaw

**Status**: pre-RFC, seeking directional feedback before any PR opens
**Target channel**: `#clawtributors`
**Author**: giodl@microsoft.com (claws monorepo / Microsoft)
**Date**: 2026-04-29
**AI-assisted**: yes (planning agents for upstream-fit audit + drafting); per upstream PR rules
**Revision**: R1-amended 2026-04-29 (canonicalization, fail-closed, gateway-emitted audit, conformance, OcPath/SnapshotInternalPath split); R1-follow-on 2026-04-29 (audit stays downstream, `claws-guardrails` rename, `SnapshotErrorCode` enum, `OC_WORKSPACE_FILES` registry awareness)

## TL;DR

Proposing a small upstream addition: a `SnapshotStore` contract in `src/plugin-sdk/` (~30 LoC) + a reference plugin under `extensions/snapshot/` (~100 LoC) + an `openclaw snap` CLI verb (~150 LoC). **~280 LoC total** across three thin layers. Daemon-shape lives downstream as a `SnapshotStore` implementation; upstream gets the contract, a useful default, and a CLI for dev/staging. Snapshot IDs are content-addressed via RFC 8785 JSON Canonicalization Scheme; signing is performed by the gateway at capture time (single signer; not a Store concern); audit emission is the gateway's responsibility on every Store op (not a decorator); failure semantics are explicitly fail-closed.

## Problem

OpenClaw consumers (claws is the immediate one; lobster-web's UI is the end-user surface; future LSPs and agents are likely too) need snapshotting of OC-workspace state for: time-travel diff, undo/redo, audit-replay, and partial-restore. Today every consumer rolls their own — claws alone has two parallel implementations (~1556 LoC + ~1665 LoC) of the same domain. Without a contract upstream, snapshotting drifts per-consumer and can't be replaced or extended without forking each implementation.

## Why upstream?

A thin contract upstream prevents drift across consumers and lets the ecosystem agree on what a Snapshot **is** plus how to read content at a snapshot-internal path within it. This matches OpenClaw's documented "contract-first" precedent: `AGENTS.md:27` ("Core stays extension-agnostic. Extensions cross into core only via `openclaw/plugin-sdk/*`") and `docs/plugins/architecture.md:262-282` ("the first question is what is the core capability contract?"). Once the contract exists, plugins can register implementations and channel/feature plugins can consume them without each picking a fork-shape.

## Why NOT a top-level package

The natural urge would be to ship a snap daemon as `packages/snap/`. That breaks upstream's pattern — the existing three packages (`memory-host-sdk`, `plugin-package-contract`, `plugin-sdk`) are SDK/contract surfaces, none binds a port, none is a daemon. Daemons in OpenClaw exist, but as **plugins** that call `api.registerService(...)` + `api.registerHttpRoute(...)` to mount routes onto the gateway's existing HTTP listener (see `extensions/diagnostics-prometheus/index.ts:6-20` and `extensions/webhooks/index.ts:32-38`). The reference plugin in this proposal follows that precedent; the daemon-shape that wants its own port lives downstream as a `SnapshotStore` implementation.

## Proposed shape

### 1. The contract — `src/plugin-sdk/snapshot.ts` (~30 LoC)

```ts
// Note: this contract does NOT import OcPath. OcPath addresses live workspace
// files (the structured `oc://{file}/...` scheme with the 9-entry workspace-file
// registry); snapshot-internal addressing is a different concept (see below).

/** Opaque content-hash identifier; see "Snapshot ID generation" below. */
export type SnapshotId = string;

/**
 * Workspace root identifier. Distinct from `OcPath` (which addresses a file
 * INSIDE a workspace); a workspace root is the addressable scope that gets
 * captured. Implementations may map this to a directory, a tenant-scoped
 * namespace, an S3 prefix, etc.
 */
export type WorkspaceId = string;

/**
 * A path INSIDE a captured snapshot bundle. Distinct from `OcPath` (which
 * addresses live workspace files via the `oc://{file}/...` scheme with the
 * 9-entry workspace-file registry); snapshot-internal paths are POSIX-style
 * relative paths into the captured tree, e.g. `.openclaw/policy/policy-ir.json`.
 */
export type SnapshotInternalPath = string;

export interface Snapshot {
  readonly id: SnapshotId;
  readonly workspace: WorkspaceId;
  readonly capturedAt: string;  // ISO-8601
}

export interface SnapshotStore {
  capture(workspace: WorkspaceId): Promise<SnapshotId>;
  read(snap: SnapshotId, path: SnapshotInternalPath): Promise<Uint8Array>;
  list(workspace: WorkspaceId, opts?: { limit?: number }): Promise<readonly Snapshot[]>;
}
```

That's it. The contract takes a `WorkspaceId` (workspace-root identifier) for capture/list and a `SnapshotInternalPath` (snapshot-internal address) for read. `OcPath` (the structured `{ file, section?, item?, field?, session? }` workspace-file address) is **not** the type for snapshot-internal addressing — that confuses two different addressing schemes. Diff is derived: `read(A, p) → read(B, p) → unifiedDiff(...)` client-side.

### 2. Reference plugin — `extensions/snapshot/` (~100 LoC)

A 30-line plugin shell using `definePluginEntry` that calls `api.registerHttpRoute` for the three operations under `/api/snapshots/*`, plus a 70-line `FsSnapshotStore` reference implementation (filesystem-backed, atomic via `writeFile + rename`). Auth is `auth: 'gateway'` — uses the gateway's existing auth chain, no new model. Mirrors the `extensions/diagnostics-prometheus` shape exactly.

### 3. CLI verb — `bin/openclaw snap *` (~150 LoC)

- `snap capture <workspace>` — HTTP client, returns `SnapshotId`
- `snap read <snap-id> <path>` — HTTP client, prints bytes
- `snap list <workspace>` — HTTP client, prints snapshots
- `snap diff <snap-a> <snap-b> <path>` — local logic: `read + read + unifiedDiff`. **Not** a server route — server stays minimal.
- `snap serve --port N --store-dir D` — standalone listener mode for local dev (uses `FsSnapshotStore` directly without the gateway). **Dev-only**: `snap serve` does NOT sign captures (gateway is the signer; see "Signing" in `realigned-story.md`). Dev snapshots are unsigned; production consumers MUST reject unsigned snapshots at trust-boundary crossings.

### Snapshot ID generation (R1 amendment 2026-04-29 addressing M-CANONICALIZATION-IMPLICIT)

Snapshot IDs are content-addressed by hashing a canonicalized manifest:

```
SnapshotId := lower-hex(sha256(jcs(canonical-manifest)))
```

where:

- **`canonical-manifest`** is a JSON object describing the snapshot's invariant content: workspace identifier, captured-at timestamp, sorted file entries (each `{ path, sha256 }`). The exact field set is part of the contract; see "Manifest shape" below.
- **`jcs(...)`** is RFC 8785 (JSON Canonicalization Scheme) serialization. RFC 8785 specifies deterministic key ordering, number formatting, and string escaping — making `sha256(jcs(x))` stable across implementations and platforms.
- **`sha256(...)`** is SHA-256, lower-hex-encoded.

This makes "content-hash IDs are consistent across `SnapshotStore` implementations" a real property, not a marketing claim. Two stores capturing byte-identical content produce byte-identical IDs.

PolicyIR's `policyId` (see `policy-pre-rfc.md`) inherits the same canonicalization rule: `policyId := lower-hex(sha256(jcs(policy-ir-body)))`. PolicyIR is content INSIDE a snapshot, so its hash is computed independently and the value lands in the snapshot's manifest as one of the `{ path, sha256 }` entries.

#### Manifest shape (normative)

```ts
interface CanonicalManifest {
  readonly workspace: WorkspaceId;
  readonly capturedAt: string;       // ISO-8601, UTC, second-precision
  readonly files: readonly {
    readonly path: SnapshotInternalPath;
    readonly sha256: string;          // lower-hex
  }[];                                // sorted lexicographically by `path`
}
```

The `files` array MUST be lexicographically sorted by `path`. JCS handles object-key ordering; array order is content, not canonicalization, so the contract pins it explicitly.

Conformance test: given a fixed input workspace, two independent `SnapshotStore` impls MUST produce identical `SnapshotId` values.

### Signing (R1 amendment 2026-04-29 addressing M-SIGNING-CHAIN-FICTIONAL)

**The `SnapshotStore` contract has NO signing API.** Signing is performed by the gateway at capture time, not by the Store. See `realigned-story.md` "Gateway-as-signer model" for the full rationale.

Concretely:

- A `SnapshotStore` impl is responsible for capturing bytes and producing a content-addressed `SnapshotId`. It is NOT responsible for signing; it does NOT carry a signing key.
- The gateway, having captured a snapshot via `Store.capture(...)`, signs the resulting `SnapshotId` (plus a timestamp + the gateway's `keyId`) and persists the signature alongside the snapshot in a gateway-controlled location. The signature is NOT part of the `Snapshot` interface returned by `Store.list(...)` — Stores do not see signatures.
- Verification is gateway-side. Consumers reading via `Store.read(...)` rely on the gateway's prior verification; consumers that span trust boundaries verify via the gateway's `verify(snapshotId)` API (defined separately, not in this contract).
- `openclaw snap serve --port N --store-dir D` (dev mode) does NOT sign. Dev snapshots are unsigned and MUST be rejected by production trust boundaries.

Why this shape: a single signer (the gateway) is the only entity with the production signing key. Pushing signing into `SnapshotStore` means every Store impl needs a key, which multiplies the attack surface and makes "downstream-only `SnapshotStore` for backend X" require key provisioning. The gateway-as-signer model keeps the key in one place and lets Stores stay key-free.

### Failure semantics (R1 amendment 2026-04-29 addressing M-FAIL-CLOSED-UNSPECIFIED)

Every failure path in the `SnapshotStore` contract is **fail-closed at the policy enforcement layer**. Specifically:

| Failure | Required behavior at consumer |
|---|---|
| `Store.capture(...)` throws | The capture-initiating operation fails; no snapshot is produced; gateway emits an audit event recording the failure |
| `Store.read(...)` throws | Consumer MUST treat as missing-content; downstream policy enforcement MUST deny the dependent action (block the tool call, refuse the request) |
| `Store.read(...)` returns a value whose hash mismatches the address it was looked up under (where verifiable) | MUST treat as missing/tampered; deny |
| `Store.list(...)` throws | Consumer MUST not synthesize an empty list; treat as unavailable; deny dependent operations |
| Network/IO/transient errors | MUST surface to the gateway, which MUST fail-closed for any policy-enforcement-bearing read; MAY retry once with bounded backoff for non-policy reads |

The runtime corollary: a `SnapshotStore` outage is a policy-enforcement outage. We accept this; the alternative (silent fail-open) is a security regression. Production deployments are expected to colocate a `SnapshotStore` impl in-process with the gateway for hot-path reads, with PolicyIR cached in plugin-private state at `onSnapshotPromoted` to bound the read latency. See `realigned-story.md` for cache discipline.

### Audit emission (R1 amendment 2026-04-29 addressing M-AUDIT-EMISSION-BYPASSABLE)

Audit emission is **the gateway's responsibility, not a decorator on the Store**. The gateway emits a hash-chained audit entry on:

- every successful or failed `Store.capture(...)` invocation
- every successful or failed `Store.read(...)` for any policy-enforcement-bearing path (e.g., `POLICY_IR_PATH`)
- every signing or verification operation
- every policy decision derived from a snapshot

This is contract-level, not consumer-decorator. The previous draft proposed "decorator pattern by the consumer" — that was identified as a security regression in R1 review (a non-decorating consumer silently drops audit). The amended posture is: Stores stay simple (no audit obligation); the gateway is the single audit-emitting layer for Store ops; consumers cannot bypass audit by skipping a decorator because there is no decorator to skip.

`SnapshotStore` impls MAY emit additional impl-private metrics/logs, but the audit-of-record is gateway-emitted.

**R1-follow-on 2026-04-29 — audit stays downstream, not in v2 upstream scope.** The audit format itself (entry shape, hash-chain rule, signing envelope) is **consumer responsibility** in v2 — claws emits via `claws-policy-generator/emit/` (post-rename per `realigned-story.md` "Renames + new packages"); other consumers emit however they prefer. There is no `@openclaw/audit` package in this proposal. Three reasons: (a) audit format does not have meaningful consumer choice variation the way `SnapshotStore` and `PolicyGenerator` do; (b) adding a 4th contract PR would push the upstream chain from ~6 weeks to ~8+ weeks against the surface budget; (c) the HMAC-chained / Ed25519-headed audit format hasn't baked across enough consumers yet — let it run two release cycles in claws before contractualizing. Future v3 may propose `@openclaw/audit`. For v2: gateway emits audit events as part of its existing observability/event bus; the audit format is documented in claws docs, not in `plugin-sdk`.

### Conformance (R1 amendment 2026-04-29 addressing M-WIRE-PARITY-MISSING)

Two deployment shapes are supported:
1. The reference `extensions/snapshot/` plugin mounted by the gateway at `/api/snapshots/*`.
2. The standalone `openclaw snap serve` listener (dev mode) mounted at the equivalent paths.

**Conformance requirement**: both deployments MUST return identical wire shapes for `capture` / `read` / `list`. The CLI client (`openclaw snap capture/read/list`) MUST work transparently against either backend without configuration beyond a base URL.

Specifically:
- HTTP method, path, request body shape, and response body shape MUST match for each verb.
- Error envelope shape (status code + body) MUST match for at least the equivalence classes `not-found`, `bad-request`, `auth-failure`, `internal-error` (specific code list deferred to the snap pre-RFC's "Open questions" §6).
- Wire-level integration test (in upstream's CI) MUST verify parity by running a fixed test client against both backends and asserting byte-identical responses for a fixed fixture set.

Rationale: dev workflows use `snap serve`; prod uses the gateway-mounted plugin. If wire shapes drift, code that works in dev breaks in prod silently. The conformance test catches drift at PR time.

### Error envelope (R1-follow-on amendment 2026-04-29)

The contract specs a stable `SnapshotErrorCode` enum so consumer-side error-handling does not fragment across `SnapshotStore` impls or across the two deployment shapes (`extensions/snapshot/` plugin and `openclaw snap serve` standalone):

```ts
export type SnapshotErrorCode =
  | 'SNAP_NOT_FOUND'           // unknown SnapshotId
  | 'SNAP_INVALID_PATH'        // SnapshotInternalPath malformed or out of registry
  | 'SNAP_STORE_UNAVAILABLE'   // backing store error (network, disk, etc.)
  | 'SNAP_AUTH_DENIED'         // gateway auth chain rejected
  | 'SNAP_CAPTURE_FAILED'      // capture op failed (workspace inaccessible, validation failed)
  | 'SNAP_LIMIT_EXCEEDED'      // store/quota limit hit
  | 'SNAP_CHECKSUM_MISMATCH'   // canonicalization or content-hash mismatch on read
  | 'SNAP_CONTRACT_VIOLATION'  // implementation didn't honor SnapshotStore contract
  | 'SNAP_INTERNAL';           // unexpected; treat as fail-closed

export interface SnapshotError {
  code: SnapshotErrorCode;
  message: string;             // human-readable; not for parsing
  cause?: unknown;             // implementation-defined detail
}
```

This enum is part of the **wire shape** and the **conformance test surface**: both the `extensions/snapshot/` plugin and `openclaw snap serve` standalone MUST return errors using this code set, and the conformance test (per "Conformance" above) MUST verify that for the equivalence-class fixtures, the returned `code` is the same on both sides. Consumers parse `code`; `message` is human-readable and MUST NOT be parsed by consumers. `cause` is implementation-defined detail (stack, inner error, etc.) and MUST NOT be relied on by consumers.

The gateway translates `SnapshotErrorCode` into HTTP status codes for the wire layer:

| `SnapshotErrorCode` | HTTP status |
|---|---|
| `SNAP_NOT_FOUND` | 404 |
| `SNAP_INVALID_PATH` | 400 |
| `SNAP_AUTH_DENIED` | 403 |
| `SNAP_LIMIT_EXCEEDED` | 429 |
| `SNAP_STORE_UNAVAILABLE` | 500 |
| `SNAP_CAPTURE_FAILED` | 500 |
| `SNAP_CHECKSUM_MISMATCH` | 500 |
| `SNAP_CONTRACT_VIOLATION` | 500 |
| `SNAP_INTERNAL` | 500 |

`openclaw snap serve` (dev mode) MUST honor the same mapping, so dev-vs-prod debugging stays consistent.

This addresses the R1 finding that yankee's earlier audit had an error envelope which v2 had dropped (per `R1-consolidated.md` "Wire-parity gaps").

### What's NOT in the contract (deliberate)

- **Server-side diff** — derived client-side from two `read` calls.
- **Promote / label / retention semantics** — downstream policy concerns.
- **Streaming reads** — `Uint8Array` for v1; streams can be added later behind a separate method.
- **Signing** — gateway responsibility (see "Signing" above), not Store.
- **Bespoke auth** — gateway provides via `auth: 'gateway'`.

**Total upstream surface: ~280 LoC** vs the ~1665-LoC daemon-shape this audit started from.

## Open questions for the channel

1. **Read shape** — `read()` returns `Uint8Array`? `string`? `{content, etag, lastModified}`? **Recommendation: `Uint8Array`** (most general; text decoders trivial on top; ETag/metadata can ride on a separate `head()` if demand emerges).
2. **`capture` semantics** — sync FS-scan + commit, or async job-id return? **Recommendation: sync for v1** (simpler; an async/streaming variant can ship later for large workspaces).
3. **Snapshot ID format** — opaque hex content-hash. **Now answered** by R1 amendment: `sha256(jcs(canonical-manifest))` (RFC 8785). Open question is whether maintainers want a different canonicalization rule.
4. **Namespace collision** — there's already `src/gateway/protocol/schema/snapshot.ts` upstream (presence/health snapshots for cross-device session coordination, completely unrelated). Subpath `plugin-sdk/workspace-snapshot`? Rename the type to `WorkspaceSnapshot`? Or a different name like `oc-snapshot` / `governance-snapshot`?
5. **Capability-table membership** — the capability table at `docs/plugins/architecture.md:34-50` enumerates the core domains (channel, memory, voice, etc.) that get a contract row in the SDK. Does snapshotting earn its own row there, or is it a pattern that consumers solve with the SDK contract alone (no capability row, contract still upstream)? **Recommendation: no row for v1** — types-only SDK module; revisit if/when a `registerSnapshotProvider` verb earns its place.
6. **Error envelope** — should the contract spec a `SnapshotErrorCode` enum (`SNAPSHOT_NOT_FOUND`, `SNAPSHOT_ID_MISMATCH`, etc.) or leave error shape to impls? **Now answered** by R1-follow-on: the contract specs the 9-entry `SnapshotErrorCode` enum (see "Error envelope" above) plus an HTTP-status mapping. Open question is whether maintainers want a different code set or different HTTP-status mapping.
7. **Registry evolution.** `OcPath.file` is constrained to the 9-entry `OC_WORKSPACE_FILES` registry (per the in-flight `@openclaw/workspace` package, Hapi PR-1). If future PolicyIR consumers need to address files outside that registry (e.g., new workspace-level config files), the registry must grow. This proposal does not propose any changes to the registry; flagging for awareness so the channel knows the dependency exists. Note that `SnapshotInternalPath` (the type used here for snapshot-internal addressing) is NOT constrained by `OC_WORKSPACE_FILES` — only `OcPath` is. The dependency is upstream-of-snap (snap consumes `WorkspaceId` for `capture`/`list`, not `OcPath` directly), but consumers that compose snap with PolicyIR-generation flows will still want `OcPath` coverage of the validated source files.

## Adoption story

- **claws** ships a downstream `SnapshotStore` implementation (filesystem with content-addressing per RFC 8785; the existing ~1665-LoC package carved down to fit the contract). Signing/audit happen at the gateway layer, not the Store.
- **lobster-web** consumes via the contract; doesn't care which `SnapshotStore` backs it.
- **OpenClaw dev/staging** uses `openclaw snap serve` standalone with `FsSnapshotStore` for local workflows. Dev snapshots are unsigned and clearly marked as such.
- **Future consumer** implements `SnapshotStore` against their backend (S3, blob, postgres, etc.) without forking either the contract or any consumer. They do not need a signing key — that's the gateway's concern.

## What I'm NOT asking for in this PR

- Not asking to land a daemon-shape upstream as a top-level package.
- Not asking for retention / promote / label semantics in the contract — those are downstream policy.
- Not asking to bundle a CLI binary inside `plugin-sdk/` — the verb lives separately under `bin/`.
- Not asking for an audit-emission API on `SnapshotStore` — gateway is the audit emitter, not the Store.
- Not asking for a signing API on `SnapshotStore` — gateway is the signer, not the Store.
- Not asking for streaming or partial-read APIs in v1.

## Related work / prior art

- `extensions/diagnostics-prometheus` — same plugin shape this proposal mirrors (`registerService` + `registerHttpRoute`).
- `extensions/webhooks`, `voice-call`, `phone-control`, `memory-lancedb`, `acpx`, `diagnostics-otel` — also gateway-mounted plugins.
- The `oc-path` contract — a sister contract for live-workspace addressing. **Distinction**: `OcPath` addresses files in a live workspace (the structured `{ file, section?, item?, field?, session? }` form, with `file` constrained to the 9-entry workspace-file registry). `SnapshotInternalPath` addresses files inside a captured snapshot bundle (POSIX-style relative path; no registry constraint). The two are not interchangeable.
- RFC 8785 — JSON Canonicalization Scheme; the canonicalization rule for snapshot IDs and (by reference) PolicyIR IDs.
- Internal claws monorepo has a daemon-shaped reference impl to be carved down into the contract + plugin (LoC details in internal architecture audit).

## Asks

1. **Directional read** — does the contract-first shape work, or does Peter want something different?
2. **Naming** — answer to question 4 (subpath / type name).
3. **Capability table** — answer to question 5 (does snap earn a row?). **Pre-answered**: no row v1.
4. **Canonicalization** — confirm RFC 8785 JCS as the rule, or propose alternative.
5. **Error envelope** — confirm small enum vs impl-defined.
6. **PR slot + sequencing** — a separate small PR (snapshot contract + reference plugin, ~280 LoC) standing on its own, sequenced after the oc-path contract is in place. Open to either landing post-oc-path immediately, or batching with later contract PRs.

## Footer

Authored 2026-04-29. R1-amended 2026-04-29 to address consolidated panel review (canonicalization, fail-closed, gateway-emitted audit, gateway-as-signer, conformance, OcPath vs SnapshotInternalPath split). R1-follow-on 2026-04-29 (audit stays downstream — no `@openclaw/audit` in v2; `claws-guardrails` rename for naming consistency; `SnapshotErrorCode` enum spec'd; `OC_WORKSPACE_FILES` registry-evolution note). AI-assisted (planning agents for upstream-fit audit + drafting). Internal architecture audit notes available on request.
