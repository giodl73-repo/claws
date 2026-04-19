# Trace: Fail Mode, Tool Classification, OBO Boundary, and Elicitation Gate

> Covers: `atom:fail-mode`, `atom:tool-classification`, `atom:obo-boundary`, `atom:elicitation-gate`

How governance handles failures, classifies tools, enforces on-behalf-of boundaries, and gates information elicitation.

---

## Fail Mode Pipeline

```
  Governance evaluation in progress
       │
       ▼
  [Unexpected Error]
       │  GovernanceHost.evaluate() throws
       │  Error: policy rule references undefined entity
       ▼
  [Fail Mode Decision]
       │  Configuration: fail_mode = "closed" (default)
       │
       │  fail-closed: treat as BLOCK → pipeline halts
       │  fail-open: treat as PASS → pipeline continues (with warning)
       │  fail-advisory: treat as WARN → log and continue
       ▼
  [CGR Emission]
       │  Record: governance evaluation failed
       │  Include: error message, stack context, fail mode applied
       │  Flag: GOVERNANCE-FAILURE in audit trail
       ▼
  Pipeline halted (fail-closed) or continues with warning
```

### Breakpoint: When to Use Each Mode

| Mode | Use Case | Risk |
|------|----------|------|
| fail-closed | Production (default) | May block valid operations |
| fail-open | Development/testing | May allow invalid operations |
| fail-advisory | Migration period | Logs everything, blocks nothing |

---

## Tool Classification

```
  Agent requests tool: Dataverse MCP
       │
       ▼
  [Classification Lookup]
       │  Tool: Dataverse MCP
       │  Type: mcp
       │  Operations: [read, write]
       │  Classification: confidential
       ▼
  [Permission Tier Check]
       │  Agent tier: T1
       │  Required tier for confidential write: T2
       │  T1 < T2 → INSUFFICIENT
       ▼
  [Decision]
       │  Read: T1 sufficient for read → ALLOW
       │  Write: T1 insufficient for write → BLOCK
       ▼
  Agent can read from Dataverse but cannot write
```

---

## OBO Boundary

```
  User initiates: "Send email to client"
       │
       ▼
  [OBO (On-Behalf-Of) Check]
       │  Agent acting on behalf of: user@company.com
       │  Action: send email
       │  OBO policy: "email requires explicit user consent per-message"
       ▼
  [Consent Verification]
       │  Has user consented to this specific email? NO
       │  → BLOCK with approval request
       ▼
  [User Approval]
       │  User reviews email content and approves
       │  Consent recorded in audit trail
       ▼
  [Resume Action]
       │  Agent sends email with OBO marker
       │  CGR records: action, consent timestamp, user identity
```

The OBO boundary prevents agents from performing privileged actions without explicit user authorization, even when the agent technically has the tool access.

---

## Elicitation Gate

```
  Agent executing task
       │
       ▼
  [Agent asks user for information]
       │  "What is the client's budget range?"
       ▼
  [Elicitation Gate]
       │  Check: is this information classified?
       │  "Budget range" → classification: internal → OK
       │
       │  Check: is this a prohibited elicitation?
       │  Policy: "Never ask for SSN, credit card, or password"
       │  "Budget range" → not prohibited → PASS
       ▼
  Question delivered to user

  Alternative:
  [Agent asks: "What is your SSN?"]
       │
       ▼
  [Elicitation Gate]
       │  "SSN" → prohibited field → BLOCK
       │  Emit: OC-POLICY-ELICIT-001 "Prohibited information request"
       ▼
  Question blocked, diagnostic logged
```

---

## Related

- [Fail Mode](../concepts/fail-mode.md) -- fail mode configuration
- [Tool Classification](../concepts/tool-classification.md) -- classification details
- [OBO Boundary](../concepts/obo-boundary.md) -- on-behalf-of enforcement
- [Elicitation Gate](../concepts/elicitation-gate.md) -- information elicitation control
