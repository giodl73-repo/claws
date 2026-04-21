# p01-decision-start-capture fixture — SOUL

Pitfall P-01: policy artifact sha256 must be captured at decision *start*,
not after awaiting the companion approval. A policy that promotes mid-decision
would otherwise let the adapter record the post-await sha — masking the
drift that the audit chain is meant to surface.

Scenario SC-05 asserts `DecisionEntry.policyArtifactSha256` binds to the
snapshot observed at decision-start, even when the harness rotates the
snapshot between the decision start and the approval return.

## Policy

- Baseline rule set — single R4 approval-required tool (below).
- The harness performs a `policyPromote(nextSha)` in the middle of the
  decision window. The DecisionEntry MUST carry the *original* sha.
