## Opportunity

Once outcomes are durable and managed skill calls retain lineage, those facts can drive a real workflow. OpenClaw should reuse its workflow stack rather than invent another step engine or trust assistant prose as completion evidence.

This slice connects existing owners: Lobster supplies deterministic pipeline semantics and approvals, TaskFlow supplies durable flow identity, and OpenClaw supplies policy-filtered managed skill execution, native session context, recorded outcomes, and child-run audit data.

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

The verification skill must complete and record `customer.verified`. That observed evidence controls the branch. Lobster pauses for approval, and the resolving skill receives only the selected authorization code as `workflow-input.json`, not the complete receipt, audit summary, or transcript.

## What this slice proves

- Gives embedded Lobster one context-bound OpenClaw invocation primitive.
- Adds `openclaw.skill` for policy-filtered managed skill steps.
- Preserves agent, session, channel, sender, provider/model policy, TaskFlow identity, and invocation lineage.
- Waits for managed child completion before advancing.
- Branches on recorded outcome evidence rather than assistant prose.
- Reuses Lobster's existing `when:` and `approval:` semantics.
- Passes one selected structured value into the next child through the existing attachment path.
- Rejects recursion and missing selected input before dispatch.

No new workflow DSL, business database, receipt ledger, approval engine, or task-state model is added.

## Auditable Skills series

1. [RFC 0022](https://github.com/giodl73-repo/rfcs/pull/6)
2. [OpenClaw #97 - durable outcomes](https://github.com/giodl73-repo/openclaw/pull/97)
3. [OpenClaw #98 - managed invocation](https://github.com/giodl73-repo/openclaw/pull/98)
4. **OpenClaw #100 - workflow composition**
5. [Lobster #1 - accounting continuity](https://github.com/giodl73-repo/lobster/pull/1)
6. [OpenClaw #109 - workflow spend](https://github.com/giodl73-repo/openclaw/pull/109)

## Validation

- Managed child/session surface: 24 passing tests; one unrelated Windows-only POSIX path assertion remains platform-specific.
- Managed skill tool surface: 58 passing tests.
- Embedded Lobster workflow registry and runner: 37 passing tests.
- Audit-run reader: 1 passing test.
- Automatic fork CI passed at head `9467b2be` in [run 29454039587](https://github.com/giodl73-repo/openclaw/actions/runs/29454039587); the complete fork graph is running in [run 29454546127](https://github.com/giodl73-repo/openclaw/actions/runs/29454546127).
- `git diff --check` clean.
- Reduced slice: 41 files, 1,782 additions, 151 deletions.

The branch was rebuilt after prototype learning to remove business-association inheritance. Workflow continuity now relies on OpenClaw's native session and TaskFlow identities, while business objects remain in typed outcome subjects.

## Real behavior proof

The embedded execution order is `spawn verify -> complete verify -> approval -> spawn resolve -> complete resolve`. Failed or non-matching verification stops before resolution; rejection does not invoke resolution; approval passes only the selected authorization code to the final skill.

No live customer system or paid provider was invoked.

Depends on #98. Fork-only Auditable Skills workflow proof; not proposed upstream.
