# Slice 5: Transactional Activation Boundary

## Question

Can generic layer resolution and runtime preparation feed the existing snapshot
machinery through one atomic callback without publishing partial candidates?

## Internal Contract

```text
descriptors
  -> resolve every source
  -> validate/project every sparse layer
  -> recursively compose authority
  -> validate/materialize one runtime candidate
  -> publish(candidate) exactly once
```

The activation adapter accepts an injected publisher. Production wiring should
adapt this callback to existing runtime snapshot preflight/finalization. The
layer modules do not own snapshot globals, file watching, or reload actions.

The published candidate contains:

- sparse composed `sourceConfig`;
- ordinary materialized `runtimeConfig`;
- path provenance;
- ordered layer IDs, access capabilities, and redacted source identities.

## Failure Semantics

- descriptor or source failure: do not publish;
- layer schema failure: do not publish;
- authority conflict: do not publish;
- effective validation/materialization failure: do not publish;
- publisher failure: return `RuntimeSnapshotPublishFailed` and do not report an
  active candidate.

Atomicity inside the callback remains the existing snapshot owner's contract.
This adapter guarantees only that the callback sees one complete admitted
candidate and is never called for a rejected candidate.

## Proof

- Date: 2026-07-11
- Environment: local WSL2 `Ubuntu-24.04`
- Result: `3` test files passed, `27` tests passed.
- Activation tests prove one publish after success, no publish after source or
  authority failure, and structured publisher failure.
- Repository wrapper: `9.98s`.

## Slice Result

The layer pipeline now reaches an atomic publisher boundary without importing
snapshot globals or reload policy. Production integration needs one adapter from
the candidate callback to existing snapshot preflight/finalization.
