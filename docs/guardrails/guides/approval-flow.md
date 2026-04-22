---
covers: [atom:GRG, atom:GRF, atom:GRA]
---

# Approval flow (package view)

The authoritative, worked walkthrough of an approval lives at
[../../governance/approval-flow.md](../../governance/approval-flow.md).
This page is a package-scoped summary for guardrail authors — covering
what a provider sees at each stage and which spec governs each piece.

## One-call shape

```
preAuthorize ──▶ review + handle ──▶ supervisor ──▶ companion ──▶ ApprovalResponse
                     (GRG)              (GRH)          (GRA sink)
       │
       └─▶ postAudit ──▶ audit chain (GRA)
```

- **GuardrailProvider.preAuthorize** (spec: [GRG](../specs/GRG-guardrail-provider.md))
  returns `review` + a signed `ApprovalHandle` (spec: [GRH](../specs/GRH-approval-handle.md))
- Supervisor hands the handle to an `ApprovalSink` (spec:
  [GRA § ApprovalSink](../specs/GRA-audit-chain.md))
- Companion signs an `ApprovalResponse`; runtime validates the handle
  (GRH first-failing order); the `DecisionEntry` + `ApprovalEntry`
  cross-link via `correlationId` (GRA § Cross-linking)
- `postAudit` appends an `ExecutionEntry` (or a `TimeoutEntry` if
  companion never responded within `handle.ttl`)

## Decision vocabulary

4 verbs — `allow`, `deny`, `review`, `modify`. Composition rule
`deny > review > modify > allow`. See
[GRG § Decision vocabulary](../specs/GRG-guardrail-provider.md).

## File ingest variant

`FileIngestProvider.beforeIngest` runs the same 4-verb vocabulary with
`modify.redirectPath` replacing `modify.args`. The `redirectPath`
re-validation invariant is non-negotiable — see [GRF § redirectPath
invariant](../specs/GRF-file-ingest.md) and
[../../governance/file-ingest-review.md](../../governance/file-ingest-review.md)
for the end-to-end walkthrough.

## Cross-references

- [../specs/GRH-approval-handle.md](../specs/GRH-approval-handle.md) —
  the 7-tuple binding + first-failing-order validator
- [../specs/GRA-audit-chain.md](../specs/GRA-audit-chain.md) —
  entry types + ApprovalSink + cross-links
- [../../governance/approval-flow.md](../../governance/approval-flow.md) —
  full flow diagram + OC-7 merger + G-CHAIN propagation
