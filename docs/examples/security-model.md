# Security Model Examples

Tool classification, OBO boundaries, elicitation gates, defense layers, and fail modes.

## Tool Classification (R1-R5)

```json
{
  "classifications": {
    "read-file": "R1",
    "search-knowledge": "R1",
    "write-file": "R2",
    "update-record": "R2",
    "send-email": "R3",
    "post-to-slack": "R3",
    "transfer-funds": "R4",
    "access-pii": "R4",
    "delete-database": "R5",
    "modify-permissions": "R5"
  }
}
```

## OBO Boundary Declaration

```yaml
# SKILL.md frontmatter for a FOR-user skill (reads data)
---
name: lookup-customer
risk: R1
obo: none
data: INTERNAL
---

# SKILL.md frontmatter for an AS-user skill (acts as user)
---
name: send-response
risk: R3
obo: email
data: INTERNAL
---
```

## Elicitation Gate Flow

```
Agent calls send-email tool
    │
    ▼
before_tool_call hook fires
    │
    ▼
OBO check: obo=email → G-ELICIT required
    │
    ▼
Gate: "This will send email to customer@example.com. Confirm?"
    │
    ├─ User approves → tool executes → audit logged
    │
    └─ User rejects → tool blocked → audit logged
```

## Defense-in-Depth Layers

```
Layer 1: L1 Advisory (SKILL.md)
  "Do not access tools classified above R2 without approval"
  → Agent reads this. May ignore.

Layer 2: L2 Runtime (Gateway plugin)
  before_tool_call: if risk > trustTier → BLOCK
  → Cannot be ignored. Intercepts before execution.

Layer 3: L3 Monitoring
  after_tool_call: log(tool, risk, params, result)
  → Continuous violation detection.

Layer 4: L4 Host (exec-approvals.json)
  Host-level allowlist backup
  → Independent of plugin. Catches plugin failures.

Layer 5: L5 Fleet
  Cross-workspace compliance baseline
  → Fleet-wide policy floor.
```

## Fail Modes

```json
{
  "fail-modes": {
    "R1": "open",     "// evaluation failure → allow tool call",
    "R2": "open",     "// evaluation failure → allow tool call",
    "R3": "closed",   "// evaluation failure → block tool call",
    "R4": "closed",   "// evaluation failure → block tool call",
    "R5": "closed"    "// NON-CONFIGURABLE — always closed"
  }
}
```

## Emergency Bypass

```bash
CLAWS_BYPASS=1 craft exec --skill emergency-response --reason "production outage"
```

```
BYPASS ACTIVE — audit trail:
  Who:    operator@company.com
  When:   2026-04-12T14:32:00Z
  Reason: production outage
  Bypassed: G-ELICIT, G-BUDGET-CAP
  Alert:  Sent to security-team@company.com
```

## Kill Switch (3 Paths)

```bash
# Path 1: Local
claws kill --reason "suspicious activity"

# Path 2: Fleet (remote)
claws fleet kill --workspace prod-cs --confirm

# Path 3: Emergency signal file
touch ~/.claws/KILL
# All workspaces on this machine stop immediately
```
