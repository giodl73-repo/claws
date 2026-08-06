# Extensibility, Artifacts, and Release

## Architectural Goal

Allow independent capabilities to be described, trusted, composed, activated,
upgraded, and removed without making one marketplace or package system the
semantic owner.

## Responsibilities

- Describe plugins, skills, providers, tools, channels, and host bindings.
- Resolve dependencies and compatibility before activation.
- Verify artifact identity, integrity, provenance, and policy.
- Install and activate transactionally within owner boundaries.
- Support migration, rollback, revocation, and removal.
- Distinguish release channel, immutable artifact, active version, and ready
  runtime.

## Explicit Non-Ownership

- Installation does not imply activation or readiness.
- A catalog does not authorize use.
- One package version does not define compatibility for every component.
- Artifact trust does not own runtime policy or facility semantics.

## Conceptual Pieces

| Piece | Purpose | Owner expectation |
| ----- | ------- | ----------------- |
| Definition | Inert capability metadata | Semantic owner |
| Artifact | Immutable distributable identity | Publisher/provenance owner |
| Compatibility claim | Supported host and dependency range | Verifiable before activation |
| Composition plan | Selected definitions and bindings | Conflict-aware |
| Activation | Make capability live | Owner-local generation |
| Release transition | Upgrade, migrate, restart, ready, recover | Multi-owner evidence |

## Core Contracts

- Artifact identity and provenance survive mirrors and promotion.
- Unknown or incompatible schema fails before destructive migration.
- Activation and service handoff expose recoverable phase results.
- Removal declares retained state, migration, and dependency consequences.

## Quality Attributes

- Safe third-party extensibility.
- Reproducible builds and immutable promotion.
- Mixed-version compatibility.
- Precise local rollback and fleet convergence.

## Candidate Fit

| Need | Existing or adjacent candidate | Initial disposition | What must be proven |
| ---- | ------------------------------ | ------------------- | ------------------- |
| Plugin system | Current OpenClaw plugins | Reuse/adapt | Capability and lifecycle declarations |
| Skills/composition | Claws project | Assess | Ownership and dependency semantics |
| Catalog | Catalog project | Adapt | Inert metadata and provenance |
| Artifact trust | Current install/integrity paths | Adapt | Signed provenance and revocation |
| Release activation | Current update/release paths | Adapt | Exact compatibility and recovery evidence |

## Cross-Lane Dependencies

- Depends on configuration, trust, protocols, state continuity, and operations.
- Serves every extensible runtime lane.
- Must not become a universal marketplace or release owner.
