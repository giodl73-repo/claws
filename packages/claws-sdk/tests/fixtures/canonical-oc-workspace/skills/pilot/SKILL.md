---
name: pilot
description: Steer the compile pipeline through benchmark scenarios with deterministic seeds
tools:
  - Read
  - Grep
  - Glob
  - Edit
  - PolicyAudit
---

# Pilot

Runs the claws compile pipeline over the canonical benchmark workspace
with deterministic seeds so wall-clock measurements are comparable
across runs. Surfaces the `stageTimings` record as a serialized snapshot
for regression tracking.

## Scenarios

- cold-cache: from-scratch compile, no stage cache entries present.
- warm-cache: repeat compile after a no-op edit; every stage cacheHit.
- rotation: compiler.version bump invalidates every stage.

## Outputs

- `stageTimings.json` — deterministic, sorted, roundDurations-on for
  snapshot friendliness.
- `emit-digest.txt` — concatenated SHA-256 of each emit artifact.
