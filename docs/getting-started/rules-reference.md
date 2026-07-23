# Rules Reference

Quick reference for the 29 governance rules, severity levels, and how to read claws pinch output.

## Severity Levels

| Level | Name     | Fail Mode       | Description                                                    |
| ----- | -------- | --------------- | -------------------------------------------------------------- |
| R1    | Info     | open            | Advisory — logged but never blocks                             |
| R2    | Low      | open            | Low risk — fails open, audit trail only                        |
| R3    | Medium   | closed          | Medium risk — fails closed by default                          |
| R4    | High     | closed          | High risk — requires approval before execution                 |
| R5    | Critical | closed (always) | Critical — fail-closed is non-negotiable, cannot be overridden |

R5 rules are structurally enforced: `FailMode<5>` resolves to `'closed'` only at the TypeScript type level. Attempting to assign `'open'` to an R5 rule produces a compilation error (`OC-POLICY-E001`).

## The 29 Governance Rules

### Tool Governance (G-TOOL)

| #   | Rule      | Level | What It Does                                             |
| --- | --------- | ----- | -------------------------------------------------------- |
| 1   | G-TOOL-01 | R5    | Block tools classified as critical without approval gate |
| 2   | G-TOOL-02 | R4    | High-risk tools require explicit approval                |
| 3   | G-TOOL-03 | R3    | Medium-risk tools logged with audit trail                |
| 4   | G-TOOL-04 | R2    | Low-risk tools tracked in audit log                      |
| 5   | G-TOOL-05 | R1    | Unknown tools default to R5 (fail-closed)                |

### Input Validation (G-INPUT)

| #   | Rule       | Level | What It Does                                  |
| --- | ---------- | ----- | --------------------------------------------- |
| 6   | G-INPUT-01 | R4    | Validate tool input schemas before execution  |
| 7   | G-INPUT-02 | R3    | Sanitize string inputs for injection patterns |
| 8   | G-INPUT-03 | R2    | Log input shape mismatches                    |

### Context Governance (G-CONTEXT)

| #   | Rule         | Level | What It Does                            |
| --- | ------------ | ----- | --------------------------------------- |
| 9   | G-CONTEXT-01 | R4    | System prompt boundary markers required |
| 10  | G-CONTEXT-02 | R3    | Context window overflow detection       |
| 11  | G-CONTEXT-03 | R2    | Prompt injection pattern scanning       |

### Agent Delegation (G-A2A)

| #   | Rule     | Level | What It Does                                   |
| --- | -------- | ----- | ---------------------------------------------- |
| 12  | G-A2A-01 | R5    | A2A firewall — unauthorized delegation blocked |
| 13  | G-A2A-02 | R4    | Delegation requires explicit permission grant  |
| 14  | G-A2A-03 | R3    | Cross-agent audit trail required               |

### Elicitation (G-ELICIT)

| #   | Rule        | Level | What It Does                                 |
| --- | ----------- | ----- | -------------------------------------------- |
| 15  | G-ELICIT-01 | R5    | OBO tools require explicit user consent      |
| 16  | G-ELICIT-02 | R4    | Elicitation gate before high-risk operations |
| 17  | G-ELICIT-03 | R3    | Elicitation prompt clarity requirements      |

### Audit (G-AUDIT)

| #   | Rule       | Level | What It Does                               |
| --- | ---------- | ----- | ------------------------------------------ |
| 18  | G-AUDIT-01 | R3    | All governed actions produce audit events  |
| 19  | G-AUDIT-02 | R2    | Audit events include tool name and outcome |
| 20  | G-AUDIT-03 | R2    | Audit log tamper detection                 |
| 21  | G-AUDIT-04 | R1    | Audit retention policy compliance          |

### Workflow (G-WORKFLOW)

| #   | Rule          | Level | What It Does                                |
| --- | ------------- | ----- | ------------------------------------------- |
| 22  | G-WORKFLOW-01 | R4    | Workflow inversion injects governance steps |
| 23  | G-WORKFLOW-02 | R3    | Original step ordering preserved            |
| 24  | G-WORKFLOW-03 | R2    | Audit steps are async (non-blocking)        |

### Compliance (G-COMPLY)

| #   | Rule        | Level | What It Does                         |
| --- | ----------- | ----- | ------------------------------------ |
| 25  | G-COMPLY-01 | R5    | Compliance signing before deployment |
| 26  | G-COMPLY-02 | R4    | Policy version tracking              |
| 27  | G-COMPLY-03 | R3    | Drift detection against baseline     |

### Supply Chain (G-SUPPLY)

| #   | Rule        | Level | What It Does                       |
| --- | ----------- | ----- | ---------------------------------- |
| 28  | G-SUPPLY-01 | R4    | Dependency provenance verification |
| 29  | G-SUPPLY-02 | R3    | Transitive dependency audit        |

## Reading Pinch Output

`claws pinch` compresses governance analysis into a compact report. Here is how to read it:

```
$ claws pinch

GOVERNANCE PROFILE: my-workspace
═══════════════════════════════════
R5 CRITICAL (fail-closed, non-negotiable)
  ✗ delete_database     DENY — Critical data destruction
  ✗ send_email          OBO — Requires user consent

R4 HIGH (fail-closed, requires approval)
  ⚠ execute_command     APPROVAL REQUIRED

R3 MEDIUM (fail-closed by default)
  ○ write_file          Audit trail active

R1-R2 LOW/INFO (fail-open)
  ✓ read_file           Governed, no restrictions
───────────────────────────────────
SCORE: 29 rules evaluated | 2 blocked | 1 approval | 26 passing
LOSS:  openclaw 0/7 | claude-code 3/7 | cursor 5/7
```

**Symbols:**

- `✗` — Tool blocked (R5 deny)
- `⚠` — Tool requires approval (R4+)
- `○` — Tool governed with audit
- `✓` — Tool governed, no restrictions

**Loss line:** Shows per-platform governance feature loss. `0/7` means zero features lost (full fidelity). `5/7` means 5 of 7 governance features are unavailable on that platform.

## Error Codes

| Range | Category   | Example                                                 |
| ----- | ---------- | ------------------------------------------------------- |
| E0xx  | Type-level | OC-POLICY-E001: R5 fail-open forbidden                  |
| E1xx  | Parse      | OC-POLICY-E101: Invalid .crest syntax                   |
| E2xx  | Rule       | OC-POLICY-E201: Rule conflict detected                  |
| E3xx  | Emit       | OC-POLICY-E301: Empty artifact, E310: strict-loss block |
