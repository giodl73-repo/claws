# SKR — Relax engine

**Sub-spec of**: [SK-sdk.md](./SK-sdk.md) · **Internal**

## Time-bound relaxations

A "relaxation" is a scoped, time-limited exemption from a specific
governance rule. Instead of permanently lowering a rule's severity,
a relax waiver says: "this specific finding, in this specific
workspace, is allowed for this specific time window, with these
specific approvers."

```ts
interface RelaxWaiver {
  readonly id: string; // UUID
  readonly ruleCode: string; // e.g. 'G-24'
  readonly workspaceId: string;
  readonly findingSignature: string; // stable hash of the finding
  readonly notBefore: number; // epoch ms
  readonly notAfter: number;
  readonly approvers: ReadonlyArray<ApproverSignature>;
  readonly reason: string; // operator-provided justification
  readonly signedAt: number;
}
```

## Scope

A waiver applies when ALL:

1. The current finding's signature matches `findingSignature`
2. The current workspace matches `workspaceId`
3. `notBefore <= now() <= notAfter`
4. The required approver chain is complete (all signatures present)

Mismatch on ANY → the finding fires as normal. Waivers never
suppress findings broadly — always scoped to exact finding + exact
workspace + exact time.

## Approver chain

The required approver chain is rule-specific, configured in the
fleet binding:

```json
{
  "rulesRequiringApproval": {
    "G-24": ["security-architect", "ops-lead"],
    "G-17": ["security-architect"]
  }
}
```

A G-24 waiver needs signatures from BOTH the security architect AND
the ops lead. G-17 waivers need only the security architect.

Unsigned or partial-signed waivers are IGNORED — they don't suppress
findings. This is the backstop against "dev filed a waiver without
getting approval".

## Audit

Every waiver application is audited — a `RelaxApplyEntry` is
appended to the audit chain whenever a waiver suppresses a finding.
This lets compliance reviewers audit "what was relaxed, when, by
whom, why".

Waivers that expire (past `notAfter`) also get a final
`RelaxExpireEntry`. Expired waivers NEVER suppress findings.
