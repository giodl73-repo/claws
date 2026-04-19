# `@openclaw/snap` — Snapshot Registry + Promote Protocol

<!-- atom:openclaw-snap -->

## The short version

`@openclaw/snap` is the snapshot registry for OpenClaw workspaces. It stores content-addressable captures of a workspace, serves them over a nine-route HTTP API, and promotes one at a time to `current`. A snapshot moves through a small state machine — `NONE → STAGED → UPLOADED → PROMOTED ↔ SUPERSEDED` — and the registry is the single authority over those transitions. The ID for every snapshot is `sha256(canonical(files))`, so the same files produce the same ID on every host. At promote time the server re-hashes the policy IR to confirm self-consistency; upload time has a depth-bomb-safe ingress; every 4xx flows through a single `SnapError` envelope that strips absolute paths and redacts secrets before the body reaches the caller. Published internally as `@bic/openclaw-snap`; upstream as `@openclaw/snap`.

This guide is **package-perspective** — state machine, HTTP surface, error envelope. For the operator-facing workflow (when to `snap save`, how to compare, what rollback looks like from the CLI), see the user-perspective guides under [See also](#see-also).

---

## State machine — workspace to current-promoted

A snapshot's lifecycle fits on one diagram. The registry enforces each transition; `.openclaw/.stage/` is a **workspace-local** concept that lives outside the registry, so the first arrow is dashed.

```
            ┌─────────┐
            │  NONE   │   no snapshot, no staged changes
            └────┬────┘
                 │  edit governance files with `stage on`
                 │  (writes redirect to .openclaw/.stage/)
                 ▼
            ┌─────────┐
            │ STAGED  │   shadow tree under .openclaw/.stage/ —
            │ (local) │   canonical files untouched, not yet
            └────┬────┘   in any registry
                 │  POST /v1/snapshots  (openclaw snap upload)
                 │  server canonicalizes, computes snapshotId,
                 │  persists as status='draft'
                 ▼
            ┌─────────┐
            │UPLOADED │   draft in the registry, content-
            │ (draft) │   addressable, not yet current
            └────┬────┘
                 │  POST /v1/snapshots/:id/promote
                 │  server re-hashes policy-ir.json,
                 │  checks self-consistency, audits
                 ▼
            ┌─────────┐            promote(otherId)          ┌─────────┐
            │PROMOTED │◄──────────────────────────────────► │SUPERSEDED│
            │(current)│            rollback(thisId)          │(history)│
            └─────────┘                                      └─────────┘
                 │  prior current is atomically moved to
                 │  SUPERSEDED as the new one becomes current;
                 │  nothing is deleted.
```

Transitions the registry does **not** allow:

- `UPLOADED → SUPERSEDED` without passing through `PROMOTED` (a draft cannot be "retired" — it is `discard`ed, which is a registry delete, not a state change).
- `PROMOTED → UPLOADED` (once current, a snapshot stays `current` or becomes `superseded` via promote/rollback — it never reverts to `draft`).
- `SUPERSEDED → anywhere` except via rollback, which promotes it back to `current` (and the then-current is moved to `superseded` in the same atomic step).

The state is represented in code as:

```ts
// claws-sdk/packages/snap/src/types.ts
export type SnapshotStatus = 'draft' | 'current' | 'superseded';
```

`NONE` and `STAGED` are not `SnapshotStatus` values — they exist before the registry is involved. The registry only sees objects that already have IDs.

---

## What "staged locally" means

Staging is a **workspace-level review gate**, not a registry concept. When a user runs `openclaw snap stage on`, subsequent writes to governance files (SOUL, USER, AGENTS, TOOLS, IDENTITY, SKILL, plus host-custom globs) are intercepted by `FileIngestProvider.modify` and redirected into a shadow tree under `.openclaw/.stage/`. The canonical files are not touched until someone runs `snap upload`.

Why this matters for the registry:

- The snapshot the registry sees on upload is assembled by overlaying `.openclaw/.stage/<path>` onto canonical. The snapshot's `files` field is the **overlay result** — canonical files that weren't restaged, plus staged content for files that were.
- Because the snapshot is content-addressable, the ID is stable regardless of whether those bytes came from canonical or from `.stage/`. The registry has no opinion about the distinction; it just hashes the file set.
- The staged-review flow is what makes CAP (change-approval-protocol) reviews practical. Reviewers inspect `snap diff --staged` (local, pre-upload) or compare two uploaded drafts with `snap diff <id1> <id2>` (registry call) before anyone promotes.

Default posture is `stage off` — writes land on canonical directly, matching OC-today behavior. Staging is **opt-in per workspace**, toggled through `.openclaw/stage-config.json`. Hosts that want the review gate mandatory set `staging.enforce: true` and `snap stage off` returns `STAGING_ENFORCED`.

---

## Content-addressable IDs

Every ID in the package has the form `sha256-<base64url>`. Two are load-bearing:

```ts
// claws-sdk/packages/snap/src/canonical.ts
export function computeSnapshotId(files: Readonly<Record<string, string>>): string;
export function computePolicyId(ir: Record<string, unknown>): string;
export const POLICY_IR_PATH = '.openclaw/policy/policy-ir.json';
```

`computeSnapshotId` sorts paths, canonicalizes the `{path → content}` map via RFC 8785 JCS (`canonicalHash` from `@bic/openclaw-workspace/canonicalize`), and returns the digest. Sorted keys plus canonical JSON means the ID is a pure function of the byte content — same files on two hosts produce the same ID, byte-for-byte.

`computePolicyId` delegates to `computeStrippedHash(ir, ['policyId', 'canonicalizerVersion'])` from the same canonicalize module. Stripping those two fields before hashing is what makes the PolicyIR's `policyId` a self-referential declaration (the IR says what hash it *claims* to have), which the server re-derives and checks at promote time.

The shared `computeStrippedHash` is how `@openclaw/snap` and `@openclaw/policy` avoid drifting. Both depend on `@bic/openclaw-workspace/canonicalize` as a peer; a PolicyIR major version is a coordinated release across those three packages.

**Server is sole source of truth.** Uploads never carry a client-declared `id`. `POST /v1/snapshots` receives `{ files: ... }`, the handler recomputes the ID, and returns it in `{ id, status: 'draft' }`. Clients that want round-trip integrity can send `X-Expected-Snapshot-Id`; mismatch produces `400 SNAPSHOT_ID_MISMATCH` with the server-computed ID in the envelope.

---

## Promote self-consistency

The entire governance boundary is one invariant: at promote time, the policy IR inside the snapshot must be **self-consistent with its own declared hash**. That is the only moment the registry looks at content.

The check, from `server/handlers.ts`:

```ts
// 1. Parse .openclaw/policy/policy-ir.json via safeParse (depth-bomb safe).
//    Direct JSON.parse of untrusted input is forbidden at this boundary.
const parsed = safeParse(rawIr, { maxDepth: 100 });

// 2. Require the declared policyId.
const declared = (parsed as Record<string, unknown>)['policyId'];
if (typeof declared !== 'string') return err(409, toSnapError('POLICY_IR_INCONSISTENT', ...));

// 3. Re-compute and compare.
const computed = computePolicyId(parsed);
if (computed !== declared) return err(409, toSnapError('POLICY_IR_INCONSISTENT', ...));
```

Error codes emitted from this check:

| Code | When |
|------|------|
| `POLICY_NOT_GENERATED` | `.openclaw/policy/policy-ir.json` is missing and `promotionRequirePolicy` is true (default) |
| `POLICY_IR_MALFORMED` | `safeParse` failed, or the parsed value is not an object |
| `POLICY_IR_INCONSISTENT` | `policyId` is missing, non-string, or does not equal `computePolicyId(ir)` |
| `POLICY_IR_VERSION_UNSUPPORTED` | Upload time only — the bundle declares a `canonicalizerVersion` outside the server's supported set |
| `POLICY_ID_MISMATCH` | Upload time only — client sent `X-Expected-Policy-Id` and it does not match `computePolicyId` |

All are reported under the unified `SnapError` envelope at HTTP 409 on promote and HTTP 400 on upload. A workspace with no `policy-ir.json` cannot be promoted in a governance deployment — there is nothing for the gateway to enforce.

**Opt-out for workspace-history hosts.** Hosts that want snap as a pure snapshot registry without governance set `promotionRequirePolicy: false` in `StartServerOptions`. Promote then only requires the snapshot to exist and the caller to have promote authority. The `snapshot_promote` audit event records `bypassed: true` so downstream compliance review can see which promotions skipped the governance check.

**Rollback uses a subset.** Rollback does not re-verify `policyId` self-consistency (re-verifying at rollback time would make rollback non-recoverable across canonicalizer upgrades — the whole point of rollback is to escape forward). If `promotionRequirePolicy: true`, the IR must still parse without throwing; beyond that, rollback proceeds and the audit event carries a `snapshot_rollback_canonicalizer_downgrade` signal if the version doesn't match the current server.

---

## HTTP server

`startServer` wraps Node's `http` module around a pure `dispatch(deps, req)` handler. The pure handlers live in `server/handlers.ts` so unit tests can exercise every branch without opening sockets.

```ts
// claws-sdk/packages/snap/src/index.ts
export { startServer } from './server/index.js';
export type { ServerHandle, StartServerOptions } from './server/startServer.js';
```

```ts
export interface StartServerOptions {
  readonly port: number;
  readonly store: SnapshotStore;
  readonly authContext?: (headers: Readonly<Record<string, string>>) => AuthContextResult;
  readonly auditSink?: AuditSink;
  readonly promotionRequirePolicy?: boolean;
  readonly host?: string;
  readonly supportedCanonicalizerVersions?: readonly string[];
  readonly idempotencyCache?: IdempotencyCache;
}
```

### Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/snapshots` | Upload pre-made files; server computes ID; returns `{ id, status: 'draft' }` |
| `GET` | `/v1/snapshots` | List snapshots (paginated via `limit`) |
| `GET` | `/v1/snapshots/:id` | Fetch a full snapshot by ID |
| `POST` | `/v1/snapshots/:id/promote` | Transition to `current` (audited) |
| `POST` | `/v1/snapshots/:id/rollback` | Re-promote a prior snapshot (audited) |
| `GET` | `/v1/policy/current` | Convenience: current snapshot's `policy-ir.json` |
| `GET` | `/v1/resolve?uri=oc://…` | Resolve an `oc://` URI against the current snapshot |
| `GET` | `/v1/snapshots/:id/resolve?uri=` | Resolve an `oc://` URI against a specific snapshot |
| `GET` | `/v1/healthz` | Liveness; also reports whether `authContext` is configured |

No `/v1/compile`, no `/v1/validate`. Generation lives in `@openclaw/policy`; snap serves pre-generated artifacts.

### safeParse ingress

Every parse of an untrusted byte source — request body, `policy-ir.json`, resolve URIs — goes through `safeParse(bytes, { maxDepth: 100 })` from `@bic/openclaw-workspace/canonicalize`. Direct `JSON.parse` at the request boundary is a spec violation (C-15 in `workspace.md` §canonicalize).

```ts
// claws-sdk/packages/snap/src/server/startServer.ts
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MiB hard cap

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    total += buf.length;
    if (total > MAX_BODY_BYTES) {
      throw new Error('request body exceeds 10 MiB limit');
    }
    chunks.push(buf);
  }
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');
  return safeParse(raw, { maxDepth: 100 });
}
```

Three things this gate does, in order:

1. **10 MiB body cap** — streams in, counts bytes, throws before allocation blows up on a 10 GB post.
2. **Malformed JSON** — `safeParse` is a SyntaxError-safe wrapper; on failure the adapter returns `400 SNAPSHOT_MALFORMED` through the envelope path.
3. **Depth bomb** — `maxDepth: 100` rejects deeply nested JSON before stack-smashing the parser. Both upload bodies and `policy-ir.json` content inside uploaded bundles hit this gate.

### Upload shift-left gates

Three checks run **before** the draft is persisted, so bad bytes never become a promotable draft:

1. **10 MiB body cap + `safeParse`** — from the ingress above.
2. **`canonicalizerVersion` handshake** — if the bundle contains a `policy-ir.json` that declares a `canonicalizerVersion` outside `supportedCanonicalizerVersions` (default `['1.0.0']`), the upload is rejected with `400 POLICY_IR_VERSION_UNSUPPORTED` and `details: { got, supported }`. This is what prevents the "1000 snapshots stamped v2.x uploaded against a v1.x server, all stuck as un-promotable drafts" storage-exhaustion pattern.
3. **Optional `X-Expected-Policy-Id`** — if present, the server parses the bundled `policy-ir.json` via `safeParse`, computes `policyId` via `computePolicyId(ir)`, and compares. Mismatch returns `400 POLICY_ID_MISMATCH` with both values in `details`.

The header-family semantic: `X-Expected-Snapshot-Id` and `X-Expected-Policy-Id` are **identity assertions** (client says: "I computed this hash, please confirm"), not If-Match ETag preconditions. Integrators that care about end-to-end integrity set both on every mutating upload.

### Idempotency

Every state-mutating endpoint (`POST /v1/snapshots`, `.../promote`, `.../rollback`) requires an `Idempotency-Key` header. Missing returns `400 IDEMPOTENCY_KEY_REQUIRED`. The handler-boundary dedup key for promote/rollback is `(op, snapshotId, idempotency_key)`. Retries within 24h return the cached response and do not emit a duplicate audit event.

```ts
export interface IdempotencyCacheEntry {
  readonly status: number;
  readonly body: unknown;
  readonly expiresAt: number;
}

export interface IdempotencyCache {
  get(key: string): IdempotencyCacheEntry | undefined;
  set(key: string, entry: IdempotencyCacheEntry): void;
}
```

The default is an in-process `Map` — fine for the reference impl and single-node deploys. Multi-replica production wires a Redis (or similar) adapter via `StartServerOptions.idempotencyCache`.

### Auth context (per-request)

`authContext(headers)` is called on every state-mutating request — not once at startup. An auth layer can drift mid-lifetime (OIDC discovery goes empty, a secret rotates to missing), and a startup check would miss it. If the closure throws, or returns an empty `principal`, the handler returns `503 AUTH_CONTEXT_UNAVAILABLE`. That's 503 rather than 401 because it's server health, not caller fault — the correct operator response is drain + investigate, not "reset the user's credential."

`/v1/healthz` reports `authContext: 'configured' | 'unconfigured'` so load balancers can see which instances have the closure wired at all. It does **not** invoke the closure with empty headers — that path used to drain perfectly healthy instances because a compliant JWT validator returns empty on a missing Authorization header.

### Audit events

Snap does **not** maintain an audit chain itself — it emits `AuditEvent` objects to a host-provided sink. The host wires in `@openclaw/guardrails/audit` or its own chain store.

```ts
// claws-sdk/packages/snap/src/server/audit.ts
export type AuditSink = (event: AuditEvent) => void | Promise<void>;
```

Two event actions fire: `snapshot_promote` and `snapshot_rollback`. Each event carries `actor` (principal), `target` (snapshot ID), `scope` (tenant, or `'default'` if single-tenant), a `reason` string composed from the prior ID, whether the governance check was bypassed, and `authContext.freshness` when the auth layer reports it.

The bypass signal is the compliance-relevant one. Every promotion with `promotionRequirePolicy: false` records `policy=bypassed` in the reason field, so post-hoc review can enumerate which governance decisions skipped the self-consistency check. The `authFreshness` signal lets compliance review see the rotation window around each bypassed promotion.

### Store adapters

`SnapshotStore` is the pluggable backend. Two reference implementations ship:

```ts
export function inMemoryStore(): SnapshotStore;
export function filesystemStore(opts: { root: string }): SnapshotStore;
```

Object-storage adapters (S3, Azure Blob, GCS) are host-defined. The `snapshotId` is content-addressable, so the store's job is a simple `id → serialized Snapshot + status metadata` map. `filesystemStore` writes each snapshot to `{root}/snapshots/{id}/` and keeps a small `status.json` tracking which is current.

---

## SnapError envelope

Every 4xx response (and the one 503, `AUTH_CONTEXT_UNAVAILABLE`) across every route shares one body shape. Integrators switch on `code`, not on endpoint.

```ts
// claws-sdk/packages/snap/src/types.ts
export type SnapErrorCode =
  | 'SNAPSHOT_MALFORMED'
  | 'SNAPSHOT_ID_MISMATCH'
  | 'SNAPSHOT_NOT_FOUND'
  | 'POLICY_ID_MISMATCH'
  | 'POLICY_NOT_GENERATED'
  | 'POLICY_IR_MALFORMED'
  | 'POLICY_IR_INCONSISTENT'
  | 'POLICY_IR_VERSION_UNSUPPORTED'
  | 'FORBIDDEN'
  | 'IDEMPOTENCY_KEY_REQUIRED'
  | 'AUTH_CONTEXT_UNAVAILABLE';

export interface SnapError {
  readonly code: SnapErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly snapshotId?: string;
}
```

The enum is **closed**. Every error path — `JSON.parse` SyntaxError, store failure, `authContext` exception, signature-header bytes — funnels through one helper:

```ts
// claws-sdk/packages/snap/src/error.ts
export function toSnapError(
  code: SnapErrorCode,
  err: unknown,
  ctx: ErrContext = {},
): SnapError;
```

This is where the safety contract lives. `toSnapError` does four things, every time:

1. **Gates `code`** to the closed enum (type-enforced; a handler can't invent a new code).
2. **Truncates `message`** to ≤200 chars (no runaway stack-trace dumps).
3. **Strips absolute paths** matching `/(?:^|\s)(?:\/[^\s]+|[A-Z]:\\[^\s]+)/g` — no filesystem layout leaks.
4. **Redacts secrets** — bearer tokens, GitHub tokens (`gh[pousr]_…`), bare JWTs (three dot-separated base64url segments where the first two start with `eyJ`), and `secret=` / `token=` / `password=` / `authorization=` / `api_key=` KV pairs.

All via `sanitizeMessage`:

```ts
// claws-sdk/packages/snap/src/error.ts
export function sanitizeMessage(raw: string): string {
  const scrubbed = raw
    .replace(GITHUB_TOKEN, '[REDACTED:GITHUB_TOKEN]')
    .replace(JWT, '[REDACTED:JWT]')
    .replace(BEARER, '[redacted]')
    .replace(SECRET_KV, '[redacted]')
    .replace(ABSOLUTE_PATH, ' [path]');
  if (scrubbed.length <= MAX_MESSAGE) return scrubbed;
  return `${scrubbed.slice(0, MAX_MESSAGE - 1)}…`;
}
```

### What never leaks

- **`err.stack`** — never serialized into `message` or `details`. The envelope is assembled from sanitized bytes only.
- **Absolute paths** — whether from a `require()` error, an `ENOENT` from the filesystem store, or a parser pointing at the offending token, they are replaced with `[path]`.
- **Bearer tokens, GitHub tokens, JWTs, KV-form secrets** — redacted even when the attacker controls the input bytes that produced the error (for example, a malformed `Authorization` header that ends up in a downstream parse error).

### Why a closed envelope

Plenty of HTTP APIs surface error strings directly from their parsers. That's how filesystem layout ends up in error bodies (`cannot read /Users/giodl/.openclaw/policy/policy-ir.json`) and how bearer tokens end up in bug reports (`JSON parse error near "Authorization: Bearer eyJhbGc…"`). The closed envelope is the prophylactic:

- Handlers cannot emit arbitrary shapes — the type system rejects a `SnapError` with a code outside the enum.
- The sanitizer is a single choke point. If a new class of secret needs redaction, one regex gets added in `sanitizeMessage` and every endpoint, every error path, every store adapter picks it up.
- `err.stack` is structurally outside the envelope. There is no code path that reaches the JSON response carrying it.

### `oc://` paths in error context

When an error is about a specific snapshot, the envelope populates `snapshotId` (the content-addressable ID, safe to surface). The `details` record may carry structured per-code payloads — for instance, `POLICY_ID_MISMATCH` emits `{ expected, computed }`, and `POLICY_IR_VERSION_UNSUPPORTED` emits `{ got, supported }`. These fields are typed, enumerated per code, and go through `sanitizeMessage` if they contain free-form strings. Raw `oc://` URIs are safe to include (they name logical regions of a snapshot, not filesystem locations); absolute disk paths are not.

---

## Eleven verbs + `serve`

The `openclaw snap` CLI group is the thin composition layer in front of the library. Eleven user-facing verbs cover the full workspace-to-registry lifecycle; the twelfth verb is `serve`, which starts the HTTP server above.

| Group | Verb | What it does |
|-------|------|--------------|
| Stage toggle | `stage on` / `stage off` | Flip per-workspace auto-staging; writes to `.openclaw/stage-config.json` |
| Working tree | `status` | One-shot view: stage rules + working tree + drafts + current |
| Working tree | `diff --staged` | Local diff: `.openclaw/.stage/<path>` vs canonical (no registry call) |
| Working tree | `discard --stage` | Clear `.stage/` without uploading |
| Registry | `upload` | `POST /v1/snapshots`; flags `--promote` (atomic upload + promote), `--local`, `--label` |
| Registry | `list` | `GET /v1/snapshots`; filter by `--status` |
| Registry | `diff <a> <b>` | Two-snapshot semantic diff (imports `diffPolicyIR` from `@openclaw/policy` at the handler layer) |
| Registry | `checkout <id>` | Reset working tree to snapshot (git-parallel) |
| Registry | `promote <id>` | `POST /v1/snapshots/:id/promote` |
| Registry | `rollback <id>` | `POST /v1/snapshots/:id/rollback` |
| Registry | `discard <id>` | Drop a draft from the registry (history snapshots are preserved) |
| Daemon | `serve` | Start the HTTP server |

The handler source lives at `claws-sdk/packages/snap/src/cli-handlers/`. Default staging posture is `off` — staging is opt-in per workspace, matching OC-today behavior. For the operator's angle on any of these, follow the cross-links in [See also](#see-also).

---

## Layer cleanliness — the two named couplings

`@openclaw/snap` is designed to be layer-clean. The library treats workspaces as opaque bytes; it doesn't import `@openclaw/policy`, doesn't know what a rule is, doesn't interpret any OC file format. This is what lets a host run snap as a pure backup/history registry without pulling the generator as a transitive dep.

Two couplings exist and are both intentional, both narrow, both named:

1. **Promote-time canonicalization peer.** `@openclaw/snap` and `@openclaw/policy` both peer-depend on `@bic/openclaw-workspace/canonicalize`. At promote time, snap re-hashes the IR via the shared `computeStrippedHash` and compares against the IR's declared `policyId`. Both packages must produce the same bytes — this is why they share the canonicalizer as a peer dep, and why a PolicyIR major version is a coordinated release.
2. **`snap diff` handler composition.** The `snap diff <a> <b>` CLI handler imports `diffPolicyIR` from `@openclaw/policy` at argv-dispatch time. Hosts without `@openclaw/policy` installed get a file-level fallback diff, not a hard error. The library itself has zero runtime dep on `@openclaw/policy`.

Everything else — upload, get, list, rollback, resolve, healthz — treats files as opaque. A host that wants snap as a pure workspace-history service sets `promotionRequirePolicy: false`, skips `snap diff`, and the coupling to policy collapses entirely.

---

## See also

**User-perspective snapshot workflow** (how an operator uses snap from the CLI):

- [Snapshot save](snapshot-save.md) — saving a workspace as a snapshot
- [Snapshot promote](snapshot-promote.md) — making a snapshot current
- [Snapshot restore](snapshot-restore.md) — rolling back to a prior snapshot
- [Snapshot diff](snapshot-diff.md) — comparing two snapshots
- [Snapshot integrity](snapshot-integrity.md) — hash verification and tamper detection
- [Snapshot storage](snapshot-storage.md) — local and remote backends

**Peer packages** (the narrow, named couplings):

- [@openclaw/policy](openclaw-policy.md) — the generator; produces the `policy-ir.json` snap re-hashes at promote
- [@openclaw/workspace](openclaw-workspace.md) — the canonicalize peer dep shared with `@openclaw/policy` so both compute the same bytes

**Spec sources:**

- `docs/claws/proposals/openclaw-upstream/snap.md` — authoritative package spec
- `docs/claws/proposals/openclaw-upstream/snap-commands.md` — eleven-verb CLI reference
- `docs/claws/proposals/openclaw-upstream/openclaw-upstream-spec.md` §4 — architecture overview
