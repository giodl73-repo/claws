# Compiler and Engine Examples

Three-engine model, workflow inversion, lossless round-trip, and GovernanceIR.

## Three-Engine Pipeline

```
Input (9 files)
    │
    ▼
┌─────────────────┐
│  PRESS Engine    │  Compress governance instructions
│  Input: rules    │  to fit token budget
│  Output: text    │  Savings: 30-50%
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Context DAG    │  Build dependency graph
│  Input: rules    │  Resolve conflicts
│  Output: DAG     │  Compute effective policy
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Plugin Engine   │  Emit executable TS
│  Input: DAG      │  before_tool_call hooks
│  Output: .ts     │  after_tool_call hooks
└────────┬────────┘
         │
         ▼
Output (3 artifacts)
  SKILL.md    index.ts    exec-approvals.json
```

## Workflow Inversion

Input workflow:

```yaml
# WORKFLOWS.md
expense-approval:
  steps:
    - action: scan-receipt
      produces: [receipt-data]
    - action: verify-amount
      requires: [receipt-data]
      produces: [verified]
    - action: approve-expense
      requires: [verified]
      gate: manager-approval
      condition: "amount > 500"
```

Compiler-generated governance rules:

```typescript
// plugins/claws-governance/index.ts (generated)
async before_tool_call(tool: string, params: Record<string, unknown>) {
  if (tool === 'approve-expense') {
    // Inverted from workflow: verify-amount must have completed
    if (!this.state.has('verified')) {
      return { block: true, reason: 'verify-amount not yet completed' };
    }
    // Inverted from workflow: manager approval required for amount > 500
    if (params.amount > 500 && !this.state.has('manager-approval')) {
      return { gate: 'manager-approval', reason: 'Amount exceeds $500' };
    }
  }
}
```

## Lossless Round-Trip

Before `claws init`:

```
workspace/
  SOUL.md           ← Original (untouched)
  AGENTS.md         ← Original (untouched)
  TOOLS.md          ← Original (untouched)
  openclaw.json     ← Modified (plugin added)
```

After `claws init`:

```
workspace/
  SOUL.md           ← UNCHANGED (byte-for-byte identical)
  AGENTS.md         ← UNCHANGED
  TOOLS.md          ← UNCHANGED
  openclaw.json     ← Modified (1 plugin entry added)
  claws.json        ← NEW
  .claws/           ← NEW (governance data)
  skills/claws-governance/  ← NEW (L1 advisory)
  plugins/claws-governance/ ← NEW (L2+L3 enforcement)
```

After `claws uninstall`:

```
workspace/
  SOUL.md           ← Still identical to original
  AGENTS.md         ← Still identical
  TOOLS.md          ← Still identical
  openclaw.json     ← Plugin entry removed, rest unchanged
```

## GovernanceIR

```yaml
kind: GovernanceIR
version: "1.0"
workspace: support-workspace
trust-tier: 2

tools:
  - name: read-file
    risk: R1
    obo: none
    fail-mode: open
  - name: send-email
    risk: R3
    obo: email
    fail-mode: closed
    gate: G-ELICIT

policies:
  - rule: G-NO-PII-LEAK
    severity: critical
    scope: output
    action: block
  - rule: G-BUDGET-CAP
    severity: high
    scope: task
    action: throttle

effective-rules: 48
press-budget: 2400 tokens
```
