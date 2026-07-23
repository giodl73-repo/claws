# Security and Classification

Classify tools, configure OBO boundaries, set up elicitation gates, and manage kill switches.

## Classify Tools (R1-R5)

claws auto-classifies every tool in your workspace by risk level during `claws build`. Review and override classifications in claws.json:

```json
{
  "classifications": {
    "read-file": "R1",
    "write-file": "R2",
    "send-email": "R3",
    "delete-database": "R5"
  }
}
```

| Risk | Meaning                              | Fail mode                 |
| ---- | ------------------------------------ | ------------------------- |
| R1   | Read-only, no side effects           | Open (allow on error)     |
| R2   | Write to local workspace             | Open                      |
| R3   | External communication, user-visible | Closed (block on error)   |
| R4   | Financial, PII, or privileged        | Closed                    |
| R5   | System admin, irreversible           | Closed (non-configurable) |

R5 fail-closed is non-negotiable. The compiler refuses to emit R5 fail-open under any configuration.

## Configure OBO Boundaries

OBO (On Behalf Of) boundaries distinguish tools that act FOR the user (read data, analyze) from tools that act AS the user (send email, post messages). Declare OBO status in SKILL.md:

```yaml
---
name: send-email
risk: R3
obo: email
---
```

Tools marked with OBO receive the full elicitation gate before execution.

## Set Up Elicitation Gates

The elicitation gate (G-ELICIT) intercepts OBO tool calls and requires explicit confirmation:

```yaml
# .claws/policies/elicitation.yaml
rule: G-ELICIT
scope: tool-call
match:
  obo: ["email", "messaging", "financial"]
action: gate
gate-type: elicitation
message: "This action will send an email on your behalf. Confirm?"
```

The gate pauses execution and requires user confirmation before the tool call proceeds. In fleet mode, gates route to the configured approver.

## Configure Defense-in-Depth

claws enforces 5 layers of defense:

1. **L1 Advisory** -- SKILL.md governance instructions (agent reads, may ignore)
2. **L2 Runtime** -- Plugin `before_tool_call` hooks (cannot be ignored)
3. **L3 Monitoring** -- Real-time violation logging and alerting
4. **L4 Host** -- `exec-approvals.json` host-level backup
5. **L5 Fleet** -- Cross-workspace compliance baseline

Each layer operates independently. A failure in one layer does not bypass the others.

## Configure Fail Modes

Set risk-based fail modes:

```json
{
  "fail-modes": {
    "R1": "open",
    "R2": "open",
    "R3": "closed",
    "R4": "closed",
    "R5": "closed"
  }
}
```

When a governance check fails to evaluate (timeout, crash, data error), the fail mode determines whether the tool call proceeds (open) or blocks (closed).

## Set Up Emergency Bypass

For emergency situations, enable the bypass:

```bash
CLAWS_BYPASS=1 craft exec ...
```

Bypass is logged with full audit trail: who, when, why, what was bypassed. Use only for genuine emergencies. Configure bypass alerting:

```json
{
  "bypass": {
    "alert-on-use": true,
    "alert-target": "security-team@company.com",
    "require-reason": true
  }
}
```

## Configure Kill Switch

The kill switch provides three out-of-band shutdown paths:

1. **Local**: `claws kill` -- stops the current workspace
2. **Fleet**: `claws fleet kill --workspace prod-cs` -- remote shutdown
3. **Emergency**: Signal file `~/.claws/KILL` -- kills all workspaces on the machine

```bash
claws kill --reason "suspicious tool call pattern detected"
```

## Next Steps

- [Compliance and Auditing](compliance-auditing.md) -- generate compliance evidence
- [Configuration and Schema](configuration-and-schema.md) -- claws.json setup
