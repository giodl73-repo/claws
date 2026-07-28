# Hosted Integration Fork Review Stack

> Historical review map. The canonical disposition and eventual upstream queue
> now live in `landing-ledger-2026-07-27.md`. Superseded `ARCHIVE` drafts were
> commented and closed on 2026-07-27 with all source branches retained.

## Purpose

These five draft PRs are the reviewer-facing OpenClaw packaging of the
fine-grained hosted-integration implementation series.

They exist only in `giodl73-repo/openclaw`. They are preparation and repair
surfaces before any issue or PR is filed against `openclaw/openclaw`.

The original fine-grained branches remain available as commit-level evidence.
The landing ledger determines which PRs stay open as `LAND`, `EXTRACT`, or
`LOBSTER` sources and which duplicate review surfaces are closed as `ARCHIVE`.

## Stack

| Package                                    | Fork PR                                                 | Base      | Size                            | Review thesis                                                                                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------- | --------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Guarded dispatch core                   | [#71](https://github.com/giodl73-repo/openclaw/pull/71) | `main`    | 3 commits, 8 files, +843/-11    | Extract one local redirect-disabled hop and a runtime-validated `network-guard/v1` boundary without adding hosted execution or credentials.                                                                              |
| 2A. Exact-origin credential slots          | [#158](https://github.com/giodl73-repo/openclaw/pull/158) | Package 1 | 6 commits, 4 files, +899/-10    | Resolve one owner-declared header credential immediately before the initial guarded hop, with exact-origin scope, cancellation, expiry, redaction, and no public/model-facing registration surface.                      |
| 2B. Manifest-first host bundles             | [#159](https://github.com/giodl73-repo/openclaw/pull/159) | upstream-main mirror | 1 commit, 10 files, +511/-1 | Validate one immutable, inert host contribution inventory during plugin discovery and carry it in the current registry snapshot with loader-owned provenance; no runtime registration API, activation, readiness, Status, or Doctor. |
| 3A. Provider request traffic policy         | [#160](https://github.com/giodl73-repo/openclaw/pull/160) | Package 2A | 1 commit, 21 files, +1622/-5 | Publish one immutable fail-closed policy generation through a transaction-safe Plugin API and enforce route, origin, private-network, timeout, TLS, and redirect invariants in the real guarded streaming LLM fetch path. |
| 3B. Provider dispatch bindings              | [#162](https://github.com/giodl73-repo/openclaw/pull/162) | Package 3A | 2 commits, 21 files, +719/-17 | Register one lifecycle-safe, policy-generation-fenced host dispatcher; keep redirect/header policy in OpenClaw and assign DNS/connection enforcement through `network-guard/v1`, without adding a carrier or provider-specific runtime. |
| Credential materialization bridge           | [#164](https://github.com/giodl73-repo/openclaw/pull/164) | Composition proof | 1 commit, 8 files | Let a selected dispatcher declare exact credential slots, resolve only same-plugin lifecycle owners at dispatch time, apply credentials to the initial guarded hop, and strip references before host dispatch. |
| Runtime readiness projection                 | [#165](https://github.com/giodl73-repo/openclaw/pull/165) | Credential bridge | 1 commit, 25 files, +992/-11 | Register plugin-owned bounded readiness criteria and project enabled host-bundle services into one immutable caller-driven runtime inventory without adding Status, Doctor, health, or startup policy. |
| Canonical profile runtime inventory           | [#175](https://github.com/giodl73-repo/openclaw/pull/175) | Hosting Profiles + host bundles | 2 commits, 6 files, +394/-15 | Re-port only host-bundle runtime projection onto the canonical readiness provider and selection contracts, with same-plugin manifest references and no duplicated registry, config, startup gate, Status, or Doctor behavior. |
| Read-only status inventory                    | [#168](https://github.com/giodl73-repo/openclaw/pull/168) | Runtime readiness | 1 commit, 15 files, +366/-13 | Reuse the registry-scoped runtime inventory through an operator-read Gateway RPC and optional non-empty `status --json` field, without local plugin activation, probe parameters, Doctor, health, startup, or carrier behavior. |
| Doctor readiness projection                   | [#170](https://github.com/giodl73-repo/openclaw/pull/170) | Status inventory | 2 commits, 6 files, +255/-6 | Convert non-ready Gateway inventory contributions into structured, redacted, actionable Doctor findings through one bounded CLI-scoped read-only RPC, without local plugin activation, repair, startup policy, or a second schema. |
| Reverse-provider dispatch contract            | [#166](https://github.com/giodl73-repo/openclaw/pull/166) | Credential bridge | 1 commit, 4 files, +1166 | Define bounded reverse-dispatch frames and a deterministic conformance evaluator with no endpoint, readiness dependency, or reconnect replay. |
| 2. Generic host composition and operations | [#72](https://github.com/giodl73-repo/openclaw/pull/72) | Package 1 | Rework in progress              | Keep credential-slot, bundle registration, provenance, Status, Doctor, and external-plugin registration generic; remove CAPI and all `lobster/*` product semantics.                                                      |
| 3. Generic hosted provider execution       | [#73](https://github.com/giodl73-repo/openclaw/pull/73) | Package 2 | Rework in progress              | Keep the bounded reverse carrier, least-privilege Gateway endpoint, traffic-policy intersection, and external-plugin contracts; remove `extensions/lobster-host` and the CAPI hosted binding.                            |
| 4. Additional provider owners              | [#74](https://github.com/giodl73-repo/openclaw/pull/74) | Package 3 | 7 commits, 24 files, +4743/-113 | Prove the owner model across Substrate, WebIQ, and Anthropic while preserving cell-local bundle incarnations, route invariants, cancellation, and narrow outbound header authority without a universal adapter registry. |
| 5. Microsoft interactions                  | [#75](https://github.com/giodl73-repo/openclaw/pull/75) | Package 3 | 3 commits, 69 files, +7086/-140 | Prove Channel- and mailbox-specific ownership for ACF and Graph without flattening those semantics into provider dispatch.                                                                                               |

Packages 4 and 5 are parallel. Neither is a prerequisite for the other.

## Delivery Readiness

| Package | Current fork head | State                                                                                               |
| ------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| 1       | `8c3f109a1e2`     | Draft, mergeable, review-clean, and ready for explicit upstream filing authorization.               |
| 2A      | `7dfbc71bdeb`     | Fork-only draft stacked on upstream Package 1; locally review-clean with fork CI initializing.      |
| 2B      | `4a733c416ca`     | Standalone fork-only draft on current upstream main; locally review-clean with real external-plugin proof. |
| 3A      | `13f6012e2ca`     | Fork-only draft stacked on Package 2A; locally review-clean, applicable fork proof green, expected fork-only label jobs red, and Lobster runtime proof published in PR 33. |
| 3B      | `0e62ffe1711`     | Fork-only draft stacked on Package 3A; locally review-clean, real-behavior proof green, paired Lobster exact-head runtime proof published in PR 34, and only expected fork-only automation failures observed. |
| Credential bridge | `938218ae3b6` | Fork-only draft stacked on the composition proof branch; 132 focused tests, all four type graphs, SDK/lint/format gates, clean review, and packaged Lobster exact-head proof in PR 36. |
| Runtime readiness | `b86df32297c` | Fork-only draft stacked on the credential bridge; 22 focused tests, core/core-test graphs, SDK/lint/format gates, clean review, green real-behavior proof, and exact packaged Lobster adopter proof in PR 37. |
| Canonical profile runtime inventory | `6e51687283c` | Fork-only draft, mergeable, stacked on exact Hosting Profiles head `e9c1988c5e59` plus standalone host bundles as composition base `f128c584b9a`; 33 focused tests, Oxlint, core typecheck, full build, diff hygiene, and clean final review pass. Lightweight fork checks are initializing. |
| Status inventory | `6577d460703` | Fork-only draft stacked on runtime readiness; 51 focused tests, core/core-test graphs, lint/format gates, clean review, and real registry-to-status-payload proof. Remote build proof awaits usable Blacksmith or brokered AWS credentials. |
| Doctor readiness | `b728840dcea` | Fork-only draft stacked on status inventory; 105 original plus 25 transport-focused tests, core graph, lint/format gates, diff hygiene, clean Codex review, green real-behavior/Workflow Sanity proof, and exact live Lobster proof in PR 48. Only expected fork-only automation failures remain. |
| Reverse carrier contract | `566cbe31d0e` | Fork-only draft stacked on the credential bridge and parallel to readiness; 67 focused tests, core/core-test graphs, lint/format gates, clean review, green real-behavior proof, and exact Rust fixture consumption in Lobster PR 40. |
| 2       | `0526a4a9e15`     | Superseded review shape: CAPI must move to an external plugin before this is an upstream candidate. |
| 3       | `df1e3c6a724`     | Superseded review shape: bundled `lobster-host` and CAPI binding must move out of OpenClaw.         |
| 4       | `f518a822261`     | Review-clean old stack head; requires restack after generic package 3.                              |
| 5       | `128df4698d8`     | Review-clean old stack head; requires restack after generic package 3.                              |

Package 5 hardening now covers root-package inclusion, generated Plugin SDK and
channel metadata, exact Graph and ACF owner authority, direct-token SSRF
protection, brokered Graph transport, mailbox/tenant identity validation,
account-aware pairing, normalized route ownership, full runtime config
validation, persistent replay suppression, atomic concurrent-delivery dedupe,
strict source/test typing, and an exported ACF contract included in the
msteams CommonJS package build. PR 75 is published with three commits across
71 files (+7118/-140), a curated reviewer-facing body, and no accepted Codex
findings.

## Branches And Worktrees

| Package | Branch                                                     | Worktree                                            |
| ------- | ---------------------------------------------------------- | --------------------------------------------------- |
| 1       | `user/giodl/hosted-integration-guarded-dispatch-core`      | `C:\src\openclaw-hosted-package-1-guarded-dispatch` |
| 2A      | `user/giodl/hosted-integration-credential-slots`           | WSL `/root/src/openclaw-hosted-package-2a-credential-slots` |
| 2B      | `user/giodl/hosted-integration-host-bundles`                | WSL `/root/src/openclaw-hosted-package-2b-host-bundles` |
| 3A      | `user/giodl/hosted-integration-provider-traffic-policy`     | WSL `/root/src/openclaw-hosted-package-3a-traffic-policy` |
| 3B      | `user/giodl/hosted-integration-provider-dispatch-bindings`  | WSL `/root/src/openclaw-hosted-package-3b-dispatch-bindings` |
| Runtime readiness | `user/giodl/hosted-integration-runtime-readiness` | WSL `/root/src/openclaw-hosted-integration-runtime-readiness` |
| Canonical profile runtime inventory | `user/giodl/hosted-integration-profile-runtime-inventory` | WSL `/root/src/openclaw-hosted-integration-profile-runtime-inventory` |
| Status inventory | `user/giodl/hosted-integration-status-inventory` | WSL `/root/src/openclaw-hosted-integration-status-inventory` |
| Lobster canonical runtime inventory | `user/giodl/lobster-profile-runtime-inventory` | `C:\src\lobster-profile-runtime-inventory` |
| Doctor readiness | `user/giodl/hosted-integration-doctor-inventory` | WSL `/root/src/openclaw-hosted-integration-doctor-inventory` |
| Lobster status inventory | `user/giodl/lobster-host-status-inventory` | `C:\src\lobster-host-status-inventory` |
| Lobster Doctor inventory | `user/giodl/lobster-host-doctor-inventory` | `C:\src\lobster-host-doctor-inventory` |
| Reverse carrier contract | `user/giodl/hosted-integration-reverse-carrier-contract` | WSL `/root/src/openclaw-hosted-integration-reverse-carrier-contract` |
| Lobster reverse-carrier conformance | `user/giodl/lobster-reverse-carrier-conformance` | `C:\src\lobster-reverse-carrier-conformance` |
| 2       | `user/giodl/hosted-integration-capi-owner-operations`      | `C:\src\openclaw-hosted-package-2-capi-owner`       |
| 3       | `user/giodl/hosted-integration-hosted-capi-execution`      | `C:\src\openclaw-hosted-package-3-capi-execution`   |
| 4       | `user/giodl/hosted-integration-additional-provider-owners` | `C:\src\openclaw-hosted-package-4-providers`        |
| 5       | `user/giodl/hosted-integration-microsoft-interactions`     | `C:\src\openclaw-hosted-package-5-microsoft`        |

## Fine-Grained Source PRs

| Package | Source PRs              |
| ------- | ----------------------- |
| 1       | #34, #35, #38           |
| 2       | #43, #45, #46, #47      |
| 3       | #48, #49, #50, #51, #52 |
| 4       | #53, #59, #62           |
| 5       | #63, #65                |

Package 4 previously composed contributions into a bundled `lobster/host`
manifest. That manifest is now a deletion target: an external Lobster plugin
must own bundle configuration and registration.

## Lobster Evidence

| OpenClaw package | Current Lobster evidence                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1                | [Runtime proof PR 30](https://microsoft.ghe.com/giodl/lobster/pull/30) exercises production guarded fetch over real direct and proxy sockets without adding activation authority.                                      |
| 2A               | [Credential proof PR 31](https://microsoft.ghe.com/giodl/lobster/pull/31) proves lazy readiness, exact-origin placement, redirect stripping, and denied-origin fail-closed behavior against production OpenClaw source. |
| 2B               | [Host-bundle proof PR 32](https://microsoft.ghe.com/giodl/lobster/pull/32) projects Lobster PR 29's canonical five-item inventory into the OpenClaw manifest contract and proves discovery plus registry provenance without runtime import. |
| 3A               | [Traffic-policy proof PR 33](https://microsoft.ghe.com/giodl/lobster/pull/33) registers through the production Plugin API and proves direct routing, timeout/private-network narrowing, pre-send denial, redirect fencing, and route-conflict failure against production `buildGuardedModelFetch`. |
| 3B               | [Dispatcher proof PR 34](https://microsoft.ghe.com/giodl/lobster/pull/34) registers the policy and binding through the production Plugin API and proves POST-body preservation, selected connection ownership, OpenClaw-owned redirects/header stripping, fail-closed generation selection, and the unchanged unbound direct path over real loopback services. |
| Credential bridge | [Packaged adopter PR 36](https://microsoft.ghe.com/giodl/lobster/pull/36) declares the slot on Lobster's dispatcher and proves OpenClaw-owned materialization through production guarded model fetch at exact heads `938218ae3b6` / `63ec23b7ac`. |
| Runtime readiness | [Packaged adopter PR 37](https://microsoft.ghe.com/giodl/lobster/pull/37) registers all five bundle criteria and proves aggregate readiness, lazy credentials, guarded POST preservation, rollback, and unload at exact heads `b86df32297c` / `343cff9a78`. |
| Canonical profile runtime inventory | [Standalone adopter PR 49](https://microsoft.ghe.com/giodl/lobster/pull/49) publishes five honest inactive criteria and proves inventory projection, explicit required selection, transaction rollback, and self-contained plugin packaging at exact heads `6e51687283c` / `c4bf85b7ff`. It is stacked directly on host-bundle proof PR 32, not old readiness PR 37's credential/dispatch chain. |
| Status inventory | [Live Gateway adopter PR 44](https://microsoft.ghe.com/giodl/lobster/pull/44) securely stages the packaged plugin and proves the authenticated `hostIntegration.status` RPC returns one five-service `lobster/host` inventory at exact heads `6577d460703` / `84cdabda59c`. |
| Doctor readiness | [Live Doctor adopter PR 48](https://microsoft.ghe.com/giodl/lobster/pull/48) reuses the packaged-plugin Gateway harness and proves three owner-reported `Unknown` contributions become redacted warnings while two ready contributions stay silent at exact heads `b728840dcea` / `55a9c03302`. |
| Reverse carrier | [Conformance adopter PR 40](https://microsoft.ghe.com/giodl/lobster/pull/40) pins OpenClaw `566cbe31d0e`'s exact fixture bytes and proves all nine traces produce matching Rust results without carrier registration or activation. |
| 2                | [F1 PR 5](https://microsoft.ghe.com/giodl/lobster/pull/5) prepares inactive package/profile selection.                                                                                                  |
| 3                | [F2 PR 14](https://microsoft.ghe.com/giodl/lobster/pull/14) contains the CAPI host peer, policy, canary, rollback, and mixed-version observation stack.                                                 |
| 4                | [Substrate PR 7](https://microsoft.ghe.com/giodl/lobster/pull/7), [WebIQ PR 9](https://microsoft.ghe.com/giodl/lobster/pull/9), and [Anthropic PR 10](https://microsoft.ghe.com/giodl/lobster/pull/10). |
| 5                | [ACF PR 11](https://microsoft.ghe.com/giodl/lobster/pull/11) and [Graph PR 13](https://microsoft.ghe.com/giodl/lobster/pull/13).                                                                        |

The Lobster evidence remains fine-grained for now. Consolidating it is not a
prerequisite for reviewing the OpenClaw contract packages.

## Upstream Filing Gate

Do not file OpenClaw issues for these packages yet. Continue authoring and
validating fork-only drafts until Gio explicitly opens the upstream issue-filing
phase.

No package should target `openclaw/openclaw` until:

1. its fork PR has no unresolved high-confidence review finding;
2. the package thesis still matches its diff after consolidation;
3. targeted owner, contract, and representative consumer proof is green;
4. prerequisite package APIs are stable enough to avoid immediate restacking;
5. the PR body removes Lobster-internal framing and leads with reusable
   OpenClaw value; and
6. the user explicitly authorizes filing the upstream PR.

Package 1 is the first upstream candidate. Packages 2 and 3 should not be filed
merely because their fork checks become green.
