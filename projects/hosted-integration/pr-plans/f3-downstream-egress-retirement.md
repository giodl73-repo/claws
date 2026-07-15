# F3: Downstream Egress Compatibility Retirement

## Outcome

Remove obsolete Lobster brokered-egress mechanics after every active request
family has migrated to owner adapters, credential resolvers, policy, and the
portable dispatcher.

## Repository And Dependencies

- Repository: `bic/lobster`
- Depends on: D2-D5 and F2 expiry gates

## Change

- Delete obsolete private framing and response message handling.
- Delete bridge buffering, inflight registries, body channels, permits, and
  duplicate correlation.
- Delete obsolete retry classification, refresh compatibility, and oversized
  single-message allowances.
- Retain surviving product policy only with its semantic owner.

## Non-Goals

- No upstream public API justified solely by deletion.
- No removal while an active provider family lacks parity or rollback expiry.

## Proof And Exit

- Old-path telemetry is zero for the supported fleet.
- Local and hosted conformance remains green after deletion.
- Rollback no longer depends on removed compatibility code.
- The deletion ledger records exact removed files, flags, and operational
  surfaces.
