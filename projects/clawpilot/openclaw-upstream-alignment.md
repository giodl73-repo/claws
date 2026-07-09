# OpenClaw Upstream Alignment For ClawPilot

Last updated: 2026-06-30

## Purpose

Track upstream OpenClaw work that can inform or reduce ClawPilot Local OpenClaw,
managed-provider, and Desktop-capability work.

Use this as product-alignment and dependency-watch context, not as proof that
open OpenClaw PRs are available in ClawPilot. ClawPilot should keep its current
implementation feature-detected and defensive until the referenced OpenClaw
surfaces are merged, released, and available in the Lobster/OpenClaw build we
validate against.

## Current Read

Peter Steinberger's recent OpenClaw work is not just quiet maintenance. The
landed work over the last three weeks is mostly provider/runtime hardening,
channel reliability, Codex/agent behavior fixes, model/provider expansion, and
release/update proof. The open product-surface PRs point toward enterprise-grade
platformization, but they are not usable dependencies yet.

Practical implication for ClawPilot:

- Use landed OpenClaw work as evidence that ClawPilot's direction matches the
  upstream platform: provider safety, session reliability, delivery correctness,
  plugin/catalog boundaries, and package rollout proof.
- Do not block ClawPilot on open/conflicting OpenClaw PRs.
- Keep Local OpenClaw and managed-provider code paths behind explicit readiness,
  capability, policy, and proof gates.

## Landed OpenClaw Work We Can Leverage Now

These PRs were merged in `openclaw/openclaw` since 2026-06-09 and are relevant
to ClawPilot architecture or proof framing.

| Area | OpenClaw PRs | ClawPilot leverage |
| --- | --- | --- |
| Provider safety | #92941, #92928, #92921, #92908, #92896, #92830 | Treat provider payloads, reasoning signatures, and tool schemas as untrusted. Managed-provider and Local OpenClaw adapters should fail closed, redact sensitive payloads, and surface degraded/unavailable states instead of silently continuing. |
| Model/provider expansion | #92796, #92554, #91882 | Reinforces provider-neutral routing in #3953 and the need for explicit provider identity, model identity, readiness, and fallback rather than hardcoding Copilot-only assumptions. |
| Session and agent reliability | #97140, #95039, #94421, #93287, #93228 | Supports ClawPilot session-status, progress, recovery, and terminal-outcome contracts. ClawPilot should distinguish active work, waiting-on-user, degraded provider, failed tool call, and terminal completion. |
| Channel delivery correctness | #97130, #94881, #94428, #91962 | Supports ClawPilot's requirement that local/hosted provider proof include visible delivery and channel-specific behavior, not just model completion. |
| Plugin/catalog hardening | #95827, #92084, #92652 | Supports ClawPilot package/provider eligibility and capability catalog rules. Catalog and allowlist behavior should be bounded, explicit, and testable. |
| Release/update proof | #93722, #94580 | Supports treating install/update/rollback as a first-class ClawPilot validation lane for Local OpenClaw packaged rollout. |

## Open OpenClaw Work To Watch

These OpenClaw PRs looked product-shaped but were live-checked on 2026-06-30 as
open, not on `origin/main`, and conflicting. They should be tracked as future
opportunities, not current dependencies.

| OpenClaw PR | Surface | Current state on 2026-06-30 | ClawPilot opportunity once landed |
| --- | --- | --- | --- |
| #90431 | Node-hosted plugin tools | Open, conflicting, waiting on author, proof sufficient | Could simplify Desktop/local capability federation and remote node tool exposure. |
| #85359 | Local skill route tool | Open, conflicting, waiting on author, proof sufficient | Could improve skill/capability discovery for ClawPilot and Local OpenClaw routing. |
| #83415 | Workspace checkpoints | Draft, conflicting, needs proof | Could provide rollback/audit primitives for workspace write/patch capability execution. |
| #76027 | WebChat read aloud | Draft, conflicting, needs proof | Useful UX parity signal, but not core to Local OpenClaw switch-over. |
| #77774 | Control dashboard redesign | Open, conflicting, needs proof | Could inform operator/admin visibility for ClawPilot's Agents panel and readiness ladder. |
| #81792 | Gateway token scopes | Open, conflicting, needs proof | Important future authz boundary for managed-provider and gateway-client access. |
| #78164 | Agent worker runtime isolation | Draft, conflicting, waiting on author | Could reduce blast radius for managed/local runtime execution. |
| #93313 | Codex app-server runtime ownership | Open, conflicting, needs video proof | Could affect how ClawPilot describes Codex/OpenClaw runtime ownership and recovery. |
| #81402 | Runtime state to SQLite | Open, conflicting, P1, needs proof | Could improve durable session/runtime switch-over and recovery. |
| #88454 | Restart recovery delivery routes in SQLite | Open, conflicting, needs proof | Could reduce ClawPilot-side recovery bookkeeping for delivery routes. |
| #83611 | Shared notification wake policy | Open, conflicting, needs proof | Could help normalize wake/reaction behavior across channels. |

## How This Should Shape ClawPilot Notes

### #3953 Provider Routing Flexibility

Use landed OpenClaw provider-safety work as external support for the #3953
compatibility envelope:

- provider identity must be explicit
- readiness and degraded state must be visible
- fallback must preserve the current Desktop provider path
- provider payloads and tool schemas cannot be trusted by default
- provider/model expansion is expected, so routing cannot be Copilot-only

Do not claim gateway token scopes or node-hosted plugin tools are available
until their OpenClaw PRs land.

### #3954 Local OpenClaw Runtime

Use landed session, queue, and channel reliability work to justify the runtime
proof bar:

- package path proof should include accepted run metadata and terminal outcome
- session routing should prove active, waiting, failed, and recovered states
- runtime/provider logs are useful but should eventually be replaced or
  supplemented by source-authenticated provider attestation returned to Scout
- Local OpenClaw should continue to work against today's stable gateway contract
  and feature-detect newer OpenClaw capabilities later

### #3955 Provider-Neutral Desktop Capabilities

Use landed plugin/catalog and delivery hardening as precedent for capability
gating:

- capabilities need explicit policy, approval, execution, audit, and replay
  evidence
- package/provider catalogs should be bounded and allowlisted
- raw credential or token pass-through should remain denied
- visible delivery proof matters when capability output is routed through
  channel or assistant delivery paths

Future OpenClaw workspace checkpoints, worker isolation, and token scopes would
reduce ClawPilot-side custom proof burden, but they should remain watchlist
items for now.

## Validation Guidance

For the next ClawPilot validation pass:

1. Pin the OpenClaw/Lobster build under test and record whether it includes the
   merged OpenClaw PRs through 2026-06-27.
2. Keep proof wording scoped: "aligned with upstream OpenClaw direction" is
   valid; "depends on upstream feature X" is not valid for open PRs.
3. Add feature probes for any future OpenClaw product surface before relying on
   it.
4. Treat missing future surfaces as degraded-but-supported paths rather than
   blockers.
5. Continue tracking live gaps separately: provider attestation returned to
   Scout, live M365 Graph draft proof, packaged installer/update rollback, and
   Scout-managed package acquisition/launch.

## Recommended Next Actions

- Add a short "OpenClaw upstream alignment" paragraph to #3854, #3953, #3954,
  and #3955 only where it clarifies direction without implying unavailable
  dependencies.
- Keep the watchlist in this file current when any of the open OpenClaw PRs
  merge or become part of the Lobster-consumed build.
- During proof updates, cite landed OpenClaw work by behavior category rather
  than overloading PR bodies with a long upstream PR inventory.
