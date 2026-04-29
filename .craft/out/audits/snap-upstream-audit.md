# snap upstream contribution audit

**Date**: 2026-04-28
**Branch**: `feature/isis-the-weaver`
**Scope**: read-only audit of `packages/openclaw-snap/` against upstream `openclaw/openclaw` architecture, with consumption-boundary analysis for claws-serve post-trim.
**Inputs**: claws monorepo `packages/openclaw-snap/`, `packages/claws-serve/src/routes/snapshots-namespace.ts`, `packages/claws-sdk/src/snapshot/`, `docs/snap/specs/`, `.craft/plans/claws-openclaw-upstream.md`, `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/` (Hapi wave), upstream `C:/src/openclaw-core/` (multi-channel AI gateway monorepo) and `C:/src/openclaw-maintainers/` (PR workflow + ops).

---

## TL;DR

`packages/openclaw-snap/` is a self-contained **HTTP-only snapshot registry** — `SnapshotStore` interface + 2 reference impls (in-memory, filesystem) + `startServer()` exposing 9 endpoints, ~1665 LoC, peer-deps `@bic/openclaw-workspace` + `@bic/openclaw-guardrails`. **It is shaped for upstream contribution as-is**: the Hapi wave (PR-7) plans a textual `@bic/openclaw-snap` → `@openclaw/snap` rename with no architectural rework. **Upstream snap does NOT exist yet at `openclaw/openclaw`**; PR-7 is in the wave's pulse-10 draft state but unopened. **Recommended deployment shape upstream is a standalone HTTP service** (`openclaw snap serve [--port 8443]`), runnable as a top-level package alongside the existing `@openclaw/plugin-sdk` and bundled-CLI verbs — NOT as a gateway plugin and NOT as an in-process library. **Consumption boundary from claws-serve is HTTP** (network-call from claws-serve to a co-deployed snap daemon), with the in-process route shell `routes/snapshots-namespace.ts` (~900 LoC) and `routes/snapshot-restore.ts` (~1506 LoC) deleting in favor of thin HTTP-proxy routes.

The biggest architectural gap: **claws-serve's current snapshot routes do NOT consume `packages/openclaw-snap/` at all** — they call into `claws-sdk/src/snapshot/` (a parallel ~1556 LoC implementation). The Hapi-wave packaging extracted a clean upstream-shaped package, but the trim to delete the duplicate from claws-sdk + rewire claws-serve to call upstream snap has not been executed. That is the work item that unblocks the snap UPSTREAM-DEFERRED decision in `claws-surface-audit.md`.

---

## Method

1. Read `packages/openclaw-snap/` source (16 files, 1665 LoC) — index, types, canonical, error, server (audit/handlers/startServer/index), store (in-memory + filesystem), cli-handlers (11 verbs).
2. Read `packages/openclaw-snap/package.json` — name, exports, peer-deps, repo coordinates.
3. Read upstream `C:/src/openclaw-core/` top-level (apps/, extensions/, packages/, src/, ui/) + `package.json` + `pnpm-workspace.yaml`.
4. Read `C:/src/openclaw-maintainers/` (`PR_WORKFLOW.md`, `release/README.md`, top-level layout).
5. Read `.craft/plans/claws-openclaw-upstream.md` (the upstream-contribution plan) + Hapi-wave PR-7 pulse + draft (`.craft/waves/260427+hapi-the-bringer+openclaw-upstream/{pulses/10+pr7-openclaw-snap.md, pr-drafts/PR-7.md}`).
6. Cross-reference `packages/claws-serve/src/routes/snapshots-namespace.ts` + `routes/snapshot-restore.ts` + `claws-sdk/src/snapshot/` to identify duplicated functionality.
7. Read `docs/snap/specs/{SN-snap.md, SNA-api.md, SNP-promote.md}` for the documented contract.
8. Cross-reference whiskey's surface audit at `.craft/out/audits/claws-surface-audit.md` decisions §1, §9, §11.

LoC counts via `wc -l`; bucket assignments validated against upstream package patterns and Hapi-wave plan.

---

## Claws-side snap (what we have)

### Package shape

**Location**: `C:/src/claws/packages/openclaw-snap/` — ~1665 LoC across 16 src files + tests.

**Package metadata** (`package.json`):
- Name: `@bic/openclaw-snap` (intended rename: `@openclaw/snap` per Hapi wave PR-7)
- Version: 0.2.0
- License: MIT
- Type: ESM-only
- Main entry: `./dist/index.js`
- Subpath exports: `.` (root), `./cli-handlers`, `./package.json`
- Peer deps: `@bic/openclaw-guardrails ^0.1.0`, `@bic/openclaw-workspace ^0.1.0`
- Dev deps include `@bic/openclaw-policy *` (test-time consumer)
- Repo: `git+https://microsoft.ghe.com/bic/claws.git` directory `claws-sdk/packages/snap`
- `engines.node`: ≥20.0.0

**Public API surface**:
- Types: `Snapshot`, `SnapshotMeta`, `SnapshotStatus`, `SnapshotStore`, `ListOpts`, `PromoteContext`, `ResolveResult`, `SnapError`, `SnapErrorCode`
- Reference stores: `inMemoryStore()`, `filesystemStore({root})`
- Server: `startServer({port, store, authContext?, auditSink?, ...})` → `ServerHandle`
- Hashing helpers: `computeSnapshotId(files)`, `computePolicyId(ir)`, plus re-exported `canonicalize`, `canonicalHash`, `CANONICALIZER_VERSION` from `@bic/openclaw-workspace/canonicalize`

**HTTP surface — 9 endpoints** (all `/v1/*`, parsed in `src/server/handlers.ts`):
- `GET /v1/healthz` — liveness probe (always returns 200; no auth required)
- `POST /v1/snapshots` — upload pre-canonicalized snapshot; computes `snapshotId`; gates on `X-Expected-Snapshot-Id` and policy-IR shift-left validation
- `GET /v1/snapshots` — list (limit param)
- `GET /v1/snapshots/:id` — fetch
- `POST /v1/snapshots/:id/promote` — draft → current; idempotency-key required; emits `snapshot_promote` audit event
- `POST /v1/snapshots/:id/rollback` — re-promote a prior id; idempotency-key required; emits `snapshot_rollback` audit event
- `GET /v1/policy/current` — fetch the current snapshot's `policy-ir.json` content
- `GET /v1/resolve?uri=oc://...` — resolve oc:// URI against current snapshot
- `GET /v1/snapshots/:id/resolve?uri=oc://...` — resolve against a specific snapshot

**CLI handler surface — 11 verbs** in `src/cli-handlers/`:
`checkout, client, diff, diffStaged, discardStage, list, promote, rollback, serve, stage, status, upload` — each ≤75 LoC, all delegate to a shared `httpCall()` helper that goes over the wire (the daemon at `--endpoint`). Same handlers run against local or remote snap daemon.

### Architectural assumptions baked in

- **HTTP server**, not library. Pure-handler split (`handlers.ts`) + Node `http` adapter (`startServer.ts`); handlers are unit-testable without sockets. No in-process API for working-tree manipulation — those were intentionally **reverted** from earlier spec drafts (per `src/index.ts:9-12`: "no library-first working-tree API").
- **Stateful**, but state-shape is pluggable via `SnapshotStore` interface. Reference impls: in-memory (single-process, ephemeral) and filesystem (single-node, atomic via `writeFile + rename` to temp).
- **Concurrency model**: Node single-threaded event loop. Promote/rollback writes are atomic at the JS reference-assignment level (per `docs/snap/specs/SNP-promote.md` §Commit point); idempotency cache (in-memory Map by default) deduplicates retried promote/rollback ops over a 24h TTL.
- **Auth pluggable**: `authContext(headers)` callback returning `{principal, tenant?, freshnessSeconds?}` — server doesn't bake in any specific JWT/OAuth flow. Default principal is `anonymous` if no callback supplied.
- **Audit sink pluggable**: `AuditSink` callback fires on promote/rollback success; integrates with `@openclaw/guardrails/audit` upstream but the contract is just `(event) => Promise<void>`.
- **Idempotency cache pluggable**: default in-memory Map; production deployments can pass Redis-backed `IdempotencyCache` interface.
- **Body limit**: 10 MiB hard cap.
- **No tight coupling to claws-monorepo specifics**. The package consumes only `@bic/openclaw-workspace/{canonicalize,path}` (peer-dep, also slated for upstream rename). Zero imports from `@bic/claws-sdk/*`, `claws-serve`, lobster-web, etc.

### Used by which claws-serve routes / SDK helpers

**Important finding**: `packages/openclaw-snap/` is **NOT currently consumed** by `packages/claws-serve/` or `packages/claws-sdk/`. A grep for `openclaw-snap` / `@bic/openclaw-snap` against both yields zero hits.

The current claws-serve snapshot routes (`routes/snapshots-namespace.ts` 900 LoC, `routes/snapshot-restore.ts` 1506 LoC) call into `claws-sdk/src/snapshot/` (~1556 LoC, 11 files: `save`, `restore`, `manifest`, `storage`, `integrity`, `promote`, `provenance`, `diff`, `diff-renderer`, `fleet-registry`, plus `index`). This is a parallel, in-process implementation that predates the Hapi extraction. Its API is **NOT** wire-compatible with `@bic/openclaw-snap`'s 9-endpoint HTTP surface — it's a direct `save(workspaceRoot, name)` call returning a `SaveResult`.

**Current consumption cycle**: the package was extracted from earlier `claws-sdk/src/snapshot/` work for upstream contribution but the in-monorepo consumers were **not migrated** to use the extracted package. Both implementations coexist.

### Tests + coverage shape

`packages/openclaw-snap/tests/`:
- `cli-handlers/` — per-verb fixture tests
- `server/` — handler unit tests (no sockets) + startServer integration
- `store/` — in-memory + filesystem store contract tests
- `policy-snap-policyid-conformance.integration.test.ts` — cross-package canonicalizer-version handshake with `@bic/openclaw-policy`

Coverage is currently scoped to the package's own surface; no claws-serve integration tests exercise `@bic/openclaw-snap` because claws-serve doesn't consume it.

---

## Upstream openclaw (what receives the contribution)

### Repo layout

`C:/src/openclaw-core/` is the upstream `openclaw/openclaw` repository. Top-level relevant directories:

- `apps/` — `android`, `ios`, `macos`, `macos-mlx-tts`, `shared`
- `extensions/` — 131 directories (channel/provider extensions: `discord`, `bluebubbles`, `anthropic`, `amazon-bedrock`, `arcee`, `azure-speech`, `brave`, etc.)
- `packages/` — `memory-host-sdk`, `plugin-package-contract`, `plugin-sdk`. **Three** packages today.
- `src/` — monolithic core (~hundreds of `.ts` files: `gateway/`, `acp/`, `agents/`, `bootstrap/`, `cli/`, `config/`, `cron/`, etc.). The "gateway" lives here as `src/gateway/`, not as a separate package.
- `ui/` — `src/ui/` Electron-style UI surface
- `skills/`, `extensions/`, `patches/`, etc.

`pnpm-workspace.yaml` includes `.`, `ui`, `packages/*`, `extensions/*`. Notable: `minimumReleaseAge: 2880` (2-day quarantine on dependency updates) for supply-chain hygiene.

`package.json` self-describes as "**Multi-channel AI gateway with extensible messaging integrations**" — this is the multi-channel AI assistant/gateway product (Discord/Matrix/iMessage/Bedrock etc.), with extensible plugins published as `@openclaw/*` packages and extensions distributed via the bundled-plugin tree.

### Where does snap fit?

**Per the Hapi wave plan (`.craft/plans/claws-openclaw-upstream.md` H4 + PR-7 pulse + draft)**:

- **Standalone top-level `packages/snap/`** in upstream openclaw-core, alongside the existing 3 packages. Same shape as `packages/plugin-sdk/`: `package.json` with `@openclaw/snap` name, `src/`, subpath exports.
- Hosted as a daemon — `openclaw snap serve [--port 8443]` — meaning the upstream `openclaw` CLI gains a `snap serve` verb that boots `startServer()` on the configured port. This is a **separate process** that consumers (gateway, generated plugins, audit chain readers) call over HTTP.
- **NOT a gateway plugin**. `openclaw-core/src/gateway/` is the multi-channel routing engine; snap is conceptually below it (a fact about the workspace state at any moment) and outside the request path. Plugins extend the gateway's messaging surface; snap doesn't.
- **NOT in-process library only**. The upstream architecture wants HTTP because (a) the audit chain is anchored to byte-stable snapshotIds that need to be served to multiple consumers, (b) the e-discovery temporal query (`resolvePolicy --at <ts>`) is a server-only verb that walks the audit chain, (c) the `/v1/resolve` endpoint is the URI vocabulary's resolution endpoint that LSPs, audit logs, and `doctor --json` all consume.

**Recommended shape**: standalone HTTP service running as a sibling process to the openclaw gateway. Same binary (`openclaw` CLI) but a different verb. Library import is available (`@openclaw/snap` exports the in-memory store + types) but the integration surface is the HTTP wire — that's intentional per `src/index.ts:9-12`.

### In-flight snap proposal at upstream — current state

**Nothing has landed at upstream yet**. As of 2026-04-28 (Hapi wave is active, branch `feature/isis-the-weaver`):

- PR-7 (`@openclaw/snap`) is in **draft state** in `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/pr-drafts/PR-7.md` — has not been opened at `github.com/openclaw/openclaw`.
- PR-7 sequencing is **last in the wave** (depends on PR-1 workspace, PR-3/4 guardrails+OC-4, PR-5/6 OC-7+policy). Wave sequence: A → B → C → D.
- The wave has not started opening upstream PRs (Wave A is workspace foothold; OC-4 + workspace ship first).
- Hapi wave plan was published 2026-04-27; ~1 day of execution to date.
- No public RFC or design doc references `@openclaw/snap` at the upstream repo (there is no `docs/snap/` upstream; the spec lives entirely in this monorepo at `docs/snap/specs/`).

The PR-7 draft is comprehensive (snap package + CLI + HTTP + temporal query + SOC2/HIPAA rubrics + Swift model regen) and bot-pre-empt-checklist-aware. But there is no upstream activity yet.

### How upstream existing packages run (deploy model)

Upstream's current 3 packages (`memory-host-sdk`, `plugin-package-contract`, `plugin-sdk`) are **library packages** — type/runtime contracts published to npm under `@openclaw/*`, consumed in-process by `openclaw-core` core code and by extensions. None of them runs a server.

`openclaw-core` itself ships as a single npm package (`openclaw`) plus the macOS app + iOS/Android wrappers. Gateway is in-process; channels are in-process plugins; storage is local/SQLite/filesystem.

**This means `@openclaw/snap` would be the FIRST upstream package that runs as a daemon**. The CLI verb model (`openclaw snap serve`) keeps it inside the existing single-binary distribution shape — operationally a sub-process spawned by the host, deployed alongside `openclaw` itself. From a packaging angle this matches openclaw-core's existing pattern (one binary, multiple verbs); from a runtime angle this is a meaningfully new shape (long-running listener, auth, audit-sink wiring, idempotency cache).

### "The gateway" — what is it?

In upstream openclaw-core, "the gateway" is `src/gateway/` — the multi-channel AI gateway: routes user inputs from Discord/Matrix/iMessage/etc. to LLM providers (Anthropic/Bedrock/Azure/etc.), manages session state, dispatches tool calls, reconciles model outputs. Schema-stable wire formats live in `src/gateway/protocol/schema/`.

There IS a `snapshot.ts` in upstream gateway protocol schema (`src/gateway/protocol/schema/snapshot.ts`) — but it's a **completely unrelated artifact**: a presence/health snapshot for cross-device session coordination (`PresenceEntrySchema`, `HealthSnapshotSchema`, `SnapshotSchema` over presence/health arrays). This is gateway-internal session state, not the policy-anchored content-addressable workspace snapshot that `@openclaw/snap` defines.

**Decision: snap does NOT belong in `src/gateway/`**. It belongs as a standalone top-level package (`packages/snap/`) whose HTTP daemon runs alongside the gateway. The gateway might consume the snap server (e.g., for e-discovery audit anchoring), but it's not a gateway plugin and it's not gateway-protocol code.

The upstream "gateway plugin" concept (per `@openclaw/plugin-sdk`) is for messaging-channel extensions — Discord adapter, Bedrock provider adapter — not for governance primitives. Snap is not a plugin in that sense.

### Contribution process (per `PR_WORKFLOW.md`)

Maintainer-side workflow at `C:/src/openclaw-maintainers/.agents/skills/PR_WORKFLOW.md`:

- 3-skill flow: `review-pr` → `prepare-pr` → `merge-pr`. Maintainers can amend PR head branch via `prepare-pr`.
- Required artifacts: `.local/{pr-meta.json, pr-meta.env, review.md, review.json, prep-context.env, prep.md, prep.env}` per PR worktree.
- PR quality bar: no `any` in implementation; type external-input boundaries; reuse canonical sources of truth (canonicalizer, hashing) — single-source-of-truth across the codebase.
- Gates: `pnpm install --frozen-lockfile && pnpm build && pnpm check && pnpm test`.
- No `--auto` merges — maintainers do squash merges deterministically with `--match-head-commit` + `Co-authored-by:` trailer.

Contributor-side rules (per `project_openclaw_pr_rules.md`):

- **10-PR-per-author cap** — `r: too-many-prs` auto-closes excess. Hapi wave's 7 PRs fits under this.
- **Refactor-only auto-rejected** — must be paired with a fix.
- **Test-only auto-rejected** for known main failures.
- **One thing per PR**. PR-7's bundle (snap pkg + CLI + HTTP + temporal query + rubrics) is at risk; PR-7 draft frames it as one substrate-level fix.
- **CODEOWNERS security paths** — `/src/config/*secret*.ts`, `/src/security/`, `/src/secrets/`, `/src/gateway/*secret*.ts` need `@openclaw/secops` review. Snap's `authContext` boundary touches secrets-adjacent territory at the *consumer* level; the package itself doesn't read secrets so this is unlikely to trigger CODEOWNERS, but the upstream audit-sink wiring may.
- **AI-assisted disclosure expected** in PR description; "fully tested" status preferred.
- **American English** spelling.

**Slot allocation for snap (Hapi wave)**: 1 of 7 PRs (PR-7). At maintainer pacing (2 PRs open at a time, ~4-hour median time-to-merge for bot-reviewer trio Greptile + Copilot + chatgpt-codex), PR-7 lands in Wave D after Wave C (PR-5 OC-7 + PR-6 policy) merges.

---

## Gap analysis

### Architectural gaps

1. **Upstream-side**: there is no `packages/snap/` at upstream openclaw-core today. The textual rename `@bic/openclaw-snap` → `@openclaw/snap` doesn't bridge a missing piece — it lifts a complete package over. Risk: maintainer feedback may want snap restructured to fit alongside `plugin-sdk` (e.g., subpath-export reorganization, dependency tightening, integration with `@openclaw/plugin-sdk` types).

2. **Daemon shape is novel**. No existing upstream package runs as a server. PR-7's `openclaw snap serve` verb introduces (a) long-running listener lifecycle, (b) port management + Bonjour-discovery considerations, (c) auth-callback wiring at the process boundary. The reviewer trio may push back on the deploy shape: "where does this run?", "what supervises it?", "what's the systemd / launchd unit?".

3. **No production deployment story baked in**. The Hapi wave plan does not specify how snap-daemon gets deployed in production. The package has the runtime and CLI to spin up locally, but: process supervision? TLS termination? auth-context wiring (what JWT validator does the upstream openclaw expect)? graceful shutdown semantics? These are things upstream maintainers may ask before accepting a long-running listener.

4. **Authentication boundary is pluggable but unwired**. `authContext(headers)` is a callback type. PR-7 doesn't wire it to a specific upstream identity provider. Upstream may want this wired to the gateway's existing auth-token resolution (`src/gateway/auth-token-resolution.ts`) before merging — meaning we'd need to write the upstream-specific adapter inside the package or the snap-CLI bootstrap.

### Surface/API gaps

5. **No upstream `@openclaw/snap` precedent**, so the wire contract is what we ship. The 9 endpoints, the `Idempotency-Key` requirement on promote/rollback, the `X-Expected-Snapshot-Id` shift-left header, the `OC_PATH_NOT_FOUND` envelope, the `safeParse` JSON depth limit — all are decisions baked into the package that upstream maintainers will review on first contact. No prior art constraints us, but no prior art validates us either.

6. **Audit envelope shape**. PR-7 emits `snapshot_promote` / `snapshot_supersede` / `snapshot_rollback` events into `@openclaw/guardrails/audit`. The audit-stream adapter audit (H6 deliverable in the wave plan) needs to confirm the wire shape matches openclaw-core's existing audit envelope before PR-7 opens. Unaudited shape mismatch would be an immediate revert.

7. **`/v1/resolve` URI scheme dependency on PR-2**. The endpoint accepts `oc://config/...` URIs (runtime-config addressing) which depend on PR-2 (oc:// scheme extension) being merged first. PR-7 is sequenced after Wave A by design, but if PR-2 lands without snap-side adoption, the URI vocabulary fragments.

### Coupling gaps

8. **Peer-dep fan-out**. Package depends on `@bic/openclaw-workspace` (to be `@openclaw/workspace`) + `@bic/openclaw-guardrails` (to be `@openclaw/guardrails`) + dev-time `@bic/openclaw-policy`. The rename + version-pin to upstream-merged tags is a `peerDependencies` flip, mechanically simple but needs every dep to land first (Wave A → B → D ordering enforces this).

9. **Repo coordinates in `package.json`**. Currently `git+https://microsoft.ghe.com/bic/claws.git` directory `claws-sdk/packages/snap` (which is wrong even today — the path is `packages/openclaw-snap`). Will need to flip to upstream `git+https://github.com/openclaw/openclaw.git` + correct directory at upstream-rename time.

10. **No claws-monorepo-isms in source code**. Verified: zero imports from `claws-sdk/`, `claws-serve/`, `lobster-web/` in `packages/openclaw-snap/src/`. Nothing to rip out.

11. **Test fixture cross-package call**. The `policy-snap-policyid-conformance.integration.test.ts` integration test hits `@bic/openclaw-policy`'s canonicalizer to verify cross-package byte-parity. Upstream this is fine (both packages move together), but the test setup needs the `@openclaw/policy` rename applied in the same PR.

---

## Consumption boundary (claws-serve → upstream snap)

### What claws-serve (post-trim) needs from snap

Per `claws-surface-audit.md` decision §1 (snapshots-namespace), §9 (auto-snapshot triggers), §11 (version-history undo/redo):

1. **Snapshot capture** — `POST /api/oc/snapshots` route receives a name, samples violation state, gates, then needs to ask snap: "save these workspace files as a draft snapshot." → upstream `POST /v1/snapshots` (with the workspace bytes serialized into the request body, plus `X-Expected-Snapshot-Id` if claws-serve pre-computes the id for verification).
2. **Snapshot listing** — `GET /api/oc/snapshots` → upstream `GET /v1/snapshots[?status=...]` + paginate.
3. **Snapshot describe** — `GET /api/oc/snapshots/:name` → upstream `GET /v1/snapshots/:id`.
4. **Snapshot restore** — `POST /api/oc/snapshots/:name/restore` → upstream `POST /v1/snapshots/:id/promote` (current snapshot becomes restored snapshot's `:id`).
5. **Undo/redo replay body** — version-history's deep manifest-replay (~1300 LoC of `routes/version-history.ts`) → upstream `POST /v1/snapshots/:id/promote` for each step in the cursor walk. Cursor-walk (~400 LoC) stays in claws-serve (per audit §11).
6. **Diff-render data** (optional) — diff route reads two snapshot manifests for unified-diff render → upstream `GET /v1/snapshots/:idA` + `GET /v1/snapshots/:idB`.
7. **Auto-snapshot trigger** — `commit-on-success.ts` middleware emits a snapshot after committed mutations → upstream `POST /v1/snapshots` (with `Idempotency-Key` keyed to the commit).
8. **Optional: SSE invalidation** — when upstream snap promotes/rollbacks, claws-serve wants to broadcast `snapshot.created` / `snapshot.restored` SSE events to lobster-web. Two options: (a) claws-serve polls `/v1/snapshots` periodically; (b) snap exposes its own SSE stream. Today snap does not have an SSE stream (the docs `SNA-api.md` mentions one in the design but the implementation only has the audit-sink callback). For initial trim, polling or audit-sink-bridging from a co-located snap daemon should work.

### Wire/library boundary recommendation

**Recommended: HTTP from claws-serve to a co-deployed snap daemon.**

Reasoning:
- Snap is fundamentally HTTP-shaped (the package explicitly disclaims a library-first working-tree API). Forcing in-process consumption would require building a parallel API surface that doesn't exist in the package.
- The Eduardo filing model (containerize + AKS + Helm + OneCert + KeyVault) is friendlier to two co-deployed processes (claws-serve + snap-daemon as sidecars in the same pod) than to a single-process embedding, because:
  - Snap's authContext + idempotency cache + audit-sink each want their own observability surface
  - Restart semantics differ: snap state can be reloaded from the filesystem store; claws-serve state is in-memory
  - Independent CPU + memory budgets
- The HTTP boundary matches upstream's intended deploy shape — claws becomes a first-class consumer of the upstream daemon rather than a special embedded variant.
- The 9-endpoint surface is small enough that an HTTP client wrapper in `claws-serve` is ~150 LoC (similar to `@bic/openclaw-snap/cli-handlers/client.ts`).

**Trade-off**: an extra hop on every snapshot-related request. For lobster-web's typical traffic pattern (occasional snapshot capture + restore, frequent reads of the listing / diff), this is acceptable — the latency overhead is local-network microseconds, not user-perceivable.

**Alternative considered but rejected**: in-process import of `@openclaw/snap` into claws-serve. This works for the in-memory store (test scenarios) but not for production: the filesystem store needs disk-write permissions co-located with claws-serve, and the audit-sink wiring would either bypass upstream's audit chain (silent corruption risk) or force claws-serve to import `@openclaw/guardrails/audit` (re-introduces the duplication we're trying to delete).

### Compatibility with Eduardo's filing model (containerize + AKS + Helm + OneCert + KeyVault)

Per `project_lobster_ownership.md`: Eduardo owns the deploy pattern; we don't pre-commit. But the HTTP-boundary approach is forward-compatible:

- **Containerization**: snap-daemon ships in its own image (built from `@openclaw/snap` via `openclaw snap serve`), runnable as a sidecar to claws-serve in the same pod, with a shared persistent volume for the filesystem store.
- **AKS + Helm**: chart specifies two deployments (claws-serve + snap-daemon) with a service for the snap-daemon. Claws-serve's container env-var `SNAP_ENDPOINT=http://snap-daemon.svc.cluster.local:8443` (or `http://localhost:8443` if sidecar).
- **OneCert / KeyVault**: TLS termination at the ingress for the public-facing claws-serve; internal claws-serve→snap traffic over HTTP plain (in-cluster) or TLS via mesh. Snap's `authContext` callback can be wired to validate the bearer token claws-serve forwards (which originated at the user-facing JWT validator at the ingress).

**Open question for Eduardo**: does the filing model prefer (a) snap as a sidecar in the claws-serve pod (1:1 lifecycle), or (b) snap as its own deployment with its own service (N:1 lifecycle, allowing multiple claws-serve instances to share one snap daemon)? Default recommendation is (b) for production (snap is the source-of-truth registry and shouldn't have N parallel filesystem stores), but (a) for dev/single-tenant pilot deployments.

---

## Recommended next steps

### 1. Pre-contribution rework (in claws monorepo, before opening PR-7)

- [ ] **Trim claws-sdk's snapshot duplicate**. Delete `packages/claws-sdk/src/snapshot/` (~1556 LoC) and route claws-serve to call `@bic/openclaw-snap` (in-process, until upstream lands; over HTTP after). This is the snap UPSTREAM-DEFERRED action from `claws-surface-audit.md`. Risk: the surface audit estimates 1.4k LoC overlap; the actual figure is 1556 LoC. Restore body `routes/snapshot-restore.ts` (1506 LoC) deletes simultaneously since its R5-classification + manifest-replay machinery moves into snap-server's `promote` handler.
- [ ] **Wire claws-serve's snapshot routes to call `@bic/openclaw-snap`**. Replace `claws-sdk/src/snapshot/save()` calls with HTTP calls to a configurable `SNAP_ENDPOINT`. Default endpoint at `http://localhost:8443` for dev; production wires via Helm.
- [ ] **Boot a local snap daemon** in dev (`pnpm --filter @bic/openclaw-snap serve` or via `claws snap serve` if the dev CLI grows the verb). Document in `docs/snap/guides/`.
- [ ] **Audit-sink + idempotency-cache wiring**. Decide whether claws-serve's audit chain (per `claws-sdk/src/audit/`) bridges to snap's audit-sink callback, or whether snap emits its own audit chain that claws-serve consumes. Cleaner: snap owns the event emission; claws-serve subscribes for SSE invalidation.
- [ ] **Spec parity check**. Reconcile `docs/snap/specs/SN-snap.md` (the in-claws spec, mentions `/snap/promote` paths and `state-change` SSE events that don't exist in the package) with `packages/openclaw-snap/src/server/handlers.ts` (the actual implementation, `/v1/snapshots/:id/promote` paths and audit-sink-only events). Either update the spec or implement the missing SSE stream. PR-7 needs the spec + impl to agree before upstream review.
- [ ] **Resolve `package.json` repo-coordinates inconsistency** (currently says directory `claws-sdk/packages/snap` but actual is `packages/openclaw-snap`).

### 2. Upstream coordination (with openclaw maintainers)

- [ ] **RFC channel**: post a snap-package design note in `#clawtributors` on Discord BEFORE opening PR-7. Per the 10-PR cap rules + maintainer culture, coordinated change sets benefit from advance notice. Surface: "we're opening 7 PRs in waves; PR-7 introduces a long-running daemon as a top-level package; here's the API surface; here's why it's core-not-extension." Lock in the deploy-shape decision (sidecar vs co-located vs separate) before maintainers see the diff.
- [ ] **Adapter audit deliverable** (H6 in Hapi plan). `docs/upstream/guides/adapter-audits.md` must reach "OK to land" verdict for (a) emitted-plugin registration vs `PluginHookRegistration` (this is a PR-6/policy concern but snap consumes the policy IR shape via `policy-snap-policyid-conformance.integration.test.ts`), (b) audit-stream wire match — snap emits to the audit chain, this needs cross-validation against upstream's `src/control-plane-audit.ts` envelope shape.
- [ ] **Bot pre-empt checklist**. PR-7 draft already addresses Greptile/Copilot/chatgpt-codex pre-empts; verify Swift protocol model regen lands (gateway HTTP surface change).

### 3. Sequencing with claws trim

- [ ] **Order of operations**:
  1. Hapi Wave A (PR-1 workspace + PR-2 oc:// scheme) — lands in upstream
  2. Hapi Wave B (PR-3 OC-4 + PR-4 guardrails) — lands in upstream
  3. **Claws-side trim begins**: delete `claws-sdk/src/snapshot/`, rewire claws-serve to consume `@bic/openclaw-snap` (in-process, dev only). Do NOT yet delete the legacy claws-serve route bodies — keep them disabled-by-flag for rollback.
  4. Hapi Wave C (PR-5 OC-7 + PR-6 policy) — lands in upstream
  5. Hapi Wave D (PR-7 snap rename) — lands in upstream
  6. **Scope-flip in claws**: rename `@bic/openclaw-*` → `@openclaw/*` across the claws monorepo's lockfiles + imports
  7. **Wire claws-serve to call snap over HTTP** (production deploy posture). Snap-daemon co-deployed via Eduardo's filing.
  8. **Final delete**: legacy `routes/snapshot-restore.ts` + bulk of `routes/snapshots-namespace.ts` deleted; only the thin HTTP-proxy route shells remain.

### 4. Risks and open questions

- **Risk: upstream maintainer pushback on daemon shape**. No precedent at upstream for a long-running listener as a top-level package. Maintainers may suggest snap-as-library + host-owns-the-listener (which would invalidate the package's `startServer` design). Mitigation: pre-RFC in Discord; lead PR-7 description with deploy-shape reasoning.
- **Risk: PR-7 scope is wide** (package + CLI + HTTP + temporal query + 2 compliance rubrics + Swift regen). "One thing per PR" gate may suggest splitting. Mitigation: PR-7 draft frames as "one substrate-level fix for snapshot-anchored evidence chain"; if split is required, leading split candidate is `resolvePolicy --at` temporal query + compliance rubrics into a follow-up PR-8 (within 10-PR cap if Wave already merged 7).
- **Risk: SNA-api.md spec drift**. The in-claws spec references `/snap/promote` paths and `state-change` SSE events that don't exist in the package. Either spec is stale or implementation is incomplete. Audit + reconcile before PR-7 open.
- **Risk: claws-serve ETag/If-Match flow incompatibility**. Today's snapshot routes participate in claws-serve's ETag concurrency model (per LBC v0.2 §3.2). Upstream `@openclaw/snap` doesn't surface ETags — the wire contract has `Idempotency-Key` for promote/rollback but no ETag for resource state. Bridging: claws-serve generates the ETag from upstream's snapshot body hash (`computeSnapshotId` is content-addressable, ETag is just `"sha256-..."`). Doable but needs confirmation.
- **Open question — auth wiring at consumer boundary**. When claws-serve (running in Eduardo's filing) calls upstream snap, what `Authorization` header does it forward? snap's `authContext({...headers})` callback decides the principal but the wire token format is undefined at the package layer. Likely: claws-serve forwards the bearer JWT it received from lobster-web; snap-daemon's authContext validates against Microsoft Entra (or equivalent). Need to wire this in the snap-side bootstrap before production.
- **Open question — multi-tenant snap state**. `filesystemStore` is single-root; if claws-serve is multi-tenant, does each tenant get its own snap daemon, or does snap-daemon become tenant-aware? Today: single-tenant. Future: tenant-axis on `Snapshot.author` is plausible but not implemented.
- **Open question — `/v1/snapshots/:name/restore` semantics in claws vs `/v1/snapshots/:id/promote` upstream**. Claws routes use `:name` (a human-readable snapshot label like `auto-2026-04-28-12-00`); upstream uses `:id` (sha256-base64url content hash). Adapter mapping: claws-serve maintains a name→id map locally (via metadata.json in the workspace `.claws/snapshots/`) and translates name lookups before calling upstream. Already implemented in `routes/snapshots-namespace.ts:metadata` shape; needs wiring to the HTTP client.

---

## Verification

Files / commands used:

- `wc -l C:/src/claws/packages/openclaw-snap/src/**` — total 1665 LoC across src tree
- `wc -l C:/src/claws/packages/claws-sdk/src/snapshot/*.ts` — 1556 LoC duplicate impl
- `wc -l C:/src/claws/packages/claws-serve/src/routes/snapshots-namespace.ts` (900) + `routes/snapshot-restore.ts` (1506)
- Read `C:/src/claws/packages/openclaw-snap/{package.json, src/index.ts, src/types.ts, src/canonical.ts, src/server/{handlers.ts, startServer.ts}, src/store/{filesystemStore.ts, inMemoryStore.ts}, src/cli-handlers/client.ts}`
- Read upstream `C:/src/openclaw-core/{package.json, pnpm-workspace.yaml, packages/plugin-sdk/package.json, src/gateway/protocol/schema/snapshot.ts}`
- Read upstream maintainer docs: `C:/src/openclaw-maintainers/{README.md, .agents/skills/PR_WORKFLOW.md, release/README.md}`
- `ls` on `C:/src/openclaw-core/{packages,extensions,src,apps,ui}/` and `C:/src/openclaw-core/src/gateway/`
- Glob `C:/src/openclaw-core/**/snap*.{ts,md,json}` — only 2 hits, both unrelated to the snapshot registry concept
- Read `C:/src/claws/.craft/plans/claws-openclaw-upstream.md` (full) and Hapi-wave PR-7 pulse + draft
- Read `C:/src/claws/.craft/plans/claws-pre-extraction-packaging.md` (Ra II background)
- Read `C:/src/claws/docs/snap/specs/{SN-snap.md, SNA-api.md, SNP-promote.md}`
- Read `C:/src/claws/.craft/out/audits/claws-surface-audit.md` (decisions §1, §9, §11)
- Read memory: `MEMORY.md`, `project_openclaw_upstream.md`, `project_openclaw_pr_rules.md`, `reference_openclaw_maintainers_repo.md`, `project_lobster_ownership.md`
- Grep `openclaw-snap|@bic/openclaw-snap` against `packages/claws-serve/src/` and `packages/claws-sdk/src/` — **zero hits** (the load-bearing finding for the consumption-gap analysis)

LoC counts are file-level `wc -l`; bucket assignments cross-validated against the `claws-surface-audit.md` UPSTREAM-DEFERRED bucket where applicable.
