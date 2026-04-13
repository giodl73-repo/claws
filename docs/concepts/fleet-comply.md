# Fleet Comply

<!-- atom:fleet-comply -->

## Overview

`claws fleet comply` is the compliance evidence command for fleet-wide governance. It evaluates every governed workspace in the fleet against one or more regulatory frameworks (SOC2, HIPAA, EU AI Act) and produces a consolidated compliance matrix.

## How It Works

1. **Discovery** -- Uses `fleet scan` to enumerate governed workspaces.
2. **Evidence Collection** -- For each workspace, gathers compliance artifacts: audit chain entries, tool classification records, OBO boundary configurations, and injection defense rules.
3. **Framework Evaluation** -- Maps collected evidence to framework-specific controls (SOC2 CC6.1, HIPAA 164.312, EU AI Act Article 6).
4. **Matrix Output** -- Produces a workspace-by-framework table showing pass/fail/partial status per control.

## Key Design Decisions

- Ungoverned workspaces are excluded from compliance metrics (no false pass rates).
- Evidence is point-in-time; `--continuous` mode integrates with `claws watch` for ongoing compliance monitoring.
- Output formats: JSON (for SIEM), table (for humans), CGR (for audit archives).

## Related Atoms

- `atom:compliance-artifact` (C15) -- Individual compliance evidence
- `atom:compliance-soc2` (C70) -- SOC2 Type II controls
- `atom:compliance-hipaa` (C71) -- HIPAA Security Rule safeguards
- `atom:compliance-eu-ai-act` (C72) -- EU AI Act assessment
- `atom:fleet-scan` (C62) -- Workspace discovery

## Spec

Governed by [CL-02 Security Model](../../design/claws/specs/CL-02-security-model.md).
