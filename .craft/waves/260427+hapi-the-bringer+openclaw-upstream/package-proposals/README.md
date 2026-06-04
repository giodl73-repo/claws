# OpenClaw Package Proposals

Wave-internal proposal notes for packages that may follow the policy and
oc-path work. These are claws-side drafts until we decide which proposal should
move to the Lobster/OpenClaw upstream spec tree.

## Current candidates

| Package | Working name | Purpose |
|---|---|---|
| Enterprise Feeds | `@openclaw/enterprise-feeds` | Let an organization curate ClawHub and private skill/plugin sources without replacing the public marketplace. |
| Context budget | `@openclaw/context-budget` | Explain token/context usage and produce reviewable optimization recommendations without autonomous prompt or skill rewrites. |

See [implementation-plan.md](implementation-plan.md) for proposed PR order and
review questions. See [enterprise-feeds-wave-plan.md](enterprise-feeds-wave-plan.md)
for the boss-ready Enterprise Feeds pitch, role review, and PR sequence. See
[context-budget-wave-plan.md](context-budget-wave-plan.md) for the Context
Budget package pitch and PR sequence.

## Shared principles

- Build on existing OpenClaw plugin and skill mechanics.
- Do not duplicate policy or become another policy language.
- Prefer evidence, findings, and dry-run plans before mutation.
- Use `oc://` / oc-path references for precise edit targets when available.
- Keep M365/Lobster specifics downstream; upstream packages should define the
  generic OpenClaw contract.
- Ship the smallest useful loop first, then add adapters.

## Relationship to existing work

- `policy` decides whether an installed capability or config posture is allowed.
- `oc-path` gives precise references and safe edit targets.
- `enterprise-feeds` governs how capabilities enter a workspace.
- `context-budget` explains how capabilities consume context and where humans
  should review optimization opportunities.
