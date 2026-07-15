# PR 4: Writes, Inspection, and Readiness

## Objective

Make activated layered config safely operable: writes target an explicit source,
authority violations fail before persistence, and failures are inspectable.

## Dependency

- PR 3 merged with a stable activation candidate and source identity model.

## Source audit before editing

- Config set/unset/write APIs and their generation or conflict checks.
- Doctor, status, readiness, and config inspection conventions.
- Secret redaction and stable identity helpers.
- Reload classification and previous-snapshot preservation.

## Production scope

- Explicit writable-source targeting.
- Read-only rejection independent of name or position.
- Recomposition preflight before persistence.
- Authority-chain identity in optimistic concurrency checks.
- Compare-and-swap on both target-source generation and authority-chain identity.
- Existing atomic config-file replacement and recovery behavior.
- Redacted effective/source identity and per-path provenance inspection.
- Structured readiness for the latest rejected candidate.
- `NoDeclaredValues` whole-layer advisory.

## Implementation steps

1. Extend the existing mutation preflight rather than adding a second writer.
2. Resolve the target source and verify write access.
3. Apply the proposed edit in memory and recompose the complete chain.
4. Persist only after authority and effective validation succeed.
5. Atomically compare target-source and authority-chain generations immediately
   before using the existing atomic write primitive.
6. Reject stale source or authority-chain generations with retry guidance.
7. Activate only the complete persisted generation; recover without a partial
   file or partial snapshot if persistence or reload fails.
8. Project findings into existing inspection/status structures.
9. Redact values and identities through existing secret metadata.

## Minimum audit record

- Effective candidate identity and authority-chain identity.
- Activation/rejected-candidate generation and timestamp.
- Redacted source identities and access capabilities.
- Path, controlling layer, declaring layers, comparator class, and stable reason.
- Persistence and activation outcome without secret values or host paths.
- Records remain explainable after restart/reload through existing diagnostics.

## Operator experience

- Conflict output names the controlling source, whether it is writable, and the
  least-destructive remediation.
- Integrity and unsupported-version findings explain which source must be
  repaired or upgraded without exposing its contents.
- `NoDeclaredValues` is clearly advisory and never presented as failed startup.
- Reuse existing config/status/doctor conventions; do not add a management UI.

## Focused proof

- Writable middle and final layers can change unclaimed paths.
- Read-only layers reject writes.
- Earlier exact authority rejects conflicting set and unset operations.
- Failed preflight performs no persistence and no activation.
- Stale authority identity rejects a racing write.
- Stale target-source identity independently rejects a racing write.
- Persistence/reload failure leaves no partial file or partial activation.
- Failed reload preserves the previous runtime snapshot.
- Empty layers produce one advisory, not per-object warnings.
- Findings and hashes do not disclose secret plaintext.
- Conflict, integrity, stale-write, and empty-layer outputs have actionable CLI
  or status fixtures.

## Non-goals

- No ownership transfer or reconciliation loop.
- No new management daemon or database.
- No broad admin UI redesign.
- No bounded comparators unless separately justified.

## Exit criteria

- Existing write APIs remain the only persistence path.
- Every authority failure is actionable through current status/inspection UX.
- Mutation and reload integration tests pass on supported platforms.
- Lobster can migrate without retaining a bypass writer.
