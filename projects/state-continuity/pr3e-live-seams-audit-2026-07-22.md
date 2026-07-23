# RFC 0013 PR 3E Live-Seams Audit

## Frame

### Thesis

Lobster can adopt OpenClaw fork PR 152 through one fixed, generation-bound
adapter operation that irreversibly closes the current adapter boot to new
work, drains tracked work, obtains the shipped Gateway suspension result,
cleanly stops the tracked Gateway child, and invokes `openclaw backup
capture-final` with the exact host request.

### Disproof

Do not author the complete PR 3E while the selected live provider cannot remove
one exact source generation idempotently. Do not reinterpret a generic idle
drain, Redis route eviction, `ReportComplete`, or process absence as provider
destruction.

### Deletion target

The replacement should delete Lobster reconstruction of private OpenClaw state
paths and the deprecated managed archive/capture schema. Lobster should retain
only host closure, exact request/response adoption, acceptance, and provider
lifecycle coordination.

## Current Source

- `ContainerHost` now has a provider-neutral immediate lifecycle execution
  seam, but the Plex capability table still declares `pause: false` and
  `destroy: false`.
- `PlexAdapter` does not override `SandboxProvider::apply_lifecycle_decision`.
  Its default implementation fails closed. There is therefore no live
  generation-scoped Plex remover to bind to PR 3D.
- The disabled ACA scaffold advertises lifecycle vocabulary but is not a live
  production provider and cannot justify a removal claim.
- The adapter lifecycle tracks Gateway starts, active turns, pending starts,
  exact child generation, cron checkpoints, and drain/retire state.
- Ordinary `Draining` is not sufficient for final capture: legacy gRPC and
  WebSocket callers may continue to admit work during its soft window.
- The existing Plex diagnostic transport can bind a POST to one routed worker
  and carries `expected_boot_id`; side-effecting requests are deliberately not
  replayed after an unknown outcome.
- OpenClaw PR 152 supplies deterministic operation identity, durable intent,
  exact local replay, real RFC 0013 SQLite capture, and the full acceptance
  inventory. It deliberately trusts host closure evidence.

## Reuse, Adapt, Avoid

- **Reuse:** current adapter lifecycle accounting, exact tracked Gateway child,
  bounded child-process conventions, Plex worker routing, and PR 152's strict
  request/result contracts.
- **Adapt:** deprecated E5a's irreversible adapter-boot admission fence,
  Gateway suspension ordering, clean-stop helper, bounded stdin/stdout, and
  same-request replay behavior.
- **Avoid:** E5a's CAPE authority schema, generic managed archive, config and
  workspace path copying, publication provider, arbitrary output plans, and
  credential-free claims.
- Existing external comparisons still support the split: CSI-style owner
  capture plus orchestrator lifecycle, Temporal-style stable identity without a
  workflow engine, and application artifacts rather than CRIU images.

## Role Findings

- **Runtime owner:** the final-capture fence must reject every new start and
  legacy turn, survive a failed capture for same-boot diagnosis/replay, and
  never resume ordinary service implicitly.
- **Adapter owner:** the route must be fixed, body/output bounded, child
  environment allow-listed, and response identity verified before returning.
- **Gateway owner:** reuse `gateway.suspend.prepare`; do not add another pause
  protocol or infer idle state from process absence.
- **Security:** bind tenant/user, adapter boot, runtime lineage, source
  generation, handoff identity, and closure evidence; expose no secret values,
  arbitrary command, or arbitrary capture path outside PR 152's repository
  contract.
- **Skeptical maintainer:** split the stack. PR 3E-A may prove the live
  final-capture adopter; PR 3E-B remains blocked on a real provider remover.

## Smallest Honest Slice

Author a fork-only PR 3E-A stacked on Lobster fork PR 27:

1. one fixed adapter final-capture route;
2. one irreversible exact-request adapter-boot fence;
3. bounded Gateway suspension, clean stop, and PR 152 child invocation;
4. strict response binding and same-request replay;
5. focused tests for accepted capture, busy hold, conflicting replay, malformed
   child output, legacy ingress rejection, and exact replay through the same
   child invocation (OpenClaw prevents a second capture).

Do not wire PR 3D's destruction consumer to `ContainerHost` until Plex or
another selected live provider exposes a reviewed idempotent operation for one
exact source generation.

## Outcome

The smallest honest slice is published as fork-only draft
[giodl/lobster#28](https://microsoft.ghe.com/giodl/lobster/pull/28), branch
`user/giodl/rfc-0013-final-capture-adopter`, commit
`58d8a63ec999dba2399dbf2d91659e0ce0f96548`, stacked on fork PR 27.

The implementation adds the fixed route, strict request/response binding,
capability preflight before the irreversible fence, complete active-work
fencing, native suspension lease validation, cancellation-safe clean stop and
reconciliation, exact replay serialization, and closure poisoning only for a
proven unclean stop. With the current OpenClaw pin, the missing capability
returns `503 capture_unavailable` before the fence is taken.

Formatting and the production adapter library check pass. Linux tests reach
the repository `just` recipe but are blocked before compilation by the absent
private `lobster` Cargo registry token in WSL. Windows test compilation is
blocked by the inherited `workspace/git_store_tests.rs` reference to
`find_git_binary`; this is recorded on the draft and requires credentialed
Linux CI before promotion.

PR 3E-B remains blocked. Fork PR 28 does not call PR 3D's remover abstraction,
remove a provider generation, or authorize persistent-data deletion.
