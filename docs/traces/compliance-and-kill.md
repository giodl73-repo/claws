# Trace: Compliance Artifacts and Kill Switch

> Covers: `atom:compliance-artifact`, `atom:kill-switch`

How compliance evidence is generated from the governance audit chain, and how the kill switch terminates agent execution in emergencies.

---

## Compliance Evidence Generation

```
  claws compliance generate --framework soc2 --period 2026-Q1
       │
       ▼
  [1. Load CGR Chain]
       │   Read all CGR records from .claws/audit/ for the period
       │   Verify chain integrity (hash chain + signatures)
       │   If chain is broken → ABORT with INTEGRITY-001
       ▼
  [2. Collect Evidence Categories]
       │
       ├── Access Control Evidence
       │     Tool classifications (R1-R5 for each tool)
       │     Gate verdicts (every elicitation decision)
       │     OBO authorizations (every impersonation action)
       │
       ├── Incident Detection Evidence
       │     Sidecar health events
       │     Handler failure records
       │     Policy IR integrity checks
       │
       ├── Incident Response Evidence
       │     Kill switch activations (if any)
       │     Bypass periods (CLAWS_BYPASS=1 events)
       │     Recovery actions (claws doctor --recover)
       │
       └── Monitoring Evidence
              Budget consumption over time
              Tool call frequency by classification
              Delegation graph usage
       │
       ▼
  [3. Map to Framework Controls]
       │   SOC2 CC6.1 ← access control evidence
       │   SOC2 CC7.1 ← incident detection evidence
       │   SOC2 CC7.2 ← incident response evidence
       │   (see compliance-artifact concept guide for full mapping)
       ▼
  [4. Generate Narrative]
       │   Human-readable compliance story in Markdown
       │   For each control: what claws does, evidence reference, gaps (if any)
       ▼
  [5. Seal]
       │   Compute SHA-256 manifest hash
       │   Sign with Ed25519 (from .claws/keys/)
       │   Write to compliance/{framework}/{period}/
       ▼
  Output:
    compliance/soc2/2026-Q1/
    ├── manifest.yaml
    ├── narrative.md
    ├── evidence/
    │   ├── cgr-chain.json
    │   ├── tool-classifications.json
    │   ├── gate-verdicts.json
    │   └── sidecar-health.json
    ├── mappings/soc2-cc.yaml
    └── seal.sig
```

---

## Kill Switch Pipeline

The kill switch is L5's emergency halt -- it terminates all agent execution when governance integrity cannot be guaranteed:

```
  Sidecar detects anomaly
       │
       ├── Policy IR hash changed unexpectedly
       │   OR
       ├── before_tool_call handler unregistered
       │   OR
       ├── Health endpoint unresponsive for 5 seconds
       │   OR
       └── Operator triggers: claws kill
       │
       ▼
  [Kill Decision]
       │   Anomaly confirmed (not transient — sustained for threshold duration)
       │
       ▼
  [Three-Path Kill]
       │
       ├── Path 1: File sentinel
       │     Write .claws/KILL file
       │     Gateway checks for this file on each tool call
       │     If found → reject all tool calls immediately
       │
       ├── Path 2: OS signal
       │     Send SIGUSR1 (Unix) or named event (Windows)
       │     Gateway's signal handler enters shutdown
       │
       └── Path 3: Process termination (fallback)
              If paths 1+2 fail within 10 seconds:
              SIGTERM → 5s grace → SIGKILL
              Ungraceful but guaranteed termination
       │
       ▼
  [Post-Kill]
       │   SIEM alert emitted with: trigger reason, timestamp, kill path used
       │   CGR: KILL-SWITCH event (indelible — cannot be deleted)
       │   Agent execution stopped across all workspaces in the process
       │
       ▼
  [Recovery]
       │   Operator investigates the anomaly
       │   Fix the root cause (re-compile, restore snapshot, etc.)
       │   Remove .claws/KILL sentinel
       │   Restart the agent gateway
```

---

## Kill Switch vs Bypass

| Mechanism | Direction | Who triggers | What happens |
|-----------|-----------|-------------|-------------|
| Kill switch | Stop everything | Sidecar (automatic) or operator | All tool calls blocked, agents terminated |
| Bypass | Allow everything | Operator only (env var) | Governance disabled, all tool calls allowed |

Kill switch is a safety mechanism — it fires when governance itself is compromised. Bypass is an operator escape — it fires when governance is blocking critical work. They are opposites but both leave audit trails.

---

## Related

- [Kill Switch](../concepts/kill-switch.md) -- the kill switch concept
- [Compliance Artifact](../concepts/compliance-artifact.md) -- evidence packages
- [Defense in Depth](../concepts/defense-in-depth.md) -- L5 sidecar
- [Audit Chain](../concepts/audit-chain.md) -- CGR records
