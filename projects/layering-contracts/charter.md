# Layering Contracts Charter

## Thesis

Lobster should host OpenClaw by upstreaming portable contracts, not by
accumulating Lobster-only runtime patches. The desired operating model is that
Lobster waits for and promotes an OpenClaw release containing a validated fix,
rather than indefinitely carrying a private behavioral fork.

Lobster's unique value is the enterprise host:

- authentication and identity-provider integration;
- tenant and user routing;
- Teams, web, and admin surfaces;
- managed policy selection and rollout;
- telemetry sinks, dashboards, and fleet alerts;
- worker pools, deployment, storage backends, and compliance controls.

OpenClaw's value remains the portable agent runtime:

- Gateway and host-facing runtime behavior;
- plugin SDK, lifecycle, and manifest semantics;
- tools, node pairing, and command approval protocols;
- sessions, memory, and local state semantics;
- snapshot, backup, restore, and runtime lifecycle primitives;
- diagnostics hooks, event semantics, and conformance tests.

## Practical Ownership Split

| OpenClaw contract                                       | Lobster responsibility                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Gateway authentication modes and trusted-proxy behavior | Select the authentication posture for each tenant/ring                    |
| Plugin lifecycle and manifest semantics                 | Select which plugins are bundled and enabled                              |
| Snapshot and backup primitives                          | Select trial policy, schedule, storage destination, and telemetry rollout |
| Node pairing and command approval protocol              | Apply user/tenant gating and provide approval UX                          |
| Tool policy resolution and effective-decision semantics | Select and roll out managed baselines                                     |
| Session/state schema, durability, and restore semantics | Route workers, enforce tenant stickiness, and implement storage           |
| Diagnostics hooks and stable event names                | Operate Kusto dashboards and fleet alerts                                 |

## Working Rules

1. Do not accept broad baked-config changes without mapping every field to an
   upstream contract, plugin-owned feature, Lobster host decision, temporary
   workaround, or suspect behavior.
2. When Lobster discovers a portable hosting gap, define the desired OpenClaw
   contract before or alongside any temporary Lobster patch.
3. Treat repeated Gateway startup, retry, authentication, state, or lifecycle
   patches as evidence that the behavior belongs upstream.
4. Prefer plugins for product capabilities such as context budget, node skills,
   feeds, and product-specific snapshot integration. Add only the smallest
   required portable primitive to OpenClaw core.
5. Tie every carried Lobster workaround to an upstream issue/contract, removal
   condition, owner, and target OpenClaw release.
6. Make upstream conformance tests the support promise. Lobster should promote a
   release because the contract is proven, then delete the corresponding patch.

## Release Compact

The architecture is enforced through the
[Upstream-First Release Compact](upstream-first-release-compact.md). Every
Lobster-carried OpenClaw workaround must have upstream ownership, an expiry,
conformance evidence, a minimum replacement release, and a deletion target.
PromoteClaw turns quarantine-cleared releases into patch-deletion events rather
than mechanically replaying a private fork.

## Plugin-First Boundary

Plugin-first does not mean every underlying semantic belongs in a plugin.

```text
OpenClaw core
  owns the portable primitive and lifecycle contract

plugin
  packages or adapts a product capability using that primitive

Lobster
  selects, configures, rolls out, stores, and operates the capability
```

For example, SQLite-safe snapshot creation and restore semantics can be an
OpenClaw primitive; Lobster-specific publication, trial policy, telemetry, and
storage integration can remain plugin/host behavior.
