# Trace: Compliance Artifact, Kill Switch, and Operational Controls

> Covers: `atom:compliance-artifact`, `atom:kill-switch`

How compliance evidence is generated and how the kill switch provides emergency workspace shutdown.

---

## Compliance Artifact Generation

```
  Operator runs: claws comply --framework soc2
       │
       ▼
  [Framework Loader]
       │  Load SOC2 Type II control framework
       │  12 controls (CC1.1 through CC7.5)
       ▼
  [Evidence Collection]
       │  For each control:
       │    CC6.1 (Logical Access):
       │      → Scan CGR chain for permission tier events
       │      → Count: 847 access-controlled operations
       │      → Status: all within policy → COMPLIANT
       │
       │    CC6.7 (Change Management):
       │      → Scan CGR chain for compilation events
       │      → Verify: each change has pre/post hash
       │      → Status: all changes tracked → COMPLIANT
       │
       │    CC7.2 (System Monitoring):
       │      → Verify audit chain integrity
       │      → Check: chain unbroken for assessment period
       │      → Status: chain intact → COMPLIANT
       ▼
  [Report Assembly]
       │  Generate:
       │    soc2-control-matrix.md (12 controls, per-control evidence)
       │    soc2-evidence-chain.json (CGR references)
       │    soc2-summary.md (executive summary)
       ▼
  [Sign Report]
       │  Sign with workspace signing key
       │  Emit CGR recording report generation
       ▼
  Compliance artifacts ready for auditor
```

### Breakpoint: Cross-Framework Overlap

Many controls overlap across frameworks:

```
  SOC2 CC6.1 (Access) ←→ HIPAA 164.312(d) (Authentication)
  SOC2 CC7.2 (Monitoring) ←→ EU AI Act Art 12 (Record-keeping)
```

The compliance engine collects evidence once and maps it to multiple frameworks, avoiding redundant CGR chain walks.

---

## Kill Switch Pipeline

```
  Operator detects incident
       │
       ▼
  [Kill Switch Activation]
       │  claws kill --workspace lead-scoring
       │  OR: CLAWS_KILL=1 environment variable
       │  OR: fleet broadcast --kill workspace=lead-scoring
       ▼
  [Immediate Effects]
       │  1. All running agents receive halt signal
       │  2. GovernanceHost.enforce() returns BLOCK for all requests
       │  3. New skill dispatches are rejected
       │  4. ExecHost stops accepting tasks
       ▼
  [Agent Shutdown (per halt-semantics)]
       │  Phase 1: Checkpoint → save state to WAL
       │  Phase 2: Cleanup → release resources
       │  Phase 3: Terminate → exit with code 4 (killed)
       ▼
  [CGR Chain Update]
       │  Record: kill switch activated
       │  Include: operator, reason, timestamp
       │  Flag: KILL-SWITCH in audit trail
       ▼
  Workspace frozen

  Later:
  [Kill Switch Deactivation]
       │  claws kill --workspace lead-scoring --lift
       │  Verify: operator has T3+ permission
       │  Record: kill switch lifted
       ▼
  Workspace resumes normal operation
```

### Breakpoint: Fleet-Wide Kill

```
  fleet broadcast --kill
       │
       ▼
  [For each workspace in fleet:]
       │  Send kill signal
       │  Wait for acknowledgment
       │  Record per-workspace kill event
       ▼
  All fleet workspaces frozen
```

---

## Related

- [Compliance Artifact](../concepts/compliance-artifact.md) -- artifact types
- [Kill Switch](../concepts/kill-switch.md) -- kill switch operations
- [Halt Semantics](../../agent/concepts/governance/halt-semantics.md) -- agent shutdown protocol
