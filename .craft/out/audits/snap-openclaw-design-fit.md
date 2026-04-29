# Snap × OpenClaw design fit — Peter's lens

**Date**: 2026-04-28
**Branch**: `feature/isis-the-weaver`
**Scope**: read-only architectural audit reframing x-ray's `snap-upstream-audit.md` through Peter Steinberger's design philosophy. Question: **if Peter wanted to add snapshotting to OpenClaw for everyone, how would he do it?** Not "how do we get our daemon into upstream?"
**Inputs**: `C:/src/openclaw-core/` (upstream source — `packages/`, `extensions/`, `src/plugin-sdk/`, `src/plugins/types.ts`, `docs/plugins/`, `AGENTS.md`, `CONTRIBUTING.md`); `C:/src/claws/packages/openclaw-snap/`; `C:/src/claws/packages/claws-sdk/src/snapshot/`; x-ray's prior audit at `.craft/out/audits/snap-upstream-audit.md` (read for facts only — its contribution-shape conclusions are the thing we're questioning).

---

## TL;DR

**Peter does not ship daemons as packages. He ships contracts + capabilities, and plugins implement them.** Upstream OpenClaw's three packages (`memory-host-sdk`, `plugin-package-contract`, `plugin-sdk`) are thin re-export shells over `src/plugin-sdk/*` — pure types, runtime contracts, and registration helpers. The "daemon shape" already exists upstream — but it's a **plugin** that calls `api.registerService(...)` + `api.registerHttpRoute({ path, auth, handler })` to mount routes ON the gateway's existing HTTP listener (see `extensions/diagnostics-prometheus/index.ts:6-20` and `extensions/webhooks/index.ts:32-38`). No new port, no new process, no new top-level package.

This means **x-ray's "standalone top-level `packages/snap/` running as a sibling daemon process" framing is inverted.** The Peter-shaped contribution is at most: (a) snapshot **types/contract** added to `src/plugin-sdk/snapshot.ts` (~50–150 LoC, mirroring `provider-web-search-contract.ts`'s shape) so the ecosystem can implement against it, and (b) optionally an `extensions/snapshot/` bundled plugin that uses `registerService` + `registerHttpRoute` to expose `/api/snapshots/*` ON the gateway. The current `packages/openclaw-snap/` (1665 LoC, its own HTTP server, its own process, 9 hand-rolled `/v1/*` endpoints) is **architecturally hostile** to upstream — it duplicates the gateway's own HTTP boundary, ignores the SDK registration model, and re-implements auth/audit-sink hooks that the gateway already provides.

**Recommendation: Option A** — contribute snapshot **types** to `src/plugin-sdk/` (small, low-risk, low-coordination); keep our daemon **downstream** (rename `packages/openclaw-snap/` → `packages/claws-snap-server/`); its conforming-impl claim is "implements the upstream `SnapshotStore` contract." Hapi PR-7 as currently designed should be **restructured** before opening, not opened as-is. **Option C (daemon upstream as today's PR-7) is wrong** — it misreads OpenClaw's pattern and would land us with the first standalone-listener package upstream, fighting Peter's "core stays extension-agnostic" + "plugins extend via SDK seams" philosophy. **Option B (don't contribute upstream at all) is also viable** as a fallback if maintainers want richer evidence of cross-consumer demand before defining a snapshot contract.

This changes the trim wave: claws-serve does NOT need to consume an upstream snap daemon over HTTP. Claws-serve continues to consume an internal (downstream) snap-server, optionally evolved to register itself as an OpenClaw plugin if claws ever runs alongside a real OpenClaw gateway.

---

## Method

1. Walked `C:/src/openclaw-core/packages/{memory-host-sdk, plugin-package-contract, plugin-sdk}/` — read every `package.json` + sampled `src/`.
2. Read `C:/src/openclaw-core/AGENTS.md` (root rules), `CONTRIBUTING.md`, and `docs/plugins/{architecture.md, sdk-overview.md}` for Peter's philosophy.
3. Identified the existing daemon-precedent extensions: `webhooks`, `diagnostics-prometheus`, `voice-call`, `phone-control`, `memory-lancedb`, `acpx`, `diffs/browser`. Read `extensions/webhooks/index.ts` and `extensions/diagnostics-prometheus/index.ts` in full.
4. Confirmed type contracts in `src/plugins/types.ts` for `OpenClawPluginHttpRouteHandler` (line 1955), `OpenClawPluginHttpRouteParams` (1960), `OpenClawPluginService` (2050), `OpenClawPluginServiceContext` (2036).
5. Sampled `src/plugin-sdk/provider-web-search-contract.ts` as a worked example of "contract-only" SDK module shape.
6. Re-read x-ray's audit but treated its conclusions about contribution shape as the hypothesis under test.
7. Cross-walked our `packages/openclaw-snap/src/{types.ts, server/handlers.ts, store/}` and `packages/claws-sdk/src/snapshot/` to identify which fragments are contract-shaped vs daemon-shaped.

No source files modified. No upstream commits read; only repo state at `C:/src/openclaw-core/` HEAD on disk.

---

## OpenClaw's design pattern (what Peter actually ships)

### Existing packages — pattern analysis

#### `packages/memory-host-sdk/` — type-and-helper export shell

- `package.json:1-21`: 13 subpath exports, all `./src/*.ts` (raw TS, no `dist/`), `private: true`, `version: 0.0.0-private`.
- `src/runtime.ts` is **3 lines**: aggregates `runtime-core`, `runtime-cli`, `runtime-files`.
- `src/runtime-core.ts` is **~40 lines of `export {...} from "./host/openclaw-runtime-*.js"`** — re-exports types and a few helpers.
- `src/host/` contains the actual runtime — but it's not its own package, it's the contract surface published THROUGH the package.
- **Shape**: types + helper re-exports. **NO daemon, NO HTTP, NO ports, NO server lifecycle.** What memory-plugin authors implement against.

#### `packages/plugin-package-contract/` — pure types + tiny validators

- `package.json` has a single `"."` export.
- `src/index.ts` is **101 lines**: `JsonObject` type, `ExternalPluginCompatibility` type, `validateExternalCodePluginPackageJson()` function, `EXTERNAL_CODE_PLUGIN_REQUIRED_FIELD_PATHS` const.
- This is **pure contract**: how to validate that a third-party package.json declares OpenClaw-compatibility metadata. No I/O. No runtime. No state.

#### `packages/plugin-sdk/` — 60+ runtime/type contracts as subpath exports

- `package.json` has **60+ subpath exports**, every one a typed contract module: `./plugin-runtime`, `./provider-auth`, `./channel-streaming`, `./security-runtime`, `./provider-web-search-contract`, `./testing`, `./zod`, etc.
- Each `src/<name>.ts` is a **one-line `export * from "../../../src/plugin-sdk/<name>.js"`** re-export shell over the canonical implementation in monorepo-root `src/plugin-sdk/`.
- **The `dist/` paths in `types` resolve to compiled `.d.ts`; the `default` resolves to source `.ts`** — i.e., this is a published-source/types package, not a runtime daemon.
- **Shape**: wrapper that gives plugin authors a stable npm-import surface (`openclaw/plugin-sdk/<thing>`) over the in-monorepo source-of-truth.

### The common pattern

OpenClaw's three packages are **published contract surfaces**, not deployable artifacts. Their job is:

1. **Define what plugins implement against** — types like `OpenClawPluginDefinition`, `WebSearchProviderPlugin`, `MemoryPluginRuntime`, `ChannelMessageActionAdapter`.
2. **Define the registration vocabulary** — helper functions like `definePluginEntry(...)`, `createWebSearchProviderContractFields(...)`.
3. **Stay deployment-agnostic** — they don't know about ports, processes, HTTP listeners, database backends, or storage. The plugin or core decides those.
4. **Stay runtime-light** — most exports are types; runtime code is small helpers. The actual runtime lives in `src/` of the monorepo and is loaded by the core, in-process, via the plugin system.

The architectural axiom is in `AGENTS.md:27`:

> Core stays extension-agnostic. No bundled ids in core when manifest/registry/capability contracts work.
> Extensions cross into core only via `openclaw/plugin-sdk/*`, manifest metadata, injected runtime helpers, documented barrels (`api.ts`, `runtime-api.ts`).

And `docs/plugins/architecture.md:262-282`:

> If OpenClaw adds a new domain such as video, the first question is not "which provider should hardcode video handling?" The first question is "what is the core video capability contract?" Once that contract exists, vendor plugins can register against it and channel/feature plugins can consume it.

Translation for snap: the question is not "where do we put our daemon?" It's "what is the snapshot capability contract?" — then plugins register implementations.

### Daemons in OpenClaw — they exist, but as PLUGINS, not packages

This is the load-bearing finding x-ray missed. OpenClaw **does** have long-running, HTTP-serving things in upstream — but they're shaped as **plugins** that register routes onto the gateway's existing HTTP listener:

- `extensions/diagnostics-prometheus/index.ts:6-20` — full plugin in 15 lines:
  ```ts
  export default definePluginEntry({
    id: "diagnostics-prometheus",
    register(api) {
      api.registerService(exporter.service);
      api.registerHttpRoute({
        path: "/api/diagnostics/prometheus",
        auth: "gateway",
        match: "exact",
        gatewayRuntimeScopeSurface: "trusted-operator",
        handler: exporter.handler,
      });
    },
  });
  ```
- `extensions/webhooks/index.ts:32-38` — same pattern:
  ```ts
  api.registerHttpRoute({
    path: target.path,
    auth: "plugin",
    match: "exact",
    replaceExisting: true,
    handler,
  });
  ```
- `extensions/voice-call/`, `extensions/phone-control/`, `extensions/memory-lancedb/`, `extensions/acpx/`, `extensions/diffs/browser/`, `extensions/diagnostics-otel/`, `extensions/device-pair/notify.ts`, `extensions/browser/plugin-registration.ts`, `extensions/slack/src/http/plugin-routes.test.ts`, `extensions/mattermost/` — all use `registerService` + `registerHttpRoute` and run **inside the gateway's process and HTTP listener**.

The relevant SDK types (`src/plugins/types.ts`):
- `OpenClawPluginHttpRouteHandler = (req: IncomingMessage, res: ServerResponse) => Promise<boolean | void>` (line 1955)
- `OpenClawPluginHttpRouteParams = { path, handler, auth: "gateway"|"plugin", match?, gatewayRuntimeScopeSurface?, replaceExisting? }` (line 1960)
- `OpenClawPluginService = { id, start(ctx), stop?(ctx) }` (line 2050)
- `OpenClawPluginServiceContext = { config, workspaceDir?, stateDir, logger, internalDiagnostics? }` (line 2036)

A snapshot service in this world is `{ id: "snapshot", start, stop }` + a handful of `registerHttpRoute({ path: "/api/snapshots/...", handler })` calls. **No new port. No new process. No new top-level package.** The gateway already runs an HTTP server; this plugin attaches to it.

### What's NOT upstream

Confirmed absent at `C:/src/openclaw-core/`:
- **No standalone-listener packages** in `packages/`. All three packages are types/helpers. None has a `startServer()`, none binds a port, none is a daemon.
- **No "deploy this separately" packages.** The single binary `openclaw` runs the gateway + plugins in-process.
- **No HTTP-transport-specific contracts** in `plugin-sdk/`. The HTTP-route registration is a generic `(req, res)` handler — not REST/JSON-schema, not OpenAPI-bound. The wire format is plugin-owned.
- **No dedicated storage-backend SDK packages.** Memory storage uses sqlite + sqlite-vec; that's an implementation in `host/sqlite.ts`, not a package or an SDK contract.
- **No "we ship the deploy unit" pattern.** Deployment is a property of the host binary (Electron app, CLI install, Fly.io, Docker, etc.) — orthogonal to package shape.

---

## Forward-designing snap as Peter would

### The snapshot contract (what would be upstream)

Peter would add `src/plugin-sdk/snapshot.ts` (re-exported as `packages/plugin-sdk/src/snapshot.ts`), defining:

```ts
// src/plugin-sdk/snapshot.ts (~50–150 LoC)

export type SnapshotStatus = "draft" | "current" | "superseded";

export interface Snapshot {
  readonly id: string;             // sha256-<base64url>
  readonly files: Readonly<Record<string, string>>;
  readonly createdAt: string;
  readonly author: string;
  readonly status: SnapshotStatus;
  readonly parentId?: string;
}

export interface SnapshotMeta {
  readonly id: string;
  readonly createdAt: string;
  readonly author: string;
  readonly status: SnapshotStatus;
}

export interface SnapshotPromoteContext {
  readonly principal: string;
  readonly tenant?: string;
  readonly idempotencyKey: string;
}

export interface SnapshotResolveResult {
  readonly snapshotId: string;
  readonly content: string;
  readonly chunk?: { file: string; section?: string; item?: string; field?: string };
}

export interface SnapshotStore {
  put(snapshot: Snapshot): Promise<void>;
  get(id: string): Promise<Snapshot | null>;
  list(opts?: { limit?: number; status?: SnapshotStatus }): Promise<readonly SnapshotMeta[]>;
  promote(id: string, ctx: SnapshotPromoteContext): Promise<{ promotedAt: string }>;
  rollback(toId: string, ctx: SnapshotPromoteContext): Promise<{ restoredAt: string }>;
  current(): Promise<Snapshot | null>;
  resolveOcPath(uri: string, id?: string): Promise<SnapshotResolveResult | null>;
}

export type SnapshotErrorCode =
  | "SNAPSHOT_MALFORMED"
  | "SNAPSHOT_ID_MISMATCH"
  | "SNAPSHOT_NOT_FOUND"
  | "POLICY_ID_MISMATCH"
  | "SNAPSHOT_PROMOTE_CONFLICT"
  | "SNAPSHOT_ROLLBACK_INVALID";

export class SnapshotError extends Error {
  constructor(public code: SnapshotErrorCode, message: string) { super(message); }
}

// Optional capability-registration helper, mirroring provider-web-search-contract.ts shape:
export interface SnapshotProviderPlugin {
  readonly id: string;
  readonly store: SnapshotStore;
}
// `api.registerSnapshotProvider(plugin)` would join the capability table at architecture.md:34-50.
```

This is the **whole upstream surface**. It defines what a snapshot is, what operations are required, what errors are closed, and how a plugin registers an implementation. **It does not define HTTP, storage, ports, or deployment** — those are consumer concerns.

### The reference plugin (optional, separate decision)

If snapshotting becomes a first-class OpenClaw capability, an `extensions/snapshot/` bundled plugin could ship a default in-memory + filesystem implementation:

```ts
// extensions/snapshot/index.ts (~50 LoC)
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createSnapshotService } from "./src/service.js";
import { createSnapshotRoutes } from "./src/http.js";

export default definePluginEntry({
  id: "snapshot",
  name: "Workspace snapshots",
  description: "Content-addressable workspace snapshot registry with audit-anchored promote/rollback.",
  register(api) {
    const svc = createSnapshotService({ stateDir: api.runtime.stateDir, logger: api.logger });
    api.registerService(svc.service);
    for (const route of createSnapshotRoutes(svc)) {
      api.registerHttpRoute({
        path: route.path,
        auth: "gateway",
        match: route.match,
        handler: route.handler,
      });
    }
  },
});
```

The route handlers are plain `(req, res)` functions; HTTP wiring is whatever the gateway's listener already provides. **No new port, no separate process.** The store is `SnapshotStore` from the SDK; the bundled plugin ships in-memory + filesystem reference impls. Production consumers (claws-snap-server, an external multi-tenant snap impl, etc.) provide their own `SnapshotStore` via plugin config.

**This is a separate decision from "is the contract upstream"** — Peter may want only the contract upstream and leave the bundled plugin to ecosystem demand. Per `CONTRIBUTING.md:89`: "Most features are not accepted and should be third party plugins instead using our plugin SDK."

### What's NOT upstream (under any option)

- **Storage backend choices.** S3, redis, postgres, filesystem-with-WAL, etc. — consumer concerns. SDK only defines the `SnapshotStore` interface.
- **HTTP transport details.** Body limits, idempotency-cache TTL, multipart vs JSON, exact path schemes (`/v1/snapshots` vs `/api/snapshots/v1` vs whatever) — bundled-plugin decisions or pluggable.
- **Port number, TLS, supervision, restart semantics.** These are gateway-host concerns — when running inside `openclaw`, the gateway already handles them. When running embedded in claws-serve, those are claws's concerns.
- **Auth callback wiring.** The plugin runs inside the gateway, so it inherits the gateway's auth model (per `auth: "gateway" | "plugin"`). No bespoke `authContext` callback needed.
- **Audit-sink wiring.** The gateway already has `src/control-plane-audit.ts`; snapshot promote/rollback events go through that pipe via injected runtime helpers, not a bespoke audit-sink callback.
- **Idempotency cache choice.** In-memory Map vs Redis — a backend concern wired by the consumer.

---

## Comparing with `packages/openclaw-snap/` today

Total source: 16 files, ~1665 LoC across `src/`.

### What fits the upstream shape

| File | LoC | Upstream-fit |
|------|-----|--------------|
| `src/types.ts` | ~95 | **Contract.** `Snapshot`, `SnapshotStore`, `SnapshotMeta`, `PromoteContext`, `ResolveResult`, `SnapErrorCode`, `SnapError`. Almost line-for-line what `src/plugin-sdk/snapshot.ts` would contain. |
| `src/canonical.ts` | small | **Could be upstream** as `src/plugin-sdk/snapshot-canonical.ts` if canonicalization is a documented part of the contract. Or stay claws-side if Peter prefers leaving canonicalization opaque. |
| `src/error.ts` | small | **Contract piece.** Error types/envelope. |

**Estimated upstream-shaped fragment**: ~150–200 LoC of types + canonical helpers. Maybe 10–12% of the package.

### What's consumer-specific (downstream)

| File / area | LoC | Why downstream |
|------------|-----|----------------|
| `src/server/handlers.ts` | ~600 | 9 hand-rolled HTTP endpoints (`/v1/healthz`, `/v1/snapshots`, `/v1/snapshots/:id/promote`, etc.) — bundled plugin would express these via `api.registerHttpRoute({ path, handler })`, not a custom request parser. The current request-routing logic is reinventing what the gateway already provides. |
| `src/server/startServer.ts` | ~200 | Boots a Node `http` listener on a configurable port. **Directly conflicts** with the gateway's listener model. Replace with plugin shape. |
| `src/server/audit.ts` | small | Bespoke `AuditSink` callback contract. Replace with the gateway's audit pipe (`src/control-plane-audit.ts`). |
| `src/server/index.ts` | small | Exposes `startServer({port, store, authContext, auditSink, ...})` — the API that has no analogue upstream. Doesn't survive into a plugin shape. |
| `src/store/inMemoryStore.ts` | ~150 | Reference impl — fine as bundled-plugin impl, not upstream-package material. |
| `src/store/filesystemStore.ts` | ~250 | Reference impl with atomic-rename writes. Fine as bundled-plugin impl. |
| `src/cli-handlers/*` (11 files) | ~600 | Per-verb handlers that talk to the daemon over HTTP from the same binary. Pure consumer-side glue: an HTTP CLIENT for the daemon. **Doesn't belong upstream** — it presupposes a remote-snap daemon, which is a deployment shape, not a contract. |

**Estimated upstream-fit fraction**: roughly **10–15%** of the current `packages/openclaw-snap/` is contract-shaped (the types file). The remaining 85–90% is consumer-specific (HTTP server, ports, CLI client, reference stores, bespoke auth/audit hooks). X-ray's "the package is shaped for upstream contribution as-is" framing is wrong by the volume estimate alone.

### Estimated upstream-fit fraction

- **Upstream-fit (~150–200 LoC, types + error envelope)**: belongs in `src/plugin-sdk/snapshot.ts`.
- **Bundled-plugin-fit (~600–900 LoC)**: could go in `extensions/snapshot/` as a default impl, IF Peter wants snap to be a first-class capability. Maintains plugin-shape (registers service + routes), drops the standalone listener.
- **Pure-claws-downstream (~400–600 LoC)**: CLI client, claws-specific glue. Stays in the claws monorepo regardless.

---

## Comparing with `claws-sdk/src/snapshot/` today

Total source: 11 files in `packages/claws-sdk/src/snapshot/` (~1556 LoC per x-ray's count).

Contents: `save`, `restore`, `manifest`, `storage`, `integrity`, `promote`, `provenance`, `diff`, `diff-renderer`, `fleet-registry`, `index`.

### Is this closer to a contract shape?

**No.** This is the in-process implementation that claws-serve currently uses. It's a parallel implementation of the same domain — content-addressable workspace snapshots — but it has more claws-monorepo-specific concerns baked in:

- `fleet-registry.ts` — multi-deployment coordination, claws-specific
- `provenance.ts` — claws audit-chain wiring
- `integrity.ts` — verification with claws-specific assumptions
- `diff-renderer.ts` — UI-targeted (lobster-web)
- `manifest.ts` — claws-spec format

It's no closer to a clean contract than `packages/openclaw-snap/`'s types.ts. **Both are consumer impls.** If anything, `packages/openclaw-snap/src/types.ts` is the cleaner contract candidate because the Hapi extraction already factored types out.

### Could we extract a clean contract?

**Yes — from `packages/openclaw-snap/src/types.ts` directly.** That file is ~95 lines, no dependencies on claws-monorepo specifics, no imports from `claws-sdk/`. It's a clean lift.

`claws-sdk/src/snapshot/` should NOT be the source of the contract — it has too much consumer-specific machinery. It should consume the contract (downstream) once defined.

---

## Recommendations

### Option A: Contract upstream, daemon stays downstream (RECOMMENDED)

- **Upstream change**: a single PR adding `src/plugin-sdk/snapshot.ts` with types + error envelope (~50–150 LoC). Re-exported via `packages/plugin-sdk/src/snapshot.ts` (one-line shell). Optionally `api.registerSnapshotProvider(...)` capability registration helper if it earns a row in `docs/plugins/architecture.md:34-50`'s capability table.
- **Claws side**:
  - Rename `packages/openclaw-snap/` → `packages/claws-snap-server/` (clarifies "this is the claws-side server, not the contract").
  - Re-target `claws-snap-server`'s types import to consume `@openclaw/plugin-sdk/snapshot` once that lands.
  - The HTTP daemon stays. It's a claws-side artifact. It can later be wrapped as an OpenClaw plugin (`registerService` + `registerHttpRoute`) IF claws-serve ever runs inside an OpenClaw gateway, but that's optional.
  - `claws-sdk/src/snapshot/` migration: still applies (delete duplicated work; route claws-serve to call into `claws-snap-server`).
- **Conformance claim**: `claws-snap-server` implements the upstream `SnapshotStore` contract. Provable via type-level conformance test.
- **Pros**:
  - Tiny upstream surface, low coordination cost (~150 LoC PR vs ~2000 LoC PR-7).
  - Aligned with Peter's pattern (contracts-only at the package layer).
  - Doesn't force daemon-shape architectural change Peter would likely reject.
  - Doesn't tie claws's deploy timeline to upstream merge timeline.
  - Future-compatible: if ecosystem demand emerges for a bundled snap plugin, it can be added later in `extensions/snapshot/` without breaking the contract.
- **Cons**:
  - Contract-only upstream may feel underspecified to ecosystem implementers (no reference impl to copy from). Mitigation: link to `claws-snap-server` as an example impl in PR description.
  - No "OpenClaw has snapshotting" bragging right at the product level — it's a contract waiting for impls.

### Option B: Don't contribute upstream at all

- Snap stays purely internal to claws monorepo as `packages/claws-snap-server/`.
- OpenClaw doesn't define snapshotting; consumers solve it themselves.
- `claws-sdk/src/snapshot/` migration still happens (delete duplicate, consume `claws-snap-server`).
- **Pros**:
  - Zero upstream coordination cost.
  - We move at our own pace.
  - Gives ecosystem time to surface organic demand for snapshotting before we lock in a contract.
- **Cons**:
  - If a peer consumer (some future OpenClaw deployment) wants snapshotting, they reinvent it without a shared shape — fragmentation risk.
  - We bear the full design + maintenance cost without amortizing.

### Option C: Full contribution as Hapi PR-7 currently designs (daemon upstream)

- Upstream gets a `packages/snap/` standalone-listener daemon (~1665 LoC + CLI verb).
- We hope ecosystem adopts.
- **Pros**:
  - Aligned with the original Hapi plan as written.
- **Cons** (decisive):
  - **First-of-its-kind** at upstream. No precedent for a package that runs as a daemon. Peter has explicitly designed packages as types/SDK-only. The pattern violation will be visible on first PR contact.
  - **Reinvents the gateway's HTTP listener.** Why bind a new port when `registerHttpRoute({ path: "/api/snapshots/...", auth: "gateway", handler })` mounts on the gateway's listener with auth + lifecycle inherited?
  - **Reinvents auth + audit wiring.** `authContext` callback + `AuditSink` callback both exist as gateway-provided pipes already (per `auth: "gateway"|"plugin"` on registerHttpRoute, and `src/control-plane-audit.ts` for audit). PR-7 ships parallel pipes that maintainers will ask why we need.
  - **Wide PR scope**: package + CLI + HTTP + temporal query + 2 compliance rubrics + Swift regen. The `CONTRIBUTING.md:122` rule "Keep PRs focused (one thing per PR)" is at risk.
  - **Probable outcome**: Peter says "rewrite as plugin," wave wastes 2-4 weeks rebuilding, lands a much smaller plugin, reaches Option A's end-state via a longer route.

### Recommended

**Option A**, with a clear sequencing change vs. the current Hapi wave.

The reasoning is direct: Peter ships contracts-not-daemons, the SDK already supports daemon-shaped plugins via `registerService` + `registerHttpRoute`, and the contract piece of our snap is a tiny clean extract. Trying to upstream the whole daemon is fighting the architecture for no marginal benefit.

**C is wrong** because it inverts the abstraction. We'd be asking upstream to host our deployment shape (a process running on a port). Upstream's job is to define what snapshotting MEANS so anyone can implement it — not to ship a specific implementation as an upstream package. The implementation can live in our monorepo, in a community plugin, in a paid product, anywhere — the contract enables all of those.

**B is the safe fallback** if the team would rather defer the upstream conversation entirely. There's no contract-level lock-in until Option A's PR opens, so we can implement Option B today and graduate to Option A later when timing makes sense.

---

## Implications for the trim wave

The Hapi-wave plan and the claws-surface-audit had this dependency chain (paraphrased): "upstream snap lands → claws-serve trims its routes and consumes upstream snap over HTTP." That chain is **broken** by this audit because:

1. There won't be an upstream snap daemon to consume over HTTP. Even under Option A, upstream gets contract types — not a server.
2. The HTTP-boundary trim plan (sketched in x-ray's audit §"Consumption boundary (claws-serve → upstream snap)") is still correct *internally* — but the daemon claws-serve calls is **claws-side `claws-snap-server`**, not an upstream daemon co-deployed beside us.
3. PR-7 in the Hapi wave should not open as designed. It should be replaced with a **much smaller PR** (call it PR-7a) that adds `src/plugin-sdk/snapshot.ts` types only — comparable in size to PR-2 (oc:// scheme). The "ship our daemon" piece moves out of the upstream wave entirely.

Concrete trim-wave sequencing for snap (revised):

1. Hapi Wave A (PR-1 workspace + PR-2 oc://) — proceed as planned. Lands upstream.
2. Hapi Wave B (PR-3 OC-4 + PR-4 guardrails) — proceed as planned.
3. **Claws-side trim of `claws-sdk/src/snapshot/` proceeds in parallel** without waiting on upstream snap. Claws-serve rewires to consume `packages/openclaw-snap/` (rename to `claws-snap-server`) in-process today, evolving to in-pod HTTP only if claws-serve and snap-server need separate deploy budgets.
4. Hapi Wave C (PR-5 OC-7 + PR-6 policy) — proceed as planned.
5. **Hapi Wave D becomes "PR-7a: snapshot contract types"** — a 50–150 LoC PR adding `src/plugin-sdk/snapshot.ts`. Optionally accompanied by a doc-page entry in `docs/plugins/`. **No daemon, no CLI verb, no temporal-query endpoint, no compliance rubric** — those move out of the upstream wave.
6. Once PR-7a lands: claws's `claws-snap-server` rebases its types on `@openclaw/plugin-sdk/snapshot`. Done.

**Net effect on the trim**: faster, less coordination, less risk. The previous risk register (x-ray's §"Risks and open questions") was dominated by daemon-shape rejection probability; that risk evaporates.

**Net effect on the snap-upstream-deferred decision in `claws-surface-audit.md`**: the deferred decision can be answered now. **Snap upstream contribution is GO under Option A** (small types-only PR), or **STAY** (Option B) if the team prefers no upstream surface. Not going Option C either way.

---

## Risks + open questions

- **Open question — does Peter have an existing opinion on snapshotting?** No upstream RFC or `docs/plan/` entry references snapshotting as searched (there is `src/gateway/protocol/schema/snapshot.ts` but it's presence/health snapshots for cross-device session coordination — completely unrelated). Pre-RFC in `#clawtributors` would surface his view before we open even a small PR.
- **Open question — is `src/plugin-sdk/snapshot.ts` the right home, or `src/plugin-sdk/workspace-snapshot.ts`?** The naming matters because there's already a presence/health Snapshot type in `src/gateway/protocol/schema/snapshot.ts`. To avoid collision, the contract should be `WorkspaceSnapshot` types or live at a clearly-namespaced subpath (`plugin-sdk/workspace-snapshot`).
- **Risk — even Option A lands a contract before claws has working impls.** If we land the contract upstream and our `claws-snap-server` doesn't reach conformance for months, the contract sits unused at upstream. Mitigation: open Option A's PR only after `claws-snap-server` already passes a conformance test against the proposed types.
- **Risk — does claws-serve need an HTTP boundary to snap at all?** Worth re-asking. If `claws-snap-server` lives in-process inside claws-serve (as a library), we lose the independent-restart property but get back zero-network-hop calls and simpler deploy. The HTTP boundary was justified upstream because snap was a separate process; if it stays in-process under Option A/B, the boundary may be optional. This is a Eduardo/filing-model question that should be re-litigated with the new context.
- **Risk — gateway-listener auth model may not fit claws's auth model.** Even if we eventually adopt the plugin shape (running snap inside an OpenClaw gateway), the gateway's `auth: "gateway"` semantics presume the OpenClaw auth chain. Claws's auth chain (lobster-web JWT → ingress → claws-serve → snap) is different. Mitigation: not a blocker for Option A (we're not running inside the gateway); only relevant if we ever ship `extensions/snapshot/` in upstream.
- **Open question — `provider-web-search-contract.ts`-style helpers.** Should the contract include credential-resolution helpers like that file does? Probably no for snap — snap doesn't have provider-credentials. Pure types are enough.
- **Open question — what's the minimum-viable conformance test?** The SDK doesn't define a conformance harness today. We could (a) leave it implicit (consumers self-verify), (b) ship a small test helper (`@openclaw/plugin-sdk/snapshot/testing`), or (c) drop conformance entirely. Option (a) is least-effort, matches the existing SDK pattern.
- **Risk — Peter's response to even the small PR.** "Why does OpenClaw need to define snapshotting?" is a fair question. If no second-implementer is on the horizon, Peter may decline even Option A. Mitigation: Option B is the fallback with zero pivot cost.

---

## Verification

Files / commands used:

- `ls C:/src/openclaw-core/{packages, extensions, src/plugin-sdk, src/plugins, docs/plugins}/`
- Read `C:/src/openclaw-core/{AGENTS.md, CONTRIBUTING.md, README.md}`
- Read `C:/src/openclaw-core/packages/{memory-host-sdk, plugin-package-contract, plugin-sdk}/package.json`
- Read `C:/src/openclaw-core/packages/{memory-host-sdk, plugin-package-contract}/src/*.ts` (sampled all)
- Read `C:/src/openclaw-core/packages/plugin-sdk/src/{plugin-runtime, plugin-entry}.ts` — confirmed thin re-export shells over `src/plugin-sdk/`
- Read `C:/src/openclaw-core/src/plugin-sdk/{plugin-entry.ts (top), provider-web-search-contract.ts}` — sampled contract-only SDK module shape
- Read `C:/src/openclaw-core/src/plugins/types.ts:1945-2074` — confirmed `OpenClawPluginHttpRouteHandler`, `OpenClawPluginHttpRouteParams`, `OpenClawPluginService`, `OpenClawPluginServiceContext`, `OpenClawPluginDefinition`
- Read `C:/src/openclaw-core/extensions/{webhooks/index.ts, diagnostics-prometheus/index.ts, diagnostics-prometheus/openclaw.plugin.json}` — confirmed plugin-shape daemons via registerService + registerHttpRoute
- Grep `registerService\(` upstream — 14 hits in `extensions/{voice-call, phone-control, memory-lancedb, acpx, diagnostics-prometheus, diagnostics-otel, browser, device-pair}` etc.
- Grep `registerHttpRoute` upstream — 15 hits, mostly bundled-plugin extensions
- Read `C:/src/openclaw-core/docs/plugins/{architecture.md, sdk-overview.md}` — captured "first question is what's the capability contract" + "core stays extension-agnostic"
- Read `C:/src/claws/packages/openclaw-snap/src/types.ts` — confirmed contract piece is ~95 lines and clean
- `ls C:/src/claws/packages/{openclaw-snap, claws-sdk}/src/snapshot/`
- Read `C:/src/claws/.craft/out/audits/snap-upstream-audit.md` (x-ray's prior audit) — for facts only; conclusions reframed
- Memory: `MEMORY.md`, `project_openclaw_upstream.md`
