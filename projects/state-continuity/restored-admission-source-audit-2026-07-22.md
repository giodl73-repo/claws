# RFC 0013 Restored-Admission Source Audit

## Thesis and deletion target

An accepted recovery point is safe to serve only after its exact bytes have
been restored into fresh canonical targets and every required owner has
reconciled while Gateway work admission remains closed. This slice replaces,
rather than revives, the old broad E6 lifecycle prototype: no continuity
runtime hierarchy, generic hook registry, public CAPE surface, provider bus, or
OpenClaw-owned wake scheduler is required.

## Current-source seams

- RFC 0013 already supplies verified global and selected-agent SQLite capture,
  verification, and fresh-target restore. Restored admission composes those
  primitives and does not add another database copier.
- Canonical cron state lives in global SQLite, and the existing cron service
  owns semantic startup reconciliation. The restored path starts and checks
  that owner instead of reconstructing scheduler state itself.
- Gateway already has a work-admission primitive and startup readiness path.
  The private restored path closes admission before database preflight and
  opens it only after exact recovery-point readiness.
- Final capture records a closed owner-selected component set. V1 cannot prove
  external or reconstructed obligations, so those obligations hold rather than
  manufacturing owner evidence.

## Reuse, adaptation, and exclusions

- Reuse RFC 0013 aggregate verification, owner snapshot providers, Gateway
  admission, cron reconciliation, and readiness.
- Adapt the existing durable-intent/exact-replay pattern to one private
  restored-recovery-point journal and startup descriptor.
- Exclude host acceptance storage, ingress retention, compute placement,
  source destruction, wake registration, and lifecycle scheduling. Those
  remain host responsibilities described by the RFC.

## Role review

- Runtime owner: exact selected-agent inventory, manifest identities, artifact
  sizes, and acceptance identity are reverified before any target is created.
- Operator: ordinary startup is unchanged; activation requires the private
  `OPENCLAW_RFC0013_RESTORED_ADMISSION_FILE` descriptor supplied by the host.
- Security: input is strict and bounded, targets must be fresh and canonical,
  conflicting or partial replay quarantines, and no credential values enter
  manifests or journals.
- Maintainer: the new path is dynamically imported only when selected, has no
  public extension point, and delegates ownership reconciliation to existing
  services.

## Disproof tests

Tests cover tampered aggregate/owner bytes before mutation, non-fresh targets,
unsupported obligations, exact response-loss replay, changed-request and
conflicting-result quarantine, admission ordering before database open,
required sidecar forcing, cron/owner readiness failure, one-time admission,
ordinary-startup import isolation, and strict CLI registration.

## Evidence

- Ready for review: [openclaw/openclaw#112896](https://github.com/openclaw/openclaw/pull/112896)
- Branch/head: `user/giodl/rfc-0013-restored-admission` at `61a4e44061a`
- Incremental size: 1,411 additions, 4 deletions, 11 files
- Safe Linux proof: Ubuntu 24.04 WSL, Node 24.15.0, built-in SQLite 3.51.3.
  The exact current-main combined head passed both Knip audits and 102 focused
  snapshot/Gateway/CLI/command tests. Production and core-test typechecks passed
  before the upstream rebase; the post-rebase local production typecheck was
  blocked only by an interrupted dependency refresh leaving
  `libphonenumber-js` unlinked, so GitHub CI owns the clean-install result.
- Remote proof gap: Crabbox access auth and Blacksmith organization auth are
  absent; no remote provider/run ID exists, and none is claimed.
- Review: Codex review found and we fixed owner-manifest verification binding
  and canonical dependency ordering at the base. Exact-head ClawSweeper runs
  completed successfully with `keep_open`; durable comments remained stuck on
  their start placeholders after workflow completion.
