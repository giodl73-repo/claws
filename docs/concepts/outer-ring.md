# Outer Ring

<!-- atom:outer-ring -->

## Overview

The outer ring operates at fleet scale -- scanning workspaces, detecting drift, broadcasting policy changes, and running compliance checks. Unlike the inner ring (per-save, sub-second) and middle ring (per-command, seconds), the outer ring runs periodically or on-demand and processes multiple workspaces in a single operation. It is the governance layer that connects individual workspaces into a managed fleet.

---

## Baseline Definition

A fleet baseline is the promoted snapshot that defines the expected governance state for all fleet workspaces. Drift is measured as the delta between a workspace's current state and the fleet baseline.

Baselines are stored in the fleet manifest and are established via `claws snap promote`. The baseline includes:

| Component | Content |
|-----------|---------|
| Governance configuration | `claws.json` policy fields |
| Policy definitions | Policy YAML files |
| GovernanceIR | Compiled governance rules |
| Metadata | Version, timestamp, promotion operator |

The baseline hash is a composite of `claws.json + policy YAML + GovernanceIR` hashes. A workspace matches the baseline only if its composite hash matches. *(Source: three-rings S03-F01, fleet-operations drift hash composition)*

---

## Workspace Discovery

Outer ring operations begin with workspace discovery -- finding all workspaces in the fleet. The discovery protocol:

1. Read fleet registry (if configured) for workspace paths
2. Alternatively, walk configured root paths up to `maxDepth`
3. Validate each workspace's governance state (GOVERNED/UNGOVERNED/MISCONFIGURED/INACCESSIBLE)
4. Retrieve GovernanceIR from each accessible workspace

Discovery results are cached within a scan session but not across sessions (workspaces may be added or removed between scans). *(Source: three-rings S03-F02)*

---

## Broadcast Lossless Conflict Resolution

When `claws broadcast` pushes fleet policy to workspaces, it must not overwrite local policy customizations. claws uses a **fleet overlay model** instead of direct file modification:

| Approach | File modified? | Local customizations |
|----------|---------------|---------------------|
| Direct write (WRONG) | Yes | Destroyed |
| **Fleet overlay** (correct) | No -- overlay file added | Preserved |

The overlay contains fleet-mandated policy fields. At compile time, the overlay is merged with local configuration using fleet-floor semantics (fleet values are floors, local values can only raise). This preserves the lossless guarantee -- original workspace files are never modified by fleet operations. *(Source: three-rings S03-F04, P-166)*

---

## Parallel Workspace Scanning

Outer ring operations scan workspaces in parallel:

- Each workspace scan is independent (no cross-workspace state during scan)
- Parallelism is bounded by a configurable `maxConcurrency` (default: 10)
- Individual workspace timeouts prevent one slow workspace from blocking the fleet scan
- Results are aggregated after all parallel scans complete

Point-in-time consistency across the fleet is **eventual**, not strict. Two workspaces scanned 30 seconds apart may have changed in between. For strict consistency, operators use `--sequential` mode (slower but consistent). *(Source: three-rings S03-F03)*

---

## Drift Classification

Drift detection classifies each workspace into one of three states:

| State | Meaning | Action |
|-------|---------|--------|
| **Compliant** | Composite hash matches baseline | No action needed |
| **Drifted** | Hash mismatch, workspace governed | Investigate and remediate |
| **Ungoverned** | No governance files present | Excluded from drift metrics |

Drifted workspaces are further classified by drift type:

| Drift Type | What changed | Remediation ring |
|------------|-------------|-----------------|
| **Configuration drift** | `claws.json` changed | Middle ring (doctor, reconfigure) |
| **Policy drift** | Policy YAML files changed | Middle ring (re-broadcast or local fix) |
| **Build drift** | GovernanceIR stale vs source files | Middle ring (recompile) |
| **Infrastructure drift** | Trust tier mismatch vs fleet floor | Outer ring (broadcast + rebuild) |

Severity classification prioritizes security-relevant drift: trust tier escalation (T2 to T3) is CRITICAL because it allows a workspace to use higher-risk tools than the fleet permits (P-172). *(Source: three-rings S03-F05, fleet-operations drift severity)*

---

## Drift Exception Registration

Not all drift is unintentional. Workspaces with approved policy deviations register a **drift exception**:

```json
{
  "drift": {
    "exceptions": [
      {
        "field": "classification.maxRisk",
        "value": "R5",
        "reason": "Security research workspace -- needs R5 for penetration testing tools",
        "approvedBy": "fleet-admin",
        "expires": "2026-07-01"
      }
    ]
  }
}
```

Excepted fields are excluded from drift reports. Exceptions have expiration dates and are audited. *(Source: fleet-operations S03-F05)*

---

## Inter-Ring Escalation

The outer ring can suggest (but not force) middle ring actions:

```
[OUTER RING] Workspace billing-agent is drifted (policy drift)
  Suggested action: run "claws doctor --fix" in billing-agent workspace
  Escalation: middle-ring (human-initiated only)
```

Escalation is always a suggestion to a human operator. The outer ring cannot remotely execute middle ring commands in a workspace. This permission boundary ensures that fleet-level operations do not silently modify individual workspace state. *(Source: three-rings S04-F01, S04-F03)*

---

## Related Concepts

- [Inner Ring](inner-ring.md) -- per-save real-time governance checks
- [Middle Ring](middle-ring.md) -- per-command maintenance operations
- [Fleet Scan](fleet-scan.md) -- the scan operation that populates outer ring data
- [Fleet Drift](fleet-drift.md) -- detailed drift detection semantics
