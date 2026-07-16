## Opportunity

Once outcomes are durable and managed skill calls retain lineage, those facts can drive a real workflow. OpenClaw should reuse its workflow stack rather than invent another step engine or trust assistant prose as completion evidence.

This slice connects existing owners: Lobster supplies deterministic pipeline semantics and approvals, TaskFlow supplies durable flow identity, and OpenClaw supplies policy-filtered managed skill execution, native session context, the shared receipt store, and child-run audit data.

## Support-case proof

```yaml
name: support-case
steps:
  - id: verify_customer
    pipeline: >
      openclaw.skill --skill verify-customer
      --receipt-type customer.verified
      --wait-timeout-ms 60000

  - id: approve_resolution
    approval: Resolve this verified customer issue?
    stdin: $verify_customer.json.receipt
    when: $verify_customer.json.receipt.type == "customer.verified"

  - id: resolve_case
    pipeline: >
      openclaw.skill --skill resolve-case
      --input-name authorizationCode
      --wait-timeout-ms 60000
    stdin: $verify_customer.json.receipt.data.authorizationCode
    when: $approve_resolution.approved
```

The verification skill must complete and record `customer.verified`. The audit-run reader resolves the trajectory reference through the configured receipt store, returning the full receipt—including the authorization code—to the managed-step result. That observed evidence controls the branch. Lobster pauses for approval, and the resolving skill receives only the selected code as `workflow-input.json`, not the complete receipt, audit summary, or transcript.

## What this slice proves

- Gives embedded Lobster one context-bound OpenClaw invocation primitive.
- Adds `openclaw.skill` for policy-filtered managed skill steps.
- Preserves agent, session, channel, sender, provider/model policy, TaskFlow identity, and invocation lineage.
- Waits for managed child completion before advancing.
- Resolves full evidence from OpenClaw's core receipt-store boundary rather than reading business payloads from trajectories.
- Branches on recorded outcome evidence rather than assistant prose.
- Reuses Lobster's existing `when:` and `approval:` semantics.
- Passes one selected structured value into the next child through the existing attachment path.
- Rejects recursion and missing selected input before dispatch.

No new workflow DSL, business database, receipt ledger, approval engine, or task-state model is added. Lobster is the current advanced adapter, not a permanent core dependency: the RFC sidecar specifies the same managed-step contract for a minimal OpenClaw runner.

## Auditable Skills series

1. [RFC 0022](https://github.com/giodl73-repo/rfcs/pull/6)
2. [OpenClaw #97 - shared durable outcomes](https://github.com/giodl73-repo/openclaw/pull/97)
3. [OpenClaw #98 - managed invocation](https://github.com/giodl73-repo/openclaw/pull/98)
4. **OpenClaw #100 - workflow composition**
5. [Lobster #1 - accounting continuity](https://github.com/giodl73-repo/lobster/pull/1)
6. [OpenClaw #109 - workflow spend](https://github.com/giodl73-repo/openclaw/pull/109)

## Validation

- Shared-store audit-run resolution: 1 passing test with full receipt data absent from the trajectory reference.
- Embedded Lobster workflow registry and runner: 37 passing tests.
- Focused result: 3 files, 38 tests passed.
- Formatting, lint, and `git diff --check` pass for the new store-resolution integration.
- Head `78185761`; slice over #98 is 41 files, 1,843 additions, 152 deletions.

**Real behavior:** the embedded execution order is `spawn verify -> complete verify -> approval -> spawn resolve -> complete resolve`. Failed or non-matching verification stops before resolution; rejection does not invoke resolution; approval passes only the selected authorization code to the final skill.

No live customer system or paid provider was invoked.

Depends on #98. Fork-only Auditable Skills workflow proof; not proposed upstream.
