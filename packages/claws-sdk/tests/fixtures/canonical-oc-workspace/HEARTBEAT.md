# Heartbeat

## On Start

- Verify security policy cache is current.
- Check audit log connectivity.
- Re-hydrate stage cache manifest and warm the tempfile sweeper.

## Every 1 Minute

- Refresh audit-chain verification status.
- Sample emitter backpressure.

## Every 5 Minutes

- Flush pending audit events.
- Re-validate tool approval state.
- Republish policy digests if any edge worker reports drift.

## Every 15 Minutes

- Re-scan network flow logs for anomalies.
- Reconcile fleet state against the canonical policy bundle.

## Every Hour

- Rotate session tokens approaching TTL expiry.
- Snapshot metric roll-ups.

## Every 24 Hours

- Rebuild governance posture report for the weekly review.
- Prune stage cache entries older than the retention horizon.
