# Experience and Administration

## Architectural Goal

Provide coherent local and managed experiences that explain and control owner
systems without becoming a second source of runtime truth.

## Responsibilities

- Project owner state for hobbyists, operators, administrators, developers,
  security teams, and auditors.
- Support inspect, explain, preview, approve, operate, and recover workflows.
- Preserve owner terminology, generation, certainty, and remediation.
- Adapt presentation by role, locale, channel, and deployment profile.

## Explicit Non-Ownership

- Does not own runtime configuration, policy decisions, session state,
  readiness, audit truth, or fleet convergence.
- Does not convert missing or stale owner evidence into a healthy status.

## Conceptual Pieces

| Piece | Purpose | Owner expectation |
| ----- | ------- | ----------------- |
| Local operator shell | Simple setup, operation, and repair | Projects owner APIs directly |
| Control experience | Multi-owner inspection and bounded mutation | Stores preferences, not canonical runtime state |
| Administrative workspace | Governed preview, approval, rollout, and exception handling | Uses explicit authority and owner generations |
| Explanation model | Findings, causes, consequences, and actions | Links to owner evidence |
| Presentation system | Locale, accessibility, channel-safe rendering | Preserves stable machine meaning |

## Core Contracts

- Every displayed state identifies owner, generation, freshness, and certainty.
- Mutations preview affected owners and expected transitions.
- Long-running operations expose progress and terminal settlement.
- Repair actions remain explicit, reviewable, and reversible where possible.

## Quality Attributes

- Progressive disclosure for hobbyist through enterprise use.
- Accessible, localizable, and automation-friendly output.
- Safe stale-state handling and clear degraded operation.
- No mandatory web control plane for local operation.

## Candidate Fit

| Need | Existing or adjacent candidate | Initial disposition | What must be proven |
| ---- | ------------------------------ | ------------------- | ------------------- |
| Local operation | OpenClaw CLI and diagnostics | Adapt | Consistent owner/generation/result projection |
| Managed administration | Control UI and admin project work | Assess | No duplicate canonical state |
| Findings and repair | Doctor patterns | Reuse/adapt | Cross-owner plans remain explicit |
| Discovery | Catalog project | Adapt | Definitions remain inert and owner-attributed |
| Presentation | Localization project | Adapt | Stable keys and safe fallback across channels |

## Cross-Lane Dependencies

- Depends on every lane's projection and evidence contracts.
- Serves people and automation.
- Must not absorb policy, orchestration, or owner persistence.
