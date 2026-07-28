# OpenClaw version slots

Status: design revision for Lobster PR
[#5541](https://microsoft.ghe.com/bic/lobster/pull/5541). The current branch
`user/giodl/openclaw-dual-image-rollback` implements an earlier asymmetric
two-slot `primary` / `rollback` model and must be reconciled with this contract
before merge.

## Terminology

- **Physical slot**: one independently registered and deployed trusted
  PlexService identity. Physical identities are stable and are not renamed
  during promotion or rollback.
- **Active**: the only logical role selected for new production routes.
- **Previous**: the known-good logical rollback target. It is distinct from
  Active and may be absent only while the system is re-establishing rollback
  eligibility after a failed promotion.
- **Candidate**: an unpointed physical slot containing a version under
  validation. Candidate is a lifecycle state, not a production routing
  pointer.
- **Retiring**: an unpointed slot retained until its route, time, capacity, and
  compatibility budgets permit reclamation.
- **Quarantined**: an unpointed slot that failed validation or was removed from
  Active by rollback. It cannot become Active without fresh validation.
- **Free**: a reclaimed slot available for the next candidate.

The operator-facing name is **Active**, not Runtime. `Runtime` describes the
system and is too easily confused with the Lobster Runtime service or process.

## Frame

Thesis: Lobster can make OpenClaw version promotion and rollback a trusted,
bounded operator action by deploying three physical PlexService slots while
maintaining only two production role pointers: Active and Previous. The third,
unpointed slot is used to validate a Candidate without overwriting the current
known-good rollback image.

The thesis is disproved if Plex cannot safely namespace the same
`workermetadata` across named services, if a route cannot retain one resolved
physical slot across HTTP/WebSocket/gRPC use, if Active and Previous cannot be
updated atomically, or if the temporary three-slot capacity budget is
unacceptable.

Deletion target: after production proof, remove ad-hoc rebuilding or
redeploying of an old OpenClaw package as the only binary rollback procedure.
Do not delete that escape hatch in the plumbing PR.

Non-goals: automatic promotion or rollback, caller-selected images or service
names, switching an in-flight route, Agent-image rollback, and claiming that
persisted state is downgrade-compatible.

## Invariants

1. Exactly one trusted physical slot is Active for each configured scope.
2. Previous, when present, is trusted, rollback-eligible, and distinct from
   Active.
3. Candidate, Retiring, Quarantined, and Free slots receive no new production
   routes.
4. A new route atomically resolves Active to a physical PlexService and stores
   that physical service plus the role-map generation with durable route
   evidence.
5. An Active-role update never moves an existing route. Drain or reap is
   required for complete convergence.
6. Role updates are atomic and generation-checked; readers never observe a
   partially rotated Active / Previous pair.
7. Only the fixed allowlist of three registered PlexService identities can
   appear in role configuration or persisted routes.
8. No two OpenClaw versions concurrently own the same mutable state directory.
9. Retaining image bytes does not prove downgrade safety. Promotion remains
   blocked without compatible-state proof or a version-appropriate restore
   point.

## Slot lifecycle

```text
Free -> Candidate -> Active -> Previous -> Retiring -> Free
          |            |
          v            v
      Quarantined  Quarantined
```

Steady state keeps Active and Previous populated while the third slot is Free
or cold. The temporary promotion window may populate all three slots.

### Promotion

Given Active `S1@v1`, Previous `S2@v0`, and Free `S3`:

1. Deploy `v2` to `S3`; mark it Candidate. Do not route production traffic.
2. Validate package provenance, Gateway startup, reported version, critical
   behavior, state compatibility, and the required soak budget.
3. Atomically rotate `Active=S3` and `Previous=S1`.
4. Mark old Previous `S2` Retiring. Keep it until post-promotion retention and
   route-drain budgets allow reclamation.
5. After convergence and budget expiry, reclaim `S2` as Free.

Never reclaim old Previous merely because Candidate is ready. Reclaim it only
after the role rotation succeeds and the former Active is confirmed as the new
Previous.

### Rollback

If new Active `S3@v2` fails while Previous is `S1@v1`:

1. Atomically select `S1` as Active for new routes.
2. Mark failed `S3` Quarantined; do not automatically make it Previous.
3. If retained `S2@v0` remains rollback-eligible, select it as Previous.
   Otherwise leave Previous unset until a known-good fallback is established.
4. Drain or reap routes pinned to `S3` and verify version convergence.

Rollback is therefore not a blind two-slot toggle. A failed version never
becomes the next rollback target merely because it was most recently Active.

## Budgets and reclamation

Reclamation requires all applicable budgets to pass:

- **capacity**: only Active and Previous remain warm in steady state;
- **overlap**: bound how long all three slots may be populated;
- **route**: no live route remains pinned to the slot;
- **retention**: the post-promotion rollback window has expired;
- **health/soak**: Active has met the required proof window;
- **compatibility**: Previous remains able to boot an eligible restore point;
- **provenance**: exact image tag, OpenClaw version, and build identity remain
  auditable.

## Official operator actions

These are governed control-plane operations, not raw production shell
commands. A protected ADO/Ev2 pipeline owns artifact deployment and validation;
an authenticated Lobster admin action owns role changes, test bindings, drain,
and reclamation. A CLI or UI may invoke those operations, but it must not become
a second source of truth.

Every mutating action records caller, reason, scope, expected generation,
before/after role map, physical slot, immutable image/build identity, validation
receipt, and result.

### Required actions

- **Status**: show Active, Previous, Candidate, Retiring, Quarantined, and Free
  slots; exact versions/builds; role-map generation; health; pinned-route
  counts; warm capacity; and remaining budgets.
- **Stage Candidate**: select the Free slot, deploy one immutable Official
  build through its protected Ev2 release, and leave the slot unpointed.
- **Validate Candidate**: run package/provenance gates, Gateway startup and
  version proof, state-compatibility checks, and required behavioral suites.
- **Smoke Candidate**: create a server-selected, TTL-bound synthetic route to
  the Candidate slot using disposable test identity/state. Exercise HTTP,
  WebSocket, gRPC/proxy-pipe, diagnostics, and version reporting without
  changing Active or accepting a caller-supplied service name.
- **Preview Candidate**: optionally bind an authorized operator-only test
  identity to Candidate for a bounded TTL without changing Active or Previous.
  The safe default creates a distinct preview route plus disposable or cloned
  OpenClaw state, because an ephemeral routing override alone does not prevent
  the Candidate from migrating SQLite/config or writing workspace data. It
  requires an explicit reason and audit receipt. Reusing non-disposable user
  state additionally requires a compatible snapshot/restore proof.
- **Clear Preview**: remove the operator's preview binding immediately, drain
  its preview route, and discard disposable preview state. Expiry performs the
  same cleanup automatically. It never rewrites the global role map.
- **Promote Candidate**: require Candidate validation and soak receipts, then
  compare-and-swap the expected generation so Candidate becomes Active and the
  former Active becomes Previous atomically.
- **Rollback to Previous**: compare-and-swap Previous into Active, quarantine
  the failed Active, select another eligible Previous when available, and
  begin drain/convergence verification.
- **Drain Slot**: stop new bindings and drain or reap routes pinned to a named
  physical slot while reporting remaining route and worker counts.
- **Retire Slot**: mark an unpointed slot Retiring and prevent reuse until all
  reclamation budgets pass.
- **Reclaim Slot**: delete or scale down the retired deployment only after
  route, retention, health/soak, compatibility, capacity, and provenance gates
  pass; then mark the slot Free.
- **Quarantine Slot**: remove a failed Candidate or failed former Active from
  eligibility without deleting its diagnostic evidence.

### Suggested command vocabulary

The eventual CLI may expose the same operations as:

```text
lobster openclaw slots status
lobster openclaw slots stage-candidate --official-build <id>
lobster openclaw slots validate-candidate
lobster openclaw slots smoke-candidate
lobster openclaw slots preview-candidate --operator self --ttl <duration> --state ephemeral
lobster openclaw slots clear-preview --operator self
lobster openclaw slots promote-candidate --expected-generation <n>
lobster openclaw slots rollback-to-previous --expected-generation <n>
lobster openclaw slots drain <physical-slot>
lobster openclaw slots retire <physical-slot>
lobster openclaw slots reclaim <physical-slot>
lobster openclaw slots quarantine <physical-slot>
```

These names define the contract, not a commitment to implement production
mutation in the local CLI. The first implementation may use protected pipeline
parameters and an admin API/UI while retaining identical verbs and receipts.

## Audit and comparisons

- Current production routing uses the registered `lobsteropenclaw`
  PlexService. `workermetadata` is the durable session key; the physical worker
  hint is short-lived.
- PR #5541 proves that a trusted physical service can be persisted and carried
  through allocation, Gateway start, diagnostics, WebSocket, proxy-pipe gRPC,
  and `ReportBusy`.
- The current PR's boolean `primary` / `rollback` selector is insufficient for
  three-slot role rotation and failed-candidate quarantine. Preserve its route
  pinning and allowlist proof, but replace permanent role semantics with an
  atomic Active / Previous role map.
- PPI accepts one PlexService worker-policy task per deployment item. Reuse the
  separate-package pattern already used by `lobsteragentcontainer` for each
  physical slot.
- ADAPT: PR #3387 merged behavior-neutral selector plumbing with old and new
  MITM scopes selecting the same implementation before changing selection.
- REUSE: the Agent's separate EV2 package/build/release boundary.
- AVOID: `ms-plex-custom-image-repository`; it bypasses registered service
  policy and would turn rollback into arbitrary image routing.
- OpenClaw supports multiple Gateways only with isolated config, state,
  workspace, ports, and service ownership. The Lobster adaptation uses one
  Gateway per Plex worker slot rather than multiple versioned Gateways sharing
  a worker.
- Kubernetes retained revisions and Azure App Service deployment slots both
  select named, provenance-bearing revisions and verify rollout. Neither makes
  an arbitrary image string the emergency control plane.

## Role evaluation

- Lobster container engineering: keep one Gateway per worker, expose exact
  slot/image provenance, and never share mutable OpenClaw state across
  versions.
- Lobster release operator: interact with Active, Previous, Candidate,
  Retiring, and Quarantined roles; physical PlexService names are diagnostic
  detail.
- Aether runtime engineering: resolve Active once per new route, persist the
  physical service and generation cross-pod, and use it on every transport.
- CISO: accept only three hard-coded service identities, make rotation atomic,
  quarantine failed versions, and retain auditable convergence evidence.
- Simplicity review: keep only Active and Previous as production pointers.
  Candidate and retirement are lifecycle states, not extra routing aliases.

## Smallest revised evidence slice

1. Preserve #5541's trusted service-name persistence and cross-transport route
   pinning.
2. Define three fixed physical service identities and an allowlisted,
   generation-bearing Active / Previous role map.
3. Resolve only Active for new production routes; reject equal, unknown, or
   partially updated role pairs.
4. Add one Candidate deployment path that remains unpointed and cold by
   default.
5. Prove a promotion rotation and a rollback that quarantines the failed
   Active instead of toggling back to it.
6. Add observable slot, role, version, and generation evidence plus the
   budget-gated reclamation runbook.
