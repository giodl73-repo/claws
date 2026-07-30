# RFC 0028 companion-spec role review

Date: 2026-07-30

Reviewed artifacts:

- `rfcs/0028/gateway-client-v1-spec.md`
- `rfcs/0028/node-runtime-v1-spec.md`
- `rfcs/0028/sidecar-hosting-v1-spec.md`
- `rfcs/0028/conformance-and-adoption-plan.md`
- `rfcs/0028/implementation-and-evidence-inventory.md`

Implementation comparison heads were OpenClaw #116050 `7600501dd50`, stacked
#116450 `c533982d751`, and Windows #1068 `194928fdc0c8`.

## Gateway engineer

Disposition: approve the role-neutral client boundary with two release
conditions.

- The ordered request/cancellation queue, carried semaphore permit, typed
  recovery metadata, and final-event-before-close rule match the current code
  and protect the receive loop.
- Event retention is bounded by count but not aggregate serialized bytes. The
  spec now requires either an accepted measured memory envelope or byte-aware
  retention that preserves the configured small-event burst. It does not
  repeat the rejected approach of deriving a four-event default from the
  maximum permitted frame size.
- Reconnect supervision stays outside the role-neutral client. The node
  lifecycle consumes typed failures rather than moving product lifecycle into
  the transport crate.

## Platform operator

Disposition: approve the sidecar state model as a future contract, not as a
claim about the current binary.

- Liveness, readiness, manifest generation, backoff, circuit breaking, version
  mismatch, crash recovery, and rollback are independently observable.
- The incumbent C# runtime remains the default until parity and rollback proof
  complete. A rollback creates a new process/session and never transfers
  in-flight work.
- The current foreground proof host uses environment-indirected secrets and is
  not a production sidecar. The documents now state this explicitly.

## CISO/security owner

Disposition: conditional approval.

- Gateway and local admission authority are one-way: local policy may narrow
  but cannot broaden delivered work.
- Local IPC requires mutual authentication/equivalent peer proof, scoped secret
  delivery, generation binding, fail-closed version negotiation, cancellation
  on authority loss, and distinct denial/failure audit outcomes.
- A real product audit/export adapter is not implemented. It is now a named
  adoption gap rather than an implied runtime feature.
- Concrete IPC transport, key-store, and product capability schemas remain
  deferred; accepting this RFC must not be read as accepting an unaudited wire
  format.

## Release engineer

Disposition: approve the layering; reject any support/publication claim today.

- Package acceptance, dependency audit, SBOM, and provenance evidence exist in
  the experimental repository, but they do not make the in-tree crates an
  official release.
- Publication still requires named protocol/security/release/incident owners,
  exact supported platforms and compatibility window, signed candidate
  artifacts, fresh-machine install/upgrade/rollback proof, and servicing
  runbooks.
- The inventory clearly separates evidence history from supported artifacts.

## Maintainer-grade reviewer

Disposition: the document set is reviewable after the revisions above.

- Every normative surface names its authority and non-goals; the inventory
  separates implemented foundation, stacked implementation, future adopter,
  and release work.
- Exact proof heads and the older foundation live-proof head are disclosed.
- No document claims the Windows adapter, production sidecar, persistent secure
  store, audit sink, `system.run`, MCP, skills, plugins, or supported release is
  implemented.
- The deletion ledger requires parity, rollout, rollback, and an observation
  window. RFC acceptance alone deletes nothing.

## Blocking decisions remaining

1. OpenClaw ownership and named code/security/release owners.
2. Whether the first product embeds the runtime or uses a sidecar.
3. If sidecar, the concrete authenticated IPC and scoped secret mechanism.
4. The canonical approval/tool integration and audit adapter contracts.
5. Supported platforms, compatibility window, artifact names, and servicing.

These are decision blockers for production adoption or support, not blockers to
reviewing the current foundation and embeddable-runtime drafts.
