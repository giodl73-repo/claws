---
covers: [atom:WSC]
---

# SC-03 · WSC algorithm-version mismatch detection

**Series**: WSC · **Runner**: compile-sim

## Setup

Artifact A embeds `canonicalizerVersion: 1` with a hash computed under
v1. Artifact B embeds `canonicalizerVersion: 2` (a hypothetical future
bump) with a hash computed under v2 over the same value.

## Run

Verifier compares `A.canonicalBytes` to `B.canonicalBytes`.

## Expected

Verifier detects version mismatch before hash comparison and raises
`CanonicalizerVersionMismatch { expected: 1, got: 2 }`. Does NOT
silently re-compute.

## Proves

Algorithm version field catches drift between producer and consumer.
Upgrades are loud.
