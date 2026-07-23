# UX State

This project tracks Lobster's gated UX surfaces that need design/product
shaping before broad rollout. The June 22 focus is giving Jesse a clean view of
the three current previews: Feeds, Policy, and Context Budget.

## Current Surfaces

| Surface                       | Lobster PR                                                      | Gate                                                                                                                 | Preview path                                                                                                  | What Jesse should evaluate                                                                                             |
| ----------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Policy authoring preview      | [#3391](https://microsoft.ghe.com/bic/lobster/pull/3391) merged | `?enablePolicyUx=1`                                                                                                  | `http://127.0.0.1:3011/?enablePolicyUx=1#/policy`                                                             | Scope model, policy section grouping, strictness preview, JSON/result panel, save-blocked posture.                     |
| Scout feeds admin composition | [#3422](https://microsoft.ghe.com/bic/lobster/pull/3422) open   | `?enableScoutFeeds=1` for the Feeds page on localhost/dev; `scout_feeds_admin_ux_enabled` ECS for tenant-admin panel | `http://127.0.0.1:3012/?enableScoutFeeds=1#/feeds`                                                            | Personal vs approved feeds, admin import/review/publish flow, where tenant feed controls belong.                       |
| Context budget tool insight   | [#3379](https://microsoft.ghe.com/bic/lobster/pull/3379) merged | `context_budget_ui_enabled` ECS                                                                                      | `http://127.0.0.1:3013/#/dev/approval-cards` for specimen; chat requires a `budget` tool result plus ECS flag | Whether the compact card explains token pressure, largest source families, and recommendations clearly enough in chat. |

## Discussion Goals

- Confirm whether these belong as separate admin/settings surfaces or a shared
  "control plane" information architecture.
- Decide whether URL gates should use separate knobs (`enablePolicyUx`,
  `enableScoutFeeds`) or move toward a shared preview convention.
- Align on which surfaces are route-level previews versus inline cards hidden by
  ECS.
- Review copy, empty states, blocked-save states, and the transition from
  preview-only to tenant-controlled production settings.
- Identify what telemetry, audit evidence, and role checks each UX needs before
  shipping beyond preview.

## Local Launch Notes

Each branch is a Lobster worktree. Start the web app from `src/lobster_web`.

```powershell
cd C:\src\lobster-admin-policy-state\src\lobster_web
npm run dev -- --host 127.0.0.1 --port 3011

cd C:\src\lobster-feeds-admin-composition\src\lobster_web
npm run dev -- --host 127.0.0.1 --port 3012

cd C:\src\lobster-context-budget-plugin\src\lobster_web
npm run dev -- --host 127.0.0.1 --port 3013
```

The Feeds URL override is intentionally localhost/development-only. The
tenant-admin composition area still requires the runtime web feature flag
`scout_feeds_admin_ux_enabled`; without it, Jesse can still review the base
Feeds page but not the admin composition panel.

Budget has no URL override in the merged branch. The `/dev/approval-cards`
specimen renders the real budget card for design review; the live chat surface
uses ECS `context_budget_ui_enabled` and only appears when a `budget` tool result
is present.
