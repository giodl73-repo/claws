# Runtime State Continuity PR-Plan Role Review

## Scope

Reviewed all six RFC 0021 implementation stages through:

- Gateway runtime owner;
- Lobster container operator;
- fleet platform operator;
- security owner;
- community/founder simplicity; and
- maintainer PR-review rigor.

## Blocking Findings Corrected

1. **Repository boundary:** Stages 3-5 described one logical stage containing
   changes to two repositories. They now identify independently reviewable A/B
   PRs and OpenClaw-before-Lobster merge order.
2. **Speculative PR 1 contract:** Manifest and restore types had no executable
   consumer. They move to PR 2; PR 1 keeps only exercised inventory, config,
   status, and fixture contracts.
3. **Archived overclaim:** Stage 3 used runtime-compute deletion as publication
   proof, implying Portable destruction authority. It now proves survival of a
   publisher exit/restart and explicitly grants no destruction authority.
4. **Final-capture owner:** A Gateway cannot capture itself after it has exited.
   PR 4A now returns a closed-state result; PR 4B's outer coordinator verifies
   exit and performs closed-state capture and publication.
5. **Absent-runtime race:** OpenClaw cannot revoke sleep when it does not exist.
   PR 5A defines the token contract; Lobster PR 5B observes retained ingress and
   revokes authorization.
6. **Restore attack surface:** PR 2 now requires destination confinement,
   traversal/link/overwrite rejection, decompression and size bounds, identity
   classification, and startup-only restore.
7. **Rollback lineage:** PR 6 rollback now requires a mutually readable point,
   fences the new generation first, and cannot create dual authority.

## Role Findings

### Gateway Runtime Owner

- PR 2 must keep bulk work off hot paths, allow one bounded capture, and record
  measured memory, disk, I/O, event-loop, and user-latency budgets.
- Periodic capture failure may degrade RPO but may not crash, stall, or close
  ordinary admission.
- Restore remains outside a live admitted runtime.

**Disposition:** corrected in PR 2; numeric budgets remain a pre-merge evidence
gate rather than guessed in the plan.

### Lobster Container Operator

- Closed-state capture requires an outer process after Gateway exit.
- Writable sidecars must drain or fence before final capture and start only
  after restore validation.
- Pending writes and sidecar readiness must be explicit in replacement proof.

**Disposition:** corrected in PR 4A/4B.

### Fleet Platform Operator

- PR 1 needs machine-readable desired/effective level, maturity, version, and
  stable reasons for drift and canary decisions.
- Quarantine and lifecycle failures need fleet-aggregatable audit identities.

**Disposition:** corrected in PR 1 and PR 5.

### Security Owner

- Host credentials remain excluded.
- Restore is an untrusted artifact ingestion boundary and needs confinement and
  resource-exhaustion tests.
- Runtime identity must be reconstructable, protected/authorized, or blocking.
- Quarantine must be host-enforced while compute is absent.

**Disposition:** corrected in PR 2 and PR 5.

### Community And Simplicity

- Absence of config must preserve Conventional without materializing a new
  default.
- PR 1 should not land unused generalized manifest abstractions.
- Local Archived remains useful and reversible without Lobster.

**Disposition:** corrected in PR 1 and preserved in PR 2.

### Maintainer Review

- Six RFC stages are not six literal GitHub PRs when repositories differ.
- Each A/B merge boundary now has a standalone proof and no cross-repo PR.
- Stage 3 no longer claims a later-stage guarantee.
- Stage 6 shadow mode remains offline/replay-safe and non-authoritative.

**Disposition:** corrected in the plan index and stages 3-6.

## Remaining Pre-Implementation Gates

- Land and name the exact Hosted Integration seams consumed by each stage.
- Complete the state-surface inventory.
- Set measured PR 2 capture budgets.
- Resolve the exact suspension-to-close result shape in PR 4A.
- Set Lobster restore and sidecar cold-start budgets.
- Complete any runtime-owned identity threat model.
- Define cutover parity threshold, observation window, rollback expiry, and
  deletion-ledger entries before PR 6.

## Verdict

The plans are coherent after correction. They are ready as execution briefs,
not authorization to implement. PR 2's state inventory and runtime budget are
the cheapest next proof.
