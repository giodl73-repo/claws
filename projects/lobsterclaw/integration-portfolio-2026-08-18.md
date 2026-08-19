# LobsterClaw Integration Portfolio

Definitive presentation of the LobsterClaw intake ledger as observed on
2026-08-18.

## What This List Is

This is the list LobsterClaw uses to decide what should enter, remain in, or
leave the private OpenClaw distribution.

EnterpriseClaw is design reference material. LobsterClaw's authoritative
operating object is broader and more concrete:

```text
upstream RFC
or direct upstream implementation PR
or bounded fork-incubated proposal
  -> LobsterClaw decision
  -> exact release disposition
  -> qualification
  -> Lobster adoption
  -> eventual carry removal
```

The list does **not** imply that every tracked item is patched into the current
release. It distinguishes:

- **carry**: exact source is already in an immutable LobsterClaw patch;
- **evidence-only**: proof exists, but the source is not admitted;
- **evaluate**: decide whether a future stable release or bounded carry is
  needed;
- **watch**: track released upstream adoption and Lobster compatibility;
- **superseded**: retain history, but do not carry;
- **incubated**: fork proof exists without an upstream decision.

## Portfolio At A Glance

| Tracked surface | Count | Meaning |
| --- | ---: | --- |
| Primary upstream RFC candidates | 23 | Gio-owned RFC PRs with a LobsterClaw disposition. |
| Direct upstream PR candidates | 1 | Important upstream behavior with no required RFC row. |
| Linked implementation/adopter PRs | 23 | Source PRs that implement or prove tracked decisions. |
| Fork-incubated proposals | 3 | Control, Board, and Config models; evidence only. |
| Strategic adjacent RFCs | 5 | RFCs owned by others that may change LobsterClaw decisions. |
| Distinct decision candidates | 32 | 23 RFCs + 1 direct PR + 3 incubations + 5 adjacent RFCs. |

Within the 23 primary RFC rows:

| Decision | Count |
| --- | ---: |
| Carry now | 3 |
| Evaluate | 8 |
| Watch | 9 |
| Superseded | 3 |

## In The Current LobsterClaw Carry

All three are currently admitted through manifest patch `0000`,
`enterpriseclaw-upstream-evidence-slices`. The patch contains exact source;
the RFC text itself is not the shipped behavior.

| RFC | Capability | Source PRs tracked | Removal condition |
| --- | --- | --- | --- |
| [#33 Readiness Conditions and Providers](https://github.com/openclaw/rfcs/pull/33) | Canonical owner readiness and bounded providers. | OpenClaw [#104018](https://github.com/openclaw/openclaw/pull/104018), [#113421](https://github.com/openclaw/openclaw/pull/113421), [#121355](https://github.com/openclaw/openclaw/pull/121355) | Adopted release exposes equivalent owner observations and hosted validation passes without patch `0000`. |
| [#34 Managed Configuration](https://github.com/openclaw/rfcs/pull/34) | Ordered startup configuration sources with field authority. | OpenClaw [#107026](https://github.com/openclaw/openclaw/pull/107026) | Released adoption proves Lobster no longer writes canonical OpenClaw configuration. |
| [#37 Standard Hosting Profiles](https://github.com/openclaw/rfcs/pull/37) | Named, release-tested local/container/proxy/node hosting postures. | OpenClaw [#113422](https://github.com/openclaw/openclaw/pull/113422), [#114636](https://github.com/openclaw/openclaw/pull/114636) | Profile semantics and conformance tooling ship in an adopted release. |

## Direct Upstream PR Tracked Without An RFC

| PR | Why LobsterClaw tracks it | Current decision |
| --- | --- | --- |
| [OpenClaw #90431](https://github.com/openclaw/openclaw/pull/90431) — **Node-hosted plugins: dynamic tools, MCP servers, and skills** | Peter's merged PR makes paired nodes first-class plugin hosts and supersedes the private standalone `skills.*`/node-skills bridge direction. This directly affects Lobster node capability, policy, routing, and future patch deletion. | **Watch for next stable-base adoption.** Do not backport by default. Qualify node policy/routing when a supported OpenClaw release contains merge commit `49b5b862acf3e45c013cb9cbebd0c7791b2349f4`; keep the superseded private bridge deleted. |

This is the reason the portfolio cannot be an RFC-only list.

## Evidence-Only Decisions

These are strategically relevant, but no source is admitted into the current
immutable release solely because the proposal or proof exists.

| RFC / proposal | Capability | Source evidence | Admission gate |
| --- | --- | --- | --- |
| [RFC #32 Command Catalog](https://github.com/openclaw/rfcs/pull/32) | Bounded command inventory and projections. | OpenClaw #100960, #104158-#104160 | Catalog remains observational; command owners retain invocation authority. |
| [RFC #46 Scale-to-zero recovery](https://github.com/openclaw/rfcs/pull/46) | Consistent capture, host handoff, restore, and restored admission. | OpenClaw #112865 and #112896 | OpenClaw owns application consistency; Lobster owns wake, storage, allocation, and rollout. |
| [RFC #54 OpenClaw-owned Rust node runtime](https://github.com/openclaw/rfcs/pull/54) | Reusable Rust Gateway client, node host, lifecycle, and authenticated sidecar. | OpenClaw #116050, #116450, #116863; Windows node #1068 | Clean-install artifact, protocol conformance, single-authority canary, rollback, and TypeScript deletion proof. |
| Control Model | Framework-neutral session/conversation projections, typed commands, and UI artifacts. | Fork RFC [giodl73-repo/rfcs#8](https://github.com/giodl73-repo/rfcs/pull/8), fork implementation stack, Lobster adopter proof | File and decide upstream; record package/support ownership; admit only released exact source. |
| Board Model | Owner-first board projection and native adopter. | Fork OpenClaw [#240](https://github.com/giodl73-repo/openclaw/pull/240) | Stable board-capable release or explicit beta admission with rollback. |
| Config Model | Read-only presentation-safe settings projection. | Fork Lobster PR #69 | Remain read-only until Managed Configuration supplies governed write authority. |

## Evaluate, Not Currently Carried

| RFC | Capability | Source PRs tracked | Decision |
| --- | --- | --- | --- |
| [#20 SQLite snapshot backup artifacts](https://github.com/openclaw/rfcs/pull/20) | Verified SQLite snapshot and restore. | OpenClaw [#105718](https://github.com/openclaw/openclaw/pull/105718) merged; #94967 stress proof | Prefer the released owner-native implementation; Lobster retains destinations, retention, and restore orchestration. |
| [#39 Hosted Feed v1 alignment](https://github.com/openclaw/rfcs/pull/39) | Reconciles feed specifications. | RFC/spec work | Wait for convergence and released implementation compatibility. |
| [#40 Policy Conformance rebuild](https://github.com/openclaw/rfcs/pull/40) | Current review surface for policy conformance. | RFC reconstruction | Admit owner behavior, never RFC text. |
| [#41 Doctor structured repair rebuild](https://github.com/openclaw/rfcs/pull/41) | Current review surface for structured findings/repair. | RFC reconstruction | Carry only a bounded implementation gap with owner tests. |
| [#48 Consolidated Claws contract](https://github.com/openclaw/rfcs/pull/48) | Portable Claw/application boundary and lifecycle. | OpenClaw #112773 and #117037 merged; #114783 draft | Carry only missing portable runtime seams; business applications stay outside LobsterClaw. |

## Watch For Released Adoption

| RFC | Capability | LobsterClaw posture |
| --- | --- | --- |
| [#1 Doctor health upgrades](https://github.com/openclaw/rfcs/pull/1) | Owner-native health findings and repairs. | Watch released implementation. |
| [#2 Policy Conformance 1.0](https://github.com/openclaw/rfcs/pull/2) | Policy conformance contract. | Preserve runtime enforcement ownership. |
| [#6 Policy approval evidence](https://github.com/openclaw/rfcs/pull/6) | Approval evidence addendum. | Use released owner evidence; no RFC-only patch. |
| [#19 Hosted feeds](https://github.com/openclaw/rfcs/pull/19) | Plugin/skill feed support. | Lobster retains tenant feed policy. |
| [#24 Feed observability](https://github.com/openclaw/rfcs/pull/24) | Usage and telemetry addendum. | Tenant reporting/billing remain downstream. |
| [#25 Hosted feed trust](https://github.com/openclaw/rfcs/pull/25) | Feed provenance and verification. | Lobster may enforce stronger tenant policy. |
| [#38 Account-feed specifications](https://github.com/openclaw/rfcs/pull/38) | Account feed and trust specifications. | Adopt released contracts. |
| [#42 Localization runtime](https://github.com/openclaw/rfcs/pull/42) | Locale/context runtime and product coverage. | Track OpenClaw #111543 and #113427; do not create a Lobster-owned OpenClaw catalog. |
| [#49 Progressive localization delivery](https://github.com/openclaw/rfcs/pull/49) | Delivery clarification for localization slices. | Use when qualifying released slices; no standalone carry. |

## Superseded — Retained Only For History

| RFC | Replaced by |
| --- | --- |
| [#27 Original Claws](https://github.com/openclaw/rfcs/pull/27) | Consolidated RFC #48 |
| [#52 Claw application composition and clients](https://github.com/openclaw/rfcs/pull/52) | Consolidated RFC #48 |
| [#56 Claw application project lifecycle](https://github.com/openclaw/rfcs/pull/56) | Consolidated RFC #48 and released lifecycle implementation |

## Strategic Adjacent RFC Watchlist

These proposals are not Gio-owned primary rows, but they may change what
LobsterClaw carries or deletes:

| RFC | Owner | Relevance |
| --- | --- | --- |
| [#30 ACL-based memory partitioning and cross-user access](https://github.com/openclaw/rfcs/pull/30) | Galin | Memory ACL and tenant-safe retrieval. |
| [#31 Remote Agent Harness Bridge and Event Protocol](https://github.com/openclaw/rfcs/pull/31) | Eduardo | Remote harness/runtime integration. |
| [#50 Automations terminology and configurable feature naming](https://github.com/openclaw/rfcs/pull/50) | Omar | Merged naming/config contract affecting hosted UX. |
| [#51 Channel-agnostic sender authentication strength](https://github.com/openclaw/rfcs/pull/51) | Omar | Ingress identity and mail/channel authorization. |
| [#59 External Automation Deadlines and Schedule-Only Occurrences](https://github.com/openclaw/rfcs/pull/59) | Omar | Hosted scheduling, deadlines, and scale-to-zero wake semantics. |

## The Complete Linked Upstream Source Stack

The primary RFC rows currently link these 23 implementation/adopter PRs:

| Area | Upstream PRs |
| --- | --- |
| Snapshot | OpenClaw #105718, #94967 |
| Command Catalog | OpenClaw #100960, #104158, #104159, #104160 |
| Readiness | OpenClaw #104018, #113421, #121355 |
| Managed Configuration | OpenClaw #107026 |
| Hosting Profiles | OpenClaw #113422, #114636 |
| Localization | OpenClaw #111543, #113427 |
| Scale-to-zero | OpenClaw #112865, #112896 |
| Claws | OpenClaw #112773, #114783, #117037 |
| Rust Node | OpenClaw #116050, #116450, #116863; Windows node #1068 |

Peter's merged OpenClaw #90431 is the twenty-fourth direct source PR and is a
first-class candidate because it is not subordinate to one of the tracked RFC
rows.

## Operating Rule

For every row, LobsterClaw must answer:

1. What user or operator capability does this provide?
2. Is the artifact an RFC, direct upstream PR, or fork-only proof?
3. Is it merged, released, and present in a supported base?
4. Is LobsterClaw carrying exact source, evidence only, or nothing?
5. Which immutable release lineages need it?
6. What proof must pass before Lobster consumes it?
7. What exact condition removes the carry?

That is the definitive portfolio. EnterpriseClaw may suggest candidates, but
only this LobsterClaw decision and release-admission process determines what the
distribution actually contains.
