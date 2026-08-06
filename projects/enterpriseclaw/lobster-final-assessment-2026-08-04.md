# Lobster Final Assessment for Peter and Vincent

Date: 2026-08-04

## Executive Summary

Lobster is not a thin OpenClaw wrapper. It is a large enterprise hosting and
product-integration system around OpenClaw: runtime orchestration, a managed
container and adapter, web and admin experiences, Microsoft identity and
services, fleet rollout, persistence, policy, approvals, telemetry, and
release operations.

The central architecture problem is not that Lobster has enterprise hosting
code. That is its product value. The problem is that Lobster has also had to
recreate or infer OpenClaw runtime semantics that should be owned by OpenClaw:
configuration, readiness, lifecycle, approvals, channels, persistence,
provider dispatch, and runtime identity. ProxyPipe is the clearest example of
that boundary erosion.

The EnterpriseClaw direction is:

```text
portable OpenClaw semantics          -> upstream OpenClaw
temporary adoption and compatibility -> controlled fork/plugin
enterprise hosting decisions         -> Lobster
complete alternative owner           -> independent Rust component
```

Success is measured by supported enterprise behavior plus deleted private
bridges, patches, duplicated state machines, and inference.

## 1. How Large Is Lobster?

Snapshot:

- checkout: `C:\src\lobster`
- branch: `user/giodl/openclaw-copilot-dev-validation`
- commit: `3caf856719`
- measurement: tracked files in the working tree

| Measure | Files | Physical lines | Nonblank lines |
| --- | ---: | ---: | ---: |
| Source classified as non-test | 1,525 | 671,071 | 614,136 |
| Test-classified source | 315 | 100,228 | 90,177 |
| **Source and tests** | **1,840** | **771,299** | **704,313** |
| Documentation | 1,215 | 237,831 | 180,772 |
| Configuration and structured text | 383 | 61,620 | 60,115 |
| **All measured tracked text** | **3,438** | **1,070,750** | **945,200** |

This is a physical-line inventory, not a `cloc` logical-code count. It includes
comments and blank lines, excludes binary and unrecognized extensions, and
classifies tests by file/path naming. Rust inline tests remain in their source
file's non-test count.

The useful headline is:

> Lobster contains about 771K tracked source/test lines. Its three core product
> areas - runtime, OpenClaw container/adapter, and web - account for about 470K.

Primary languages by source/test physical lines:

| Language | Lines |
| --- | ---: |
| Rust | 348,698 |
| C# | 95,457 |
| JavaScript | 94,758 |
| TypeScript | 74,461 |
| TSX | 61,340 |
| Python | 42,340 |
| CSS | 24,206 |
| Shell | 21,446 |

## 2. Major Code Areas

| Area | Source/test lines | What it does |
| --- | ---: | --- |
| `src/lobster_runtime` | 237,783 | Rust hosting runtime: provisioning, placement and lifecycle, Plex/container connectivity, Teams bridges, approvals, ProxyPipe client/handlers, metrics, scheduling, policy, and managed service integration. |
| `src/openclaw_container` | 120,224 | Lobster-owned OpenClaw image and adapter: Aether gRPC to Gateway translation, reverse proxy, plugins, baked configuration, workspace persistence, container lifecycle, and the container side of ProxyPipe. |
| `src/lobster_web` | 112,486 | Product and operator UI: Scout, feeds, policy, approvals, settings, diagnostics, administration, and associated services/tests. |
| `src/dev` | 87,877 | Internal developer/operator tooling, especially Autodev, watchdog, Teams notifications, MCP helpers, and telemetry viewers. This is substantial but is not the Lobster runtime itself. |
| `project-lobster-vault` | 82,950 | Architecture, proposals, specifications, examples, and coordination material that uses code-like file types as well as prose. |
| `prototypes` | 40,842 | Product and UX prototypes; useful evidence, but not equivalent to production runtime. |
| `scripts` and `tools` | 54,948 | Build, release, validation, migration, diagnostics, dashboards, and operational automation. |

The simplest product picture is:

1. **Managed runtime and fleet** - places, starts, routes, governs, observes,
   repairs, and rolls out OpenClaw units.
2. **Hosted OpenClaw image and adapter** - translates Aether/Cowork integration
   into OpenClaw behavior.
3. **User, admin, and operator experience** - exposes Scout, policy, feeds,
   approvals, configuration, health, and support workflows.
4. **Developer and release system** - builds, patches, validates, promotes,
   diagnoses, and operates the stack.

## 3. ProxyPipe

### What it is

ProxyPipe is a runtime-to-container bidirectional gRPC stream. The runtime
dials into the OpenClaw container through Plex, while application requests can
flow in the opposite direction over that connection. The current checked-out
proto has 16 `PipeFrame` payload variants.

It began as a way for an isolated OpenClaw container to use host-supplied
network execution. It accumulated:

- streamed HTTP request/response forwarding and cancellation;
- Cron wake scheduling;
- code-mode judge deduplication and user-turn hints;
- Teams Activity delivery and acknowledgement;
- container build identity;
- feedback submission;
- connection ownership, generations, correlation, retries, overload,
  cancellation, stale-result rejection, and telemetry.

The broader project inventory also found approval, lifecycle, checkpoint,
shutdown, and AgentHarness concerns in the private integration family.

### Why it became a problem

ProxyPipe is both a carrier and a semantic catalog. One private protocol ended
up deciding the meaning of unrelated product operations. That duplicates
OpenClaw owners and makes every new feature depend on Lobster-specific framing,
compatibility, retries, identity, and lifecycle.

The size is material:

- 29 tracked implementation/test/proto files explicitly named for ProxyPipe;
- 16,523 physical lines in those named files alone;
- 3,244 textual references across 215 files in the checked-out repository.

The 16.5K figure is a lower bound because lifecycle, metrics, Teams, Plex,
container, and product handlers also contain ProxyPipe behavior without using
it in the filename.

### What replaces it

ProxyPipe should not be renamed into a generic `host.invoke`, ClawBus, or
reverse `OpenClawTransport`. Its semantic families move to their real owners:

| ProxyPipe concern | Durable owner |
| --- | --- |
| Provider HTTP/LLM egress | OpenClaw provider request policy and transport, with an optional hosted physical dispatcher |
| Secrets and credentials | Existing owner-specific secret/credential provider seams with exact origin-bound slots |
| Teams delivery | OpenClaw Channel adapter and ingress semantics; Lobster retains Bot Framework and tenant routing |
| Approvals | Canonical Gateway exec, node, and plugin approval APIs |
| Lifecycle and shutdown | Gateway lifecycle plus Runtime State Continuity |
| Runtime/build identity | Readiness, Hosting Profiles, artifact identity, Status, and Doctor |
| AgentHarness traffic | Its own typed harness protocol and conformance |
| Judge, feedback, WorkIQ behavior | Owning plugin or explicit Lobster product service |

The only genuinely missing generic primitive is narrow:

```text
owner-prepared and owner-authorized operation
  -> optional host execution
  -> bounded request/result, credentials, identity, deadline, and generation
```

The hosted dispatcher must be semantically empty: it does not choose the user,
provider, policy, retry semantics, response meaning, or replay behavior.

### Migration rule

Migrate one frame family at a time:

```text
owner support
  -> inactive Lobster adopter
  -> explicit canary
  -> new authority
  -> zero old-path evidence
  -> compatibility expiry
  -> old frame, fallback, tests, and retry logic deleted
```

No big-bang replacement and no indefinite dual path.

## 4. What Else We Have Done in Lobster

### Product and hosting work that is appropriate

- Integrated OpenClaw as a managed Aether/Cowork container type.
- Built the Lobster-owned container image and adapter between Aether gRPC and
  OpenClaw Gateway/provider surfaces.
- Added per-user container sharing, sticky routing, placement, rollout rings,
  quotas, quarantine, rollback, and repair.
- Added Microsoft identity, tenant/user routing, managed credential
  materialization, private networking, Teams/Bot Framework integration, and
  Microsoft 365 services.
- Built Scout, feeds, catalog, skills, policy, approval, settings, admin,
  Control UI, and operator experiences.
- Built managed budgets, usage attribution, limits, recommendations, and
  reporting.
- Built managed storage destinations, encryption/retention policy,
  checkpoint/restore orchestration, workspace persistence, and recovery UX.
- Built Kusto/telemetry sinks, dashboards, alerts, audit retention, support
  workflows, Doctor/status projections, and LobsterTank/PR tooling.
- Built release slots, promotion, patch carry-forward, image admission,
  canary, rollback, and deletion tracking.
- Built ClawPilot/node enrollment, managed capability composition, governed
  invocation, offline recovery, and device/fleet policy.

These are enterprise hosting decisions. They should remain in Lobster.

### Code Mode and product plugins are first-class product work

Lobster's plugin delta is not merely compatibility debt. Its flagship is Code
Mode: roughly 9.3K checked-in shipped plugin lines and 78 Code Mode-named
commits across at least 12 contributors. It composes OpenClaw's generic
`execute_code` sandbox and namespace dispatcher with a Microsoft-owned WorkIQ
plugin exposing typed M365, Outlook, Planner, Search, Engage, Workspace, and
Office capabilities.

The surrounding integration is substantial: delegated-token and private-host
routing, per-ring and per-user gates, restore-safe plugin/config overlays,
managed skills, destructive-action guidance, judge telemetry and cost signals,
and web/Teams end-to-end tests. WebIQ search, self-diagnosis, brokered Teams,
and diagnostics follow the same product-extension pattern.

OpenClaw main now contains the generic Code Mode runtime. The remaining
architectural opportunity is to let that upstream runtime load trusted, pinned
namespace-provider dependencies, rather than requiring one OpenClaw plugin
wrapper per product namespace. This is host-side package loading; model-written
sandbox code must not gain arbitrary module imports.

The durable ownership split is:

- OpenClaw owns the generic Code Mode runtime and stable plugin, skill,
  auth-context, lifecycle, approval, and compatibility contracts.
- Microsoft owns WorkIQ/M365 and WebIQ behavior, Graph/OBO adapters, enterprise
  policy, rollout, evals, and product support.
- Lobster should host and operate those plugins without forking generic
  OpenClaw semantics.

The per-package and per-patch decision ledger is
`lobster-plugin-patch-disposition-2026-08-05.md`.

### The tools profile should replace blanket YOLO without restoring prompt fatigue

The Scout team currently runs in YOLO mode because repeated approvals made
normal work too annoying. That is important adopter evidence: a safe posture
that users bypass is not an effective safety contract.

The target is bounded autonomy. The `productivity` profile is necessary but not
sufficient:

- OpenClaw owns a portable `productivity` base role for common workspace,
  research, memory, session, planning, scheduled, and image-understanding work.
  Draft upstream PR #112473 implements this bounded built-in profile.
- Lobster owns `scout-standard`: the exact Microsoft composition adding WorkIQ,
  WebIQ, nodes, diagnostics, and other reviewed product capabilities, with
  `tools.fs.workspaceOnly=true`, targeted denies, and a release-specific final
  model-visible tool-set assertion.
- Known, attributable, preapproved operations run without repeated prompts.
  Unknown exec, externally visible writes, and destructive operations require
  one human confirmation and fail closed when approval is unavailable.
- Exec uses `mode=ask`: allowlist matches run and misses ask. Managed policy
  rejects model-reviewed `auto` and unrestricted `full`.
- OpenClaw still needs usable authority primitives: method-level consequence
  metadata for compound tools such as WorkIQ, scoped and expiring approval
  receipts, effective-capability diagnostics, and stable typed replacement
  paths for common shell work.

Until `productivity` ships in a quarantine-cleared OpenClaw release, Lobster
should use one generated exact allowlist rather than pinning the draft PR or
duplicating another profile registry. The objective is to preserve YOLO
ergonomics while removing YOLO authority. Blanket YOLO should be disabled only
when safe mode can complete normal work without repeated prompts.

### Necessary bridge and evidence work

We have also had to:

- carry and regularly rebase OpenClaw patches;
- build deterministic source/release reconstruction and exact source ledgers;
- prove managed configuration, readiness, Hosting Profiles, policy, Doctor,
  catalog, continuity, node, and hosted-integration contracts;
- build fork-only owner/adopter slices and external-plugin fixtures;
- compare mixed versions, add canary/rollback evidence, and track old-path use;
- inventory every workaround with a minimum replacement release and deletion
  target;
- reconstruct the Lobster adoption layer on signed OpenClaw `v2026.6.33`;
- replay Teams, Cron, secrets, prompts, node, memory, approval, and hosted
  Control UI patch islands;
- maintain 22 realized downstream patch artifacts in the current reduced
  replay, with six original inputs still requiring final disposition.

This work is appropriate as migration, evidence, and release engineering. It is
not appropriate as a permanent architecture.

### Architecture and proof work that must not be described as shipped

The hosted-integration owner contracts, reverse carrier, many continuity
slices, Rust Node Mode, and several EnterpriseClaw contracts are proposals,
fork-only drafts, simulations, or evidence. They prove feasibility and clarify
ownership; they are not all merged OpenClaw or production Lobster behavior.

The 35 EnterpriseClaw contracts are a portfolio and review model, not 35 new
services or 35 automatic upstream RFCs.

## 5. What Is Appropriate and What Is Not

### Lobster should own

- enterprise IdP, federation, tenant/user/workload routing;
- Teams, Cowork, Scout, web, admin, approval, and support experiences;
- worker pools, placement, routing, quotas, rollout rings, quarantine, repair,
  and fleet convergence;
- enterprise policy distribution and stronger admission decisions;
- managed credentials and private-service physical integration;
- storage destinations, encryption, retention, legal holds, retries, and
  compliance export;
- release selection, image promotion, canary, rollback, and patch retirement;
- telemetry sinks, Kusto, dashboards, alerts, audit retention, and assurance;
- cross-owner orchestration that preserves each owner's result.

### Lobster should not own

- canonical OpenClaw session, memory, tool, channel, provider, plugin,
  workspace, scheduler, or run state;
- a second generic Gateway, approval bus, Channel protocol, lifecycle state
  machine, AgentHarness protocol, or persistence coordinator;
- direct edits to OpenClaw state files or config blobs when an owner API exists;
- success inferred from a socket, container, HTTP request, or carrier completing;
- generic transport retries that redefine owner effect/replay semantics;
- permanent patch forks or private contracts with no release/deletion gate;
- a universal host method API, provider adapter registry, or service bus;
- local OpenClaw operation that depends on Lobster infrastructure.

## 6. Evaluation and Final EnterpriseClaw Destination

### Source-to-source relationship

The comparable source-tree view is:

| Repository area | Source/test physical lines | Relationship |
| --- | ---: | --- |
| OpenClaw `src/` | 3,861,553 | Owner runtime and core product implementation |
| Lobster `src/` | 569,922 | Enterprise host, adapter, web, and development implementation |
| Lobster runtime + container/adapter + web | 470,493 | Core Lobster product subset |

Lobster `src/` is 14.8% the size of OpenClaw `src/`; OpenClaw is 6.8 times
larger. The OpenClaw snapshot is the clean 2026-08-01 design-audit worktree at
`bde1602e6e86`, which was 526 commits behind the local `origin/main` reference
when measured. The ratio is therefore directional rather than a permanent
repository statistic.

### Current Lobster source allocation

| Lobster area | Current lines | Share of Lobster `src/` | Share of OpenClaw `src/` | Evaluation |
| --- | ---: | ---: | ---: | --- |
| `src/lobster_runtime` | 237,773 | 41.7% | 6.2% | Correct durable home for enterprise placement, routing, identity, policy composition, fleet operations, and managed services; contains private runtime semantics to remove. |
| `src/openclaw_container` | 120,224 | 21.1% | 3.1% | Necessary image and adapter boundary, but the clearest concentration of compatibility, patch, proxy, workspace, and duplicated owner behavior. |
| `src/lobster_web` | 112,486 | 19.7% | 2.9% | Appropriate product/admin/operator surface; should grow or shrink according to product value, not OpenClaw internals. |
| `src/dev` | 87,877 | 15.4% | 2.3% | Useful development and operations tooling; manage separately from production architecture. |
| Other `src/` areas | 11,562 | 2.0% | 0.3% | Mocks, protocol, packaging, TLS, and small supporting components. |

The current 14.8% source-to-source ratio is not intrinsically excessive for an
enterprise host. Lobster performs work that upstream OpenClaw intentionally
does not: tenancy, Microsoft identity and services, fleet placement, managed
policy, administration, support, compliance, release promotion, and managed
storage.

The problem is composition, not the total:

- durable enterprise product code is mixed with temporary hostee workarounds;
- transport completion sometimes stands in for owner success;
- private paths duplicate configuration, readiness, lifecycle, Channel,
  approval, persistence, or provider semantics;
- patches and adapters can survive after their replacement contract exists.

### Current integration concentrations

These measured areas are useful migration indicators, not automatic deletion
totals:

| Current area | Lines | Final disposition |
| --- | ---: | --- |
| Teams bridge | 41,506 | Retain Microsoft identity, Bot Framework transport, tenant routing, delivery operations, and UX. Move Channel-owned acknowledgement, conversation, and delivery semantics to OpenClaw contracts. |
| Gateway proxy | 19,426 | Retain routing and host connection mechanics. Delete private lifecycle, readiness, and owner-success inference as canonical Gateway/hosting contracts replace them. |
| Explicitly named ProxyPipe implementation/tests/protos | 16,523 | Delete frame families, correlation, retry classifiers, compatibility, and duplicated lifecycle family by family. Retain only a narrow owner-prepared hosted dispatch binding if still required. |
| OpenClaw client inside the container | 15,309 | Retain a thin typed adapter to supported Gateway/owner APIs; do not grow a second semantic client model. |
| Container plugins | 10,247 | Retain normal product plugins with owner-local contracts. Remove Lobster-specific core patches and generic host semantics from plugins. |
| Privileged bridge | 8,713 | Retain only bounded privilege separation with explicit authority and evidence. |
| Reverse proxy | 5,691 | Retain transparent routing/security functions; do not use it to own provider, credential, retry, or effect semantics. |
| Workspace implementation | 5,554 | Retain managed destination, encryption, retention, and recovery orchestration. Move canonical workspace/state lifecycle rules to OpenClaw owners. |
| Checked-in OpenClaw patch directory | 717 | Converge permanent active patch count to zero; temporary release carries require source identity, minimum replacement release, proof, expiry, and deletion. |

### Quantitative planning bands

LOC is a guardrail, not an architecture requirement. The final system should be
judged by ownership, behavior, and deletion proof. These bands describe a
plausible steady state for Lobster's current product breadth:

| Durable Lobster area | Current | Planning band | Direction |
| --- | ---: | ---: | --- |
| Enterprise runtime, fleet, identity, policy, and managed services | 237.8K | 200K-300K | Retain; allow product-driven growth while deleting owner duplication. |
| Hosted OpenClaw image, adapter, plugins, and physical integration | 120.2K | 60K-100K | Shrink and stabilize around supported owner contracts. |
| Web, admin, operator, approval, support, and assurance UX | 112.5K | 100K-180K | Retain or grow based on user value. |
| Developer, validation, release, and operator tooling | 87.9K | 50K-100K | Keep bounded and distinguish from production runtime. |
| Small protocols, mocks, packaging, and shared support | 11.6K | 10K-30K | Retain only named responsibilities. |
| **Total Lobster `src/`** | **569.9K** | **roughly 400K-700K** | Current aggregate size is plausible; improve its ownership shape. |

The adapter band is intentionally smaller than today, but the total band is not
a forced reduction. Lobster may add enterprise value while removing private
OpenClaw semantics.

### UX destination

OpenClaw UX should be the default experience for OpenClaw-owned concepts.
Lobster should not independently rebuild session, memory, tool, channel,
plugin, runtime-status, or local-configuration experiences.

The target UX composition is:

| Surface | Durable responsibility |
| --- | --- |
| OpenClaw CLI and Control UI | Owner-native runtime state and actions: agents, sessions, memory, tools, channels, plugins, configuration, readiness, diagnostics, and local repair. |
| Lobster product and admin UX | Tenant and fleet administration, Microsoft identity, policy distribution, rollout, budgets, compliance, support, managed storage, and cross-owner assurance. |
| Lobster-hosted OpenClaw Control UI | Version-matched OpenClaw assets behind Lobster authentication, Gateway routing, rollout selection, policy enforcement, and lockdown. |

The operating rule is:

> OpenClaw renders owner truth; Lobster renders enterprise governance across
> owners.

This refocuses the current 112.5K-line Lobster web area rather than requiring
its deletion. Duplicate OpenClaw screens become deletion candidates. Lobster
web code remains appropriate where it composes tenant, fleet, Microsoft, policy,
compliance, support, or managed-operation concerns that no individual OpenClaw
owner should absorb.

The hosted Control UI must use the exact compatible OpenClaw release, preserve
owner-native APIs and state, and fail closed when Lobster policy denies an
operation. Lobster authentication, routing, or presentation must not create a
second mutation path or a second copy of runtime truth.

### Final repository and ownership shape

```text
Upstream OpenClaw
  owner runtime facilities
  local configuration, sessions, memory, tools, channels, providers, nodes
  lifecycle, readiness, approvals, effects, retries, persistence semantics
  public contracts, Status, Doctor, Control UI, and conformance

Controlled OpenClaw fork or normal plugin
  temporary incubation and compatibility only
  every component classified B1, B2, or B3
  every component exits through upstream, plugin, Lobster, Rust, or deletion

Lobster
  enterprise desired state, identity, tenancy, policy, placement, fleet
  Microsoft 365 and private-service physical integrations
  managed credentials, storage destinations, retention, audit, and assurance
  release promotion, canary, rollback, repair, admin, support, and UX
  thin adapters consuming OpenClaw owner contracts

Independent Rust components
  complete replaceable owners behind language-neutral contracts
  no private Lobster dependency
  canary, rollback, state migration, and exact TypeScript deletion
```

### Measurable destination

EnterpriseClaw is at its destination when:

1. Lobster remains independently valuable as the enterprise host and product
   plane, whether its total source count is 400K, 570K, or 700K.
2. The OpenClaw-specific adapter is thin, typed, versioned, and supported rather
   than a second runtime.
3. Current ProxyPipe semantic families and the permanent patch stack reach zero;
   any remaining carrier is bounded to physical execution.
4. Lobster does not write canonical OpenClaw state or infer owner success from
   host transport, process, or container state.
5. Every fork carry and migration shim has an owner, minimum release, telemetry,
   expiry, and exact deletion target.
6. Local OpenClaw remains fully usable without Lobster, while Lobster can add
   enterprise governance through the same owner contracts.
7. Rust replaces only complete owners and deletes the superseded implementation;
   it does not create another cross-cutting platform layer.

## Recommended Message to Peter and Vincent

> We built a real enterprise hosting product around OpenClaw, not a wrapper.
> Lobster is roughly 771K repository-wide source/test lines and 570K under
> `src/`, compared with about 3.86M under OpenClaw `src/`. Lobster is therefore
> about 15% of the OpenClaw source tree. That is a credible size for the
> enterprise host because identity, tenancy, Teams, fleet rollout, policy,
> admin, storage, telemetry, budgets, and release operations belong in Lobster.
>
> The costly part has been compensating for missing or immature OpenClaw host
> contracts. ProxyPipe is the clearest example: a 16K-plus-line private
> protocol that grew from network forwarding into scheduling, Teams, product
> services, identity, lifecycle, retries, and evidence. We should not replace
> it with another universal bus. We should move each semantic family to its
> OpenClaw owner, keep only a narrow optional host execution boundary, canary
> each adoption, and delete the old path after measured expiry.
>
> Our architecture, fork, patch, conformance, and release work has already
> mapped that path. The remaining discipline is to distinguish shipped product
> from fork evidence, keep enterprise composition in Lobster, upstream only
> portable owner behavior, and require every bridge or patch to have a deletion
> condition. The destination is not a tiny Lobster; it is roughly a 400K-700K
> enterprise product plane with a thinner 60K-100K hosted adapter, zero
> permanent patches, and no duplicated OpenClaw semantic owners.

## Sources

- `C:\src\lobster\README.md`
- `C:\src\lobster\src\proto\proxy_pipe.proto`
- `projects/hosted-integration/proxypipe-decomposition.md`
- `projects/hosted-integration/decision-package.md`
- `projects/layering-contracts/lobster-deletion-ledger.md`
- `projects/enterpriseclaw/implementation-disposition-35-contracts.md`
- `projects/enterpriseclaw/delivery-portfolio-inventory-2026-08-02.md`
- `projects/enterpriseclaw/current-roadmap-2026-08-04.md`
- `projects/enterpriseclaw/lobster-plugin-patch-disposition-2026-08-05.md`
- `projects/enterpriseclaw/implementation-packages/`
