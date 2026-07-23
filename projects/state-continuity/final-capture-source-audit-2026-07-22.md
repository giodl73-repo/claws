# RFC 0013 Final Capture Source Audit

## Frame

### Thesis

One hidden OpenClaw operation can turn already host-closed owner state into one
final RFC 0013 recovery point by reusing the shipped SQLite snapshot provider
and PR 112385's aggregate composer. It must bind runtime lineage, source
generation, handoff identity, selected-agent inventory, and host closure
evidence while adding no Gateway, publication, acceptance, or destruction
authority.

### Disproof

Do not promote this slice if OpenClaw must infer host closure, stop Gateway,
copy reserved config/workspace/plugin paths, or invent a second SQLite capture
or verification implementation.

### Deletion target

The replacement stack should not require Lobster to discover private OpenClaw
database paths or reconstruct aggregate/acceptance identity itself. The older
managed archive/provider framework remains deprecated archaeology.

## Audit

- RFC 0013 already owns global and per-agent SQLite snapshot creation,
  verification, sanitation, immutable local publication, and fresh restore.
- OpenClaw PR 112385 owns exact selected-agent inventory, owner-manifest and
  artifact binding, host-protected classification, aggregate identity, and the
  closed logical acceptance set.
- Current Gateway suspension remains cooperative and host-incomplete. The host
  owns external ingress, unregistered writers, process stop, and restart
  fencing; OpenClaw cannot prove those facts after its Gateway exits.
- The deprecated E5a donor's useful invariant is durable intent before capture
  plus exact committed-result replay. Its CAPE archive, generic managed
  publication, arbitrary plan paths, and provider framework are not reused.
- A deterministic runtime-lineage/source-generation/handoff directory removes
  Lobster path discovery and lets response-loss replay find the exact local
  result. An intent without a committed result quarantines instead of silently
  recapturing.

## Compare

- Reuse `SqliteSnapshotProvider`, `createRecoveryPointManifest`, and
  `verifyRecoveryPoint` rather than general backup archives or volume copies.
- Keep the operation hidden and stdin-shaped like other fixed host adapter
  operations; do not create a public lifecycle API or provider registry.
- General volume/application backup systems do not know OpenClaw's exact
  selected-agent inventory, sanitation, schema ownership, or logical
  acceptance-set contract, so they remain host transport/durability choices.

## Evaluate

- **Gateway owner:** accepts a separate offline operation; rejects SIGTERM
  hooks, a second suspension API, or inference from process absence.
- **Container operator:** requires exact host closure evidence, deterministic
  replay, and a local receipt while the worker and host fence remain held.
- **Enterprise security:** ordinary recovery points remain `host-protected`;
  no credential-free claim, secret value, publication, or destruction token is
  emitted.
- **Skeptical maintainer:** accepts reuse of the existing snapshot/composer
  path; rejects the deprecated managed archive/provider framework.

## Slice Result

- Fork draft: [giodl73-repo/openclaw#152](https://github.com/giodl73-repo/openclaw/pull/152)
- Branch: `user/giodl/rfc-0013-final-capture`
- Commit: `1ee5956dc0271d50abe216eded76510d283e0c9f`
- Base: `user/giodl/rfc-0013-recovery-points` / OpenClaw PR 112385
- Proof: 22 focused tests, core production tsgo, targeted Oxlint/Oxfmt, and
  final `codex review --uncommitted` with no actionable correctness findings.
- Known gap: core-test tsgo did not complete within bounded six- and ten-minute
  attempts. No live Gateway/Lobster/provider behavior was claimed.

## Next Boundary

Lobster still needs a real caller that establishes host ingress fencing, uses
current-main `gateway.suspend.*`, proves clean process/writer closure, invokes
this exact operation, and retains the returned acceptance inventory. PR 3E
also still needs a live idempotent provider remover scoped to one source
generation. Neither responsibility belongs in this OpenClaw slice.
