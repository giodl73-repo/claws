# The Three Rings

## Situation

Governance is not a single moment. It's three moments -- and the OpenClaw ecosystem treated them as one.

The first moment is live operation. An agent is running, making tool calls, consuming tokens, interacting with users. Governance here means real-time enforcement: is this tool call allowed? Is this token spend within budget? Does this delegation require approval? The answers must be instant -- the agent is waiting.

The second moment is upgrade. A workspace maintainer updates skills, changes policies, modifies agent behavior. Governance here means change validation: does the new version comply with the same policies as the old one? Did the permission tier change? Did a new tool dependency appear? The answers must be thorough -- a governance regression in production is worse than a delay in deployment.

The third moment is fleet. An operations team manages dozens of workspaces across environments. Governance here means aggregate visibility: which workspaces are compliant? Which are drifting? Which need attention? The answers must be comparative -- one workspace's compliance is a fact, but a fleet's compliance posture is a pattern.

Before claws, all three moments used the same tool: a manual review process. A human reads the workspace files, checks policies, approves changes, and monitors compliance. This works at scale 1. It collapses at scale 20.

## Attempt

The first design treated the three moments as three features of one command. `claws check --mode=live` for real-time. `claws check --mode=upgrade` for change validation. `claws check --mode=fleet` for aggregate. Same verb, different flags.

This was architecturally wrong. Live governance runs inside the OC Gateway as a plugin -- it intercepts tool calls and applies policies in real time. That's a runtime component. Upgrade governance runs at build time -- it compares two workspace versions and reports deltas. That's a compilation component. Fleet governance runs across workspaces -- it aggregates compliance data from multiple sources. That's an orchestration component. Runtime, compilation, and orchestration are not three modes of one thing. They're three things with different execution models, different performance requirements, and different trust boundaries.

## Result

The three rings (`atom:three-rings`) are claws's governance lifecycle:

**Ring 1: Live.** The governance plugin (`atom:governance-plugin`) runs inside the OC Gateway. It's compiled TypeScript -- not a claws dependency, not a runtime interpreter, just code that the gateway executes natively. Permission tier checks on every tool call. Budget enforcement on every token spend. Delegation fence evaluation on every agent-to-agent handoff. All decisions logged to the CGR. Response time: sub-millisecond.

**Ring 2: Upgrade.** `claws check` compares the current workspace against governance policies and reports violations. `claws check --diff` compares two workspace versions and reports governance deltas: new violations, resolved violations, changed permission tiers. The tier adoption model (`atom:tier-adoption`) defines three compliance levels: DECLARED (policies exist), TYPED (policies are machine-checkable), VERIFIED (policies are enforced at runtime). Upgrade governance promotes workspaces up the tiers.

**Ring 3: Fleet.** Fleet-level governance aggregates Ring 1 telemetry and Ring 2 compliance reports across all workspaces. The three-tier packages (`atom:three-tier-packages`) define the dependency model: @openclaw/ packages (community contributed, unverified), @claws/ packages (shared libraries, verified), @craftworks/ packages (internal infrastructure, not exposed). Fleet governance tracks which tier each workspace's dependencies sit at and flags tier regressions.

The OBO boundary (`atom:obo-boundary`) runs through all three rings. An agent acting FOR a user (on-behalf-of) has different governance constraints than an agent acting AS a user. The FOR-user boundary restricts tool access, limits delegation depth, and requires explicit approval for sensitive operations. The AS-user boundary inherits the user's full permission set. Every governance decision in every ring checks the OBO boundary first. R5 actions -- the most sensitive tier -- are fail-closed regardless of OBO mode. Non-negotiable. Non-configurable.

## Lesson

The three rings work because they match the three moments governance actually serves. Live enforcement can't wait for a compilation step. Upgrade validation can't run in real time. Fleet visibility can't be per-workspace. Each ring has its own execution model, its own performance target, and its own trust boundary. Treating them as three modes of one command would have forced one execution model to serve three contexts. Three rings, each purpose-built, connected by shared policy definitions and a common CGR audit trail.

The rings are concentric by design. Live (innermost) enforces the tightest constraints in real time. Upgrade (middle) validates changes before they reach live. Fleet (outermost) watches everything and raises the alarm when patterns emerge that no individual workspace can see.
