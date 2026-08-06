# EC-006/EC-007 Specialist Evidence Packet

## Review Scope

- EC-006 Effective Configuration Generations.
- EC-007 Owner Readiness Observations.

The pair is reviewed together because configuration generation feeds
activation, while readiness observes the active owner generation without
becoming the configuration or host-lifecycle owner.

## Evidence Baseline

### Configuration and activation

- Source audit worktree: `C:\src\openclaw-design-audit`.
- Audited branch: `user/giodl/design-audit-20260801`.
- Audited head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`.
- Audit: `projects/openclaw-design/source-audit-configuration-activation-2026-08-01.md`.
- Confidence: high for current source; scored 23/24.

### Readiness

- Conceptual source: `projects/openclaw-design/specs/readiness.md`.
- Proposed normative sources: OpenClaw RFC 0018 and Standard Hosting Profiles
  RFC 0023.
- Partial implementation/proof: readiness PR stacks and package-installed
  upgrade evidence recorded in `projects/hosting-profiles/`.
- Confidence: strong for proposed semantics and fork proof, but exact current
  upstream acceptance, authorization, and retained-artifact status remain
  unverified.

## Current Configuration Objects

| Object | Current owner | Identity/lifetime |
| --- | --- | --- |
| Config file snapshot | Config IO | One observed read with raw hash, parsed/source/runtime views, issues, and warnings |
| Source config | Config IO | Resolved authored intent renewed by accepted reread |
| Runtime config snapshot | Runtime snapshot owner | Process-pinned accepted runtime object |
| Runtime revision | Runtime snapshot owner | Process-local monotonic publication revision |
| Runtime/source fingerprints | Runtime snapshot owner | Hashes of materialized runtime and source values |
| Applied source hash | Gateway config owner | Source revision accepted by active runtime |
| Write candidate | Config write flow | Validated/preflighted mutation through commit, activation, or rollback |
| Reload transaction | Gateway reloader | Candidate generation that may be superseded before commit |
| Prepared secrets snapshot | Secrets runtime owner | Candidate-specific secret generation published only if current |
| Restart debt/target | Restart coordinator | Retained until compatible restart or superseding target |

## Current Configuration Interfaces and Transitions

```text
file/includes/environment
  -> parse/resolve/migrate/validate
  -> source config
  -> materialized runtime config
  -> process-pinned runtime snapshot

write candidate
  -> validation/preflight
  -> commit
  -> canonical reread
  -> activate
  -> accepted runtime generation
     | rollback when safe
     | restart debt when recovery is deferred

reload candidate
  -> prepare config/secrets
  -> reject if superseded
  -> hot commit or restart target
  -> publish accepted state/recovery debt
```

Source-backed behavior includes CAS-style conflict protection, candidate
supersession, last-known-good preservation, bounded plugin/channel reload
metadata, secret-generation fencing, and retained restart debt.

## Current Gaps Addressed by EC-006

- no portable effective generation across processes/deployments;
- no generic ordered host/operator source model;
- no portable field authority/provenance;
- several useful hashes/revisions are not one operator-readable identity;
- mixed-version source/runtime compatibility is not one explicit contract; and
- safe dynamic/no-op reads depend on implicit snapshot-selection discipline.

EC-006 should extend the current configuration owner. It should not create a
managed configuration database or a second write path.

## Proposed Readiness Objects

| Object | Proposed owner/role | Identity/lifetime |
| --- | --- | --- |
| Criterion | Semantic criterion owner | Stable criterion kind |
| Provider | Activating facility/plugin owner | Activation-scoped producer |
| Subject | Semantic owner | Stable ref plus lifetime ID/generation |
| Condition | Evaluating owner/provider using criterion-owner semantics | Current required/advisory result for one subject/type at one activation snapshot |
| Readiness result | Activating owner readiness surface | Canonical bounded result from one activation-pinned evaluation |
| Hosting profile | Non-authoritative profile/release consumer | Immutable selected condition set outside EC-007 core |
| Transition event | Non-authoritative watch projection | Semantic result change, excluding evaluation-time churn |
| Conformance artifact | Non-authoritative profile/evidence consumer | Versioned comparison outside EC-007 core |

## Proposed Readiness State Model

Readiness is orthogonal to configuration acceptance and activation:

```text
configuration: authored -> validated -> accepted
activation: accepted -> activating -> active | failed | superseded
readiness: unknown -> not_ready -> ready | degraded
availability: available | unavailable
```

Important distinctions:

- accepted does not imply active;
- active does not imply ready;
- process existence does not imply ready;
- evaluation timestamp changes do not imply semantic transition;
- required false/unknown makes aggregate not ready;
- advisory failure remains visible without becoming required; and
- host/fleet consumers decide what to do with owner-produced readiness.
- recovery from unavailable re-emits the full result for the active generation;
  recovery is not a healthy-by-default state.

## Existing Readiness Proof

Recorded fork/package proof covers:

- canonical readiness results;
- semantic watch transitions and recovery;
- inert criterion catalog;
- one total startup-wait deadline;
- subject lifetime/generation explanations;
- hosting profile catalog and fail-closed structural validation;
- package-installed upgrade survival; and
- opt-in readiness requirements that do not silently change baseline
  installations.

The proof does not establish current upstream acceptance, final authorization
scope, retained artifact signing/retention, or the exact portable generation
composition defined by EC-006.

## Representative Fixtures

### 1. Existing configuration acceptance

A valid local configuration loads, materializes, and publishes one runtime
snapshot with source/runtime fingerprints and revision.

Expected: accepted and active local generation; no managed service required.

### 2. Stale/superseded candidate

Two reload candidates race; the older candidate finishes preparation after the
newer candidate is current.

Expected: older candidate is rejected/superseded and never publishes config or
secret state.

### 3. Managed-source conflict

A future managed source and local source claim the same field without declared
authority or merge semantics.

Expected target behavior: structured conflict; no new accepted generation;
prior generation remains authoritative.

### 4. Accepted but not active

A valid generation requires restart or an owner-specific activation that has
not completed.

Expected: accepted generation remains distinct from active generation and
retained restart target/debt is visible.

### 5. Active but not ready

The active generation is serving but one required readiness criterion is false
or unknown.

Expected: active remains true; readiness is not ready with owner criterion,
subject identity/generation, reason, and freshness.

### 5a. Protected readiness detail

The same result is requested by an unauthenticated caller, an ordinary
authenticated caller, and a privileged operator.

Expected target behavior: disclosure-safe summary, redacted/denied protected
detail, and authorized detail respectively; missing or stale authority never
reveals protected reasons or related subjects.

### 6. Unavailable and recovered

The Gateway becomes unreachable during watch/wait and later returns.

Expected: unavailable is distinct from valid not-ready; recovery emits the
full canonical result without implying healthy readiness.

### 7. Upgrade compatibility

Upgrade a published baseline to a candidate with new optional readiness
criteria.

Expected: baseline required conditions remain unchanged unless the operator
selects a profile/criterion; declared versions govern comparison.

## Security and Disclosure Questions

- Which principal/authorization scopes may inspect detailed readiness reasons,
  related subjects, and retained artifacts?
- Which configuration provenance may be projected without exposing secret or
  host-private source values?
- Which readiness evidence must be durable, signed, retained, or merely
  ephemeral operational observation?
- How are managed-source authority and break-glass changes represented without
  copying credential material into configuration evidence?

Target contract decisions now require bounded managed-source/break-glass
authority and audience-bound readiness detail. Exact current enforcement seams
remain source-audit work.

## Evidence Classification

| Object | Default audience | Disclosure | Durable? | Assurance |
| --- | --- | --- | --- | --- |
| Local accepted-generation status | Local operator | Secret-safe provenance summary | No | Operational |
| Detailed configuration provenance | Authorized operator | Field/source detail with redaction | Optional | Non-auditable unless integrity/retention declared |
| Live readiness result | Runtime consumer/operator | Summary plus authorized details | No | Operational |
| Readiness watch/wait event | Operator/host | Same disclosure as source result | No | Operational |
| Retained readiness artifact | Release/support/compliance consumer | Audience-bound | Yes when selected | Producer, chronology, integrity, verifier, retention, legal hold |

## Operational Questions

- Is portable generation identity stable across restart, host movement, and
  mixed versions?
- What are evaluation, watch polling, and startup-wait latency budgets?
- Which readiness providers may execute synchronously on the Gateway event
  loop?
- How are provider timeouts, malformed results, plugin removal, and registry
  generation changes represented?
- How do hot reload, restart debt, hosting lifecycle, and owner readiness
  recover without mixed active generations?

## Migration and Deletion

### EC-006

- Preserve local files and the existing configuration owner.
- Adapt current runtime snapshot/write/reload machinery.
- Add portable generation/provenance without long-lived dual writers.
- Delete duplicated host-side configuration writers and inference across
  disconnected hashes/revisions.

### EC-007

- Reuse owner-produced conditions and canonical readiness results.
- Keep hosting profiles, Doctor, release, and fleet as consumers.
- Delete process/install-state readiness inference and private host evaluators.
- Do not require readiness machinery for owners without a hosted/readiness
  boundary.

## Disproof

- Disprove EC-006 if the existing owner can expose portable accepted
  generation, provenance, authority/conflicts, and mixed-version behavior
  without a new relationship contract.
- Disprove EC-007 if activating owners already expose generation-bound
  readiness/recovery in a form all consumers can use without a shared
  readiness evidence contract.

## Specialist Questions

### Configuration owner

- Which current hash/revision should anchor portable generation identity?
- Can ordered external sources reuse current preflight/CAS/rollback?
- Which dynamic/no-op consumers violate snapshot discipline today?

### Readiness owner/consumer

- Is readiness one shared evidence facility or owner-native conditions plus a
  very small aggregate convention?
- Which conditions are current, proposed, profile-owned, or plugin-owned?
- What exact identity survives provider replacement and activation?

### Runtime/hosting operator

- What is the atomic cutover between accepted, active, and ready?
- Which budgets and failure states are required for startup, watch, and wait?
- What survives restart and how is recovery observed?

### Security/simplicity

- Which details require authorization/redaction?
- Can ordinary local configuration and Gateway use remain complete without
  managed provenance, durable evidence, or hosting profiles?
- Which abstractions can be deleted or folded into current owners?
