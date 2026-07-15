# RFC 0021 PR-Body Role Review

## Scope

Reviewed the fork PR #5 body as an architecture pitch through the Gateway
runtime owner, Lobster container operator, fleet platform operator, security
owner, community/founder, and maintainer lenses.

## Findings and revisions

### Community and founder

**Finding:** Opening with Lobster made a host-specific deployment problem sound
like the reason OpenClaw should accept the feature.

**Revision:** The body now starts with the general OpenClaw recovery gap and
names value for self-hosted users, maintainers, operators, and host authors.
Lobster is evidence and the first conformance case, not the product boundary.

### Gateway runtime owner

**Finding:** The pitch did not make the cost of opting out obvious enough.

**Revision:** It now states that absent configuration remains Conventional and
adds no capture, host, generation, or wake work to the normal hot path.
Archived checkpointing remains bounded and off ordinary work paths.

### Lobster container operator

**Finding:** The body explained ownership but did not sell the concrete
simplification.

**Revision:** It now names the deletion target: private path discovery,
copy/upload wrappers, duplicate restore ordering, and private
checkpoint/shutdown frames after shadow migration.

### Fleet platform operator

**Finding:** CAPE was understandable but the operator payoff was implicit.

**Revision:** The value statement now names measurable RPO, compatible restore,
safe replacement, scale-from-zero readiness, and monotonic operator guarantees.

### Security

**Finding:** The design had the correct boundaries, but their value was buried
in the technical section.

**Revision:** The pitch now contrasts first-class manifests, compatibility,
credential boundaries, restore validation, and readiness with unsafe directory
copying. The existing fail-closed and no-credential-backup boundaries remain.

### Maintainer

**Finding:** The body described the design but did not say what decision the
draft asks reviewers to make.

**Revision:** It now ends the design narrative with five explicit architecture
questions and says implementation approval is not requested.

## Verdict

The revised body sells an OpenClaw capability rather than a Lobster feature. It
leads with broad user and maintainer value, proves urgency with Lobster, shows
the bounded implementation surface, and gives reviewers a concrete decision.
