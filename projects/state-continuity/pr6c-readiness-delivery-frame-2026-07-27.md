# PR 6C readiness-gated delivery frame

> **Status:** in progress — fork-only evidence slice stacked on Lobster PR 47.

## Frame

Native Teams and cron already retain their payload, deadline, acknowledgement,
and retry state. RFC 0013 PRs 46 and 47 add the missing shared activation and
owner-validation capability. PR 6C must add only the gap after activation:
owner delivery may begin after the exact accepted recovery point, destination
runtime generation, and restored-admission readiness generation are durable.

V1 is a permanent payload-free per-cause delivery ledger and one idempotent
owner dispatch seam. Each cause remains independently owned and completed.
The deterministic dispatch identity lets an owner deduplicate a retry when the
host exits after owner success but before the central completion CAS.

This slice does not acknowledge Teams work, execute cron jobs, carry payloads
or credentials, choose recovery authority, map logical runtimes to owners, or
activate production routes/cohorts. Live route wiring remains blocked until a
production accepted-final-handoff lookup and canonical logical-runtime owner
mapping exist.

The thesis is disproved if exact readiness cannot be checked from PR 46's
permanent activation record, if replay requires a second destination runtime
generation, or if independent owner completion requires central payload or
acknowledgement state.

## Audit and transfer ledger

- Reuse: PR 46's Blob ETag-CAS activation record and exact
  recovery/destination/readiness tuple.
- Reuse: PR 47's closed cause kinds and owner-retained cause identities.
- Preserve: the deprecated E6C/E6D requirement that restored readiness precede
  delivery and crash replay reuse the winning destination generation.
- Reject: the deprecated Plex restore-hold, duplicate lifecycle authority, and
  large cross-component provisioning implementation.
- Defer: production Teams/cron call-site activation until authoritative owner
  resolution exists.

## Role findings

- Lobster container owner: persist dispatch intent before the owner call and
  make retries idempotent; a pod-local completion map is not acceptable.
- Gateway owner: delivery consumes already-durable readiness and adds no hook
  or work to Gateway admission.
- Security/simplicity: keep the ledger payload-free, validate every identity,
  and fail closed on a mismatched recovery, destination, readiness, or cause
  set. Central completion is evidence only and cannot substitute for the
  semantic owner's acknowledgement.

## Evidence slice

1. Pending activation cannot dispatch.
2. One Teams cause and one cron cause share the exact ready tuple but retain
   independent dispatch/completion state.
3. A simulated response-loss retry reuses the same deterministic dispatch
   identity and destination generation.
4. A different readiness or forged cause set fails closed.
5. Permanent bytes contain identities and owner receipts only, never payloads
   or credentials.
