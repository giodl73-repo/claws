# RFC Scope: Memory Corpus Lifecycle

- ID: EC-020
- Lane: Knowledge, context, and continuity
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Memory corpus owner

## Scope

- Define canonical sources, derived indexes/caches/exports, retention, delete,
  rebuild, retained exceptions, and lifecycle evidence.
- Limit exports in this contract to memory-owned derived copies; session
  exports remain EC-017 and cross-owner obligation settlement remains EC-030.

## Explicit Exclusions

- One memory implementation.
- Index deletion as source deletion proof.
- LanceDB row deletion as coverage of workspace-memory owners, or any
  single-backend GDPR/compliance completion claim.

## Required Outcomes

- Complete, partial, blocked, deferred, and unknown are explicit.
- Each derived index, cache, and memory-owned export has stable copy identity,
  source-generation binding, freshness, and per-copy terminal settlement.
- Restart reconciliation preserves operation identity.
- Evidence evolves through existing audit conventions rather than a parallel
  lifecycle ledger.

## Dependencies

- EC-030.

## Proof and Deletion Gate

- First prove a generation-conflict block that leaves canonical and derived
  state unchanged, then delete one corpus with index and memory-owned export
  copies.
- Delete broad compliance claims based on one backend row.
- Disprove the separate contract if memory has no independently managed
  canonical/derived copies or lifecycle obligations beyond one owner's native
  storage semantics.
