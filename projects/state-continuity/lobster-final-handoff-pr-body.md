## Summary

- define the Lobster-owned acceptance contract for RFC 0013 final handoffs
- bind acceptance to the exact OpenClaw logical byte set and an equivalent host-protection receipt
- make retries idempotent and conflicting claims permanently quarantine under a permanent atomic-store contract

## Boundary

This is a fork-only evidence slice. It adds no production store, Gateway caller, provider operation, plugin, sidecar, storage layout, destruction authority, or user-visible runtime behavior.

The host assertion is accepted only after the selected host-owned durability boundary has confirmed every byte sequence in the OpenClaw acceptance inventory. Ordinary RFC 0013 snapshots remain `host-protected`; this PR does not claim credential-free portability.

The journal's store boundary is crate-private and requires permanent atomic storage that survives process, pod, and Redis loss. A production Blob/SQL CAS implementation is deliberately deferred until it can share one atomic lifecycle-finalization transition with generation-scoped provider deletion. This draft therefore cannot authorize destruction.

Related design and producer drafts:

- openclaw/rfcs#46
- openclaw/openclaw#112385

## Proof in the slice

- OpenClaw/Rust cross-language acceptance-set identity fixture
- first acceptance and lost-response replay
- conflicting bytes/generation quarantine
- independent continuity lineages
- unknown atomic write outcomes fail closed
- malformed inventory, reordered components, unbound protection evidence, unknown fields, URLs, SAS strings, and connection strings are rejected

## Validation

- `just rust-fmt-check` — passed
- `git diff --check` — passed
- `just cargo test final_handoff --no-fail-fast` — blocked before the new tests by current-main Windows-only MIP code importing `windows_sys` without a corresponding dependency
- autoreview — findings about lineage binding, lifecycle authority, secret-bearing references, Lua integer precision, Redis durability, and cross-pod destruction races were accepted; the latter two caused the production backend/destruction API to be removed from this slice

## Draft gates

Keep this draft until the RFC/OpenClaw ownership boundary is accepted and all required Lobster checks pass:

- `GitOps/GitHubPop`
- `Lobster-Runtime-PullRequest`
- `Lobster-Runtime-Build-Validation`
