# OpenClaw Design Area Scorecard - 2026-08-01

## Scope

This is a first portfolio assessment using `assessment-rubric.md`. It grades
the maturity of the available design and contract evidence in `claws-hapi`.
It is not yet a complete current-head audit of every OpenClaw implementation
path.

## Summary

The portfolio is strongest around the host/runtime boundary:

- readiness and hosting profiles;
- managed configuration and activation;
- hosted integration;
- state continuity;
- Doctor;
- localization; and
- owner-shaped operational signals.

Source-audit passes now cover the central agent data path:

- agent execution;
- configuration activation; and
- messaging and channel delivery;
- provider/model routing;
- tools and MCP;
- session continuity, context assembly, and memory; and
- delegated execution;
- credentials, secrets, and auth profiles;
- workspace and filesystem ownership;
- privacy, retention, export, and deletion; and
- resource governance; and
- transport, protocol, and API evolution; and
- supply-chain and artifact trust; and
- nodes, devices, pairing, and remote capabilities; and
- install, update, release, and compatibility.

The major owner-domain audit pass is complete. The largest remaining work is
cross-facility relationship modeling and targeted enterprise contract gaps.

The notebook can now explain the canonical route from admitted message through
session, run, attempt, tool calls, transcript, terminal outcome, and channel
delivery at a first-pass level, including provider fallback, context
construction, memory projection, and child execution. The next work should map
authority and retention across those mature owners rather than introduce
another central runtime framework.

## Scorecard

Scores are `O/M/C/S/E/X`, each out of 4.

| Design area | Scores | Total | Grade | Confidence | Primary action |
| ----------- | ------ | ----- | ----- | ---------- | -------------- |
| Catalog and discovery | 3/3/3/3/3/2 | 17 | B | Medium | Split inert definition catalog, live inventory, and generated/prompt projections. |
| Configuration and activation | 4/4/4/3/4/4 | 23 | A | High | Preserve the current activation owner; extend it with managed-source authority and provenance. |
| Credentials, secrets, and auth profiles | 3/3/4/2/4/3 | 19 | B | High | Preserve SecretRef/profile/snapshot owners; add federation, tenant/KMS, governed break-glass, and fleet contracts. |
| Extensions and composition | 2/2/2/2/3/2 | 13 | C | Medium | Split package/distribution, install, activation, runtime registration, and starter-setup composition. |
| Supply-chain and artifact trust | 3/4/3/2/4/3 | 19 | B | High | Preserve source-specific lifecycle owners; add signed provenance, SBOM, org trust, revocation, and fleet promotion contracts. |
| Identity and lifetimes | 3/3/2/3/3/2 | 16 | C | Medium | Maintain the source-backed comparison matrix; do not create a universal identity facility. |
| Nodes, devices, pairing, and remote capabilities | 3/4/4/2/4/3 | 20 | B | High | Preserve pairing and node owners; separate device identity, grants, leases, capabilities, invocation, presence/wake, revocation, and host-peer specialization. |
| Install, update, release, and compatibility | 4/4/4/3/4/3 | 22 | A | High | Preserve local package/git/service/migration owners; add portable release-component, rollback-certainty, rollout-intent, and fleet-convergence contracts. |
| Agent execution | 3/4/3/2/4/3 | 19 | B | High | Consolidate the end-to-end turn contract and separate run, attempt, tool, transcript, and delegation child contracts. |
| Delegated execution | 3/4/3/2/4/3 | 19 | B | High | Preserve separate lineage, controller, and completion-owner identities; strengthen durable admission and settlement. |
| Models and provider routing | 3/3/2/2/4/3 | 17 | B | High | Preserve catalog, route/auth, prepared runtime, attempt/fallback, and usage/status contracts; add attempt correlation. |
| Tools, MCP, and external actions | 3/3/3/2/4/3 | 18 | B | High | Separate catalog, materialization, MCP transport, execution authority, and invocation/projection contracts. |
| Transport, protocol, and API evolution | 3/3/3/2/4/3 | 18 | B | High | Preserve Gateway/ACP foundations; separate declaration, capability, envelope, connection, stream, replay, and compatibility-evidence contracts. |
| Sessions, memory, and context | 3/4/3/2/4/3 | 19 | B | High | Replace the umbrella with session continuity, context assembly/compaction, and memory owner specs. |
| Workspace and filesystem ownership | 4/4/4/3/4/4 | 23 | A | High | Preserve local owners; add enterprise classification, retention, KMS, remote-provider, and fleet-attestation bindings. |
| Privacy, retention, export, and deletion | 3/3/2/3/4/2 | 17 | B | High | Preserve owner-native lifecycle actions; add copy, hold, export, deletion-result, backup, and fleet evidence contracts. |
| Resource governance | 3/4/3/2/4/2 | 18 | B | High | Preserve local enforcement points; connect scoped policy, admission, leases, usage, allocation, and fleet capacity. |
| Messaging and channels | 3/3/2/2/3/3 | 16 | C | Medium-high | Formalize messaging core versus channel projection/transport; extract duplicated delivery lifecycle. |
| Scheduling and background work | 3/3/3/2/3/3 | 17 | B | Medium | Separate scheduler ownership from continuity wake projection and host scale-to-zero concerns. |
| State continuity | 4/4/4/3/4/4 | 23 | A | High | Preserve as a portfolio, but keep checkpoint, restore, lifecycle authority, and retained wake as bounded child contracts. |
| Hosting and lifecycle | 4/4/4/3/3/3 | 21 | A | High | Preserve the umbrella; keep lifecycle, readiness, profiles, and host orchestration independently owned. |
| Readiness | 4/4/4/4/4/3 | 23 | A | High | Preserve the core; keep profiles, watch/wait, Doctor, telemetry, and retained evidence as consumers or dependent facilities. |
| Policy, trust, and approval | 3/3/3/2/4/3 | 18 | B | High for conformance, medium overall | Split conformance evidence, runtime authorization, user approval, authentication, and repair ownership. |
| Diagnostics and repair | 4/3/4/4/4/3 | 22 | A | High | Preserve findings as owner-shaped; keep repair explicit, previewable, and separate from lint/evaluation. |
| Signals, telemetry, and audit | 4/3/4/4/3/2 | 20 | B | Medium | Preserve as projection rules; separate telemetry transport, audit retention/integrity, and current-state evidence. |
| Localization and presentation | 4/3/4/4/3/3 | 21 | A | High for RFC, medium for rollout | Preserve shared locale/context contracts while keeping final rendering with surface owners. |
| Hosting integration | 4/4/4/4/3/4 | 23 | A | High | Preserve owner-first bindings and prevent the bundle or carrier from becoming a semantic service bus. |

## Covered Well

### Readiness and hosting contracts

The readiness work has explicit subjects, identity renewal, conditions,
required/advisory semantics, one canonical result, inert catalogs, watch/wait
facilities, profile conformance, and strong non-ownership rules. The main gap
is accepted-versus-proposed status and retained evidence trust.

### Managed configuration and activation

Current source already has source/runtime snapshots, process revisions,
fingerprints, write preflight, rollback, reload transactions, supersession, and
recovery debt. Managed Configuration adds ordered sources, field authority,
provenance, and portable effective generations rather than replacing this
owner.

### Hosted integration

The native-owner-first rule, exact credential slots, trusted identity,
generation fencing, replay behavior, bounded physical dispatch, and explicit
rejection of a universal service bus are strong. This is a good model for how
the design notebook should describe composition without absorbing owners.

### State continuity

The work covers inventory, capture, publication, restore, fencing, quarantine,
final handoff, retained wake, destruction authority, and mixed-version
migration. It is broad but internally aware of the danger of generic provider
buses and universal consistency layers.

### Doctor

Doctor has substantial current evidence and a good separation between
read-only findings, default versus opt-in checks, structured repair metadata,
dry-run effects, and actual mutation. It should be treated as a consumer of
owner facts, not the owner of every health concept.

### Localization

Localization has an accepted contract, explicit preservation of machine
semantics, owner-specific delivery slices, catalog/coverage gates, and a strong
rule against one translation service absorbing surface ownership.

## Weak or Under-Specified

### Agent execution

The source has strong run/session/attempt/tool/cancellation machinery, but the
end-to-end contract is distributed across Gateway phases, auto-reply
operations, prepared runtime ownership, fallback, embedded attempts,
transcripts, and terminal projections. The problem is consolidation and
terminology, not missing implementation.

### Messaging and channels

Source audit confirms a shared semantic inbound/reply core plus channel-owned
projection and transport. The weak point is duplicated delivery visibility,
partial failure, receipt synthesis, route derivation, and transcript mirroring
inside large channel dispatch modules.

### Identity and lifetimes

Readiness has a strong subject model, but it must not be generalized by
analogy. Session, run, message, tool call, delivery, node, and provider attempt
identities may have different owners and replacement rules. The design area
should maintain an identity/lifetime matrix, not a universal ID package.

### Cross-owner authority and retention

The central execution objects are now source-backed. Their remaining ambiguity
is mostly relational:

- which credential or secret generation authorized an activation or attempt;
- which workspace/file owner may read, write, retain, export, or delete an
  artifact;
- which budgets govern tokens, model cost, concurrency, queues, disk, and
  memory;
- which protocol/version contract preserves cancellation and evidence; and
- which artifact provenance is trusted across install, update, restore, and
  fleet rollout.

### Privacy lifecycle governance

Current source has meaningful session cleanup, archives, disk budgets,
incognito transcript behavior, redaction, snapshot pruning, and owner-specific
delete paths. The weak point is cross-owner completeness: canonical content,
indexes, caches, exports, support bundles, delivery media, audit, holds, and
backups have different authorities and terminal states.

### Resource governance

Current source has broad local limits and observations across tokens, context,
timeouts, lanes, queues, child admission, provider cooldowns, disk, memory,
processes, output, and cost. The weak point is enterprise scope and
coordination: tenant/project quotas, fairness, reservations, durable leases,
chargeback, fleet capacity, and SLO evidence.

### Transport, protocol, and API evolution

Gateway protocol v4, min/max negotiation, role-specific N-1 compatibility,
capability advertisement, structured frames/errors, additive-field handling,
idempotent run admission, reconnect policy, and ACP replay are source-real.
The weak point is portfolio-wide consistency: support windows, capability
discovery, replay declarations, terminal settlement, deprecation/removal gates,
and mixed-version evidence are not uniform across HTTP, RPC, nodes, channels,
providers, ACP, and host adapters.

### Supply-chain and artifact trust

Current source has canonical manifests, source precedence, path/archive safety,
integrity fields, install policy, dependency scanning, dry-run/consent,
rollback snapshots, quarantine/rebuild, durable plugin/Claw records, update,
removal, and activation separation. The weak point is enterprise trust:
publisher/workload identity, signed provenance, transparency, SBOMs,
organization source policy, portable revocation, and fleet convergence.

### Nodes, devices, pairing, and remote capabilities

Current source has public-key device proof, pairing approval, role-bound token
rotation/revocation, pairing-generation fencing, capability/command/tool/skill
catalogs, connection-bound invocation, ordered streams, deadlines, cancellation,
presence/wake, disconnect settlement, and N-1 version skew. The weak point is
enterprise fleet scope: federated/hardware attestation, posture policy,
cross-Gateway ownership, acknowledged cancellation, offline revocation
convergence, and a distinct host/runtime peer identity.

### Install, update, release, and compatibility

Current source has explicit channel resolution, dry-run, downgrade confirmation,
staged npm verification/swap recovery, git rollback/rebuild, detached service
handoff, schema refusal, target-owned Doctor migrations, plugin convergence,
release-SHA/package-digest evidence, beta-first promotion, and published
upgrade-survivor lanes. The weak point is fleet scope: a portable
multi-component release manifest, rings/windows/holds, semantic health gates,
partial convergence, exception expiry, and precise code-versus-state rollback
evidence.

## Areas That Need Separation

### Sessions, memory, and context

Current source confirms three facilities and one relationship:

1. **Session continuity**: registry identity, transcript events, branches,
   cursor, reset/fork, export, and retention.
2. **Context assembly**: current-run input construction, budgets, hidden
   context, provenance, and context-engine projection.
3. **Memory**: corpora, indexing, retrieval, scope, writes, provenance, and
   prompt projection.
4. **Compaction**: budget-triggered transcript transformation, optionally owned
   by the selected context engine.

Consolidation beyond pre-compaction memory flush remains an open candidate, not
a proven fourth owner.

### Tools, MCP, and external actions

Current source confirms these contracts:

1. tool surface catalog;
2. per-run materialization and availability;
3. MCP runtime transport;
4. binding, policy, approval, and trusted target resolution;
5. invocation, cancellation, execution, and side effects; and
6. structured result, transcript, progress, and audit projection.

MCP is a protocol/transport and capability source, not the semantic owner of
every tool.

### Models and provider routing

Current source confirms these contracts:

1. provider/model catalog and logical routes;
2. operator/session route selection;
3. credentials, auth profiles, and endpoint binding;
4. prepared model runtime generation;
5. invocation attempt, retry, cooldown, and fallback;
6. usage, cost, and attribution evidence; and
7. health/readiness projection.

### Messaging and channels

Split into:

1. **Messaging core**: inbound context, session route, semantic turn, reply
   payload, and durable final result.
2. **Channel projection**: native normalization, quotes, media, localization,
   drafts, reactions, and ephemeral UX.
3. **Channel runtime and transport**: account activation, health, send/retry,
   receipts, disconnect, and recovery.

### Policy, trust, and approval

Split conceptually between:

1. authentication and principal establishment;
2. authorization/policy decision;
3. interactive approval;
4. static conformance evidence;
5. runtime enforcement;
6. audit projection; and
7. Doctor findings and repair.

These may compose, but one "policy" object must not silently own all of them.

### Signals, telemetry, and audit

Keep one shared projection discipline, but separate guarantees:

- signals: owner-shaped structured facts;
- telemetry: lossy operational transport and aggregation;
- audit: durable integrity, access, retention, and legal meaning;
- current-state evidence: freshness-bound inspectable results.

### Extensions and composition

Split:

- package/artifact format;
- feed/registry discovery and trust;
- installation and update;
- activation and dependency resolution;
- runtime registration;
- starter setup composition (`Claws`); and
- export/import or portable agent bundles.

### Privacy, retention, export, and deletion

Keep semantic ownership with each durable store. Split the cross-cutting
contract into:

1. data-class policy;
2. canonical-to-derived copy relationship;
3. legal/operational hold;
4. authorized export;
5. owner-native deletion operation; and
6. disclosure-safe lifecycle evidence.

### Resource governance

Keep definitions and enforcement with their owners. Split the portfolio into:

1. scoped resource policy;
2. admission decision;
3. runtime lease/fencing;
4. usage observation;
5. allocation/chargeback; and
6. fleet capacity projection.

### Transport, protocol, and API evolution

Keep payload semantics with the owning method or event. Split the relationship
portfolio into:

1. protocol/interface declaration;
2. capability set;
3. envelope and correlation;
4. connection incarnation;
5. operation stream and settlement;
6. replay/idempotency; and
7. compatibility evidence and removal gates.

### Supply-chain and artifact trust

Split the portfolio into:

1. artifact identity;
2. manifest/capability declaration;
3. source resolution and safe extraction;
4. trust evidence;
5. install admission and consent;
6. install transaction and durable record;
7. activation/runtime binding;
8. update/removal/revocation; and
9. release/fleet promotion.

### Nodes, devices, pairing, and remote capabilities

Split the portfolio into:

1. device identity and attestation;
2. pairing request and approval;
3. role/scope credential grant;
4. node session lease;
5. declared/effective capability surface;
6. invocation stream and settlement;
7. presence/wake;
8. revocation/removal; and
9. remote-peer specialization.

### Install, update, release, and compatibility

Split the portfolio into:

1. immutable release identity;
2. mutable channel intent;
3. installation/service ownership;
4. compatibility envelope;
5. update plan;
6. candidate activation;
7. migration ledger;
8. rollback and recovery certainty;
9. release proof;
10. optional rollout intent; and
11. fleet convergence.

## Missing Design Areas

No major unaudited owner-domain candidate remains from the first pass. The
remaining candidate is a control-plane relationship, not another runtime
framework:

| Missing area | Why it matters | Likely classification |
| ------------ | -------------- | --------------------- |
| Admin and control-plane intent | Tenant/operator desired state, rollout, fleet targeting, and UI are producers of owner inputs, not runtime semantic owners. | Control-plane relationship |

## Portfolio Fix Order

1. **Frame the memory corpus lifecycle evidence slice** to lift the only E4/C1
   facility and prove owner/copy/delete evidence relationships.
2. **Validate the experimental evidence header** across memory, authorized
   action, and release activation before proposing a shared contract.
3. **Add missing areas to the map** only with concrete audit questions and
   source evidence.
