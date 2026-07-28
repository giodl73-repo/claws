# PR 6B owner adapters: frame and source audit

## Frame

**Thesis:** the native Teams inbox and permanent cron projection can enter PR
46's retained-wake authority through two small, payload-free adapters. Each
adapter must revalidate the supplied identity against its semantic owner's
durable state, resolve the logical runtime through a trusted host directory,
and submit one deterministic retry identity. PR 46 remains the only lifecycle
and destination-generation authority.

**Deletion target:** source-specific cold-start races that bypass the permanent
cross-source generation. Preserve the native inbox, its acknowledgement and
delivery state, the cron projection journal, Redis scheduler, and managed
Gateway start implementation.

**V1 non-goals:** no route or cohort activation, no payload/credential copying,
no cron parsing or execution, no reverse lookup from untrusted caller data, no
new Gateway API, and no attempt to turn coarse container readiness into the
exact restored-admission evidence required by PR 6C.

**Disproof:** reject the slice if a cause cannot be revalidated without reading
payload content, if owner identity must be trusted from a wake request, or if
the adapters require a second lifecycle/provisioning state machine.

## Audit

- `NativeInboxWarmCandidate` is emitted only after an atomic durable warm claim
  and already contains bounded partition, activity, sequence, tenant, and owner
  identity. The repository can validate the retained message metadata without
  returning `payload_json`.
- `WakeProjectionJournal::load` returns the accepted permanent projection for
  a trusted `CronOwnerKey`. Its receipt binds projection id/revision and the
  semantic `next_wake_at_unix_ms` without cron expressions or job payloads.
- `RetainedWakeCoordinator` already owns lifecycle revocation, permanent CAS
  coalescing, destination generation, provisioning, and exact readiness
  persistence. Adapters should construct requests, not duplicate those steps.
- Existing `EnsureContainerReady` and scheduler dispatch paths expose coarse
  readiness. They may initiate the shared managed start, but they cannot prove
  the exact restored recovery point/readiness generation. Reporting them as PR
  46 `Ready` would be an ownership violation; PR 6C must supply that evidence.

## Internal analogue decisions

| Mechanism | Decision | Adapter use |
| --- | --- | --- |
| Native warm claim | Reuse | Produce a Teams cause only after durable claim; revalidate metadata in the inbox owner. |
| Permanent projection receipt | Reuse | Bind cron cause to accepted projection id, revision, and exact deadline. |
| Trusted runtime directory | Adapt | Resolve owner identities from logical runtime; never accept tenant/user/provider from a wake caller as authority. |
| PR 46 coordinator | Reuse | Sole lifecycle, coalescing, generation, and provisioner entry point. |
| Coarse `EnsureContainerReady` result | Avoid as exact evidence | It may remain the managed-start mechanism but cannot complete restored readiness. |

## Role findings

- **Container owner:** adapters add no process, sidecar, public route, or new
  boot sequence. Retry stays idempotent through the existing coordinator and
  managed-start seam.
- **Gateway owner:** no OpenClaw hook, configuration, or per-message Gateway
  work is added. Cron remains a host alarm followed by OpenClaw reconciliation.
- **Security/simplicity:** the central cause id is bounded and payload-free;
  owner resolution is trusted and reverse-directional; mismatched or missing
  owner state fails before lifecycle mutation.

## Smallest evidence slice

1. Trusted logical-runtime-to-owner resolver contract.
2. Native inbox metadata-only retained-cause validation.
3. Permanent cron projection/deadline validation.
4. Deterministic Teams and cron request construction into PR 46.
5. Tests proving valid activation, owner mismatch rejection, stale projection
   rejection, payload absence, and Teams+cron joining one coordinator path.

Production route/cohort activation remains owner-controlled. Exact
restored-readiness consumption and delivery acknowledgement remain PR 6C.
