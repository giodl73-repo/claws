# Lobster Plugin and Patch Disposition

Date: 2026-08-05

## Decision

The useful artifact for Peter is not a public dump of Lobster source. It is a
current, named ledger showing:

- which Lobster extensions are durable Microsoft product integrations;
- which are generic OpenClaw capabilities that should move upstream;
- which Code Mode wrappers can become ordinary namespace dependencies;
- which patches are portable fixes versus Microsoft/Lobster adaptation; and
- the deletion condition for every downstream carry.

The most important new outcome is:

> OpenClaw main now owns Code Mode. Lobster should stop growing a second generic
> Code Mode engine. Upstream should support trusted, pinned namespace-provider
> dependencies so product libraries can load without one OpenClaw plugin wrapper
> per namespace.

This means trusted host-side package loading, not arbitrary `import()` or
`require()` from model-written sandbox code.

## Source Generations

The often-quoted "27 patches" is historically correct, but it is not the only
current count.

| Generation | Commit | Patch files | Meaning |
| --- | --- | ---: | --- |
| Original PR #6839 promotion set | `d181f1b4ef` | 27 numbered inputs, `0001`-`0027` | The set used in the Peter/Vincent presentation. The tree also inherited a concurrently developed `0028`, so a raw tree count at this commit is 28. |
| Lobster `origin/main` assessment snapshot | `9f2109311b` | 29 | Earlier legacy queue: `0001`-`0019`, `0021`-`0030`. |
| Earlier Lobster `origin/main` | `3c2bc373f4` | 30 | Added the product-neutral `0031-cron-wake-only-payload-kind`. |
| Current Lobster `origin/main` | `a9ebb9ba0d` | 31 physical files | Numbered through `0032`; `0020` is absent; adds `0032-channel-participant-capability-surface`. |
| Live Lobster PR #6839 head | `9c4d209d06` | 31 | Promotion/rebase branch with additional node, harness, Teams, and release-port work. |
| Active checkout branch | `3caf856719` | 2 | Newer brokered-Teams-only patch direction against OpenClaw `v2026.5.28`. |

The counts describe generations, not contradictions. The strategic measure is
whether the permanent queue trends to zero as owner contracts ship.

## Plugin Portfolio

At current Lobster `origin/main` `a9ebb9ba0d`:

- 19 Lobster source packages exist under `src/openclaw_container/plugins`;
- 17 are enabled by the baked curated manifest;
- Cowork Code Mode and Scout exist in source but are not enabled;
- `_shared` and `cowork-runtime-sdk` are support libraries without
  `openclaw.plugin.json` and are not counted as plugin packages;
- three external OpenClaw packages are also enabled: Policy, Diagnostics OTEL,
  and Remote Harness.

### Disposition key

- **Upstream**: portable OpenClaw behavior; move to OpenClaw or an upstream-owned
  package.
- **Dependency**: keep the product/provider library, but remove the dedicated
  namespace-registration plugin after upstream Code Mode can load trusted
  providers.
- **Lobster**: durable Microsoft product, host, or transport integration.
- **Extract**: keep the Lobster adapter but upstream the generic contract.
- **Retire**: delete after upstream parity and migration evidence.

| Lobster source package | Current activation | Disposition | Why |
| --- | --- | --- | --- |
| Tools Code Mode | Enabled | **Retire** | Generic Code Mode now exists in OpenClaw main. Compare capabilities, upstream missing contracts, then delete Lobster's second engine. |
| WorkIQ Code Mode | Enabled | **Dependency + Lobster** | The M365/Graph/OBO implementation is Microsoft product code. Use it as the stress test for trusted provider loading, not as the generic engine. |
| Nodes Code Mode | Enabled | **Upstream / Dependency** | The namespace is portable, but the package also registers the separate approval-gated `nodes_remove` tool. Split that tool before removing the wrapper. |
| Workspace Files Code Mode | Enabled | **Upstream / Dependency** | Bounded workspace inspection is generic. Host workspace resolution must be injected through a stable owner contract. |
| Self-Diagnosis | Enabled | **Extract / Dependency** | Generic diagnosis and bug-provider contracts are portable; Lobster loopback routing and signed-user filing remain product adapters. |
| What's New Code Mode | Enabled | **Dependency + Lobster** | The `WhatsNew.list()` provider uses the ProxyPipe loopback while its runtime owns eligibility evaluation. Keep that product adapter and load it through the generic provider contract. |
| Cowork Code Mode | Present, disabled | **Dependency + Lobster** | The thin `cowork.runTask` namespace wrapper is the simplest provider-loading proof. The Aether/Cowork host binding remains Microsoft-owned. |
| Context Budget | Enabled | **Upstream** | Generic context inventory, evidence, and recommendations belong with the OpenClaw runtime; Lobster may add managed policy and reporting. |
| Snapshot | Enabled | **Upstream** | Runtime-owned snapshot semantics and SQLite-safe capture are generic. Lobster retains managed destinations, retention, and restore orchestration. |
| Catalog Inventory | Enabled | **Upstream** | Plugin/tool inventory is owner-native OpenClaw observability. Lobster consumes it for fleet and admin views. |
| Cron Preapproval | Enabled | **Extract** | Recurring least-privilege approval receipts are generic; Lobster identity projection and managed policy remain host concerns. |
| Turn Timezone | Enabled | **Upstream** | Per-turn time grounding is portable runtime behavior and should not require a Lobster-only package. |
| Channel Guidance | Enabled | **Extract** | The channel-scoped prompt hook is generic; Microsoft-specific guidance remains Lobster configuration. |
| Channel Participant | Enabled | **Lobster + contract extraction** | Thread-bound Teams participant actions and runtime-origin bindings are product behavior; upstream should own only the origin/authority contract. |
| Meeting Negotiation | Enabled | **Lobster** | Typed guest outcomes and managed collaboration are Microsoft product integration, currently coupled to private host routing. |
| Cowork Runtime | Enabled | **Lobster** | Aether/Cowork runtime invocation is a Microsoft service adapter, not generic OpenClaw behavior. |
| WebIQ | Enabled | **Lobster** | Managed web search routing, identity, and service behavior are product-specific provider integration. |
| Remote Harness Lobster | Enabled | **Lobster** | This is deliberately the private Lobster transport adapter for the upstream Remote Harness contract. |
| Scout Channel | Present, disabled | **Lobster** | Scout channel behavior and Microsoft routing belong in the product integration, consuming upstream Channel contracts. |

### Code Mode packaging outcome

A credible upstream design would keep one OpenClaw Code Mode runtime and load
trusted namespace providers from a pinned host manifest. The minimum contract is:

1. exact package name, version, and integrity;
2. a namespace-provider export with schema, prompt/reference, and callable paths;
3. collision and reserved-global validation;
4. host-supplied bindings for identity, workspace, transport, and secrets;
5. consequence and approval metadata for callable methods;
6. deterministic inventory, diagnostics, lifecycle, and unload behavior; and
7. no package-manager, filesystem, network, or module-loader access from guest
   model code.

If that contract lands, the dedicated WorkIQ, Cowork, Workspace Files,
Self-Diagnosis, and What's New registration wrappers can disappear. Nodes can
follow after its standalone approval tool is separated. The Microsoft provider
libraries and runtime-owned eligibility logic remain.

## Current-Main Patch Queue

This table classifies the 31 physical patch files at Lobster `origin/main`
`a9ebb9ba0d`. The generation is numbered through `0032`, but `0020` is absent.
Even "upstream" entries should become clean source PRs; the raw consolidated
patch files should not be published as-is.

| Patch | Portable value | Disposition |
| --- | --- | --- |
| `0001-msteams-upstream` | General Teams correctness, delivery, attachments, and channel behavior mixed into one large bucket | **Split and upstream** as focused Teams PRs; do not publish the consolidated bucket. |
| `0002-msteams-lobster` | Private brokered Teams adaptation, Lobster routing, identity, and transport behavior | **Lobster**; retain only until supported Teams host seams replace it. |
| `0003-secrets-fast-path-keyless-webiq` | Keyless hosted provider startup | **Lobster / extract contract**; upstream a generic credential-provider seam, keep WebIQ details private. |
| `0004-cron-delivery-target-optional` | Scheduler support for jobs without a delivery target | **Upstream**. |
| `0005-cron-toolless-run-guard` | Correct settlement for tool-less scheduled runs | **Upstream**. |
| `0006-cron-gateway-restart-interrupt-skipped` | Correct restart/interruption state | **Upstream**. |
| `0007-cron-hook-job-identity` | Stable scheduled-job identity through hooks | **Upstream**. |
| `0008-cron-passport-execution-fence` | Generation/authority fencing for scheduled execution | **Extract and upstream** the generic fence; keep Passport naming and host projection in Lobster. |
| `0009-cron-preapproval-creation` | Recurring scoped approval creation | **Extract and upstream** the receipt/approval contract; retain managed policy adapter in Lobster. |
| `0010-personality-extra-system-prompt` | Supported additional system-prompt projection | **Upstream** if still absent; otherwise retire. |
| `0011-cron-nested-tool-authorization` | Authorization of nested effects in scheduled/code-mode work | **Extract and upstream**; remove WorkIQ/Microsoft coupling from the portable change. |
| `0012-msteams-brokered-bot-framework-attachment-download` | Brokered Bot Framework attachment access | **Lobster**; Microsoft transport adapter, not a generic core patch. |
| `0013-node-approved-followup-output` | Correct output after an approved node operation | **Upstream**. |
| `0014-sensitivity-label-session-entry` | Sensitivity/provenance projection into session context | **Extract contract**; Microsoft label provider stays external. |
| `0015-agent-hook-channel-field` | Channel identity in agent hooks | **Upstream**. |
| `0016-memory-list-gateway-rpc` | Bounded read-only memory inventory | **Upstream**. |
| `0017-exec-approval-capability-token-relay` | Attributable approval capability through execution | **Extract and upstream** a typed approval receipt; keep private carrier/token details out of the public artifact. |
| `0018-msteams-agent-reactions` | Agent reaction behavior in the Teams channel | **Upstream Teams extension**. |
| `0019-hosted-control-ui-policy` | Explicit hosted Control UI policy and lockdown | **Upstream** as a generic hosting policy/profile. |
| `0021-doltlite-sqlite-engine` | Pluggable SQLite engine selection | **Extract upstream seam**; keep DoltLite product selection outside core. |
| `0022-node-exec-deadlines` | Deadline propagation and settlement for node execution | **Upstream**. |
| `0023-vitest-unit-fast-group-order` | Test-lane ordering only | **Upstream maintenance or drop**; no durable Lobster product value. |
| `0024-cron-drain-quiescence` | Scheduler drain and shutdown quiescence | **Upstream**. |
| `0025-context-derived-sensitivity` | Large Microsoft sensitivity/provenance implementation | **Lobster / provider plugin**; upstream only the generic provenance contract. |
| `0026-msteams-reaction-target-text` | Correct reaction target rendering | **Upstream Teams extension**. |
| `0027-teams-per-send-sensitivity` | Per-message Microsoft sensitivity behavior | **Lobster / provider plugin**. |
| `0028-node-invoke-session-binding` | Bind node invocation to the trusted requesting session | **Upstream security fix**. |
| `0029-agent-harness-host-adapter` | Hosted Agent Harness transport adaptation | **Lobster adapter** behind an upstream typed harness contract. |
| `0030-msteams-native-audience-route` | Microsoft Teams audience/routing selection | **Lobster**, or a narrowly reviewed Teams-extension contribution if the behavior is portable. |
| `0031-cron-wake-only-payload-kind` | Wake the scheduler without enqueueing a session, heartbeat, or agent turn | **Upstream** as a product-neutral scheduler primitive. |
| `0032-channel-participant-capability-surface` | Strict Teams participant origin and scoped group-chat meeting capability | **Lobster + contract extraction**; keep private brokered Teams routing downstream and upstream only the generic origin/capability binding contract. |

## Priority for Peter

The less Microsoft-specific the item, the more useful it is as upstream evidence.

### Priority 1: generic platform outcomes

- converge Lobster Tools Code Mode onto OpenClaw main;
- add trusted Code Mode namespace-provider dependencies;
- upstream Context Budget, Snapshot, Catalog Inventory, Workspace Files, and
  Turn Timezone behavior;
- upstream the generic Cron, node deadline/session binding, memory inventory,
  hosted Control UI policy, and approval-receipt fixes.

### Priority 2: generic contracts proven by Microsoft adapters

- method-level effect and approval metadata, proven by WorkIQ;
- provenance/sensitivity provider contracts, proven by Microsoft labels;
- channel identity and origin binding, proven by Teams;
- host execution and harness contracts, proven by ProxyPipe and Remote Harness.

### Priority 3: durable Microsoft product code

- WorkIQ, WebIQ, Cowork/Aether, Scout, Teams brokered auth/transport, tenant
  routing, and Microsoft sensitivity providers.

These items are valid Lobster investments, but they are not the most interesting
content for an upstream-facing repository.

## Repository Recommendation

Do not create a public repository containing all raw Lobster plugins and patch
files.

Use two surfaces:

1. **Private source mirror/evidence repository**: exact source generations,
   checksums, patch files, internal adapters, tests, and release evidence.
2. **Public or shareable decision repository**: this ledger, sanitized
   architecture diagrams, package/API contracts, clean extracted examples,
   upstream PR links, and deletion status.

The public repository should contain no credentials, tenant data, private
endpoints, internal service schemas, or copied Microsoft adapters. Its useful
proof is the generic contract and the upstream contribution, not the private
implementation dump.

## Peter/Vincent Summary

> Lobster has 19 source packages around OpenClaw, but they are not one category.
> Some are durable Microsoft products, some are generic OpenClaw capabilities,
> and several Code Mode packages are only registration wrappers. Since Code
> Mode is now in OpenClaw main, the next architectural outcome is one upstream
> runtime that loads pinned namespace-provider dependencies. WorkIQ remains the
> Microsoft stress test; it should not force a second generic engine.
>
> The patch count also represents generations, not a permanent stack: 27 in the
> original presentation set, 29 on an earlier assessment snapshot, 30 on the
> `0031` main snapshot, and now 31 physical files numbered through `0032` on
> current main. The live promotion PR also had 31 files, while the newer
> brokered-Teams branch carried only two. We should
> upstream portable Cron, node, memory, approval, hosting, and channel fixes;
> keep Microsoft adapters in Lobster; and require every remaining carry to name
> its replacement release and deletion condition.

## Sources

- `bic/lobster` current `origin/main` at `a9ebb9ba0de9314bb4fc11d33fe165fff173e416`
- earlier `0031` main snapshot at `3c2bc373f4025a0983ddaf9c73bdb746b4fbde43`
- earlier assessment snapshot at `9f2109311beab78a3e5d5f6a582f3a5da9a831c4`
- live Lobster PR #6839 at `9c4d209d0688e1bd8de3dcaf1c716f4c345c3974`
- active Lobster checkout branch at `3caf856719`
- OpenClaw `origin/main` at `2db3431f4aa198ba84c465bdf15506e783575431`
- `src/openclaw_container/config/openclaw.plugins.json`
- `src/openclaw_container/plugins/*/openclaw.plugin.json`
- `src/openclaw_container/openclaw-patches/`
- `projects/enterpriseclaw/lobster-final-assessment-2026-08-04.md`
- `projects/enterpriseclaw/lobster-openclaw-operational-issue-audit-2026-08-05.md`
