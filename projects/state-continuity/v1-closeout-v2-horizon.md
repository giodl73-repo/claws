# V1 Closeout And V2 Horizon

## V1 finish line

V1 is complete when all four CAPE levels are usable through one coherent
continuity authority model:

```text
Conventional -> existing lifecycle behavior
Archived     -> exact checkpoint, publication, retrieval, and explicit restore
Portable     -> final handoff, fresh-compute restore, and safe source retirement
Elastic      -> Portable plus absent-compute wake for Teams, host/API work, and cron
```

The V1 promise is intentionally narrower than universal runtime mobility. It
preserves current stores and owner semantics, keeps host-managed credentials
external, and proves one tenant cell and generation at a time.

## What is already substantially proven

- continuity owner vocabulary, CAPE projection, inventory, and status model;
- exact Archived verification, capture, materialization, and restore planning;
- launcher-fenced restore execution and same-incarnation replay;
- Lobster durable restore and final-handoff authority;
- authoritative Gateway suspension and exact closed-state final capture; and
- the continuity-owned publication provider contract needed by E5b.

These remain fork-only implementation stacks until their prerequisites and
owner reviews converge.

## Remaining V1 sequence

1. **Finish E5b Portable authority**
   - implement the `lobster-host` streaming publication provider;
   - publish conditionally, retrieve through a fresh instance, and verify exact
     archive and manifest identities;
   - durably commit the acceptance receipt;
   - strictly release the workspace passport; and
   - permit provider retirement only from durable `SafeToDestroy`.

2. **Close the Portable round trip**
   - connect accepted publication to the existing fresh-compute restore
     executor;
   - prove dependency and credential capability closure;
   - measure cold restore phases; and
   - keep restored admission closed until all exact evidence passes.

3. **Implement the bounded Elastic lane**
   - support durable Teams ingress, host/API requests, and cron while compute is
     absent;
   - retain owner semantics and deliver only after the restored generation is
     ready;
   - block Elastic for resident-socket and polling Channels; and
   - prove wake deduplication, quarantine, and rollback to resident Portable.

4. **Cut over and delete**
   - expose stable Status and Doctor evidence;
   - run mixed-version shadow observation;
   - prove zero use of the private Lobster paths; and
   - remove private shutdown inference, duplicate restore ordering, stale cron
     restore paths, and inert lifecycle scaffolding.

## V1 exit evidence

V1 needs one named proof bundle, not more architecture:

- local Archived round trip;
- Portable source-to-fresh-compute round trip;
- exact replay and unknown-outcome recovery;
- stale generation, digest conflict, and corrupt retrieval quarantine;
- strict passport-release failure and replay;
- bounded-memory publication and measured cold restore;
- Elastic Teams/API/cron wake with retained work; and
- mixed-version rollback plus deletion evidence.

## V2 horizon

V2 starts only after V1 deletion gates are met. Candidate areas:

- third-party plugin capture and reconstruction contributions;
- resident-socket or polling Channel continuity;
- incremental, deduplicated, or multi-recovery-point publication;
- cross-region or cross-cloud replication and migration;
- retention, legal hold, and regulated deletion policy;
- richer fleet rollout, placement, and recovery-SLO policy; and
- broader ingress families proven independently through their existing owners.

V2 should not reopen V1's settled boundaries: no generic host bus, canonical
remote live store, global dirty bit, credential export, or cross-cell lifecycle
authority.
