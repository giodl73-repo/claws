# Fleet Inheritance

<!-- atom:fleet-inheritance -->

## Overview

Fleet inheritance allows fleet-level governance templates to establish a security floor for all member workspaces. Workspaces can raise constraints above the fleet floor but can never lower them. This ensures fleet-wide minimums without preventing individual workspaces from adopting stricter governance for their specific needs.

---

## Inheritable Fields

Not all governance configuration fields are inheritable. The fleet template specifies which fields propagate:

| Field Category     | Example                          | Inheritable? |
| ------------------ | -------------------------------- | ------------ |
| Trust tier minimum | `trustTier: T2`                  | Yes          |
| Elicitation policy | `elicitation.mode: deny-default` | Yes          |
| Tool risk ceiling  | `classification.maxRisk: R4`     | Yes          |
| Workspace name     | `name: billing-agent`            | No           |
| Local overrides    | `classification.overrides.*`     | No           |

Only security-relevant policy fields propagate. Identity and workspace-specific configuration remains local. _(Source: fleet-operations S08-F01)_

---

## Floor-Only Semantics

Fleet inheritance operates on a **floor-only** model. The fleet template sets the minimum acceptable value. Local workspaces may only raise the bar:

| Fleet Template              | Local Config                | Effective    | Valid?                           |
| --------------------------- | --------------------------- | ------------ | -------------------------------- |
| `trustTier: T2`             | `trustTier: T3`             | T3           | Yes -- stricter than fleet       |
| `trustTier: T2`             | `trustTier: T1`             | **Error**    | No -- below fleet floor          |
| `elicitation: deny-default` | `elicitation: deny-default` | deny-default | Yes -- matches fleet             |
| `maxRisk: R3`               | `maxRisk: R4`               | **Error**    | No -- more permissive than fleet |

When a local workspace attempts to set a value below the fleet floor, `claws pinch` reports an error with the fleet template value, the local value, and the direction of violation. _(Source: fleet-operations S08-F03, P-182)_

---

## Template Hierarchy

Fleet templates support a single level of inheritance (fleet to workspace). Multi-level hierarchies (fleet -> team -> workspace) are not supported in the initial design. This avoids complex resolution chains and makes the effective configuration traceable to exactly two sources: the fleet template and the local workspace.

Templates are versioned and signed. Workspace `claws.json` files declare the fleet template they inherit from:

```json
{
  "fleet": {
    "template": "enterprise-standard",
    "version": "1.4.0"
  }
}
```

_(Source: fleet-operations S08-F02)_

---

## Opt-In Requirement

Fleet inheritance is opt-in per workspace. A workspace without a `fleet.template` declaration is UNGOVERNED from the fleet's perspective (or GOVERNED-LOCAL if it has its own `claws.json`). Fleet operators can enforce template adoption via fleet policy (`fleet.requireGovernance: true`), which makes ungoverned workspaces a scan-level error. _(Source: fleet-operations S08-F04)_

---

## Impact Analysis

Before broadcasting a fleet template change, operators should understand the impact. `claws broadcast --dry-run` evaluates each workspace against the proposed template and reports:

- Workspaces already compliant (no change needed)
- Workspaces that need local config adjustments (floor raised)
- Workspaces that would fail (current config below new floor)

This prevents surprise breakage from template tightening. _(Source: fleet-operations S08-F05)_

---

## Cascade Failure Risk

Removing a policy field from a fleet template (e.g., dropping an elicitation policy) can cause cascade failures in dependent workspaces. If workspace A inherits an elicitation policy from the fleet template and that policy is removed, workspace A's OBO tools lose their gate -- triggering compile-time errors across all affected workspaces. Template changes must include impact analysis before broadcast. _(Source: fleet-operations P-183)_

---

## Precedence Rules

When both fleet inheritance and local pre-authorization apply to the same field, the resolution order is:

1. Fleet floor (minimum)
2. Local configuration (must meet or exceed floor)
3. Pre-authorization (runtime overrides, also subject to floor)

Pre-authorization cannot bypass the fleet floor. A fleet floor of `deny-default` for elicitation cannot be overridden by a local pre-authorization of `allow-default`. _(Source: fleet-operations S08-F09)_

---

## Related Concepts

- [Fleet Scan](fleet-scan.md) -- scan detects inheritance violations
- [Fleet Drift](fleet-drift.md) -- drift baseline includes inherited values
- [Elicitation Gate](elicitation-gate.md) -- elicitation policy is a key inheritable field
