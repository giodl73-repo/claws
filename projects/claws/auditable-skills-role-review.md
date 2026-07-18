# Auditable Skills receipt-first role review

Reviewed 2026-07-17 against RFC 0022, both sidecar specifications, and the
current fork-only OpenClaw PR #97 head `738ca6d79d37`.

## Lenses used

- founder: natural OpenClaw value without a governance tax;
- Gateway engineer: bounded work and contained failure on the tool-result path;
- platform engineer: multi-agent operation, lifecycle, backup, and health;
- power user/operator: useful search and count without transcript scanning;
- skill author and newcomer: a small optional producer contract;
- CISO and compliance: sensitive evidence, access, retention, and claim limits;
- skeptical simplicity reviewer: delete speculative framework and scope;
- repository steward and release engineer: native seams, no Craftworks
  dependency, migration and production-readiness truth.

Integration-specific Aether, M365, Lobster, and workflow-runner lenses are not
Round 1 gates. They become relevant only when a concrete consumer is proposed.

## Conclusion

The receipt-first thesis survives the review. A successful trusted tool can
return a typed business fact, OpenClaw can add trustworthy execution context,
and an operator can get, list, or count the retained fact. The dedicated,
configurable single-host `receipts.sqlite` is justified because full business
evidence has a different volume, sensitivity, retention, and export lifecycle
from the metadata-only audit ledger and session transcripts.

Round 1 should remain receipts only. It does not require portable skill
metadata, managed invocation, usage, budgets, a workflow engine, a CRM object
model, or a speculative remote-store abstraction.

## Findings to resolve before presentation

1. **Bound the Gateway result path.** `collectToolAuditReceipts` accepts an
   unbounded array and PR #97 writes each accepted receipt in a separate
   synchronous SQLite transaction. A 50 ms busy timeout is therefore not a
   50 ms bound for one tool result. Cap receipts per result, validate a bounded
   batch, and commit that batch once. Cover the maximum, overflow behavior,
   and one-store-failure containment in tests.
2. **Separate conformance profiles in the core sidecar.** The readable RFC says
   receipts are standalone Round 1, but the v1 core specification still makes
   skill metadata, managed child identity, usage, and cost part of one harness
   conformance package. Define a Receipt Core profile and label managed-skill
   identity/accounting as later extension profiles. Partition the required test
   vectors accordingly.
3. **Re-status the runner sidecar.** It is useful preserved research, but it
   must be an optional future addendum for implementations claiming runner
   conformance. It must not recommend a first core runner or imply that RFC
   0022 selects TaskFlow, Lobster, or another engine.
4. **Make storage claims exact.** PR #97 is a local SQLite implementation whose
   CLI calls the SQLite store directly. Describe the producer and query shapes
   as portable, but do not call the current implementation storage-neutral or
   add an unused provider interface. The abstraction can be extracted when a
   second provider exists.
5. **Make schema and operational claims exact.** Either put schema creation and
   future migrations under an explicit transaction or narrow the atomic-
   migration claim. Keep retention, backup/export, store health, corruption,
   permissions, and unsupported-newer-schema behavior as explicit production-
   readiness gates, not capabilities already supplied by PR #97.
6. **Call out sensitive evidence.** Full receipt data can contain authorization
   codes and other business evidence. The CLI/storage docs should state that
   local OS users with access to the database can read it and that operators
   own access, backup, export, and retention policy. Continue to avoid payment-
   ledger, tamper-evidence, compliance, or non-repudiation claims.

## Source-backed checks that passed

- Native OpenClaw, Codex, and Copilot harness paths forward the exact tool-call
  ID and an already-sanitized tool result to the shared observer.
- Codex app-server's `DynamicToolCallParams.call_id` is retained through the
  dynamic-tool request, thread item, response, and thread history.
- Receipt recording failures are contained and cannot change the completed
  tool result.
- Producer fields cannot assert receipt ID, time, agent, session, run, tool, or
  tool-call identity.
- Exact type, subject, agent, session, and run filters plus payload-free count
  cover the useful mini-CRM indexing scenario without creating CRM entities.
- Full producer evidence is stored once; the trajectory contains only a
  bounded reference.

## Deliberately later

- portable `SKILL.md` outcome vocabulary;
- exact managed-skill identity and run-level token/cost accounting;
- caller-owned budget decisions;
- retention automation, snapshot/export, remote or multi-host stores;
- workflow orchestration and restart-safe replay.

The next implementation should resolve findings 1 and 5 in PR #97 while the
RFC update resolves findings 2 through 4. Then rerun focused receipt/store/
harness tests and one support-thread real-behavior proof. If that remains small
and understandable, the receipt slice is ready for Patrick/Hannes review.
