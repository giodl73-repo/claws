# Claws RFC Refresh Role Review

Date: 2026-08-09

Reviewed exact heads:

- RFC #48: `9415755da2a7df47b7c5c89d4596501d07467dca`
- RFC #52: `04e7a7186147bc08889b2d790ab62d4951c561c9`
- RFC #56: `bb9cc91f6dc3629266a7d05ba6d7ee461119fd24`

Role panels:

- runtime and maintainability: `gateway-eng`, `lorant-reviewer`;
- author and operator experience: `skill-author`, `power-user`,
  `clawpilot-product`;
- trust and release evidence: `ciso`, `compliance`, `claws-release-eng`.

## Actionable Findings

### 1. Shared plugin cleanup is unsafe in RFC #48

Severity: high.

`rfcs/0016/claw-package-v1-spec.md` still allows `remove-if-unused` to remove a
globally installed plugin when no known owner remains. Claw provenance cannot
enumerate manually configured agents that may still use that plugin. RFC #52
already contains the safer rule: exclude global plugins from bulk cleanup and
allow only explicitly selected canonical uninstall with the unknown-use
warning.

Required correction: port the RFC #52 exclusion and warning into RFC #48.

### 2. RFC #48 orders shared requirements after Claw-owned mutation

Severity: medium.

The RFC 0016 lifecycle sequence creates the agent and workspace before installing
plugin dependencies, while the package sidecar requires approved missing shared
requirements to be installed before Claw-owned mutation.

Required correction: resolve and install approved shared host requirements
before agent/workspace creation; keep workspace-owned skill realization in its
appropriate later phase.

### 3. RFC 0016 acceptance status conflicts across the three PRs

Severity: medium.

RFC #48 changes RFC 0016 from `draft` to `accepted`, while RFC #52 still calls
RFC 0016 draft-status and RFC #56 says it must not be accepted before RFC #48
and RFC #52. The combined landing state is internally contradictory.

Required correction: keep RFC 0016 draft until the prerequisite addenda are
accepted, or define one explicit accepted-product-direction state and use it
consistently across all three PRs.

### 4. RFC #48 attributes RFC #56's authoring lifecycle to itself

Severity: low.

RFC #48 lists OpenClaw #117037 create/validate/dev/build as an addendum described
by RFC #48, but those commands are specified by RFC #56.

Required correction: remove #117037 from RFC #48's landed-addenda list or label
it explicitly as the RFC #56 project-lifecycle implementation.

### 5. Acceptance-criterion numbering will collide

Severity: editorial.

RFC #48 and RFC #56 both add acceptance criterion 20 from the same base.
Whichever lands second must renumber its additions.

## Security And Release Triage

The security/release pass proposed mandatory artifact signatures, mandatory
pre-publication dogfood, non-overridable experimental gates, and stronger local
proof embedding. These are not supported as defects in the current RFCs:

- authenticated ClawHub ownership plus exact digest-bound immutable bytes is the
  accepted experimental trust contract; mandatory signing would be a new design;
- the disposable-registry golden proof already validates the exact published
  bytes through clean application without claiming public production release;
- the environment gates are explicit operator-controlled experimental gates,
  not an R5 policy control; and
- RFC implementation plans may cite durable merge commits and proof digests
  without embedding repository CI configuration.

No additional security or release blocker was accepted from that pass.

## Verdict

RFC #52 was clean for the reviewed role lenses. The accepted findings were
resolved on 2026-08-09:

- RFC #48 `018297f7cc211382c0a38f302cae371736b19635` excludes global plugins
  from bulk cleanup, warns before selected plugin uninstall, realizes approved
  shared requirements before Claw-owned mutation, restores RFC 0016 to draft,
  and removes the misplaced #117037 attribution.
- RFC #56 `7635e39dcf2b5e1f2d92d01e3df8cc36c2a9420f` renumbers its dependent
  project acceptance criteria after RFC #48's criterion 20.

No accepted role-review finding remains open.
