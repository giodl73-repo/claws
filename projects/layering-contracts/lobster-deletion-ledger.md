# Lobster Workaround Deletion Ledger

## Purpose

Track whether upstream hosting contracts actually delete Lobster code. An RFC,
OpenClaw PR, or shipped release is not complete for this project until the
corresponding Lobster workaround has a named removal gate and owner.

## Required Fields

| Field | Meaning |
| --- | --- |
| Workaround | Exact Lobster code, config writer, frame, path rule, probe, or test family |
| Contract | Portable OpenClaw contract replacing it |
| Temporary owner | Lobster owner while the workaround remains |
| Upstream proof | RFC/PR plus semantic conformance test |
| Minimum release | First OpenClaw artifact Lobster may admit without the workaround |
| Lobster removal | Deletion PR or planned code/test removal |
| Runtime evidence | Telemetry proving the old path is unused during rollout |
| Status | Inventory, mapped, dual-run, removal-ready, or deleted |

No entry may remain in dual-run indefinitely. Dual paths require an expiry
release and must not silently fall back after the expiry.

## Initial Ledger

| Workaround family | Contract | Replacement proof | Lobster removal target | Status |
| --- | --- | --- | --- | --- |
| Private startup probes and adapter readiness inference | Readiness Conditions and Standard Hosting Profiles | Selected profile reports the canonical required conditions through ready/readyz, health, status, and CLI; packaged profile conformance passes | Delete duplicate adapter checks and exact startup-checklist tests | Mapped; activation and release-evidence conditions remain |
| Baked OpenClaw config fragments and ordered config writers | Managed Configuration | Old generated effective config is semantically equivalent to composed ordered-layer inputs; conflict, reload, and stale-write tests pass | Delete fragment generators, stale-value cleanup, duplicate env projection, and exact config-blob tests | Recursive exact-authority prototype proven; allowed-origins writer mapped; real old/new dual-run pending |
| ProxyPipe host-service request/result frames | Hosted Integration and Capability Bindings | Each portable unary frame family maps to a typed provider and passes non-TypeScript, rollover, timeout, overload, and mixed-version conformance | Delete mapped ProxyPipe frames, retry classifiers, and duplicate correlation logic | Fork RFC updated; full CAPI proof is the first adoption milestone |
| ProxyPipe channel, approval, harness, and lifecycle frames | Existing Channel/Gateway approval/AgentHarness/continuity contracts | Per-family semantic mapping and end-to-end equivalence proof | Delete private frames only after migration to their owning contracts; do not tunnel them through host providers | Inventory in progress |
| Path discovery, opportunistic copy, persistence wrappers, and private shutdown-ready inference | Runtime State Continuity | Complete component/writer inventory plus generation-fenced checkpoint, publication, restore, and failure-injection proof | Delete path-copy logic, duplicate restore ordering, private checkpoint/shutdown frames, and unsafe clean/dirty inference | RFC draft; state inventory required |
| Release pinning based on tribal knowledge or patch presence | Readiness profile release evidence | ArtifactIdentityAvailable, SelectedProfileConformant, and ExpectedArtifactMatched bind the running release to packaged profile proof | Replace manual allowlists and patch-presence checks with artifact/profile admission data | RFC roadmap |
| Host-specific readiness telemetry parsing | Readiness transition evidence | Stable redacted transition events and condition IDs | Delete string parsing and duplicate readiness state machines; retain Kusto sinks/dashboards | Planned follow-up |
| Unversioned `extra_env` projection/reset/forwarding matrix | Four-corner adoption by key owner | Complete generated key descriptor plus effective-config/binding/activation equivalence | Delete ordinary config and binding keys from `extra_env`; retain only documented bootstrap/container inputs | Inventory; complete key matrix pending |
| Missing OpenClaw runtime/incarnation correlation | Hosting Profile runtime activation identity | Lobster supplies stable logical runtime and physical incarnation ids; returned readiness identity matches routing and telemetry | Delete private identity inference from container/log correlation where canonical activation identity is available | OpenClaw PR 42 drafted; Lobster adoption pending |
| Eleven OpenClaw source patches and post-install rewrite scripts | Per-owner upstream fixes plus applicable four-corner contracts | Each patch has upstream issue/PR, minimum release, conformance evidence where needed, and no old-path telemetry | Delete patch application, rewrite scripts, drift gates, and obsolete patched tests one replacement at a time | Patch-retirement inventory required |
| Vendored m365mail extension and transparent Graph token injection | D5c m365mail owner contract plus D5d exact `lobster/graph-token` resolver, enterprise route, and Gateway-authenticated inbound delivery | D5c cross-language request fixture; D5d exact origin/audience/subject tests, canary readiness/rollback, and webhook auth proof | After Lobster admits an OpenClaw artifact containing D5c, activate the hosted owner selector, observe old-path usage at zero, then delete `src/openclaw_container/m365mail-extension` and the legacy Graph injection rule/tests | Adopter canary proven; removal blocked on OpenClaw promotion and activation evidence |
| CAPI ProxyPipe egress compatibility path | D2a owner binding, D2b host-provider canary, and F2 CAPI mixed-version observation | Recorded/synthetic request and response fingerprints match across OpenClaw `2026.5.28` legacy and minimum candidate `2026.6.11`; status exposes exact version/generation, old-path, expiry, rollback, and phase blockers without retaining bytes | F3 deletes CAPI private framing, buffering, inflight correlation, refresh compatibility, and fallback only after the F2 snapshot is removal-ready | F2 exact observer proven; real compatibility expiry and zero-old-path fleet evidence remain |

## Legitimate Lobster Ownership

The ledger must not create deletion work for Lobster's actual product value:

- enterprise IdP integration and tenant/user routing;
- Teams and web surfaces;
- worker pools, placement, rollout rings, and quotas;
- admin and approval UX;
- storage destination, encryption, retention, and retries;
- telemetry sinks, Kusto dashboards, fleet alerts, and audit retention; and
- OCC-facing desired-state compilation when that control plane exists.

The target is to delete duplicated OpenClaw runtime semantics, not Lobster's
enterprise hosting decisions.

## Promotion Rule

For every upstream implementation PR:

1. add or update the ledger entry;
2. identify the minimum OpenClaw artifact and conformance result;
3. open or stage the Lobster removal change before broad rollout;
4. dual-run only for bounded comparison where required;
5. observe old-path usage and mismatch telemetry;
6. remove fallback at the declared expiry; and
7. mark the entry deleted only after code and obsolete tests are gone.
