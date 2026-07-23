# Aether Bridge -- claws Artifact Flow to Host Consumers

**Version**: 1.0.0
**Status**: Specification
**Pulse**: 52 (guardrail-composition)

---

## Overview

This document describes how claws compilation artifacts flow to host
consumers. Aether is the reference consumer, but the architecture is
vendor-neutral -- any host that implements the HostApprovalPolicy
interface can consume these artifacts.

---

## Artifact Flow

```
claws compile                     claws emit
     |                                |
     v                                v
GovernanceIR                   host-approval-policies.json
(internal, not shipped)        (shipped to host)
     |                                |
     |                                v
     |                         exec-approvals.json
     |                         (OC Gateway format)
     |                                |
     v                                v
Capability Manifest            Host Approval Gate
(tools, skills, agents)        (approve/deny UX)
```

### Step 1: Compile

`claws compile` reads the workspace (SOUL.md, TOOLS.md, lobster.yaml)
and produces a GovernanceIR. The IR is the internal pivot format --
it is never shipped to the host.

### Step 2: Emit

`claws emit` transforms the GovernanceIR into host-consumable artifacts:

- **host-approval-policies.json** -- vendor-neutral approval policies
  per tool, with risk level, server, and approval requirement.
- **exec-approvals.json** -- OC Gateway format (backward-compatible
  with existing ShellExecProvider deployments).

### Step 3: Fleet Override Resolution

Before writing artifacts, the emit phase resolves fleet overrides:

1. Load fleet overrides from fleet policy configuration.
2. For each tool, determine if a fleet override applies.
3. R5 overrides are rejected (non-negotiable).
4. R3-R4 overrides are applied with audit trail.
5. Audit entries are embedded in the artifact.

### Step 4: Host Consumption

The host reads `host-approval-policies.json` and builds an in-memory
policy index (Map<server, Map<tool, Policy>>) for O(1) resolution.

Resolution order (per Aether PR #5067):

1. Exact server + tool match
2. Wildcard server (*) + tool match
3. Global default: fail-closed (requires approval)

---

## Vendor Neutrality

The artifact format uses generic field names:

| Field               | Description         | Not                    |
| ------------------- | ------------------- | ---------------------- |
| `server`            | MCP server name     | Not "Aether workspace" |
| `tool`              | Tool name           | Not "Aether action"    |
| `requires_approval` | Approval gate flag  | Not "Aether approval"  |
| `risk_level`        | Risk classification | Not "Aether risk tier" |

Any host that reads these fields can implement the approval gate.
Aether is the reference consumer -- other hosts (ClawPilot, CLI,
custom) follow the same schema.

---

## Schema Versioning

`schemaVersion: 1` is the current version. Forward compatibility is
maintained via the schemaVersion field. Hosts MUST ignore unknown
fields and handle unknown schema versions gracefully.

---

## Artifact Integrity

See [blob-integrity.md](blob-integrity.md) for signature verification
on artifact rehydration.
