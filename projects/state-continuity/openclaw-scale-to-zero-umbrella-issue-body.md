### Summary

Define the minimal OpenClaw recovery contract that lets per-user and event-driven hosts safely scale idle Gateway compute to zero and later admit work on replacement compute without losing accepted state.

### Problem to solve

Infrastructure can stop, suspend, replace, and wake compute, but it cannot infer when an OpenClaw Gateway is application-consistent.

RFC 0013 and `openclaw backup sqlite` provide a safe snapshot for one OpenClaw-owned SQLite database. A host still cannot prove that:

- it captured the complete owner-selected global and per-agent state inventory;
- authoritative writers were closed before the final recovery point;
- it durably accepted the exact required byte set;
- retiring the source generation is safe; or
- replacement work admission stayed closed until the same recovery point, scheduler state, and required owners were ready.

Without that contract, hosts must either keep idle Gateways resident or maintain private shutdown, copying, restore-ordering, scheduler-reconciliation, and readiness-inference paths.

Existing OpenClaw reports show the underlying user and operator need:

- #13616 requests unified backup and restore for config, cron, and session state.
- #63392 requests per-agent backup and restore instead of rolling back an entire multi-agent installation.
- #104412 shows recurring cron work can be skipped silently while Gateway compute is stopped.
- #101290 shows why hosts need owner-safe snapshot boundaries instead of touching live SQLite state from another process.
- #107433 asks for explicit protected and reconstructable-state obligations rather than silent omissions.

### Proposed solution

Define a host-neutral application-consistency contract with these outcomes:

1. The OpenClaw state owner supplies the exact required-component inventory.
2. Final capture binds host-supplied closed-writer evidence to one verified recovery point.
3. Host acceptance identifies the exact logical byte set without prescribing storage, packaging, or cloud provider.
4. Source retirement authority is generation-scoped and fail-closed.
5. Replacement Gateway admission remains closed until the accepted recovery point, scheduler generation, and required owners are reconciled.
6. Unknown outcomes hold or quarantine rather than guessing.

The contract keeps its lifecycle facts separate:

```text
GatewaySuspensionReady
  -> SourceWritersClosed
  -> RecoveryPointCaptured
  -> RecoveryPointAccepted
  -> SourceComputeRetirementAuthorized
  -> RecoveryPointRestored
  -> AdmissionReady
```

There is no global `/synced` state. In particular,
`SourceComputeRetirementAuthorized` applies only to one named source compute
generation and never authorizes deletion of persistent tenant state or accepted
recovery points.

The diagram is the success path. Retained work may race retirement: while
source compute exists it must atomically revoke or defeat retirement authority;
after retirement it joins the single destination wake and restore operation.

Reuse the primitives already added by maintainers and RFC 0013:

- RFC 0013 and #105718 remain the authoritative SQLite snapshot/restore primitive.
- #103618 and #103925 remain the cooperative Gateway suspension foundation.
- Josh Lehman's #98236 established the SQLite-backed session/transcript runtime, and #111869 established the restart-recovery admission behavior this proposal extends rather than replaces.
- Retained ingress, wake registration, durable external acceptance, compute placement, lifecycle policy, and source-compute retirement remain host-owned.

The current implementation evidence is RFC https://github.com/openclaw/rfcs/pull/46 and the stacked PRs #112385, #112865, and #112896. Those PRs demonstrate one bounded solution; this issue intentionally does not require that decomposition. If maintainers prefer a smaller or different core seam that satisfies the same outcomes, that is a valid resolution.

When RFC 0018 canonical readiness is available and enabled, restored admission
also publishes one required `RecoveryPointRestored` condition with stable
subjects for the Gateway, restore operation, recovery point, destination
generation, scheduler reconciliation, and required state owners.
`gateway.restore.status` remains the independent operation-fenced query; both
surfaces project the same durable readiness generation when composed.

### Cron, Teams, and absent-compute wake

The current three OpenClaw PRs intentionally stop at restored admission. The complete scale-to-zero composition also needs:

- a durable host wake registration derived from OpenClaw's reconciled scheduler projection and bound to the accepted final recovery point, with a nullable next-required time but no cron expressions, job names, prompts, or payloads;
- durable retention of a Teams/API payload or opaque reference and deduplication identity before acknowledging upstream delivery;
- atomic revocation of an in-progress sleep authorization when retained work arrives;
- coalescing of Teams, API, cron-deadline, and operator causes into one idempotent compute wake; and
- delivery only after the exact restored-admission readiness identity is current.

The host may schedule an alarm before OpenClaw's semantic deadline to cover cold-start latency. It must not parse cron expressions, decide whether work is due, invoke restored cron jobs directly, or suppress duplicates. After wake, OpenClaw owns missed-run reconciliation, catch-up policy, duplicate suppression, and publication of the next semantic deadline. Teams and other ingress owners retain their own payload, acknowledgement, retry, and delivery semantics.

Peter's [#103647](https://github.com/openclaw/openclaw/pull/103647) and [#104368](https://github.com/openclaw/openclaw/pull/104368) already provide the intended OpenClaw owner seams: post-commit `cron_changed: scheduled` hints and lifecycle-owned `cron_reconciled` snapshots. The documented safe external projection pattern adopts the exact reconciled scheduler, coalesces change hints into full rereads, and returns only after durable host acceptance. That tracked hook work is visible to `gateway.suspend.*`, while restored admission waits for startup reconciliation. A separate OpenClaw wake subsystem is not needed by default.

Wake callers cannot choose recovery points or destination generations and cannot supply readiness. Central lifecycle records contain bounded identities only; payloads, prompts, and credentials remain with their existing owners.

Proposed follow-on PR plan:

1. **Host/Scout cron-projection adapter:** consume the shipped `cron_reconciled` plus `cron_changed` pattern, durably replace the complete external wake set, and atomically bind its accepted revision to the final recovery point and revocable sleep authority. Fork-only draft [giodl/lobster#38](https://microsoft.ghe.com/giodl/lobster/pull/38) proves the authority binding; stacked [giodl/lobster#39](https://microsoft.ghe.com/giodl/lobster/pull/39) adds permanent atomic projection replacement, stale-writer supersession, and recovery into Lobster's existing Redis scheduler; stacked [giodl/lobster#41](https://microsoft.ghe.com/giodl/lobster/pull/41) makes prepare, commit, abort, and newer-attempt supersession race in the same permanent CAS state so a disconnected request cannot later become hidden authority; and stacked [giodl/lobster#42](https://microsoft.ghe.com/giodl/lobster/pull/42) connects Peter's shipped hooks to that bounded protocol as an image-present, baked-disabled plugin (Microsoft GHE access required). Stacked [giodl/lobster#43](https://microsoft.ghe.com/giodl/lobster/pull/43) completes the inactive path through Lobster's existing loopback proxy-pipe bridge, trusted runtime identity, Blob CAS authority, and existing Redis scheduler rehydration (Microsoft GHE access required). It avoids a new public callback/bearer system. Stacked [giodl/lobster#45](https://microsoft.ghe.com/giodl/lobster/pull/45) completes the default-off activation boundary: private permanent Blob-container provisioning, explicit per-user ECS projection through the shared Gateway start path, pooled-slot reset, and tracked retry/sleep-veto handling of an already-due recovered projection (Microsoft GHE access required). No user is enabled; the actual ECS cohort remains an owner rollout decision.
2. **Host/Scout wake authority:** retain ingress causes before acknowledgement, schedule deadlines, revoke sleep, and coalesce them into one ensure-runtime-ready operation. Fork-only draft [giodl/lobster#46](https://microsoft.ghe.com/giodl/lobster/pull/46) is the bounded authority/core evidence (Microsoft GHE access required): it validates already-retained owner identities, composes the existing final-handoff revocation race and managed-start seam, and grants one destination generation for concurrent Teams/API/cron/operator causes. Stacked fork-only draft [giodl/lobster#47](https://microsoft.ghe.com/giodl/lobster/pull/47) adds metadata-only native Teams and exact permanent cron projection/provider/deadline validation into that authority (Microsoft GHE access required). Route/cohort activation and readiness-gated delivery remain owner-controlled follow-ups.
3. **Readiness-gated delivery proof:** consume the exact restored-admission result before delivery and prove one retained Teams message plus one cron deadline share one cold start across a host-process failure without lost or duplicate acknowledgement. Fork-only draft [giodl/lobster#51](https://microsoft.ghe.com/giodl/lobster/pull/51) supplies the core payload-free dispatch journal, exact recovery/destination/readiness fence, independent per-cause completion, and deterministic crash replay (Microsoft GHE access required). It deliberately does not activate production Teams or cron delivery: Lobster owners still need to choose the accepted-final-handoff lookup, canonical opaque-logical-runtime-to-owner mapping, and default-off route/cohort wiring.

The end-to-end acceptance proof must exercise the complete race, not only each
component independently: retain one Teams message and one cron deadline, race
them with planned sleep, lose a coordinator response after durable acceptance,
retire the source generation, cold-restore one destination, observe readiness
remain unavailable until the exact recovery point is reconciled, then observe
`503 -> 200` and independently acknowledge both owner operations without loss
or duplicate side effects. Journal corruption, stale inventory, or an unknown
generation must hold or quarantine instead of starting an ordinary Gateway.

These are evidence slices, not a required repository decomposition. The host slices may be combined if their ownership, race, replay, and failure boundaries remain independently reviewable. Unknown provisioning or restore outcomes retain work and hold or quarantine; timeout is not permission to acknowledge work, start a second authoritative generation, or open admission.

If the end-to-end proof exposes an invariant the shipped hooks and suspension fence cannot express, add only the smallest OpenClaw extension to those seams rather than a parallel scheduler or generic wake API.

### Alternatives considered

- **Keep every Gateway warm:** operationally simple but prevents per-user scale-to-zero and retains idle compute cost.
- **Copy the live state directory:** unsafe for SQLite/WAL ownership and cannot prove a closed multi-owner recovery point.
- **Put the full lifecycle in OpenClaw:** would incorrectly move retained ingress, wake, placement, storage, and compute policy out of the host.
- **Leave the contract private to each host:** duplicates delicate recovery semantics and gives OpenClaw no common restored-admission proof.

### Impact

Affected: hosted, per-user, and event-driven OpenClaw deployments; multi-agent installations that must recover exact owner state.

Severity: High for hosts that remove or replace compute. A false success can lose accepted work, skip scheduled work, restore an incomplete owner set, or expose a replacement Gateway before it is ready.

Frequency: Every idle retirement, cold wake, host replacement, or disaster-recovery operation.

Consequence: idle compute must stay resident, or each host must build and validate a private recovery lifecycle.

### Evidence/examples

Representative infrastructure already offers the compute half of this experience:

- [Fly Machines autostop/autostart](https://fly.io/docs/launch/autostop-autostart/) can stop all Machines and restart them for traffic.
- [E2B auto-resume](https://e2b.dev/docs/sandbox/auto-resume) pauses idle persistent sandboxes and resumes them on activity.
- [Daytona persistence](https://www.daytona.io/docs/en/persistence/) preserves sandbox files across stop/start and supports archive or VM pause/resume.
- [Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/scale-app) supports event-driven scale-to-zero.
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) hibernate while retaining wakeable WebSocket delivery.
- [Modal](https://modal.com/docs/guide/scale) scales Functions to zero by default and offers [Sandbox snapshots](https://modal.com/docs/guide/sandbox-snapshots).

These systems cannot infer OpenClaw's state-owner inventory, SQLite invariants, scheduler continuity, or restored-admission boundary. This request is for that missing application layer, not another infrastructure scheduler.

[Microsoft Scout](https://learn.microsoft.com/en-us/microsoft-scout/), an OpenClaw-powered product, is also pursuing host-side scale-to-zero orchestration outside upstream OpenClaw core. Scout remains responsible for its retained ingress, wake, placement, and compute lifecycle; the reusable upstream need is the narrow recovery and restored-admission contract described here.

Adjacent hardening issue #113306 tracks crash-durability and identity guarantees in the underlying SQLite snapshot implementation. It is related work and is not claimed as fixed by this lifecycle proposal.

### Do you plan to open a PR for this?

Yes, I plan to implement this myself.

### Additional information

- Design and ownership review: https://github.com/openclaw/rfcs/pull/46
- Recovery-point composition evidence: #112385
- Final closed-state capture evidence: #112865
- Accepted restore and restored-admission evidence: #112896

Success should be judged by the observable outcome: a host can remove idle compute, retain its own ingress and wake authority, and later expose a replacement Gateway only after the exact accepted OpenClaw recovery point is ready.
