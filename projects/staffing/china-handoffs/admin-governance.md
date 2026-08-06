# Admin and Governance: Collaboration and Ownership Opportunities

> **Omar's vision for Admin & Governance:** Own tenant/global settings,
> policy, permissions, approvals, audit/override state, Partner Center,
> marketplace governance, and M365 auth decisions.

## High-level vision

Scout needs a coherent enterprise control plane in which administrators can
configure availability and policy, govern extensions, understand effective
state, approve or override safely, and audit every consequential decision.

The intended boundary is:

- MAC/MOS3 and Partner Center remain authoritative for Microsoft catalog,
  title availability, package distribution, and native M365 admin decisions.
- Lobster consumes and composes those decisions with operator enrollment,
  tenant configuration, policy, and runtime state.
- Scout presents one understandable admin experience and materializes the
  effective result into OpenClaw.
- OpenClaw owns generic runtime configuration, policy, and conformance
  primitives rather than Microsoft-specific admin systems.

This document describes collaboration and ownership opportunities, not a
fixed work assignment. The Admin & Governance team could own an end-to-end
area, partner on selected slices, or help close product/platform decisions.

The first useful conversation is which responsibility best matches the team's
existing charter: native Scout availability, Partner Center, tenant/global
authority, approvals and overrides, marketplace governance, M365 auth, or the
unified admin experience.

### Guardrails and non-goals

- Keep one authoritative source for every security or availability decision.
- Do not use precedence to disguise unclear ownership or duplicate the same
  allow/deny rule in multiple systems.
- Missing identity, permission, or an authoritative first resolution must not
  silently permit a protected action.
- A dependency failure after a known-good resolution may preserve the prior
  decision, but must expose stale state and must not widen access.
- Microsoft enterprise controls must not change default community OpenClaw
  behavior; OpenClaw should receive generic effective configuration and policy.
- Resolve and cache admin decisions outside latency-sensitive runtime paths
  where possible. An admin-service failure must not crash the OpenClaw Gateway;
  each protected operation needs an explicit bounded failure posture.

## Areas and major pieces

### Tenant and global administration

- Deployment/global floors and equal-or-stricter tenant settings.
- Effective value, inheritance, provenance, denial reason, and freshness.
- Protected, tenant-only, global-only, and user-overridable settings.
- Preview, publish, rollback, and previous-good behavior.

### Permissions, approvals, and overrides

- Explicit admin roles and permission claims.
- Approval, deny, exception, override, break-glass, expiry, and reversal.
- Actor, scope, reason, prior/new value, ticket, review state, and audit.
- Failure behavior for stale, unknown, or unavailable decision sources.

### Marketplace and feed governance

- Register a source without granting install permission.
- Approve, deny, pin, scope, revoke, deprecate, quarantine, and except.
- Compose Microsoft, tenant, publisher, group, and personal feed decisions.
- Explain which authority supplied every effective outcome.

### Partner Center, MAC, and M365 administration

- Scout Teams/M365 package registration and Partner Center submission.
- MAC/MOS3 native title availability and per-environment title IDs.
- M365 auth, consent, token audience, delegated versus application behavior,
  OBO flows, preauthorization, and sovereign environment routing.
- Admin/non-admin validation, rollback, diagnostics, and support readiness.

## Partners and dependencies

| Partner                              | Contribution and decisions needed                                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| MAC/MOS3                             | Native title availability, catalog/feed authority, tenant controls, title IDs, package-defense state, RBAC, and admin APIs. |
| Partner Center / M365 admin center   | App/package submission, certification, publishing, tenant enablement, consent, and admin distribution.                      |
| Lobster/Scout                        | Authority composition, hosted control plane, effective-state APIs, admin UX, materialization, E2E, rollout, and operations. |
| OpenClaw                             | Generic policy, config, conformance, repair, and runtime enforcement primitives.                                            |
| Extensibility                        | Feed composition, marketplace governance, extension identity, versioning, trust, and revocation.                            |
| Frontend Product Engineering         | Coherent settings, preview, explain, audit, errors, freshness, and remediation UX.                                          |
| Security                             | Roles, consent, permissions, exceptions, overrides, package governance, auth boundaries, and privacy review.                |
| Infrastructure & Engineering Systems | Test tenants, E2E harnesses, required checks, reliability, tracing, dashboards, and rollback automation.                    |
| Data Science & Insights              | Admin adoption, decision latency, override/exception trends, blocked-state and rollout signals.                             |
| Operations & TPM                     | Partner decisions, certification/submission follow-through, launch readiness, and named ownership.                          |

### Terms used in this brief

- **MAC/MOS3:** Microsoft's catalog, acquisition, title-availability, and
  admin-control systems.
- **Partner Center/M365 admin center:** Microsoft app submission, publishing,
  consent, and tenant distribution surfaces.
- **Lobster/Scout:** the Microsoft-hosted product and administration experience
  around OpenClaw.
- **OBO:** on-behalf-of authentication using the signed-in user's identity.
- **ECS enrollment:** the existing operator-controlled Scout enrollment gate.
- **AppId/title ID:** the stable application identity and the environment-bound
  MOS3 catalog identity; both must be validated rather than interchanged.

## Work completed to date

- Lobster design/preparation work for the Scout package and admin integration
  landed through PRs #2422 and #3555.
- Existing Scout operator/ECS enrollment provides one availability input.
- MOS3/MAC title discovery and preview contracts were investigated and a
  bounded implementation for native title availability is in flight.
- Lobster policy foundations already support policy bootstrap/materialization,
  preview, authenticated acceptance, MOS3 publishing, effective-baseline
  projection, durable persistence, and effective-policy read UX.
- Feed foundations already support MOS3 acquisition, personal and
  tenant-approved projections, marketplace search, tenant catalog review, and
  approved-feed publication.

These pieces should be reused and brought under a coherent authority model;
they do not yet constitute the full admin product.

## Work currently in flight

### Native MAC/MOS3 Scout availability

Lobster PR [#5422](https://microsoft.ghe.com/bic/lobster/pull/5422), branch
`user/giodl/scout-tenant-availability`, was open and non-draft at `70b96a084d`
on 2026-07-27.

Its purpose is to enforce native MAC/MOS3 availability for the existing Scout
Teams app after operator enrollment. At that snapshot only GitOps checks were
attached, `GitOps/GitHubPop` was failing, the required
`Lobster-Runtime-PullRequest` context was missing, and review was not current.
The earlier CI workaround PR #5495 is closed and should not be revived without
checking current `main`.

This status is a dated snapshot. Any team choosing this slice should first
verify the current PR head, review decision, requested changes, and required
checks.

The intended product contract is:

- Scout is an existing Teams tabs app, not a new declarative agent.
- Do not create a separate Lobster availability setting, `gpt.json`, profile,
  or `x-policies` surface.
- MAC/MOS3 native title availability/block state is authoritative.
- Lobster uses a user OBO token to read targeted title preview state, validates
  the environment title ID and stable manifest AppId, caches per caller, and
  composes explicit denial with the operator/ECS enrollment gate.
- Before the first successful resolution an armed gate fails closed. After a
  successful resolution, refresh failure retains the last-known decision
  rather than widening access.
- Enforcement remains default-off until live validation succeeds.

A possible contribution is to share ownership of #5422, refresh it on current
`main`, restore the required runtime validation, address current review, and
prove resolver, discovery, remap, reacquisition, cache, and E2E behavior.

## Work still to be done

### Partner Center and MAC operational path

1. Confirm final package/app names, publisher, descriptions, categories,
   icons, screenshots, privacy URL, terms URL, support URL, and escalation
   alias.
2. Confirm production and validation tenants and admin/non-admin accounts.
3. Document exact Graph/app permissions, delegated/application behavior,
   consent wording, token audiences, allowed client AppIDs, and sovereign
   differences.
4. Validate the package and execute Partner Center/M365 admin-center
   submission.
5. Obtain and configure per-environment MOS3 title IDs for the stable Scout
   AppId.
6. Produce a repeatable enable/deny, ordinary-user, non-admin-denial, rollback,
   and diagnostics runbook.

### Durable admin authority and composition

1. Decide the durable authority for customer admin settings. Redis and local
   files may be projection/test state, not final customer authority. Prefer
   native MAC/MOS3 authority where it already exists.
2. Define the deployment/global floor and the equal-or-stricter tenant subset.
3. Define how allow, deny, approval, exception, override, quarantine,
   revocation, and package-defense decisions compose.
4. Make effective value, inheritance, authority, revision, freshness, and
   denial reason available through APIs and UX.
5. Preserve previous-good state on transient failure without silently widening
   access; surface stale and unknown status explicitly.

### Marketplace and extension governance

1. Register sources without granting install authority.
2. Approve, deny, pin, scope, revoke, deprecate, quarantine, and allow explicit
   tenant/Microsoft exceptions.
3. Reuse MOS3 effective feeds instead of creating a competing Lobster catalog.
4. Add preview showing affected users/groups, surfaces, entries, installed
   drift, warnings, quarantines, and widening/narrowing effects.
5. Provide explain and audit views for every effective decision.

### Approval, exception, and override lifecycle

- Record actor, role, scope, reason, ticket, expiry/review state, prior/new
  value, evidence, and reversal.
- Clearly separate routine approval, bounded exception, emergency break-glass,
  and permanent configuration.
- Add expiry alerts, owner review, rollback, and audit history.
- Define which controls can be delegated and which require deployment/global
  authority.

### M365 authentication decisions

- Own the escalation path for missing scopes, preauthorization, consent,
  token audience, OBO versus app-only behavior, and environment routing.
- Preserve downstream trace/correlation headers without exposing tokens.
- Validate admin and ordinary-user flows across production and validation
  tenants, including sovereign differences where applicable.

### Product and operational readiness

- Build coherent settings, preview, explain, audit, error, and rollback UX.
- Add E2E harnesses, dashboards, alerts, stale-state detection, support
  playbooks, and named DRIs.
- Validate non-admin mutation denial, access narrowing, dependency failure,
  previous-good behavior, rollback, and recovery.
- Support ring and fleet rollout with visible partial failures, targeted retry,
  rollback of affected tenants, and no disruption to unaffected tenants.
- Export security and governance events to enterprise monitoring/SIEM using a
  stable schema and correlation IDs.
- Define incident response and an emergency disable/kill path, including who
  may invoke it, which floor is never overridable, and how use is audited.
- Make consequential audit records tamper-evident, timestamped, attributable,
  retained under an explicit policy, and exportable for investigation.
- Show the user the decision source, owner, reason, impact, and next action;
  denial codes alone are not a usable admin experience.
- Apply M365 accessibility and design-system requirements to lock, warning,
  preview, exception, and error states.

## Areas the Admin & Governance team could take on

The team could select work according to charter and capacity:

- Co-own or fully take over Lobster PR #5422 and native Scout availability.
- Own Partner Center/M365 package submission and operational readiness.
- Own the authoritative tenant/global settings model and durable store.
- Own permission claims, admin roles, approval, exception, override, and
  break-glass lifecycle.
- Own marketplace/feed governance in partnership with Extensibility and MOS3.
- Own M365 auth, consent, preauthorization, token, and sovereign decisions.
- Own the unified admin API and Scout UX for preview, explain, audit, freshness,
  drift, rollback, and remediation.
- Own admin E2E, dashboards, support playbooks, and long-term operations.
- Provide a product/engineering DRI who coordinates these pieces without
  requiring that the team implement every one directly.

## Decisions where partnership would be especially valuable

- Which controls belong in MAC/M365 admin center, MOS3, Lobster, or OpenClaw?
- What is authoritative when no native MAC/MOS3 control exists?
- What are the exact deployment/global and tenant roles and claims?
- How do approval, deny, exception, override, revocation, and quarantine
  compose?
- What is the stale/unknown/failure behavior of each authority?
- Which settings are user-overridable, tenant-only, global-only, or protected?
- How should policy, feed, capability, and app availability appear as one
  coherent Scout admin experience?

## Suggested success outcomes

- Native MAC/MOS3 Scout availability is proven and safely enabled.
- The Partner Center/M365 package is submitted or submission-ready, with every
  external approval assigned to a named partner.
- Tenant/global settings have a durable authority, inheritance model, API,
  preview, explain, audit, and rollback story.
- Marketplace/feed outcomes are visible and enforceable without turning
  Lobster into a competing MOS3 registry.
- M365 auth and preauthorization have an owned escalation path and tested
  runbook.
- The admin experience is coherent for administrators and support, with
  explicit long-term ownership.
