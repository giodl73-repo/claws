# Enterprise Layer Role Review - 2026-08-01

## Scope

Reviewed:

- `enterprise-needs-framework.md`;
- `enterprise-needs-matrix-2026-08-01.md`;
- `enterprise-comparators-2026-08-01.md`;
- `source-audit-credentials-secrets-auth-2026-08-01.md`; and
- `source-audit-workspace-filesystem-2026-08-01.md`;
- `source-audit-privacy-retention-deletion-2026-08-01.md`; and
- `source-audit-resource-governance-2026-08-01.md`; and
- `source-audit-transport-protocol-api-evolution-2026-08-01.md`; and
- `source-audit-supply-chain-artifact-trust-2026-08-01.md`; and
- `source-audit-nodes-devices-pairing-2026-08-01.md`; and
- `source-audit-install-update-release-compatibility-2026-08-01.md`.

Applied `.craft/roles/claws/` lenses:

| Role | Primary tension |
| ---- | --------------- |
| `platform-eng` | Fleet consistency versus workspace autonomy |
| `ciso` | Security assurance versus agent capability |
| `compliance` | Evidence completeness versus operational speed |
| `policy-steward` | Coherent owner evidence versus one-off enforcement |
| `founder` | Community trust versus enterprise capture |
| `power-user` | Operational control versus governance overhead |

## Findings

### 1. Blocking: enterprise criticality cannot be inferred from source maturity

Workspace/filesystem behavior grades 23/A for current local contracts while
enterprise coverage is C2. Credentials/auth grades 19/B while enterprise
coverage is C3.

**Risk**: a mature local feature could be marketed as enterprise-ready without
tenant, retention, network, audit, or fleet semantics.

**Disposition**: accepted. The enterprise matrix scores `E0-E4` criticality and
`C0-C4` enterprise coverage independently from the existing maturity rubric.

### 2. Blocking: network and isolation were missing from the enterprise lens

Identity, data, and operations did not fully capture private endpoints, egress,
service perimeters, remote workspace providers, or data movement.

**Risk**: credentials and DLP could appear complete while runtime traffic still
crosses an uncontrolled boundary.

**Disposition**: accepted. `N` is now a separate enterprise obligation applied
to owner and relationship reviews.

### 3. High: enterprise identity belongs in relationships, not one global ID

Provider attempts, tools, channels, delegated runs, secret providers, and
remote workspaces need principal, workload, credential, tenant, and target
correlation.

**Risk**: a universal identity object would hide which owner authenticates,
authorizes, renews, revokes, or delegates each relationship.

**Disposition**: retain owner-native identities and add explicit principal,
credential generation, binding, controller, completion-owner, network, and
policy relationships.

### 4. High: data governance must attach to every durable owner

Sessions, memory, messages, workspaces, attachments, audit, checkpoints,
backups, exports, and support bundles have different canonical stores and
deletion behavior.

**Risk**: one global retention setting would produce false deletion, legal
hold, residency, or eDiscovery claims.

**Disposition**: require owner-native classification, encryption, retention,
hold, export, deletion, and backup interaction. A central policy may express
requirements and aggregate evidence, not own all data.

### 5. High: evidence must distinguish current state, audit, and telemetry

Readiness and Doctor provide strong current-state/finding patterns, but
telemetry transport is not automatically durable audit evidence.

**Risk**: compliance reports could cite stale, lossy, unsigned, unretained, or
over-redacted observations.

**Disposition**: enterprise evidence must include subject/generation, producing
owner, policy/config generation, time/freshness, scope, integrity, redaction,
retention, and export semantics.

### 6. High: fleet is a management scope, not a new semantic owner

Platform operators need desired/accepted generations, staged rollout, drift,
partial failure, rollback, kill/drain, and mixed-version comparison.

**Risk**: a central fleet service could absorb workspace, configuration,
policy, extension, or runtime semantics.

**Disposition**: reuse owner generations and evidence. Fleet projections and
orchestration coordinate owners but do not redefine their objects.

### 7. Medium: enterprise controls must be optional and removable

Federation, private networking, SIEM, legal hold, fleet administration, and
hosted policy integrations are enterprise needs. They are not required for
simple local operation.

**Risk**: enterprise defaults could make OpenClaw harder to understand,
introduce hosted dependencies, or fragment the community ecosystem.

**Disposition**: enterprise bindings remain optional adapters and policies.
Core owner contracts should remain locally operable and useful without them.

### 8. Medium: governance must replace manual work

Power users and operators already maintain upgrade scripts, security checks,
backups, and incident evidence.

**Risk**: policy, attestation, or admin workflows could add ceremony without
removing scripts or reducing incidents.

**Disposition**: every enterprise extension needs a named deletion target:
manual secret rotation, custom drift scripts, hand-built audit packages,
workspace inventory spreadsheets, or ad hoc support collection.

### 9. Blocking: deletion must report retained and externally controlled copies

The CISO and compliance lenses reject a success-shaped delete result that only
removed the local canonical object. Holds, audit records, indexes, exports,
backups, attachments, provider-native messages, and support bundles may remain
under different authorities.

**Risk**: legal discovery and privacy responses could make contradictory claims
about the same subject.

**Disposition**: deletion is an owner-native operation with a cross-owner
result of complete, partial, blocked, deferred, or externally controlled.
Evidence records retained exceptions without retaining prohibited content.

### 10. High: resource governance must preserve runtime enforcement owners

The Gateway and power-user lenses reject a synchronous global policy service
on every token, queue, tool, and process path. The platform lens still requires
tenant/project quotas, fleet capacity, fairness, and kill/drain evidence.

**Risk**: central governance could add latency and failure coupling while still
missing local safety semantics.

**Disposition**: configuration expresses scoped policy; the real lane, queue,
scheduler, provider, disk, process, or host owner enforces it. Decisions and
usage are projected through portable evidence rather than delegated to one
global budget manager.

### 11. High: usage estimates are not chargeback records

Current token and cost reporting is useful operational evidence, but the
compliance and platform lenses require pricing generation, tenant/project
allocation, corrections, provider reconciliation, and immutable accounting
periods before finance use.

**Risk**: dashboards could present estimates as invoice-grade truth.

**Disposition**: label observations as estimated or reconciled and keep
chargeback as a separate projection/ledger contract.

### 12. Medium: local operation must not require enterprise lifecycle services

The founder and power-user lenses require privacy and resource controls to
remain understandable and removable for personal operation.

**Risk**: mandatory enterprise identity, quota, retention, or fleet services
would turn owner-native local behavior into a hosted dependency.

**Disposition**: retain safe local defaults and owner controls. Enterprise
policy, holds, allocation, and fleet aggregation are optional bindings around
those owners.

### 13. Blocking: transport retry cannot imply semantic replay safety

The Gateway and CISO lenses reject reconnect or transport retry that silently
replays a tool, provider, channel, node, approval, or host operation. ACP can
replay retained transcript events because its owner defines that behavior;
external side effects have different certainty and idempotency.

**Risk**: connection loss could duplicate side effects while the protocol
reports recovery.

**Disposition**: every streamed or side-effecting operation declares dedupe,
resume, replay, cancellation, dispatch certainty, and late-result behavior.
Reconnect creates a new transport incarnation and never grants replay safety.

### 14. High: capability discovery is not authorization

Gateway connect already separates advertised capabilities from granted scope.
The platform and security lenses require that distinction across nodes, ACP,
MCP, channels, providers, and host adapters.

**Risk**: a peer could treat protocol support as permission to invoke a
capability.

**Disposition**: negotiate version and capability first, then apply
owner-native principal, credential, policy, network, and approval checks at the
real method or operation boundary.

### 15. High: compatibility needs release-bound evidence, not one endpoint

The platform lens needs mixed-version rollout and rollback proof. The Gateway
and founder lenses reject a central `/compatible` evaluator or universal
hosted schema that would stabilize accidental dependencies.

**Risk**: compatibility becomes either a false boolean or an expanding
integration envelope.

**Disposition**: publish artifact protocol/capability declarations, run
contract-specific conformance suites, observe old-path use, and retain explicit
deprecation/removal blockers.

### 16. Blocking: source precedence and registry moderation are not trust

Workspace, config, global, bundled, npm, git, and ClawHub sources have useful
selection and moderation metadata. The CISO and policy-steward lenses reject
using those facts as proof of publisher identity, build origin, dependency
integrity, or organization approval.

**Risk**: a higher-precedence or catalog-clean artifact could bypass enterprise
admission without signed provenance or current policy evidence.

**Disposition**: bind immutable digest identity to publisher/build provenance,
signature/transparency, dependency/SBOM, scan/moderation, and policy evidence.
Keep precedence as a separate definition-selection rule.

### 17. High: install, activation, and runtime authority must remain separate

The Gateway and founder lenses reject a marketplace or installer becoming the
semantic owner of plugins, skills, tools, providers, Claws, or host bundles.

**Risk**: installation success could be mistaken for authorization, readiness,
or permission to expose capabilities.

**Disposition**: installation commits owned local state; configuration and the
runtime registry select activation; semantic owners enforce operation policy.
Existing admitted runs retain their pinned generation until drain/replacement.

### 18. High: revocation requires fleet convergence without erasing evidence

The platform and compliance lenses require emergency disable, installed
inventory, late/offline member handling, and proof of convergence. Sigstore and
certificate precedents show that revocation invalidates trust without deleting
historical attestations.

**Risk**: a revoked publisher or artifact remains active on disconnected or
stale fleet members, or evidence disappears during cleanup.

**Disposition**: define portable revocation scope/generation, preserve
provenance and quarantine evidence, project installed-to-active generations,
and report partial, stale, blocked, and converged fleet state.

### 19. Blocking: capability advertisement cannot grant node authority

Nodes advertise commands, permissions, tools, skills, versions, and health.
The CISO and Gateway lenses require pairing, role/scopes, command policy,
operator scope, plugin policy, and approval to remain independent gates.

**Risk**: a compromised or buggy node could widen its own callable surface by
advertising a capability.

**Disposition**: the effective surface is the intersection of declared
capabilities and current pairing, config, policy, approval, availability, and
connection state.

### 20. High: cancellation and disconnect need certainty, not success-shaped cleanup

OpenClaw settles pending invokes and can send cancellation, but a Gateway
timeout or disconnect cannot prove remote external work stopped or was undone.

**Risk**: operators retry an uncertain command and duplicate side effects.

**Disposition**: preserve invocation ID, connection incarnation, cancellation
capability, acknowledgement level, and side-effect certainty. No transparent
replay occurs across reconnect.

### 21. High: a host or workload peer is not a paired user device

The internal duplex-transport analogue shows that node invocation machinery is
reusable, while node pairing, wake, device permissions, and user approval are
domain-specific.

**Risk**: hosts gain device-like trust or device credentials acquire
infrastructure authority.

**Disposition**: extract/reuse bounded internal correlation, deadlines,
connection fencing, and settlement; define separate public identity,
credential, capability, and policy contracts for host/runtime peers.

### 22. Blocking: release identity must not collapse into channel or fleet intent

OpenClaw correctly distinguishes source SHA, signed tag, package version,
tarball/image digest, dist-tag, installed root, and running version.

**Risk**: an administrator assigns `latest` or a fleet alias and later cannot
prove which bytes were approved, installed, active, or rolled back.

**Disposition**: bind rollout intent to an immutable release-component
manifest. Channels and rings remain mutable projections with their own
generation, owner, and evidence.

### 23. Blocking: code rollback is not state rollback

Package swaps and git checkouts can restore code, while config, database,
plugin, and external migrations have independent recovery semantics.

**Risk**: automatic rollback starts older code against newer state, producing a
second outage or hiding lost post-update writes.

**Disposition**: every recovery result reports candidate, package/source,
runtime, component, config/data, and external-effect layers separately.
Unknown or forward-only state blocks automatic code rollback unless the older
runtime's compatibility is proven.

### 24. High: fleet rollout should compose local update ownership, not replace it

The platform role needs rings, windows, holds, pause/abort, partial retries,
drift, and convergence. The Gateway, founder, and new-hire roles require local
`openclaw update`, package managers, Doctor, service managers, and readiness to
remain authoritative.

**Risk**: a central controller directly mutates roots or databases and bypasses
the local safety contracts that already handle platform-specific failure.

**Disposition**: define optional rollout intent and convergence evidence.
Controllers submit bounded local plans, consume structured outcomes, and never
bypass incompatibility or ownership refusal.

### 25. High: publication proof and deployment proof have different retention

Release workflows bind exact source, package bytes, provenance, validation,
registry readback, and platform artifacts. Operators additionally need
per-target plan, migration, activation, readiness, exception, and rollback
evidence.

**Risk**: a green release workflow is presented as proof that a tenant fleet
successfully and safely converged.

**Disposition**: retain release proof and rollout evidence as linked but
separate artifact families, including partial, held, exempted, stale, unknown,
and rolled-back targets.

## Result

The four-layer model is suitable for enterprise validation after adding network
and isolation. The validated enterprise shape is:

```text
owner-native objects and lifecycles
+ explicit identity, credential, tenant, network, and policy relationships
+ retained owner evidence
+ role-specific fleet/admin/audit projections
```

The first major owner-domain audit pass validates the four-layer model. The
cross-facility relationship model now identifies the reusable seams. The next
proof should implement the memory corpus lifecycle evidence slice, then test
the evidence header against authorized action and release activation.
