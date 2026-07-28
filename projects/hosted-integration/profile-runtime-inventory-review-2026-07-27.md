# Canonical Profile Runtime Inventory Review

Date: 2026-07-27

## Thesis And Deletion Target

Host bundles need a bounded runtime view of their owner-provided readiness
evidence. They do not need a second readiness framework. Delete the duplicated
registry, provider, timeout, retry, cache, and selection primitives from the
older hosted-readiness prototype and reuse the canonical Hosting Profiles
contracts.

## Source Audit

- Canonical Hosting Profiles head: `e9c1988c5e59`.
- Standalone host-bundle source commit: `4a733c416ca`, recreated without
  conflict as composition base `f128c584b9a`.
- A virtual merge of the old readiness PR 165 head `b86df32297c` into the
  canonical profile head produced ten conflicts because both sides define the
  readiness ownership and resolution layer.
- The canonical stack already exposes plugin-owned readiness registration,
  `gateway.readiness.requiredCriteria`,
  `gateway.readiness.advisoryCriteria`, and caller-selected resolution.

## Bounded Evidence Slice

Fork draft PR 175, head `6e51687283c`, adds only:

- an optional canonical same-plugin readiness criterion reference on a host
  integration declaration;
- a caller-driven immutable runtime inventory that evaluates only referenced
  criteria;
- closed missing-declaration and missing-registration `Unknown` results;
- deterministic `False`, then `Unknown`, then `True` aggregation; and
- isolation between concurrent one-shot inventories, while allowing a stable
  lifecycle owner to inject and reuse a resolver.

It does not register or select criteria, alter readiness defaults, gate startup,
activate plugins, add operator RPCs, or add Status/Doctor policy.

## Comparators

Kubernetes keeps readiness distinct from liveness and uses readiness failure to
remove a Pod from service endpoints rather than restart it. That supports the
same boundary here: the inventory exposes eligibility evidence, while a profile
or operator retains policy authority.

- https://kubernetes.io/docs/concepts/workloads/pods/probes/
- https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/

## Role Review

### Gateway engineer

Reuse the canonical resolver and evaluate only caller-selected contribution
criteria. Do not add another global registry or implicit startup gate.

### Power user / operator

A manifest link is descriptive, not a requirement. Explicit profile selection
continues to decide whether a criterion is required or advisory.

### Security reviewer

Only canonical same-plugin criterion identifiers are accepted. Inventory output
uses the canonical condition shape but omits profile-only subject/requirement
metadata, and it does not widen owner messages, identity, or activation.

## Verification

- 33 focused Vitest assertions passed.
- Direct Oxlint passed with zero warnings or errors.
- Core TypeScript checking passed.
- Full `pnpm build` passed, including SDK export and UI gates.
- `git diff --check` passed.
- Final Codex review found no actionable correctness defects. An earlier
  concurrency finding was fixed and retained as a regression test.

## Next Evidence

Re-compose Lobster's five-service readiness adopter against PR 175 and the
canonical profile stack. Keep that as a fork-only proof; no OpenClaw issue or
upstream PR is authorized yet.
