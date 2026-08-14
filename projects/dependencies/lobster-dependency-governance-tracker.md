# OpenClaw dependency governance baseline and remediation tracker

## Purpose

Maintain the living Microsoft-facing record for the OpenClaw dependency
baseline, prioritized fixes, Lobster product evidence, and the proposed
upstream release dependency feed.

## Latest detailed analysis

- Versioned publication:
  https://microsoft.ghe.com/bic/lobster/tree/openclaw-dependency-governance-analysis/docs/openclaw-dependency-governance
- Reviewed baseline: 2026-08-14
- Published commit: `b7a56037ee04ef7c8a84661bd630920db3ba6239`
- Workbook SHA-256:
  `7b5a00367cce5d9554aa62d36b9dcaf136d897a80e9966215eed20249e7f6a3d`

The versioned Lobster branch contains the canonical workbook, a searchable CSV
with all 2,624 identities, the machine-readable source inventory, Microsoft
control status, evidence notes, and this remediation tracker.

## Baseline

The review covers 2,624 exact dependency and artifact identities across
npm/pnpm, Cargo, Gradle, Swift, Go, Python, release locks, GitHub Actions, and
container inputs.

- 33 High
- 1,707 Moderate
- 878 Low
- 6 Unknown
- 0 Critical

The result is a good prognosis rather than an all-clear: OpenClaw has strong
dependency controls and no Critical crisis, while the remaining risks are
concentrated and have identifiable owners or remediation paths.

## Existing OpenClaw strengths

- security-owner authorization for dependency graph changes;
- Dependabot and minimum-release-age protection;
- frozen and generated lock checks;
- production vulnerability blocking;
- dependency delta, transitive-risk, and ownership reports;
- npm release dependency evidence; and
- signed container SBOM and provenance attestations.

## Remediation workstreams

- [ ] Split the package-only upgrades from closed OpenClaw PR #123513.
- [ ] Handle the WebRTC behavior change as an independently reviewed fix.
- [ ] Handle immutable image references as an independent provenance fix.
- [ ] Add or confirm update coverage for Cargo and isolated release locks:
      OpenClaw #123690 / PR #123694 covers the shipped Linux Cargo graph;
      #123689 now tracks an atomic trusted ClawHub lock-and-pin refresh after
      generic updater PR #123692 was rejected. Draft PR #123722 now adds
      update discovery, atomic pin synchronization, and required drift
      detection plus a no-secret pre-merge proof of the same trusted-publisher
      command and flags used by the release workflow. Release/security-owner
      approval remains required.
- [ ] Make existing dependency ownership and pin checks required for relevant
      changes: OpenClaw #123687 / PR #123695 adds the pin guard to required CI.
- [ ] Add owner, reason, and review/expiry metadata to minimum-release-age
      exclusions: OpenClaw #123688 awaits maintainer confirmation of the
      repository metadata contract.
- [ ] Resolve the remaining High-risk owner decisions and six Unknown evidence
      gaps.
- [ ] Allow the thirteen newly published exact npm versions to complete normal
      Microsoft feed admission, escalating only delayed ingestion.

## Lobster product evidence

- [ ] Complete #8220 so the exact OpenClaw package, final image digest, SBOM,
      CFS result, Component Governance result, and exceptions are tied to one
      Official release record.
- [ ] Establish the baseline and owner-approved rollout needed before making
      unresolved blocking Component Governance alerts fail the build.

## Long-term upstream direction

Propose an append-only OpenClaw dependency evidence feed. Each immutable
release entry should identify source and artifact digests, SBOM and lock
evidence, dependency changes, scanner/policy versions, and withdrawal state.
Lobster can consume the exact entry matching the package it installs and apply
Microsoft-specific policy downstream.

Small OpenClaw hardening changes do not need an RFC. An RFC is warranted only
if maintainers want the dependency feed to become a stable public contract.

## Related

- Product-exact Lobster attestation: #8220
- Closed OpenClaw remediation proof:
  https://github.com/openclaw/openclaw/pull/123513
- Closed mismatched-lock experiment:
  https://microsoft.ghe.com/bic/lobster/pull/8174
