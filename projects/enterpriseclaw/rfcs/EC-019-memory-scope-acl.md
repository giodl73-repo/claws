# RFC Scope: Memory Scope and ACL

- ID: EC-019
- Lane: Knowledge, context, and continuity
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Memory owner plus policy owner

## Scope

- Define memory subject/resource scopes and read, retrieve, write, correct,
  export, and delete authority.
- Consume memory copy and derived-index identity from EC-020 without
  redefining corpus lifecycle.

## Explicit Exclusions

- A separate ACL database as memory truth.
- Prompt projection as enforcement.
- Treating provenance labels as enterprise data classification.

## Required Outcomes

- Enforcement occurs at retrieval and each supported owner mutation boundary;
  unsupported authority verbs are explicit.
- Provenance explains why a memory was visible.
- Revocation propagates to derived indexes and caches.
- Classification, policy, and revocation inputs are generation-fenced;
  protected retrieval or mutation fails closed when required state is unknown,
  stale, or unsupported.

## Dependencies

- EC-004, EC-020, EC-030.

## Proof and Deletion Gate

- Revoke shared-memory access and prevent stale retrieval.
- Delete post-retrieval filtering as the sole control.
- Disprove the separate contract if every memory owner already enforces the
  same scoped authority at retrieval and mutation boundaries and derived
  copies require no cross-owner revocation relationship.
