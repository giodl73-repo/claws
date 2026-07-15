# Bundle-Centered Architecture Role Review

## Scope

Review the final architecture:

```text
central host integration bundle registration
  -> typed references from owner config
  -> owner validation, activation, and generation fencing
  -> owner readiness evidence
  -> Hosting Profile required/advisory criteria
  -> readiness, status, and Doctor
  -> native carrier or narrow provider-dispatch reverse carrier
```

This review supersedes composition-root and multipurpose-carrier assumptions in
the earlier overarching role review.

## OpenClaw Runtime Owner

The model preserves semantic ownership and hot-path clarity. Gateway, Channel,
provider request, secrets, publication, and telemetry each retain their own
configuration, validation, activation, failures, and generation.

Required conditions:

- the bundle contributes implementations but cannot activate them globally;
- owner references fail explicitly when registration is missing;
- traffic policy and dispatcher readiness remain independent criteria; and
- transient dispatcher saturation reports overload and `Degraded` status
  without making readiness flap.

**Verdict: proceed.**

## Lobster And Fleet Operator

The bundle preserves ProxyPipe's useful packaging and discoverability without
preserving its semantic frame union. `lobster/managed` expresses the deployment
contract while status and Doctor expose the assembled result.

Required conditions:

- status identifies bundle version, owner generation, host bundle generation,
  carrier incarnation, provenance, and migration authority;
- a host bundle rollout requires re-admission but does not silently advance
  owner configuration;
- one unavailable required owner binding makes the workload non-ready; and
- disabling the bundle produces structured failures for every selected
  Lobster implementation.

**Verdict: proceed.**

## Security And Compliance

Typed registrations and owner-local references preserve least privilege better
than a universal host method registry. The reverse dispatcher remains the only
new material trust boundary.

Required conditions:

- owner binding generation fences side effects;
- host bundle generation fences the admitted implementation deployment;
- the dispatcher may observe credentials in prepared protected headers but has
  no authority to resolve, mint, widen, or reuse secret references;
- credentials remain scoped, short-lived where possible, and redacted from
  operational output; and
- cancellation is advisory, with dispatch certainty governing retry safety.

**Verdict: proceed with these constraints as normative.**

## Plugin And Ecosystem Maintainer

The bundle is additive registration, not a second plugin framework. Existing
owner registries and Hosting Profiles are the extension model.

Required conditions:

- add only missing owner-specific contribution types;
- keep interface versions and conformance with semantic owners;
- do not expose the bundle as an arbitrary invocation API; and
- keep local implementations valid and testable without Lobster.

**Verdict: proceed.**

## Skeptical Simplicity Reviewer

The final design is smaller than both ProxyPipe and the earlier composition-root
proposal:

- one package declares implementations;
- owner config selects them;
- Hosting Profiles declares operational requirements;
- status and Doctor explain the result; and
- only provider dispatch receives a new reverse carrier.

No global activation DAG, universal dependency-injection container,
multipurpose carrier, or normalized semantic envelope is justified.

**Verdict: proceed.**

## Final Decision

The architecture is coherent and ready for bounded evidence slices. Remaining
questions are implementation-boundary questions, not reasons to reopen the
overall model:

- exact dispatcher handoff relative to redirect and remote DNS/SSRF checks;
- credential-slot semantics;
- exact reverse WebSocket or stream realization; and
- the first owner-specific registry additions.

No production implementation or upstream submission is authorized by this
review.
