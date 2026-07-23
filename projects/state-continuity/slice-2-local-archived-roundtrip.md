# Slice 2: Local Archived Round Trip

## Purpose

Test the recovery substrate without Hosted Integration, fresh-compute
replacement, or scale-to-zero implementation. This is a design-only fixture.

## Configuration

```jsonc
{
  "continuity": {
    "level": "archived",
    "checkpoint": {
      "rpo": "5m",
      "publication": "local-volume",
    },
    "retention": {
      "minimumPoints": 2,
    },
  },
}
```

Names are illustrative.

## State Inventory Fixture

For each core state surface, record:

- stable owner and component ID;
- treatment: captured, reconstructed, external, or ephemeral;
- native online capture mechanism;
- final closed-state capture mechanism;
- artifact format, digest, and compatibility identity;
- restore ordering and validation;
- secret/redaction classification; and
- whether Archived requires it.

Representative surfaces:

- global SQLite;
- each per-agent SQLite database;
- sessions and transcripts;
- configuration;
- workspace;
- plugin state;
- pairing/runtime-owned identity; and
- caches and generated indexes.

Host-managed credentials must be absent from artifacts.

## Accepted Path

```text
enumerate required surfaces
  -> capture each through native online semantics
  -> build immutable manifest
  -> local-volume binding accepts exact manifest
  -> return identity-bound publication receipt
  -> select the recovery point in a clean destination
  -> retrieve and verify artifacts
  -> restore in declared order
  -> reconstruct generated state
  -> restore no credential bytes and resolve required external credentials
  -> validate compatibility
  -> readiness opens
```

## Structured Failures

- missing required state-surface descriptor;
- capture timeout or resource saturation;
- digest conflict on checkpoint ID replay;
- publication timeout with unknown commit certainty;
- corrupt artifact;
- missing required restore dependency;
- incompatible schema or runtime;
- fallback to the preceding point; and
- exhausted fallback lineage.

Unknown publication retries must reuse the same checkpoint identity and
manifest digest.

## Observable Proof

Status shows:

- selected CAPE level;
- desired/effective local publication binding;
- latest local capture and accepted recovery point;
- target and actual RPO;
- component treatments and redacted provenance;
- selected restore source and compatibility;
- readiness blocker or success; and
- stable failure reason and operator action.

Doctor reports missing surfaces, incompatible artifacts, insufficient
retention, and unresolved dependencies.

## Runtime Budget Proof

The paper fixture defines measurable bounds for:

- one capture at a time;
- timeout and cancellation;
- event-loop occupancy;
- temporary memory and disk;
- I/O throttling;
- user-visible latency delta; and
- missed-RPO reporting.

Capture failure degrades the recovery guarantee without crashing or stalling
ordinary Gateway work.

## Deletion Mapping

This slice authorizes no deletion. It establishes the manifest and restore
baseline needed to compare Lobster's current workspace artifact set in a later
shadow migration.

## Gate

Do not begin Portable or Elastic implementation until this round trip accounts
for all required core state surfaces and the same accepted/failure semantics
work through the Hosted Integration publication-binding pattern.
