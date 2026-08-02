# RFC Scope: Context Assembly Contract

- ID: EC-018
- Lane: Knowledge, context, and continuity
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Context assembly

## Scope

- Define run-scoped context sources, provenance, ordering, budgets, hidden
  runtime context, projection mode, and fallback.
- Consume attempt/generation identity from EC-008, retrieval/ACL from EC-019,
  and corpus/copy identity from EC-020.

## Explicit Exclusions

- Context as durable memory or transcript state.
- One universal context-item storage model.
- Authorization re-evaluation or writes back into canonical memory/session
  state as a consequence of context projection.

## Required Outcomes

- Model input is reproducible for declared generations.
- Fallback cannot corrupt canonical session state.
- Compaction remains a separate transcript relationship.
- Projection-mode selection is attributable and reproducible.
- Token, size, latency, and source-count exhaustion produces explicit degraded
  or omitted-source results bound to source identities/generations; fallback
  and truncation are never silent.
- Promotion requires a bounded source/evidence slice comparing native and
  plugin assembly, hidden context, fallback, and provenance.

## Dependencies

- EC-008, EC-019, EC-020, and session identity.

## Proof and Deletion Gate

- Compare native and plugin context assembly.
- Delete hidden source ordering and untraceable prompt additions.
- Disprove the separate contract if the runtime already produces reproducible,
  generation-bound context with explicit source ordering, budgets, omissions,
  fallback, and provenance without a second context model.
