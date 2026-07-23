# PR 3D source audit — durable destruction consumption

Date: 2026-07-22

## Frame

Thesis: PR 3C's permanent, generation-scoped destruction authorization can be
consumed safely by one owner-local, replayable compute-removal coordinator if
the provider receives the identical authorization on every retry and permanent
state records completion only after a conclusive provider result.

Deletion target: remove the future temptation to implement `safeToDestroy` as
a read-then-delete check or to treat a successful provider call as sufficient
without a durable completion record.

Disproof conditions:

- the current live provider cannot remove one exact source generation;
- current Lobster cannot durably fence all Gateway start and external ingress
  paths for this handoff; or
- the replacement OpenClaw stack has no production final-capture caller.

The audit found all three gaps for end-to-end wiring. Therefore this slice is
narrowed to durable authorization consumption and completion. Production
Gateway/ingress/provider wiring remains a later stacked slice and must not be
claimed by this PR.

## Current-source audit

- `final_handoff.rs` already persists acceptance, revocation, and atomic
  destruction finalization in Azure Blob CAS. Its authorization binds the
  logical runtime, continuity lineage, handoff, source generation, lifecycle
  revision, recovery point, and acceptance set.
- `container_lifecycle.rs` defines provider-neutral `DestroyWhenIdle` and
  `ForceDestroyNow` actions, but vocabulary is not a live destruction seam.
- `container_host/provider.rs` fails closed by default for lifecycle actions.
- The only live provider, Plex, does not override lifecycle destruction and
  declares `destroy: false`. `sandbox_connection.rs` explicitly documents that
  runtime has no synchronous Plex kill lever.
- The ACA provider is a disabled scaffold. It performs no live control-plane
  calls.
- `sandbox_registry.rs` returns planned lifecycle actions but explicitly does
  not execute provider pause/delete/resume APIs; it also calls for an
  idempotency/version boundary before multi-pod execution.
- The old E5a worktree contains a `gateway.suspend.prepare` caller, but the
  replacement branch does not. That worktree remains an implementation donor,
  not current authority.
- The replacement OpenClaw aggregate-recovery-point PR does not yet expose the
  final closed-state capture caller needed for an end-to-end handoff.

## Internal comparisons

- Adapt PR 3C's permanent object CAS and deterministic authorization identity.
- Adapt the provider boundary's fail-closed default, but do not add a generic
  provider registry or make unsupported Plex destruction appear live.
- Avoid the advisory Redis lifecycle record as irreversible authority.
- Avoid the old E5a/E5b publication coordinator's deprecated Redis authority
  while preserving its stable Gateway request identity and exact-replay tests
  as later wiring evidence.

## External comparison

Kubernetes finalizers keep an object in a visible deletion-in-progress state
until the responsible controller completes cleanup, and Kubernetes documents
that retryable Jobs should be idempotent. The useful analogue is the durable
pending/finalized/completed split, not Kubernetes APIs or a new generic
controller framework.

## Role evaluation

- Gateway engineer: no hot-path hook or new Gateway API in this slice. Later
  wiring must keep suspension bounded and must not infer host-ingress fencing
  from Gateway admission state.
- Lobster container engineer: provider uncertainty is expected. Completion
  must survive pod loss, and a retry must use the same operation identity; no
  pod-local coordinator state may decide correctness.
- CISO: destruction is fail-closed and generation-scoped. The request type must
  be incapable of naming persistent data, credentials, recovery artifacts, or
  another runtime generation.
- Maintainer reviewer: current head and current provider capabilities override
  the plan narrative. The PR body must state that production provider and
  Gateway wiring are absent, with tests for unknown outcome, crash replay,
  conflicting completion, and strict target scope.

## Bounded implementation slice

Extend the same permanent handoff object with a terminal
`destruction_completed` state and add an injected source-compute remover whose
only request is the PR 3C authorization. The coordinator:

1. atomically finalizes or replays PR 3C authority;
2. returns without provider work for revoked/quarantined state;
3. skips provider work when permanent completion already exists;
4. otherwise invokes the remover with the exact deterministic authorization;
5. leaves finalization pending on any unknown/error result; and
6. records permanent completion only for conclusive `removed` or
   `already-absent` results.

Live Plex/ACA wiring, `gateway.suspend.*`, external ingress fencing, and final
capture remain outside this slice because current source cannot satisfy them.
