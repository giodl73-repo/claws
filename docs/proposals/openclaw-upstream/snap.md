# `@openclaw/snap` — Package Spec

**Package**: `@openclaw/snap`
**Status**: Proposal (draft)
**Date**: 2026-04-18
**Companion to**: `openclaw-upstream-spec.md` (main spec, §4) · `openclaw-upstream-brief.md` (Peter-facing brief)

---

## Summary

`@openclaw/snap` is the snapshot registry for OC workspaces. A **snapshot** is a content-addressable capture of a workspace (every file in the directory, with `snapshotId = canonicalHash(files)` — format `sha256-<base64url>` per `workspace.md` §`canonicalHash`). Snap stores snapshots, serves them over HTTP, promotes them to "current," rolls back. **At the npm-import level it treats workspaces as opaque** — files are files. The separation from `@openclaw/policy` is deliberate: any host can run snap without the generator (review-flow staging, backup, auditing); hosts that generate locally and don't need a registry can skip snap. Zero npm-import dep either direction.

The **one named coupling** is at promotion time: `POST /v1/snapshots/:id/promote` inspects `.openclaw/policy/policy-ir.json` inside the snapshot and checks it's self-consistent. Self-consistency means re-canonicalizing the PolicyIR and recomputing the `policyId` hash, which requires snap to canonicalize exactly the way `@openclaw/policy` does. Both packages depend on `@openclaw/workspace/canonicalize` (a small RFC 8785 JCS helper) as a peer dep, and a PolicyIR major version is a coordinated release. Hosts running snap as a pure workspace-history service configure `promotion.requirePolicy: false` and the precondition is skipped entirely.

---

## Motivation

Once `openclaw policy generate` writes enforcement artifacts into `.openclaw/policy/`, somebody has to answer three questions: *what is the current policy in force?* *can we go back to yesterday's?* *how does a supervisor app read the current policy without fetching the whole workspace?*

Those are storage-and-serving problems, not generation problems. Conflating them with the generator forces every consumer to install the generator (heavyweight), couples the serve lifecycle to generator releases, and misleads anyone from the admission-control world about what a "policy server" does.

`@openclaw/snap` keeps the layers clean. Snapshots are content-addressable on their filesystem content, so the id is stable across hosts. Promotion is the single governance boundary that transitions a snapshot to "current." The HTTP server exposes read endpoints (`GET /v1/policy/current`, `GET /v1/resolve?uri=oc://…`) that editors, SIEM entries, audit correlations, and review UIs hit without needing a generator locally.

---

## Interface

```ts
export interface Snapshot {
  id: string;                                  // canonicalHash(files) — `sha256-<base64url>`
  files: Record<string, string>;               // path → content
  createdAt: string;
  author: string;                              // OC-populated (request principal)
  status: 'draft' | 'current' | 'superseded';
  parentId?: string;                           // prior current, for rollback history
}

export interface SnapshotStore {
  put(snapshot: Snapshot): Promise<void>;
  get(id: string): Promise<Snapshot | null>;
  list(opts?: ListOpts): Promise<SnapshotMeta[]>;
  promote(id: string, ctx: PromoteContext): Promise<{ promotedAt: string }>;
  rollback(toId: string, ctx: PromoteContext): Promise<{ restoredAt: string }>;
  current(): Promise<Snapshot | null>;
  resolveOcPath(uri: string, id?: string): Promise<{ content: string; chunk?: Chunk } | null>;
}

// Reference backends
export function inMemoryStore(): SnapshotStore;
export function filesystemStore(opts: { root: string }): SnapshotStore;
// Object-storage adapters (S3 / Azure Blob / GCS) are implementation-defined.

// Server
export function startServer(opts: StartServerOptions): Promise<ServerHandle>;

export interface StartServerOptions {
  port: number;
  store: SnapshotStore;
  authContext?: (req: IncomingMessage) => { principal: string; tenant?: string };
  auditSink?: (event: AuditEvent) => void | Promise<void>;
}
```

### HTTP endpoints

```
POST   /v1/snapshots                  upload a pre-made snapshot; returns { id, status: 'draft' }
GET    /v1/snapshots                  list (paginated); returns [{ id, createdAt, author, status }, …]
GET    /v1/snapshots/:id              fetch a snapshot by id
POST   /v1/snapshots/:id/promote      make current (audited); preconditions validated — see below
POST   /v1/snapshots/:id/rollback     revert to this snapshot (audited)
GET    /v1/policy/current             returns the current snapshot's .openclaw/policy/policy-ir.json
                                      (convenience; clients can also GET /v1/snapshots/:current-id)
GET    /v1/resolve?uri=oc://...       resolve an oc:// URI against the current snapshot
GET    /v1/snapshots/:id/resolve?uri= resolve an oc:// URI against a specific snapshot
GET    /v1/healthz                    liveness
```

**No `/v1/compile`, no `/v1/validate`**. Generation is `@openclaw/policy`'s job, run locally via `openclaw policy generate`. Consumers upload pre-generated snapshots to snap.

---

## Semantics / Behavior

### Uploading a snapshot

`POST /v1/snapshots` accepts a workspace bundle (paths → contents) in the request body. **The server is the sole source of truth for `snapshotId`**: it canonicalizes the file set via RFC 8785 JCS, computes `snapshotId` via `canonicalHash(files)` (format `sha256-<base64url>`, per `workspace.md` §`canonicalHash`), and stores the result in `draft` status. The client does NOT declare an id on upload — the response returns the computed `id`. Idempotent: uploading the same bundle twice with the same `Idempotency-Key` yields the same id, the cached response, and no duplicate entries (see §Promotion for the full idempotency contract). A client that wants to verify round-trip integrity can optionally send `X-Expected-Snapshot-Id`; mismatch returns `400 SNAPSHOT_ID_MISMATCH` (under the unified `SnapError` envelope — see §Fail-closed postures) with the server-computed id in the body (useful for detecting accidental payload corruption).

**Upload-time shift-left validation.** Before the snapshot is accepted into `draft` storage, the server applies three optional / one required pre-storage checks so bad bytes never become a promotable draft (this closes the storage-exhaustion vector where spammed incompatible uploads would fill disk as un-promotable drafts):

- Optional `X-Expected-Policy-Id`: if present, the server invokes `safeParse(bytes, { maxDepth: 100 })` from `@bic/openclaw-workspace/canonicalize` on the bundle's `.openclaw/policy/policy-ir.json` bytes (per `workspace.md` §`/canonicalize` C-15 — direct `JSON.parse` of untrusted input is a spec violation that bypasses the depth-bomb gate), recomputes `policyId` via `computePolicyId(ir)` (see `policy.md` §PolicyIR), and compares against the header. Mismatch returns `400 POLICY_ID_MISMATCH` — no draft is created. The client-asserted `policyId` is logged on the `snapshot_upload` audit event so a review UI can show "uploader claimed this IR; server verified it matches."
- Required canonicalizer-version handshake: if the bundle contains `.openclaw/policy/policy-ir.json` with a `canonicalizerVersion` field outside the server's supported set, the server returns `400 POLICY_IR_VERSION_UNSUPPORTED` pre-storage with both versions in `details`. Prevents the "1000 snapshots stamped v2.x uploaded against a v1.x server, all stuck as un-promotable drafts" DoS pattern.
- `X-Expected-Snapshot-Id` (see above).

Note on semantic: `X-Expected-*` headers are **assertions of identity** (content-addressable IDs, recomputed server-side), not If-Match ETag preconditions. Integrators who care about end-to-end integrity should set both `X-Expected-Snapshot-Id` and `X-Expected-Policy-Id` on every state-mutating upload.

### Promotion is the governance boundary

Only `POST /v1/snapshots/:id/promote` makes a snapshot `current`. The transition is audited (`snapshot_promote` category, per main spec §6 OC-5). Preconditions checked at promote time:

- The snapshot must exist.
- **Governance precondition (configurable)**: by default, `.openclaw/policy/policy-ir.json` must be present in the snapshot's files, parse via `safeParse(bytes, { maxDepth: 100 })` from `@bic/openclaw-workspace/canonicalize` (per `workspace.md` §`/canonicalize` C-15 — direct `JSON.parse` is forbidden at untrusted boundaries), and its `policyId` must be self-consistent with the canonicalized IR (`computePolicyId(ir) === ir.policyId`, using `canonicalHash` which emits `sha256-<base64url>` — see `policy.md` §PolicyIR for the normative pseudocode; both `policyId` and `canonicalizerVersion` are stripped before hashing). A workspace with no generated policy can't be promoted — there's nothing for the gateway to enforce. Server returns `POLICY_NOT_GENERATED`, `POLICY_IR_MALFORMED`, `POLICY_IR_INCONSISTENT`, or `POLICY_IR_VERSION_UNSUPPORTED` (when the generator's `canonicalizerVersion` is outside the server's supported set — see §Uploading for the shift-left upload gate) under the unified `SnapError` envelope (see §Fail-closed postures). Hosts running snap as a pure workspace-history service (no governance layer) set `promotion.requirePolicy: false` in server config to skip this check entirely — promote then only requires the snapshot to exist and the caller to have promote authority (see §Auth for the required per-request principal assertion).
- The caller must have promote authority (authorization is host-wired; snap reads identity from request context).
- **Idempotency-Key header is REQUIRED.** State-mutating endpoints (`POST /snapshots`, `POST /snapshots/:id/promote`, `POST /snapshots/:id/rollback`) require a client-supplied `Idempotency-Key` header (per RFC 9457 / Stripe convention). Missing header returns `400 IDEMPOTENCY_KEY_REQUIRED` under the `SnapError` envelope. Server persists `idempotency_key → first_response` for ≥24h; retries with the same key return the cached response (including the original `promotedAt`) and produce no additional audit event. Handler-boundary dedup key is `(snapshotId, idempotency_key)` — client-controlled, not server-generated — because the `promotedAt` timestamp is server-generated and cannot deduplicate retries after transient 5xx from the audit sink.

A prior `current` snapshot is moved to `superseded` status atomically with the new promotion; nothing is deleted.

### Rollback

`POST /v1/snapshots/:id/rollback` promotes a prior snapshot as current. Same audit category, **subset** of the promote precondition set (rollback is a recovery path and must not become non-recoverable under forward-only version compatibility):

- The snapshot must exist + the caller must have rollback authority + per-request principal assertion per §Auth.
- If `promotion.requirePolicy: true`: `.openclaw/policy/policy-ir.json` must be syntactically parseable (rejects with `POLICY_IR_MALFORMED` under the `SnapError` envelope) — but rollback does NOT re-verify `policyId` self-consistency (the hash was verified at original promote; re-verifying now would make rollback non-recoverable across canonicalizer upgrades).
- Rollback does NOT reject on `canonicalizerVersion` mismatch; it emits a `snapshot_rollback_canonicalizer_downgrade` audit signal and proceeds.
- `Idempotency-Key` header is required, per §Promotion.

4xx responses use the unified `SnapError` envelope (see §Fail-closed postures). Newer snapshots remain in history marked `superseded`.

### `oc://` URI resolution

The `/v1/resolve` endpoints compose `@openclaw/workspace/path` server-side so a client with just a URI string — an editor diagnostic link, a SIEM entry, an audit correlation, a review-UI reference — can `GET` content without fetching the whole snapshot or parsing files client-side. If the URI carries `?snapshot={id}`, the server keys off that; otherwise resolves against current.

```
GET /v1/resolve?uri=oc://TOOLS.md/Tools/send-email/args_from
  → { snapshotId, content, chunk: { span, heading } }

GET /v1/resolve?uri=oc://SOUL.md/Boundaries?snapshot=sha256-3a7f
  → content from snapshot 3a7f
```

### Auth is pluggable

The library doesn't define an auth scheme. Hosts wire an auth layer in front — typically `@openclaw/guardrails/identity` for OIDC/SAML. `authContext` reads the caller's identity from request context; every state-mutating endpoint (upload, promote, rollback) records that identity on the resulting snapshot or audit event. Read-only endpoints (`GET /v1/snapshots`, `GET /v1/policy/current`, `GET /v1/resolve`, `GET /v1/healthz`) may be unauthenticated at the host's discretion, though tenant-scoped auth is typical for the first two.

**Per-request principal assertion MUST succeed on every state-mutating call.** `authContext` is a closure that typically wraps OIDC discovery or a secret-backed JWT validator; its readiness can drift mid-lifetime (discovery endpoint goes empty, validator secret rotates to missing). A startup-only check is insufficient. For every `POST` to `/v1/snapshots`, `/v1/snapshots/:id/promote`, `/v1/snapshots/:id/rollback`, the handler MUST assert `principal !== '' && principal !== undefined` per-call. If the assertion fails, the handler returns **`503 AUTH_CONTEXT_UNAVAILABLE`** (not 401 — 401 implies caller fault; this is server health, and the correct operator response is drain + investigate the auth layer, not caller credential reset). `GET /v1/healthz` MUST surface `authContext` readiness so load balancers can drain drifting instances before requests pile up. Every `promotionPolicy: 'bypassed'` audit event (see §Promotion) logs `authContext.freshness: <seconds-since-last-successful-validation>` for post-hoc compliance review of the rotation window.

### Snapshot storage is pluggable

In-memory for tests, filesystem reference impl for single-node deploys, object-storage-backed for multi-node. The `snapshotId` is content-addressable, so the store's job is just mapping `id → serialized Snapshot` + status metadata. `filesystemStore({ root })` writes snapshots to `{root}/snapshots/{id}/` with a small `status.json` tracking current/superseded state.

### Fail-closed postures

- If the store is unreachable, all endpoints return 5xx rather than stale data.
- Upload with malformed or non-UTF-8 content returns `400 SNAPSHOT_MALFORMED` and is not stored. If the client sent an `X-Expected-Snapshot-Id` header and it doesn't match the server-computed id, returns `400 SNAPSHOT_ID_MISMATCH`.
- Promotion of a snapshot missing policy artifacts returns 409 loudly — the governance boundary surfaces the gap clearly rather than silently making an unenforceable snapshot current.

**Unified error envelope (`SnapError`).** All 4xx responses across snap endpoints (`/v1/snapshots` upload, `/v1/snapshots/:id/promote`, `/v1/snapshots/:id/rollback`, `/v1/resolve`) share one body shape, so integrator error-formatters switch on `code`, not on endpoint:

```ts
export interface SnapError {
  code:
    | 'SNAPSHOT_MALFORMED' | 'SNAPSHOT_ID_MISMATCH' | 'SNAPSHOT_NOT_FOUND'
    | 'POLICY_ID_MISMATCH' | 'POLICY_NOT_GENERATED'
    | 'POLICY_IR_MALFORMED' | 'POLICY_IR_INCONSISTENT' | 'POLICY_IR_VERSION_UNSUPPORTED'
    | 'FORBIDDEN' | 'IDEMPOTENCY_KEY_REQUIRED';
  message: string;                     // human-readable, no secrets, ≤200 chars
  details?: Record<string, unknown>;   // per-code payload
  snapshotId?: string;                 // populated when a snapshot is in scope
}
```

`503 AUTH_CONTEXT_UNAVAILABLE` (see §Auth) also uses this envelope shape. All error paths — including `JSON.parse` SyntaxError, schema-validator errors, signature-header verification — route through a single internal `toSnapError(err, errContext)` helper that (i) truncates `message` to ≤200 chars, (ii) strips absolute paths matching `/^(\/|[A-Z]:\\)/`, (iii) redacts bearer/secret patterns, (iv) gates `code` to the closed enum above. This prevents file-path leaks from raw parser errors and secret leaks from attacker-controlled header bytes.

---

## CLI surface

`openclaw snap` is a flat subcommand group on the existing `openclaw` CLI (peer of `openclaw policy`). Eleven verbs covering the full workspace lifecycle — stage toggle (`stage on` / `off`), working tree (`status`, `diff --staged`, `discard --stage`), registry (`upload`, `list`, `diff <a> <b>`, `checkout`, `promote`, `rollback`, `discard <id>`), daemon (`serve`). `snap status` is the only status command needed — it shows effective stage rules + working tree + drafts + current in one view. Full subcommand spec — arguments, flags, exit codes, composition rules — in `snap-commands.md`.

Key composition note: `snap diff <a> <b>` imports `diffPolicyIR` from `@openclaw/policy` at the CLI-handler layer to render a semantic diff; the `@openclaw/snap` library itself has zero runtime dep on `@openclaw/policy`. Default stage posture is **off** — staging is opt-in per workspace (matches OC's current behavior); hosts can enforce `stage on` via `staging.enforce: true`.

---

## Versioning

Semver. The HTTP path prefix (`/v1/`) carries the major version; a `/v2/` would ship alongside `/v1/` during a transition window. Adding an endpoint or a response field is minor; removing an endpoint or changing a response schema is major. Request-body schemas are versioned through the path prefix. The `Snapshot` TypeScript shape follows the npm package version. LTS alignment: an LTS holds `/v1/` stable for the LTS lifetime.

---

## Testing

- **L0 unit** — store implementations (in-memory, filesystem) pass the same SnapshotStore conformance suite. Canonicalization is deterministic. Hash mismatch detection works. Promote/rollback state transitions atomic.
- **L1 integration** — paired with `@openclaw/workspace/path`: `/v1/resolve` returns the right chunk for round-tripped URIs. Paired with `@openclaw/guardrails/audit`: `snapshot_promote` / `snapshot_rollback` events fire in the expected shape. Paired with `@openclaw/guardrails/identity`: auth-context propagation through to snapshot metadata.
- **L2 E2E** — spin up snap against a filesystem store; from a separate client, generate a workspace with `@openclaw/policy`, upload it as a snapshot, promote it, read `/v1/policy/current`, rollback to a prior snapshot, verify the audit chain.

---

## Dependencies

Zero `@microsoft/*` imports. Runtime deps on sibling `@openclaw/*` packages at type-level only: `@openclaw/workspace/path` (for `oc://` resolution in `/v1/resolve`), `@openclaw/guardrails/audit` (for audit event shapes on promote/rollback), `@openclaw/guardrails/identity` (for caller-identity types).

**Zero npm-import dep on `@openclaw/policy`.** Snap stores files; at the library level it doesn't know what's in them. Two narrow, named couplings exist and are intentional: (1) both packages depend on `@openclaw/workspace/canonicalize` so `snap promote`'s `policyId` self-consistency check produces the same bytes as `@openclaw/policy`'s canonicalization; (2) the `snap diff` CLI handler (separate composition layer) imports `diffPolicyIR` from `@openclaw/policy` at argv-dispatch time. Everything else — upload, get, list, rollback, resolve, healthz — treats files as opaque bytes.

HTTP server framework is implementation-defined; the main spec does not mandate one.

---

## Open items

- Streaming uploads for very large workspaces — current plan is whole-payload JSON; multipart/streaming may be needed for workspaces with large embedded files (e.g., memory archives).
- WebSocket surface for snapshot change notifications (`snapshot_promoted`, `snapshot_rolled_back`) — would let supervisor companion apps react in real time. Plausible follow-up; not in v1.
- Rate limiting — host concern (reverse-proxy level) rather than in-library. Leave unspecified.
- Cross-tenant snapshot listing — single-tenant assumed for v1. Multi-tenant isolation is a host/deployment concern, not a library one.
- Whether the server should offer a `GET /v1/resolve` that returns content + a pre-rendered link for UIs (e.g., `openclaw://editor/TOOLS.md#line-12` style) — useful for review UIs but adds surface. Punt for v1.

---
