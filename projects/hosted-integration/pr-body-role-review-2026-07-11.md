# RFC PR Body Role Review

## Scope

Review the fork RFC PR body as a persuasive architecture proposal for an
executive, maintainer, security reviewer, runtime owner, and operator.

## Founder

Lead with why this makes OpenClaw better rather than why Lobster needs an
escape hatch. The proposal must preserve the simple local install, remain
removable, and produce upstream seams useful to other hosts.

Required change:

- put community-safe defaults and reusable OpenClaw value on the first screen;
- state that no host bundle is required for ordinary installations;
- frame Lobster as the first adopter, not the owner of the architecture.

## Platform Engineer

The operational sale is stronger than the transport sale:

- one deployment contract;
- explicit readiness;
- desired versus resolved inventory;
- version-skew detection;
- canary and rollback;
- capability-by-capability migration instead of a big-bang replacement.

Required change:

- add a concise "why this matters" section with fleet and upgrade outcomes;
- explain that adoption is incremental and support lands inactive first.

## CISO

The body should make the authority model legible without requiring readers to
decode implementation terms.

Required change:

- state plainly that credentials stay in the host;
- state that each request is constrained by owner config, credential scope,
  traffic policy, network guard, and current generations;
- emphasize fail-closed behavior and no weaker fallback.

## Gateway Engineer

The proposal must not sound like provider traffic is being moved into Gateway
or that every request gains a new control-plane hop.

Required change:

- state that local behavior remains unchanged;
- state that Gateway and Channel paths stay native;
- state that provider streams have separate queues and scheduling.

## Lobster Container Engineer

The strongest concrete value is deleting private ownership and duplicated
transport machinery while preserving the useful outward-dial topology.

Required change:

- compare today's ProxyPipe model with the proposed owner-based model;
- show that migration is per capability with health, canary, and rollback;
- retain CAPI as the proof because it exercises the real hard parts.

## New Hire

The body should answer three questions in order:

1. What is wrong today?
2. What becomes possible?
3. What decision do you want from me?

Required change:

- move detailed scope below an executive summary and current/future comparison;
- replace internal phrasing with outcomes;
- end with a concrete review request.

## Lorant Reviewer

Do not oversell implementation that has not shipped. Separate proposed
contracts, first proof, and later adoption. Keep non-goals and risk controls
visible.

Required change:

- label the RFC as a proposal and the CAPI path as the first proof;
- state that this fork PR requests architecture feedback, not upstream merge;
- keep exact review questions and avoid unsupported cost or LOC claims.

## Final Decision

Revise the body around:

1. executive summary;
2. why this matters;
3. current versus proposed model;
4. architecture diagram;
5. full supported scope;
6. CAPI proof;
7. incremental delivery and risk controls;
8. explicit decision requested.

This structure improves the sale without turning the RFC into marketing copy.
