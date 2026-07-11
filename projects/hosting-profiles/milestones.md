# Hosted OpenClaw Conformance Milestones

## Framing

The hosted layer is not an alternative to OCC or remote AgentHarness. It is the
conformance layer that lets Lobster host today's OpenClaw cleanly while
OpenClaw grows toward a stronger control-plane/data-plane model.

The key testing model:

> Given a hosted envelope, OpenClaw should be able to validate whether it can
> run safely under those parameters, report precise conformance failures, and
> execute without Lobster patching private runtime behavior.

That changes the relationship:

- Today: Lobster patches config/env/hooks until OpenClaw behaves correctly in a
  hosted enterprise environment.
- Target: Lobster passes a typed hosted envelope; OpenClaw owns validation,
  defaults, conformance tests, stable diagnostics, and runtime semantics.

This makes OpenClaw more self-controlling, not less. The host still decides
tenant rollout, storage backend, auth provider, telemetry sink, and admin UX.
OpenClaw decides what a valid hosted runtime means.

## Milestone 0 - Name The As-Is Layer

Goal: document the implicit Lobster/OpenClaw boundary as `hosted-openclaw/v0`.

Deliverables:

- Inventory current env vars, headers, start-body fields, config fragments,
  proxy-pipe states, persistence paths, and telemetry events.
- Classify each item as upstream contract, Lobster host policy, plugin feature,
  compatibility layer, temporary workaround, or suspect.
- Add conformance gaps for warm-container env restore, state path durability,
  Gateway auth posture, and config overlay semantics.

Outcome:

- No behavior change.
- Broad baked-config PRs become easier to challenge because every change must
  map to a named bucket.

## Milestone 1 - Hosted Envelope Contract

Goal: replace "random env plus baked config" with a typed hosted runtime
envelope.

Deliverables:

- Draft OpenClaw RFC for `hosted-openclaw` compatibility profile.
- Place the first OpenClaw implementation in existing runtime surfaces:
  `src/config` for schema/validation, `src/gateway` for hosted Gateway profile,
  `src/plugin-sdk` for plugin-facing contract types, and existing state/session
  modules for persistence semantics.
- Define envelope sections:
  - identity/profile
  - gateway/auth/trusted proxy
  - brokered egress/proxy-pipe
  - persistence/state paths
  - policy/restrictions
  - plugin selection
  - telemetry/diagnostics
  - lifecycle/readiness/drain
- Define compatibility versioning and validation errors.

Outcome:

- Lobster can keep using the adapter/start path, but each value has a semantic
  place.
- OpenClaw can expose a `doctor`/validation path for hosted envelope
  conformance.

## Milestone 2 - Gateway Hosted Profile

Goal: upstream Gateway behavior that Lobster currently encodes through local
auth and Control UI config.

Deliverables:

- Trusted-proxy auth mode.
- Allowed-origin and direct-caller fallback semantics.
- Local relay/loopback-only posture.
- Node command allowlist and approval protocol semantics.
- Conformance tests for direct local caller, trusted proxy caller, bad origin,
  missing identity, and disabled node command.

Outcome:

- Lobster selects a hosted Gateway profile instead of maintaining broad Gateway
  config patches.
- OpenClaw owns the behavior and tests.

## Milestone 3 - Plugin-First Feature Selection

Goal: move product features out of broad baked config and into plugin-owned
manifests plus host-selected enablement.

Deliverables:

- Plugin manifest fields for hosted enablement, required tools, skills,
  config, policy asks, telemetry hooks, and state paths.
- Host selection semantics: enabled, disabled, required, optional, denied.
- Migration map for WorkIQ, WebIQ, code mode, diagnostics, and Teams plugin.

Outcome:

- Lobster decides which plugins are available per tenant/ring/user.
- Plugins own their own config and policy requirements.
- OpenClaw can validate plugin compatibility before Gateway start.

## Milestone 4 - State And Persistence Contract

Goal: make OpenClaw local state semantics explicit so Lobster's Graph/SPO/git
store is a host implementation, not a semantic fork.

Deliverables:

- Path durability table for workspace, OpenClaw home config, memory, plugin
  state, sessions, transcripts, and snapshots.
- Restore-before-start and checkpoint semantics.
- Single-writer requirement and lease expectations.
- Stable restore/checkpoint failure codes.
- Snapshot/backup primitive shape that can later align with OCC-managed cells.

Outcome:

- Lobster persistence remains Microsoft-specific, but OpenClaw owns what must
  persist and when it is safe to checkpoint.
- Memory and session restore ambiguities become testable.

## Milestone 5 - Policy And Evidence Categories

Goal: map hosted controls into durable OpenClaw policy categories rather than a
parallel Lobster settings system.

Deliverables:

- Categories for gateway/auth, model/provider routing, tools/node commands,
  plugins/skills, network/proxy-pipe, storage/persistence, diagnostics/audit.
- Evidence extraction from OpenClaw settings and hosted envelope.
- Runtime enforcement point per category.
- Fail-open/configurable/fail-closed posture per risk level.
- Stable audit record fields.

Outcome:

- Lobster can compile tenant policy into OpenClaw policy inputs.
- OpenClaw can prove what governed a runtime decision.

## Milestone 6 - Hosted Conformance Suite

Goal: make `hosted-openclaw` the repeatable test model for enterprise-hosted
OpenClaw.

Deliverables:

- Golden hosted envelopes for common profiles:
  - local dev host
  - Lobster trusted-proxy/brokered-egress host
  - no-persistence ephemeral host
  - strict enterprise host
- Conformance tests:
  - envelope validation
  - Gateway auth/profile behavior
  - proxy-pipe required/fail-closed behavior
  - plugin selection and policy asks
  - state restore/checkpoint
  - telemetry event emission
  - drain/readiness behavior
- Compatibility matrix by OpenClaw release.

Outcome:

- Lobster can wait for upstream releases with confidence because the upstream
  conformance suite covers the hosted behavior Lobster depends on.
- The team stops fighting OpenClaw through patches and starts pushing failing
  conformance cases upstream.

## Milestone 7 - OCC And AgentHarness Alignment

Goal: keep the layer compatible with future OCC and remote AgentHarness work
without forcing Lobster to wait for them.

Deliverables:

- Map OCC resources to hosted envelope fields:
  - Agent -> identity/profile/plugins/policy
  - Channel -> Gateway/channel ingress profile
  - Cell -> lifecycle/readiness/persistence
  - SandboxPolicy -> tools/network/exec restrictions
  - Budget -> quotas and model/provider limits
  - Plugin -> plugin selection and policy asks
- Map AgentHarness event protocol to runtime execution only:
  assistant deltas, tool calls/results, approvals, patches, terminal state,
  cancellation, session events.
- Explicit non-overlap rule: hosted envelope configures execution; AgentHarness
  carries execution events.

Outcome:

- OCC can later compile declarative resources into the hosted envelope.
- AgentHarness can take over the execution data plane without inheriting
  Lobster config/env details.

## Milestone 8 - Shrink The Lobster Layer

Goal: remove Lobster-only patches as upstream contracts land.

Deliverables:

- Track each broad baked config patch to one of:
  - upstreamed contract
  - plugin-owned feature
  - Lobster host policy
  - deleted workaround
- Replace config fragments with hosted profile selection where possible.
- Replace env var scattering with envelope generation.
- Replace ad hoc telemetry dependencies with stable OpenClaw diagnostics.

Outcome:

- Lobster remains the enterprise host.
- OpenClaw remains the runtime.
- The boundary is smaller, tested, and release-aligned.
