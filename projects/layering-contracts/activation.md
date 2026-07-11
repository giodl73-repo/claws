# Runtime Activation

## Disposition

Runtime Activation remains a useful classification area, but it is not a
separate contract initiative or host probe. Startup-critical activation
observations should contribute to the existing readiness result. Broader
desired-versus-effective configuration drift belongs in status and future
control-plane reconciliation work.

The current leading configuration hypothesis is two authorities over the same
OpenClaw schema: a sparse read-only host document claims fields by presence,
while the operator controls undeclared fields. See
`inventory/host-operator-config-fit-2026-07-10.md`. This is composition and
provenance, not a `/converged` probe.

This hypothesis is now tracked as the scoped Managed Configuration deliverable
in `managed-configuration-deliverable.md`.

## Question

How does host intent become one accepted, inspectable OpenClaw runtime
configuration without creating a parallel hosted configuration tree?

## Scope

- Config schema, include, overlay, merge, reset, and precedence semantics.
- Effective-config identity and provenance.
- Plugin activation, dependencies, declarations, and state ownership.
- Tool, node-command, approval, and restriction materialization.
- Startup validation and stable rejection reasons.
- Hosting-profile selection as one input to normal OpenClaw configuration.

## Ownership

OpenClaw owns portable configuration and activation semantics. Lobster chooses
tenant values, bundles, restrictions, and rollout rings. OCC may later compile
its Agent, Plugin, Channel, Budget, and SandboxPolicy resources into the same
OpenClaw inputs.

## Boundary

This area configures execution. It does not carry assistant deltas, tool calls,
approvals, patches, or other AgentHarness execution frames. It also does not
replace existing OpenClaw config sections with a Lobster-shaped envelope.

## Readiness Integration

Candidate startup-critical conditions include:

- `ConfigResolved`
- `RequiredPluginsActivated`
- `RequiredSecretsAvailable`
- `ModelRoutingResolved`
- `HostingProfileApplied`

These names are illustrative until checked against RFC 33 and current OpenClaw
status fields. Readiness must not become a validator for every configuration
value. Only observations required to serve work safely should affect the ready
decision.

No `/converged` endpoint is proposed. During startup, activation convergence is
already part of readiness. A future OCC or Lobster reconciler may need
desired-versus-effective generations, but that is status/control-plane evidence
rather than another container probe.

## Audit Questions

- Which baked Lobster fragments depend on undocumented merge or reset behavior?
- Which values are image-time, process-time, per-start, or tenant-sticky?
- Can OpenClaw report the effective value and provenance of every managed field?
- Which product flags should instead be plugin-owned declarations?
- Where can current OpenClaw validation be extended instead of adding a new API?

## Status

Fold startup-critical findings into Readiness and Hosting Profiles where they
fit its accepted condition/provider model. Keep config provenance and dynamic
reconciliation as inventory until a narrow missing OpenClaw primitive is proven.
