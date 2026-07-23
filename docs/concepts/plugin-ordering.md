# Plugin Ordering

<!-- atom:plugin-ordering -->

## Overview

The OpenClaw Gateway executes plugins in a defined order. Governance depends on where the claws governance plugin sits in that chain. If a non-governance plugin runs first and pre-approves a dangerous tool call, the governance plugin may see "already approved" context and defer incorrectly. claws addresses this with ordering enforcement, self-position verification, and a fallback late validation mode.

---

## OBSERVE vs ACT Categorization

Plugins are categorized by their effect on tool call decisions:

| Category    | Behavior                                                             | Example                          |
| ----------- | -------------------------------------------------------------------- | -------------------------------- |
| **OBSERVE** | Reads tool call metadata, logs, monitors -- does not approve or deny | Audit logger, metrics collector  |
| **ACT**     | Makes approval/denial decisions, modifies tool call context          | Governance plugin, safety filter |

OBSERVE plugins are safe in any position. ACT plugins must be ordered carefully because their decisions affect downstream plugins. The claws governance plugin is an ACT plugin and must see tool calls before other ACT plugins have modified the approval state. _(Source: fleet-operations S09-F01)_

---

## Governance-First Requirement

The claws governance plugin must execute **before** any other ACT plugin in the Gateway chain. This ensures:

1. Governance sees the original, unmodified tool call request
2. No prior plugin has pre-approved a tool call that governance would deny
3. Governance decisions are authoritative -- not advisory

If the Gateway allows plugin ordering configuration, governance must be position 1 (after any OBSERVE-only plugins). _(Source: fleet-operations S09-F02, P-184)_

---

## Self-Position Verification

At startup, the governance plugin verifies its own position in the plugin chain. If it detects that another ACT plugin precedes it:

| Condition                              | Response                           |
| -------------------------------------- | ---------------------------------- |
| Governance is first ACT plugin         | Normal operation                   |
| Another ACT plugin precedes governance | Warning diagnostic emitted         |
| Cannot determine position (no API)     | Falls back to late validation mode |

Self-position verification runs once at plugin initialization. The check uses whatever Gateway introspection API is available. If no API exists, the plugin logs a warning and activates late validation mode. _(Source: fleet-operations S09-F03, S09-F04)_

---

## Late Validation Mode

When the Gateway does not provide ordering control or introspection, the governance plugin activates **late validation mode**:

- Governance evaluates every tool call independently, ignoring prior plugin context
- Prior approvals from other plugins are treated as advisory, not authoritative
- Governance re-evaluates risk classification, OBO status, and elicitation requirements from scratch

Late validation is less efficient (redundant evaluation) but preserves governance integrity when ordering cannot be guaranteed. It is the safety net -- not the preferred operating mode. _(Source: fleet-operations S09-F06)_

---

## Sidecar Monitoring

In addition to plugin chain ordering, the governance plugin monitors for plugin configuration changes via sidecar:

- New ACT plugins added to the chain trigger a re-verification of ordering
- Plugin removal is detected and logged
- Configuration changes that affect tool call routing are flagged

This ensures that a safe ordering at startup does not become unsafe after runtime reconfiguration. _(Source: fleet-operations S09-F07)_

---

## Fleet Scan Integration

`claws scan --fleet` includes a governance plugin marker (`__claws_governance: true`) check for each workspace. Workspaces without the governance plugin installed, or with the plugin in a non-first ACT position, are flagged in the scan inventory. This gives fleet operators visibility into ordering compliance across all workspaces. _(Source: fleet-operations CL-04 constraints)_

---

## Related Concepts

- [Defense in Depth](defense-in-depth.md) -- plugin ordering is one layer of the defense model
- [Fleet Scan](fleet-scan.md) -- scan reports plugin ordering status
- [Tool Classification](tool-classification.md) -- classification drives what ordering must protect
