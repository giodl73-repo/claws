# Slice 1: Readiness-Shaped Continuity Provider (Superseded)

> Superseded by `slice-2-local-archived-roundtrip.md` and the Hosted
> Integration prerequisite. Continuity does not introduce a generic provider
> runtime, provider-specific readiness system, or global `/synced` contract.
> This file remains only as the discarded first hypothesis.

## Purpose

Design the smallest vertical evidence slice without implementation. The slice
tests whether provider ownership can remain as easy as readiness while core
retains the stronger checkpoint guarantees.

## Candidate Surface

```ts
type ContinuityProvider = {
  id: string;
  description: string;
  stateClass: "durable" | "reconstructable" | "ephemeral" | "secret";
  checkpoint(ctx: {
    checkpointId: string;
    mode: "periodic" | "final";
    signal: AbortSignal;
  }): Promise<ContinuityCheckpointResult>;
  restore?(ctx: ContinuityRestoreContext): Promise<ContinuityRestoreResult>;
};
```

Core namespaces plugin IDs, scopes registration to activation, rejects
duplicates, enforces deadlines, and enumerates descriptors without callbacks.
Profiles select which IDs are required. Providers do not publish artifacts and
do not return `safeToDestroy`.

## Representative Fixture

`plugin.example.notes` owns one SQLite database.

Accepted result:

```json
{
  "state": "materialized",
  "watermark": "sqlite-data-version:42",
  "artifacts": [
    {
      "id": "notes.sqlite",
      "digest": "sha256:...",
      "formatId": "sqlite",
      "schemaVersion": "3"
    }
  ]
}
```

Structured failure:

```json
{
  "state": "failed",
  "reason": "WriterNotQuiesced",
  "retryable": true
}
```

## Observable Proof Surface

One continuity status result lists:

- provider ID and description;
- profile requirement;
- latest state and stable reason;
- opaque source watermark;
- redacted artifact identity and digest;
- checkpoint and runtime identity.

The public `/synced` projection exposes only the aggregate boolean/state and
stable reason. Detailed secret metadata remains operator-scoped.

## Final-Checkpoint Rule

For `mode: "final"`, a successful provider result promises that its
acknowledged writers cannot advance while the same Gateway suspension remains
active. A provider that cannot make that promise is ineligible as a required
V1 provider and returns `WriterNotQuiesced`.

This rule keeps barrier ownership local without adding prepare/commit/release
callbacks to the public API.

## Deletion Mapping

Once the fixture shape is proven with a real workspace provider and exact host
receipt:

- replace Lobster `LifecycleSignal.shutdown_ready`;
- remove inert `checkpoint_unmount` command/result handling;
- replace path discovery with provider enumeration and aggregate manifests;
- replace warning-only final push handling with structured checkpoint failure.

## Cheapest Next Design Test

Walk the candidate surface against two real owners:

1. the built-in global SQLite snapshot provider; and
2. the Lobster-backed workspace/git provider.

Reject or revise the surface if either owner needs host storage concepts or
cannot uphold the final-checkpoint rule with one callback.
