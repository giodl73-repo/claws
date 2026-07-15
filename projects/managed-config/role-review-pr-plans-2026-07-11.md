# Managed Configuration PR-Plan Role Review

Date: 2026-07-11

Reviewed:

- `pr-plan.md`
- PR plans 0-5 under `projects/managed-config/prs/`
- RFC 0019 implementation sequence

## Findings

### P0: Source integrity has no owning PR

Roles: aether-adapter-eng, ciso, compliance, platform-eng

PR 3 resolves opaque sources and records source identity, but it does not own
expected-digest verification, verification ordering, or a tamper failure. RFC
0019 describes an optional expected digest, so the implementation plan needs a
hard contract: verify the resolved bytes/document identity before parsing or
admission, reject a mismatch, publish nothing, and distinguish missing,
unverified, and mismatched integrity in telemetry. A host callback must not be
able to claim a digest was checked without returning verifiable evidence.

Required plan change:

- Put source-integrity verification and proof in PR 3.
- Define fail-closed behavior when an expected digest is present.
- Cover mismatch, source rotation, and redacted telemetry.

### P0: Configured layered startup must explicitly fail closed

Roles: aether-runtime-eng, gateway-eng, lobster-container-eng, lorant-reviewer

PR 3 says failures publish nothing, but does not state whether startup falls
back to the ordinary single-config path. Once an ordered source list is
explicitly configured, fallback would bypass authority. The process must fail
readiness/startup for the configured candidate; only absence of the feature
selects the legacy path. Reload failure must retain the previous complete
snapshot without treating it as the new candidate.

Required plan change:

- Distinguish feature absent, configured startup failure, and reload failure.
- Add readiness and container-health proof for each state.

### P1: PR 2 promises real comparators but names no initial fields

Roles: policy-steward, founder, gateway-eng, lorant-reviewer

The comparator plan correctly rejects an empty framework, but “at least one
real field” still allows the key product decision to slip into implementation.
The plan should name initial audit targets now. The strongest current candidates
are the canonical tool-policy allow and deny set paths: allow as an allow-set
ceiling and deny as a deny-set floor. The audit may reject or narrow these
paths, but PR 2 must not merge without replacing them with equally concrete
schema-owned fields and an operational use case.

Required plan change:

- Name initial target paths and their intended comparator classes.
- Require field-owner approval for the safety ordering.
- Include nested/scope variants or explicitly exclude them.

### P1: PR 4 write durability is underspecified

Roles: gateway-eng, platform-eng, power-user, m365-connector-eng

In-memory recomposition is necessary but not sufficient. The plan needs one
atomic persistence contract covering source generation, authority-chain
generation, file replacement, reload, and failure recovery. Otherwise a write
can pass preflight against one generation and persist after either the source
or an earlier layer rotates.

Required plan change:

- Require compare-and-swap on both target-source and authority-chain identity.
- Use the existing atomic config write primitive.
- Prove no partial file, no partial activation, and actionable retry findings.

### P1: Release and mixed-version behavior needs an owner before Lobster

Roles: claws-release-eng, platform-eng, lobster-container-eng, repo-steward

PR 5 gates on a minimum OpenClaw version, but PRs 2-4 do not define how source
or comparator versions are identified and rejected. A newer deployment source
must not silently run on an older OpenClaw that ignores authority metadata.

Required plan change:

- PR 2 owns comparator/schema version incompatibility findings.
- PR 3 owns source-contract capability/version preflight.
- PR 5 proves packaged-artifact install and upgrade, not workspace-only tests.

### P1: Security and compliance evidence is too generic

Roles: ciso, compliance, policy-steward

PR 4 mentions redaction and identities but not the evidence needed to explain a
decision later. Inspection should include stable candidate/authority identity,
source identities, controlling layer, comparator class, reason code, and
activation generation without exposing secret values or host paths.

Required plan change:

- Define the minimum audit record and redaction rules in PR 4.
- Prove the record survives restart/reload diagnostics.
- Keep Policy an evidence consumer, not a second settings owner.

### P1: PR 1 risks landing a parallel subsystem with no integration owner

Roles: founder, claws-repo-steward, gateway-eng

A no-call-site core is reviewable, but six new standalone files can become an
orphaned alternate config runtime. The plan should require use of existing
config types, validators, materialization, blocked-key helpers, and finding
conventions, plus a clear deletion/consolidation step when PR 3 integrates it.

Required plan change:

- Add an API/LOC budget and identify reused config primitives.
- Reject duplicate schema or materialization logic.
- State which prototype adapters disappear during PR 3 integration.

### P2: Operator UX needs actionable errors, not only structured data

Roles: new-hire, power-user, cowork-ux-eng

PR 4 exposes findings but does not require a user-facing explanation. Operators
need to see which source controls the field, whether they can edit that source,
and the least-destructive remediation. Empty-layer advisories must not look like
startup failures.

Required plan change:

- Add CLI/status examples for conflict, integrity failure, and empty layer.
- Reuse existing config inspection conventions.
- Require remediation text without introducing a new management UI.

### P2: Lobster deletion proof should include boot ordering and packaged proof

Roles: lobster-container-eng, claws-release-eng, power-user

PR 5 has good behavioral coverage but should explicitly prove source material
exists before Gateway activation, readiness remains false until publication,
and the supported packaged OpenClaw artifact is used. Workspace tests alone do
not prove the container upgrade path.

Required plan change:

- Add container boot-order/readiness assertions.
- Test the installed/package artifact at the minimum supported version.
- Record rollback as a version-pair rollback, never a bypass flag.

## Role verdicts

- Founder: **Revise.** Strong core thesis; needs tighter upstream-sized PR 1 and
  named comparator fields.
- Gateway engineer: **Revise.** Activation ownership and write atomicity need
  explicit existing hooks.
- Policy steward: **Revise.** Closed comparator model is sound; initial field
  assignments and evidence contract are missing.
- CISO/compliance: **Block until P0 integrity is owned.** Authority without
  source integrity can faithfully enforce a tampered document.
- Platform/release: **Revise.** Mixed-version and packaged upgrade proof need
  owners before host migration.
- Lobster container engineer: **Revise.** Deletion target is correct; boot and
  readiness proof must be explicit.
- Power user/new hire/UX: **Revise.** Feature invisibility is good; failures need
  actionable explanations and recovery paths.
- Repo steward/reviewer: **Revise.** Sequence is reviewable, but consolidation,
  API budget, and cross-PR dependency gates must be written down.
- Aether and connector roles: **No direct implementation dependency**, but
  their fail-closed, integrity, idempotency, and decision-evidence requirements
  reveal real contract gaps above.

## What is already strong

- Generic recursive model with no special layer roles.
- Exact authored-value authority as the default.
- Bounded comparators are closed and schema-owned.
- Feature absence preserves current behavior.
- Activation is candidate-atomic.
- Writes reuse existing persistence surfaces rather than creating a controller.
- Lobster has a concrete deletion target rather than permanent dual machinery.
- Each major concern has its own PR instead of one cross-repo mega-change.

## Recommended disposition

Accept the five-implementation-PR sequence, but revise the plans before starting
PR 1. P0 integrity and fail-closed startup belong in PR 3; named comparator
fields belong in PR 2; atomic writes/evidence belong in PR 4; packaged boot and
deletion proof belong in PR 5.

## Resolution

All accepted findings were incorporated into PR plans 1-5 on 2026-07-11:

- PR 1 now has API/LOC, reuse, and consolidation constraints.
- PR 2 names tool allow/deny audit targets, field-owner approval, and
  mixed-version proof.
- PR 3 owns integrity verification, source-contract versioning, fail-closed
  startup, reload preservation, and readiness proof.
- PR 4 owns dual-generation CAS, atomic persistence, audit records, redaction,
  and actionable operator output.
- PR 5 owns Scout/tenant/operator sources, capability preflight, boot ordering,
  packaged-artifact proof, deletion, and version-pair rollback.
