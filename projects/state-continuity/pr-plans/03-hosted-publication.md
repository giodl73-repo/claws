# Stage 3: Hosted Publication

## Outcome

Make Archived recovery points publishable through a host-selected durable
binding while preserving the exact semantics proven by the local binding.

## Repository And Dependencies

- PR 3A: `openclaw/openclaw`
- PR 3B: `bic/lobster`, after PR 3A lands
- Depends on: PR 2 and Hosted Integration bundle registration, typed bindings,
  effective binding Status/Doctor, binding and host-bundle generations, and
  local/hosted conformance conventions

## PR 3A: OpenClaw Change

- Define the continuity-owned publication capability and exact request,
  acceptance receipt, retrieval, and failure shapes.
- Register and resolve it through Hosted Integration owner references.
- Bind receipt identity to runtime, checkpoint, manifest digest, durability,
  binding generation, and host-bundle generation.
- Do not require Portable runtime-generation authority at Archived.
- Preserve local and hosted publication as equivalent bindings under one
  conformance suite.
- Hold host-accepted recovery status closed on timeout uncertainty, digest
  conflict, stale generation, quota, or retrieval failure.
- Report desired/effective binding, redacted provenance, durability, and stable
  reasons through existing Hosted Integration surfaces.

## PR 3B: Lobster Change

- Register the encrypted durable publication binding in the Lobster host
  integration bundle.
- Store immutable artifacts and manifests outside runtime compute.
- Enforce authorization, retention, exact replay, quota, and redacted audit.
- Supply Hosting Profile evidence for the binding without introducing a second
  readiness or config tree.

## Non-Goals

- No replacement generation, final handoff, hibernate, or wake.
- No host control over OpenClaw capture ordering or restore meaning.
- No credential backup.
- No generic artifact/provider bus.

## Proof And Exit

- Run the PR 2 conformance suite unchanged against local and Lobster bindings.
- Confirmed acceptance remains retrievable after the publishing process exits
  or restarts. This stage does not authorize compute destruction.
- Stale binding or bundle generations cannot accept or report publication.
- Timeout-before-commit, timeout-after-commit, exact replay, digest conflict,
  corruption, quota, and unauthorized retrieval are distinguishable.
- Status and Doctor expose effective binding and recovery posture without
  leaking artifact paths, keys, tokens, or tenant identifiers.
- PR 3A can merge with only local/fake hosted conformance; PR 3B then proves the
  Lobster binding without changing OpenClaw.

## Rollback

Select the local binding or Conventional. Hosted recovery points authorize
restore only; they never authorize replacement or destruction in this stage.
