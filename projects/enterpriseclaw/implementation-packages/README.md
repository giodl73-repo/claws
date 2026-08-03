# EnterpriseClaw Implementation Packages

Implementation packages are the level between the 35 architecture contracts
and repo-specific work items.

Each package defines:

- reconciliation with `../delivery-portfolio-inventory-2026-08-02.md`;
- current owner/source seams;
- local area RFCs;
- reconciled upstream workstreams and residual asks;
- B1/B2/B3 fork ledger;
- Lobster/Scout managed capabilities;
- independent Rust components;
- operator journey;
- work-item dependency graph; and
- release and deletion gates.

## Inventory Gate

Before adding a work item, classify it as:

- **reuse** - behavior already exists;
- **adopt** - an existing PR/issue or Lobster capability is the delivery path;
- **extend existing** - a residual gap belongs on an existing stack;
- **new ask** - no current source, upstream thread, or Lobster owner covers the
  portable behavior;
- **downstream-only** - the behavior is enterprise policy or physical hosting;
  or
- **delete** - an upstream release or replacement makes the work obsolete.

Every row records the live upstream state, Lobster evidence, current
carried-patch-baseline relationship, and deletion target. PR numbers alone are
not proof; refresh live state before implementation or filing.

The consolidated `.craft/roles` review is
`role-review-2026-08-02.md`. It approves the package decomposition as a planning
model and records the cross-package corrections required before execution.
Those corrections are applied through
`cross-package-execution-contracts.md`, the canonical shared-result ownership,
dependency, evidence, managed-mutation, deployment-profile, release, cutover,
fixture, and deletion contract for the package portfolio.

The package graphs are corrected and approved to begin Wave 0. Wave 0 makes
XPK-001 through XPK-009 executable. XPK-010 remains the mandatory reusable
pre-canary gate before any Rust authority change.

## Packages

| Area | Status | File |
| --- | --- | --- |
| Operations, assurance, and fleet | Designed from standalone simulation evidence | `operations-assurance-fleet.md` |
| Knowledge, context, and continuity | Reconciled against current source, upstream decisions, Lobster plugins, and patch retirement | `knowledge-context-continuity.md` |
| Identity, authority, actions, and effects | Reconciled across credential, approval, trust, capability, effect, conversation, and delivery owners | `identity-authority-actions-effects.md` |
| Runtime fabric, nodes, and Rust | Reconciled across Gateway/ACP/node source, command inventory, Lobster adopters, reverse-carrier proofs, and bounded Rust evidence | `runtime-fabric-nodes-rust.md` |
| Configuration and activation | Reconciled across config activation, ordered layers, readiness/profile stacks, Automations, Lobster managed config, and retained wake | `configuration-activation.md` |
| Agent runtime and delegated execution | Reconciled across Gateway/channel entry, runtime attempts, terminal outcomes, subagent authority/recovery, diagnostics, and managed projections | `agent-runtime-delegated-execution.md` |
| Models, provider attempts, and usage | Reconciled across catalog/route/auth/runtime owners, fallback candidates, model calls, usage diagnostics, cost provenance, Lobster Budget, and optional workers | `models-provider-usage.md` |
| Extensibility, artifact trust, and release | Reconciled across inert extension metadata, immutable install evidence, provenance/revocation, current updater/release owners, Lobster slots/promotion, and optional Rust verification/activation | `extensibility-artifact-release.md` |
| Data governance and resource control | Reconciled across owner-native lifecycle/copy settlement, memory decision threads, local admission/lease/usage owners, Lobster retention/Budget/capacity investments, and optional Rust coordinators | `data-governance-resource-control.md` |
| Experience and administration | Reconciled across owner-state projections, Doctor findings/repair previews, command/localization support, hosted Control UI, policy/admin composition, and optional Rust validators/coordinators | `experience-administration.md` |

All 35 EC contracts now map to a reconciled implementation package.
