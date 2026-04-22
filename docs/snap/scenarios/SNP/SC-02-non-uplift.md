---
covers: [atom:SNP/non-uplift]
---

# SC-02 · SNP non-uplift Rule 1

**Series**: SNP · **Runner**: e2e-loop-sim

## Setup

Daemon in `ready` with snapshot A (tool `send-email` at R3).
A call enters `preAuthorize` for `send-email`, gets `review`, supervisor
hands it to companion. Call is stalled awaiting human approval.

## Input

While the call is stalled, operator promotes snapshot B where
`send-email` is R5 with stricter conditions.

## Run

Companion responds `approve`. Call completes.

## Expected

- Call completes against snapshot A's policy (R3 review)
- `DecisionEntry.policyArtifactSha256` matches A, not B
- `ApprovalEntry.policyArtifactSha256` matches A, not B
- Audit chain shows a single correlationId cluster under A

## Proves

Rule 1: in-flight decisions complete under their pre-promote
snapshot. The promote does NOT mid-flight reclassify.
