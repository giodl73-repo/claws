# Hosted Integration Landing Ledger — 2026-07-27

## Decision

The fork portfolio is an evidence funnel, not a merge queue. Broad OpenClaw and
Lobster prototypes proved the end-to-end architecture; corrected generic slices
are the only candidates for upstream promotion. Product-specific implementations
remain in Lobster, and ProxyPipe deletion remains last.

O1 and O4 received explicit upstream filing authorization on 2026-07-27. O1 is
tracked by issue #114772 and draft PR #114773; O4 is tracked by issue #114782
and draft PR #114783. The older broad O1 draft PR #113513 was linked and
closed as superseded. No additional upstream OpenClaw issue or PR is authorized
by this ledger; fork PRs remain draft until their disposition is applied
deliberately.

## Dispositions

| Disposition | Meaning                                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LAND`      | The capability and current diff shape are candidates for a fresh current-`main` upstream branch after issue filing is authorized. The fork PR itself is not merged into upstream. |
| `FILED`     | A fresh issue-linked upstream draft PR now owns the landing path. Keep the fork evidence only as source history.                                                                  |
| `EXTRACT`   | Preserve the proof and useful commits, but do not land the PR as written. Rebuild a smaller owner-correct PR from it.                                                             |
| `LOBSTER`   | Keep as downstream implementation or evidence. Restack onto released/pinned OpenClaw contracts before filing against `bic/lobster`.                                               |
| `ARCHIVE`   | Evidence only. Record its replacement, then close the fork draft; do not keep rebasing it.                                                                                        |

## Applied consolidation state

The first disposition pass was applied on 2026-07-27:

- Closed OpenClaw fork PRs #34, #35, #38, #45-#51, #72, #73, #156,
  #165, #166, #168, and #170 after posting their replacement or owner.
- Closed Lobster fork PRs #30-#34, #40, #44, and #48 after posting their
  canonical replacement.
- Annotated OpenClaw `EXTRACT` PRs #43, #52-#54, #59, #62, #63, #65, #71,
  #74, and #75 with their future owner and landing posture.
- Annotated Lobster PR #8 as Runtime State Continuity extraction work.
- Retained every source branch. No branch was deleted, no draft was marked
  ready, no ADO pipeline was queued, and no new upstream issue or PR was filed
  during consolidation.

The remaining `LAND`, `EXTRACT`, and `LOBSTER` drafts stay open as review or
replay sources. Closure is not a negative technical verdict; it ends duplicate
PR maintenance after the proof has a named canonical successor.

## Target landing graph

```text
guarded one-hop dispatch
  + exact-origin credential slots
  + manifest-first host bundles
        |
        +--> credential resolver registration
        |      + provider traffic policy
        |      + provider dispatch binding
        |             `--> credential materialization
        |
        +--> Hosting Profiles dependency
        |      `--> runtime inventory --> Status --> Doctor
        |
        `--> reverse frames --> session admission
                 --> operation ownership --> connection owner

merged/released OpenClaw contracts
        --> inactive Lobster plugin
        --> CAPI shadow/canary + rollback
        --> remaining owner migrations
        --> ProxyPipe telemetry zero
        --> ProxyPipe deletion
```

The graph has no dependency from Status/Doctor into carrier mechanics. The
carrier and operator stacks can proceed in parallel after their shared generic
foundations stabilize.

## Finite OpenClaw upstream queue

This is the canonical queue. `LAND` means content candidate, not permission to
file upstream yet.

| Order | Capability                          | Fork evidence                                                                                                                                                                                                                       | Disposition | Prerequisite                                                                                                                                   | Upstream shape                                                                                                                                                                                                                         |
| ----- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O1    | Local one-hop dispatch extraction   | Upstream [issue #114772](https://github.com/openclaw/openclaw/issues/114772) and [draft PR #114773](https://github.com/openclaw/openclaw/pull/114773), branch `user/giodl/o1-one-hop-dispatch-upstream` at `48fab2d723d0`           | `FILED`     | Current upstream `main`                                                                                                                        | One behavior-preserving internal networking refactor; no portable guard profile, credentials, or hosted execution. Exact-head ClawSweeper review is proof-sufficient and ready for maintainer review.                                  |
| O2    | Exact-origin credential slots       | [#158](https://github.com/giodl73-repo/openclaw/pull/158), current-main fork branch `user/giodl/o2-exact-origin-credential-slots-current-main` at `d15ab96cbf4`                                                                     | `EXTRACT`   | O1 + maintainer product/security decision on [#104849](https://github.com/openclaw/openclaw/issues/104849) + an approved provider/plugin owner | Fork proof only. Recompose with the approved owner and consumer; do not file a standalone infrastructure PR while the issue carries `no-new-fix-pr`.                                                                                   |
| O3    | Credential resolver registration    | [#163](https://github.com/giodl73-repo/openclaw/pull/163)                                                                                                                                                                           | `LAND`      | O2                                                                                                                                             | Plugin-owned resolver registration with lifecycle and provenance.                                                                                                                                                                      |
| O4    | Manifest-first host bundles         | Upstream [issue #114782](https://github.com/openclaw/openclaw/issues/114782) and [draft PR #114783](https://github.com/openclaw/openclaw/pull/114783), branch `user/giodl/o4-manifest-first-host-bundles-upstream` at `14bd05f5691` | `FILED`     | Current upstream `main`; parallel with O1-O3                                                                                                   | Inert manifest inventory only; no runtime registration API or activation. Exact-head ClawSweeper review is proof-sufficient and ready for maintainer review; the new plugin-manifest surface still requires plugin-owner confirmation. |
| O5    | Provider request traffic policy     | [#160](https://github.com/giodl73-repo/openclaw/pull/160)                                                                                                                                                                           | `LAND`      | O2                                                                                                                                             | Fail-closed immutable policy generation in the existing guarded fetch owner.                                                                                                                                                           |
| O6    | Provider dispatch bindings          | [#162](https://github.com/giodl73-repo/openclaw/pull/162)                                                                                                                                                                           | `LAND`      | O5                                                                                                                                             | Lifecycle-safe generic dispatcher selection; introduce a portable network guard only with the approved second connection owner; no carrier or provider product code.                                                                   |
| O7    | Credential materialization          | [#164](https://github.com/giodl73-repo/openclaw/pull/164)                                                                                                                                                                           | `LAND`      | O3 + O6                                                                                                                                        | Resolve same-plugin slots at dispatch time and remove references before host dispatch.                                                                                                                                                 |
| O8    | Canonical profile runtime inventory | [#175](https://github.com/giodl73-repo/openclaw/pull/175)                                                                                                                                                                           | `LAND`      | O4 + Hosting Profiles                                                                                                                          | Project bundle services into the canonical readiness provider; no duplicate registry.                                                                                                                                                  |
| O9    | Read-only Status                    | [#177](https://github.com/giodl73-repo/openclaw/pull/177)                                                                                                                                                                           | `LAND`      | O8                                                                                                                                             | One operator-read RPC and optional non-empty JSON field.                                                                                                                                                                               |
| O10   | Read-only Doctor                    | [#178](https://github.com/giodl73-repo/openclaw/pull/178)                                                                                                                                                                           | `LAND`      | O9                                                                                                                                             | Redacted actionable findings; no activation or repair.                                                                                                                                                                                 |
| O11   | Reverse-provider frame contract     | [#179](https://github.com/giodl73-repo/openclaw/pull/179) at `fa6f09737a8`                                                                                                                                                          | `LAND`      | O1                                                                                                                                             | Portable bounded state machine and fixtures; no endpoint, credentials, or carrier-supplied network policy. Lobster conformance PR 53 is at `6725e0b2b1`.                                                                               |
| O12   | Reverse-provider session admission  | [#180](https://github.com/giodl73-repo/openclaw/pull/180) at `5459acdd52e`                                                                                                                                                          | `LAND`      | O11                                                                                                                                            | Caller-verified exact authority including peer key, expiry, immutable sessions, safe detach. Lobster declaration PR 54 is at `58643569f1`.                                                                                             |
| O13   | Session-scoped operation ownership  | [#181](https://github.com/giodl73-repo/openclaw/pull/181) at `8a6590048fc`                                                                                                                                                          | `LAND`      | O12                                                                                                                                            | Exact current-session ownership, 64-operation cap, terminal release, detach drain, and late-frame fencing; no socket, queue, timer, or replay.                                                                                         |
| O14   | Connection-owner Plugin SDK seam    | [#182](https://github.com/giodl73-repo/openclaw/pull/182) at `c3a2cd79ea45`                                                                                                                                                         | `LAND`      | O13                                                                                                                                            | One narrow public facade over O11-O13 plus plugin-owned upgrade guidance; no Gateway role, token issuer, listener, socket manager, or generic host bus.                                                                                |

O1 is filed as issue #114772 and draft PR #114773. O4 is filed as issue #114782
and draft PR #114783. O2 maps to the
existing issue #104849 and is decision-blocked; do not file a duplicate issue
or fix PR while its `no-new-fix-pr` product/security gate remains. O1 is
intentionally local: the earlier `network-guard/v1` proposal is deferred to O6,
where a real second connection owner can justify and co-own the contract. O5
and O6 should not be filed until the credential-owner decision is stable.
O8-O10 are owned with Hosting Profiles.
O11-O14 are one carrier sequence, but each remains independently reviewable.

### Fork-only reverse-carrier prerequisites

These are evidence slices, not additions to the authorized upstream queue.

| Order | Capability                             | Fork evidence                                                                                                                                                                                                                                                                                                                                                          | State                                                                                                                                                                                           | Next dependency                                                                           |
| ----- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| G1    | Per-effective-bundle opaque generation | [#183](https://github.com/giodl73-repo/openclaw/pull/183) at `c6ce310f1ab`, stacked on O4 `14bd05f5691`                                                                                                                                                                                                                                                                | Draft, mergeable, exact-head review clean                                                                                                                                                       | G2 owner-preparation generation                                                           |
| G2    | Owner-prepared binding generation      | [#184](https://github.com/giodl73-repo/openclaw/pull/184) at `519e1c57819`, consolidating O11-O14 on G1                                                                                                                                                                                                                                                                | Draft, mergeable; combined-review protocol-state finding fixed; exact-head build, 76 focused tests, and final review clean                                                                      | G1 + effective config authority + recorded traffic-policy generation                      |
| G3    | Plugin-owned Gateway connection owner  | Lobster [#59](https://microsoft.ghe.com/giodl/lobster/pull/59) at `ee697055129`, stacked on #58                                                                                                                                                                                                                                                                        | Draft, mergeable, off by default, real loopback upgrade/admission proof                                                                                                                         | G2 + O11-O14                                                                              |
| G4    | Lobster runtime peer                   | Retry slice [#60](https://microsoft.ghe.com/giodl/lobster/pull/60) at `8b4402a737`; atomic selection/classification [#61](https://microsoft.ghe.com/giodl/lobster/pull/61) at `bad65d354d`; cooldown/drain/generation owner [#62](https://microsoft.ghe.com/giodl/lobster/pull/62) at `728678ac3c`; full contract in `g4-lobster-runtime-peer-lifecycle-2026-07-29.md` | Bounded inactive lifecycle proof complete: exact selection, classified retry, circuit cooldown, bounded drain, and stop-before-start replacement. Production wiring and rollout remain separate | G3 + exact selected generation, classified retry, bounded shutdown, observation, rollback |

## OpenClaw supersession ledger

### Fine-grained first-generation PRs

| Fork PR                                                 | Original purpose               | Disposition | Durable replacement or owner                                                                          |
| ------------------------------------------------------- | ------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------- |
| [#34](https://github.com/giodl73-repo/openclaw/pull/34) | Local one-hop dispatcher       | `ARCHIVE`   | Corrected O1 source in #71 / `guarded-dispatch-core-upstream`.                                        |
| [#35](https://github.com/giodl73-repo/openclaw/pull/35) | Network guard profile          | `ARCHIVE`   | Deferred to O6's second-owner decision. Fixtures remain evidence; do not land the profile in O1.      |
| [#38](https://github.com/giodl73-repo/openclaw/pull/38) | Credential slots               | `ARCHIVE`   | O2 #158, O3 #163, and O7 #164.                                                                        |
| [#43](https://github.com/giodl73-repo/openclaw/pull/43) | CAPI owner adapter             | `EXTRACT`   | External Lobster plugin/CAPI vertical after generic contracts. No CAPI product code in OpenClaw core. |
| [#45](https://github.com/giodl73-repo/openclaw/pull/45) | Bundle registration            | `ARCHIVE`   | O4 #159.                                                                                              |
| [#46](https://github.com/giodl73-repo/openclaw/pull/46) | Status inventory               | `ARCHIVE`   | O8/O9 #175/#177.                                                                                      |
| [#47](https://github.com/giodl73-repo/openclaw/pull/47) | Doctor bindings                | `ARCHIVE`   | O10 #178.                                                                                             |
| [#48](https://github.com/giodl73-repo/openclaw/pull/48) | Carrier frames                 | `ARCHIVE`   | O11 #179.                                                                                             |
| [#49](https://github.com/giodl73-repo/openclaw/pull/49) | Gateway host-provider endpoint | `ARCHIVE`   | Design evidence only; O13/O14 must be rebuilt without the 39-file endpoint bundle.                    |
| [#50](https://github.com/giodl73-repo/openclaw/pull/50) | Bundled Lobster host package   | `ARCHIVE`   | External Lobster plugin #29 and later official adopter.                                               |
| [#51](https://github.com/giodl73-repo/openclaw/pull/51) | Provider traffic policy        | `ARCHIVE`   | O5 #160.                                                                                              |
| [#52](https://github.com/giodl73-repo/openclaw/pull/52) | CAPI hosted binding            | `EXTRACT`   | External Lobster CAPI vertical after O1-O14.                                                          |
| [#53](https://github.com/giodl73-repo/openclaw/pull/53) | Substrate owner                | `EXTRACT`   | Later owner-correct Substrate PR plus Lobster adopter.                                                |
| [#54](https://github.com/giodl73-repo/openclaw/pull/54) | Continuity restore hold        | `EXTRACT`   | Runtime State Continuity project; not on the hosted-provider critical path.                           |
| [#59](https://github.com/giodl73-repo/openclaw/pull/59) | WebIQ owner                    | `EXTRACT`   | Later WebIQ-owner PR after CAPI proof.                                                                |
| [#62](https://github.com/giodl73-repo/openclaw/pull/62) | Anthropic owner                | `EXTRACT`   | Later provider-owner PR after CAPI proof.                                                             |
| [#63](https://github.com/giodl73-repo/openclaw/pull/63) | ACF Channel owner              | `EXTRACT`   | Later Teams Channel-owner PR; native Channel path, not provider dispatch.                             |
| [#65](https://github.com/giodl73-repo/openclaw/pull/65) | Graph/mail owner               | `EXTRACT`   | Later mail/Graph owner PR; native owner path, not provider dispatch.                                  |

### Consolidated five-package PRs

| Fork PR                                                 | Purpose                          | Disposition | Durable use                                                                                                                      |
| ------------------------------------------------------- | -------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [#71](https://github.com/giodl73-repo/openclaw/pull/71) | Package 1 guarded dispatch core  | `EXTRACT`   | Source evidence. Canonical landing path is upstream issue #114772 and draft PR #114773; portable guard-profile work moves to O6. |
| [#72](https://github.com/giodl73-repo/openclaw/pull/72) | Package 2 generic composition    | `ARCHIVE`   | Replaced by O2-O10. Preserve review history only.                                                                                |
| [#73](https://github.com/giodl73-repo/openclaw/pull/73) | Package 3 hosted execution       | `ARCHIVE`   | Replaced by O5-O14 plus external Lobster plugin ownership.                                                                       |
| [#74](https://github.com/giodl73-repo/openclaw/pull/74) | Package 4 provider owners        | `EXTRACT`   | Source for later Substrate/WebIQ/Anthropic owner PRs after the CAPI gate.                                                        |
| [#75](https://github.com/giodl73-repo/openclaw/pull/75) | Package 5 Microsoft interactions | `EXTRACT`   | Source for later ACF and Graph owner PRs in their native owners.                                                                 |

### Second-generation slices replaced by canonical recomposition

| Fork PR                                                   | Purpose                              | Disposition | Replacement                                                  |
| --------------------------------------------------------- | ------------------------------------ | ----------- | ------------------------------------------------------------ |
| [#156](https://github.com/giodl73-repo/openclaw/pull/156) | Hosted readiness composition         | `ARCHIVE`   | Hosting Profiles dependency plus O8 #175.                    |
| [#165](https://github.com/giodl73-repo/openclaw/pull/165) | Private runtime readiness projection | `ARCHIVE`   | Canonical O8 #175. Lobster #37 remains evidence.             |
| [#166](https://github.com/giodl73-repo/openclaw/pull/166) | First standalone carrier contract    | `ARCHIVE`   | Smaller O11 #179 and O12 #180. Lobster #40 remains evidence. |
| [#168](https://github.com/giodl73-repo/openclaw/pull/168) | First read-only Status slice         | `ARCHIVE`   | Canonical O9 #177. Lobster #44 remains evidence.             |
| [#170](https://github.com/giodl73-repo/openclaw/pull/170) | First Doctor slice                   | `ARCHIVE`   | Canonical O10 #178. Lobster #48 remains evidence.            |

## Hosting Profiles and readiness dependencies

These are not filed as Hosted Integration issues. They remain owned by the
Hosting Profiles/readiness program and are prerequisites only where shown:

| Fork PRs                                                                                                                                                                                                                                                                                              | Ownership in this ledger                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#157](https://github.com/giodl73-repo/openclaw/pull/157), [#173](https://github.com/giodl73-repo/openclaw/pull/173), [#174](https://github.com/giodl73-repo/openclaw/pull/174), [#176](https://github.com/giodl73-repo/openclaw/pull/176)                                                            | Standard profile composition, catalog, validation, and conformance. O8 consumes these contracts.                                                                                                                                                  |
| [#161](https://github.com/giodl73-repo/openclaw/pull/161), [#167](https://github.com/giodl73-repo/openclaw/pull/167), [#169](https://github.com/giodl73-repo/openclaw/pull/169), [#171](https://github.com/giodl73-repo/openclaw/pull/171), [#172](https://github.com/giodl73-repo/openclaw/pull/172) | Readiness subject identity, operations, catalog, startup wait, and affected-subject lifetimes. Track and land in the readiness project, not this queue. #167 is currently conflicting; that does not block the pure hosted-integration contracts. |

## Lobster landing ledger

Lobster fork PRs are never merged in their current stacked form into
`bic/lobster`. Production pieces are replayed onto the OpenClaw version that
contains their receiver contracts; proof-only branches are archived.

### Production/adopter sources

| Fork PR                                                                  | Purpose                                                                 | Disposition | Official landing condition                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#2](https://microsoft.ghe.com/giodl/lobster/pull/2)                     | Reverse dispatcher peer                                                 | `LOBSTER`   | Extract only after O13/O14 choose the connection owner; retain no-replay and bounded-stream semantics.                                                                                                                                              |
| [#3](https://microsoft.ghe.com/giodl/lobster/pull/3)                     | Inactive host package                                                   | `LOBSTER`   | Rebuild with #29 on the released bundle/plugin contracts.                                                                                                                                                                                           |
| [#4](https://microsoft.ghe.com/giodl/lobster/pull/4)                     | Enterprise egress policy                                                | `LOBSTER`   | After O5/O6; must remain Lobster-owned policy.                                                                                                                                                                                                      |
| [#5](https://microsoft.ghe.com/giodl/lobster/pull/5)                     | Inactive bundle/profile selection                                       | `LOBSTER`   | After O8-O10; remains inactive until CAPI cutover.                                                                                                                                                                                                  |
| [#6](https://microsoft.ghe.com/giodl/lobster/pull/6)                     | CAPI canary cutover                                                     | `LOBSTER`   | First authoritative vertical only after O1-O14, policy, Status/Doctor, rollback, and required ADO checks.                                                                                                                                           |
| [#7](https://microsoft.ghe.com/giodl/lobster/pull/7)                     | Substrate adoption                                                      | `LOBSTER`   | After successful CAPI observation.                                                                                                                                                                                                                  |
| [#8](https://microsoft.ghe.com/giodl/lobster/pull/8)                     | Continuity restore hold                                                 | `EXTRACT`   | Runtime State Continuity project, not carrier critical path.                                                                                                                                                                                        |
| [#9](https://microsoft.ghe.com/giodl/lobster/pull/9)                     | WebIQ adoption                                                          | `LOBSTER`   | After successful CAPI observation and owner PR.                                                                                                                                                                                                     |
| [#10](https://microsoft.ghe.com/giodl/lobster/pull/10)                   | Anthropic adoption                                                      | `LOBSTER`   | After successful CAPI observation and owner PR.                                                                                                                                                                                                     |
| [#11](https://microsoft.ghe.com/giodl/lobster/pull/11)                   | ACF OBO resolver                                                        | `LOBSTER`   | Later native Teams Channel migration.                                                                                                                                                                                                               |
| [#13](https://microsoft.ghe.com/giodl/lobster/pull/13)                   | Graph credential resolver                                               | `LOBSTER`   | Later Graph/mail owner migration.                                                                                                                                                                                                                   |
| [#14](https://microsoft.ghe.com/giodl/lobster/pull/14)                   | CAPI mixed-version observation                                          | `LOBSTER`   | After #6 canary; required before compatibility expiry.                                                                                                                                                                                              |
| [#29](https://microsoft.ghe.com/giodl/lobster/pull/29)                   | External host contribution plugin                                       | `LOBSTER`   | Canonical inert plugin foundation; replay after O4 and Hosting Profiles.                                                                                                                                                                            |
| [#35](https://microsoft.ghe.com/giodl/lobster/pull/35)                   | Host egress composition                                                 | `LOBSTER`   | Extract into final plugin after O5-O7.                                                                                                                                                                                                              |
| [#36](https://microsoft.ghe.com/giodl/lobster/pull/36)                   | Credential materialization adopter                                      | `LOBSTER`   | Extract after O7.                                                                                                                                                                                                                                   |
| [#37](https://microsoft.ghe.com/giodl/lobster/pull/37)                   | Readiness adopter                                                       | `LOBSTER`   | Evidence source; canonical implementation should use O8.                                                                                                                                                                                            |
| [#49](https://microsoft.ghe.com/giodl/lobster/pull/49)                   | Canonical profile runtime inventory                                     | `LOBSTER`   | Current O8 adopter source.                                                                                                                                                                                                                          |
| [#50](https://microsoft.ghe.com/giodl/lobster/pull/50)                   | Live Status proof                                                       | `LOBSTER`   | Current O9 live proof; fold harness into final plugin validation.                                                                                                                                                                                   |
| [#52](https://microsoft.ghe.com/giodl/lobster/pull/52)                   | Live Doctor proof                                                       | `LOBSTER`   | Current O10 live proof; fold harness into final plugin validation.                                                                                                                                                                                  |
| [#53](https://microsoft.ghe.com/giodl/lobster/pull/53)                   | Standalone carrier conformance                                          | `LOBSTER`   | Current O11 adopter source.                                                                                                                                                                                                                         |
| [#54](https://microsoft.ghe.com/giodl/lobster/pull/54) at `58643569f1`   | Session declaration                                                     | `LOBSTER`   | Current O12 adopter source against OpenClaw `5459acdd52e`.                                                                                                                                                                                          |
| [#55](https://microsoft.ghe.com/giodl/lobster/pull/55) at `f01fa7d8ab43` | Inactive plugin connection owner                                        | `LOBSTER`   | Current O14 connection factory, stacked on #54; superseded as stack tip by #56.                                                                                                                                                                     |
| [#56](https://microsoft.ghe.com/giodl/lobster/pull/56) at `bb174d675a13` | Inactive deployment credential and authority                            | `LOBSTER`   | Credential/authority source stacked on #55; superseded as stack tip by #57.                                                                                                                                                                         |
| [#57](https://microsoft.ghe.com/giodl/lobster/pull/57) at `98b726c681e2` | Off-by-default deployment composition and live proof                    | `LOBSTER`   | Composition source stacked on #56; superseded as stack tip by #58.                                                                                                                                                                                  |
| [#58](https://microsoft.ghe.com/giodl/lobster/pull/58) at `86edeaafc859` | Deployment-owned key projection and explicit selection                  | `LOBSTER`   | Selection source stacked on #57; superseded as the carrier adopter tip by #59 after G1/G2 supplied real generation authority.                                                                                                                       |
| [#59](https://microsoft.ghe.com/giodl/lobster/pull/59) at `ee697055129`  | G2-prepared plugin-owned Gateway route                                  | `LOBSTER`   | Current off-by-default adopter tip, stacked on #58 and proven against OpenClaw #184. Normal startup remains inert; production runtime peer and rollout are G4.                                                                                      |
| [#60](https://microsoft.ghe.com/giodl/lobster/pull/60) at `8b4402a737`   | Stable-window, jittered runtime-peer reconnect lifecycle                | `LOBSTER`   | First inactive G4 slice stacked on #59. It hardens retry timing and shutdown signaling only; exact selection wiring, failure classification, drain, activation, and rollout remain future slices.                                                   |
| [#61](https://microsoft.ghe.com/giodl/lobster/pull/61) at `bad65d354d`   | Atomic selected runtime peer and blocked-failure classification         | `LOBSTER`   | Second inactive G4 slice stacked on #60. It binds authority, peer fingerprint, identity, credential issuer, and exact route; only transport retries. Circuit cooldown, drain, generation replacement, activation, and rollout remain future slices. |
| [#62](https://microsoft.ghe.com/giodl/lobster/pull/62) at `728678ac3c`   | Circuit cooldown, bounded drain, and stop-before-start generation owner | `LOBSTER`   | Third inactive G4 slice stacked on #61. The bounded lifecycle proof is complete; upstream replay, production startup, live Gateway/canary proof, activation, and rollout remain gated on matching OpenClaw contracts.                               |

### Proof-only Lobster drafts

| Fork PR                                                | Evidence                         | Disposition | Replacement retained in  |
| ------------------------------------------------------ | -------------------------------- | ----------- | ------------------------ |
| [#30](https://microsoft.ghe.com/giodl/lobster/pull/30) | Guarded dispatch runtime routes  | `ARCHIVE`   | O1 validation record.    |
| [#31](https://microsoft.ghe.com/giodl/lobster/pull/31) | Credential slot runtime boundary | `ARCHIVE`   | O2/O3 validation record. |
| [#32](https://microsoft.ghe.com/giodl/lobster/pull/32) | Host bundle registry             | `ARCHIVE`   | #29 and canonical #49.   |
| [#33](https://microsoft.ghe.com/giodl/lobster/pull/33) | Traffic policy runtime           | `ARCHIVE`   | O5 validation record.    |
| [#34](https://microsoft.ghe.com/giodl/lobster/pull/34) | Dispatch binding runtime         | `ARCHIVE`   | O6 validation record.    |
| [#40](https://microsoft.ghe.com/giodl/lobster/pull/40) | First carrier fixture consumer   | `ARCHIVE`   | Canonical #53.           |
| [#44](https://microsoft.ghe.com/giodl/lobster/pull/44) | First live Status proof          | `ARCHIVE`   | Canonical #50.           |
| [#48](https://microsoft.ghe.com/giodl/lobster/pull/48) | First live Doctor proof          | `ARCHIVE`   | Canonical #52.           |

Lobster PR #12 is Managed Configuration work and is outside this ledger.
Required `bic/lobster` landing checks remain `GitOps/GitHubPop` and
`Lobster-Runtime-PullRequest`; none are manually queued for fork drafts.

## RFC track

[RFC fork PR #2](https://github.com/giodl73-repo/rfcs/pull/2) remains a
mergeable fork-only architecture draft. It is useful for the cross-cutting
decision—owner bindings, external plugin ownership, readiness, carrier limits,
and migration—but it does not block additive generic OpenClaw factorizations.
Reference it only when an upstream issue genuinely needs the architecture;
standalone issues should lead with their own reusable OpenClaw problem.

## Role review findings

- **Gateway runtime:** O11-O14 remain pure and allocation-bounded. O14 exposes
  the existing contracts to a plugin-owned upgrade route and imports no token
  issuance, reconnect scheduling, provider semantics, or second operator queue
  into the Gateway. The old #49 endpoint is evidence, not code to cherry-pick.
- **Lobster container owner:** one inactive in-process plugin/client is the
  target. No new sidecar or service is introduced. Reconnect creates a new
  incarnation and never transfers pending operations.
- **Fleet/operator:** O8-O10 and mixed-version observation precede authority
  cutover. Every Lobster production replay targets a pinned OpenClaw release,
  passes required GHE/ADO checks, and retains explicit rollback.
- **Security:** exact-origin credential slots, policy intersection, caller-
  verified peer evidence, generation fencing, expiry, and fail-closed unknown
  versions are landing gates. Generic core does not invent a Lobster token
  issuer or accept raw product credentials.
- **Open-source simplicity:** no `lobster/*` identifiers, CAPI behavior, ACF
  semantics, or Graph semantics land in generic core. Host bundles stay inert
  and removable; the external plugin owns product assembly.

## Application order

1. Record replacement links on every `ARCHIVE` fork PR, then close those fork
   drafts without deleting branches.
2. Update each `EXTRACT` PR body to name the future owner and stop treating it
   as a live stack dependency.
3. Keep `LAND` PRs draft and mergeable; do not restack them merely for cosmetic
   freshness before their prerequisites are selected for upstream filing.
4. When upstream filing is authorized, create a fresh issue and current-main
   branch for O1, O2, and O4 first. Never retarget the fork PR directly to
   `openclaw/openclaw`.
5. After receiver contracts merge and ship, replay `LOBSTER` production pieces
   into a small official `bic/lobster` stack. Proof-only commits stay behind.
6. Activate only through inactive selection, shadow/synthetic proof, bounded
   CAPI canary, mixed-version observation, explicit rollback, and compatibility
   expiry.
7. Delete ProxyPipe only after all active request families reach parity and
   old-path telemetry is zero.

## Completion gates

The consolidation phase is complete when:

- every hosted-integration fork PR has one disposition and replacement link;
- only O1-O14 remain in the prospective OpenClaw queue;
- Hosting Profiles and Continuity dependencies are tracked by their owner
  projects rather than duplicated here;
- the external Lobster plugin has one canonical replay plan;
- no upstream issue/PR has been filed without explicit authorization; and
- the ProxyPipe deletion ledger names the exact removable code after each
  adopter reaches parity.
