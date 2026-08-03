# RFC Scope: Owner State Projection

- ID: EC-001
- Lane: Experience and administration
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Each semantic owner; projection contract is shared

## Scope

- Project owner identity, subject identity, generation, owner-native state,
  observation time, freshness, certainty, reason, compatibility, disclosure,
  and evidence references.
- Define a machine-stable projection envelope without one universal status
  enum or owner base class.

## Current Owner Baseline

Current facilities already expose useful but heterogeneous facts:

- configuration publishes runtime revisions, source/runtime fingerprints,
  accepted source hash, activation state, and restart debt;
- readiness publishes generation-bound conditions, reasons, observation time,
  and availability;
- releases distinguish exact artifact identity, installed/active state,
  compatibility, migration, readiness, and recovery certainty;
- channels expose provider receipts and partial/unknown delivery;
- nodes expose pairing, connection incarnation, capability, invocation, and
  presence facts; and
- lifecycle owners expose complete, partial, retained, blocked, deferred, and
  unknown copy outcomes.

The gap is not absent owner state. It is repeated projection-specific
inference, incompatible freshness conventions, and generic success/health
summaries that lose owner meaning.

## Projection Envelope

| Field family | Required meaning |
| --- | --- |
| Projection | Projection schema/version, producer, audience/profile, and generated time |
| Source | Owner type and stable owner identity |
| Subject | Owner-native subject reference and lifetime identity where applicable |
| Generation | Exact owner generation/revision/incarnation observed |
| Observation | Observed/effective time plus freshness policy and state |
| Owner result | Owner-native state code and versioned owner payload |
| Certainty | Confirmed, inferred with declared basis, partial, incompatible, or unknown |
| Reason | Structured owner reason/findings and remediation references |
| Disclosure | Classification, redaction, omitted fields, and authorization context |
| Evidence | Links to owner-native settlement or durable evidence when available |
| Projection status | Current, stale, unavailable, partial, malformed, incompatible, or ambiguous |

The envelope standardizes relationship facts. The owner result remains an
owner-versioned payload; projection consumers must not compare unrelated owner
state codes as though they were one lifecycle.

## Projection Rules

- Projection is a side-effect-free observation, never an owner command.
- Last-known owner state remains explicitly stale when the owner cannot be
  observed.
- Projection failure is distinct from owner-reported failure.
- Conflicting or ambiguous generations remain partial/ambiguous; the
  projection never selects a convenient generation silently.
- Certainty records the source of a fact. Process existence and log pattern
  matching cannot be promoted to confirmed semantic state.
- A managed cache may retain owner observations, but source generation,
  observed time, expiry/freshness, and projection time remain visible.
- Local CLI and optional managed/fleet consumers use the same semantic
  envelope, while requesting different audience-bound detail.

## Explicit Exclusions

- Canonical runtime state and owner mutation.
- UI layout, dashboard technology, and fleet storage.
- One universal health, status, lifecycle, reason, or remediation enum.
- Requiring every local owner to run a projection service or durable audit
  sink.
- Treating projection availability as owner readiness.

## Required Outcomes

- Missing, stale, degraded, partial, and unknown remain explicit.
- Projection failure such as unreachable owner, ambiguous generation, or
  incompatible payload is explicit and distinct from owner-reported state.
- Local CLI and managed projections consume the same owner facts.
- Schema evolution preserves owner-specific payloads, unknown optional fields,
  and declared incompatible required fields.
- Audience-bound projections preserve redaction and omitted-field metadata so
  an apparently healthy summary cannot conceal unavailable protected detail.
- Projection composition records each child source and generation; aggregate
  state never erases a stale or unknown required child.
- Lifecycle projection answers what remains: local, exported, provider,
  attachment, archive, backup, and other independently owned copies retain
  explicit per-owner settlement after local deletion.

## Compatibility and Operations

- Envelope and owner-payload versions evolve independently.
- Unknown optional envelope fields are ignored and preserved where relayed.
- Unknown required semantics produce incompatible projection status.
- Owners that cannot expose a generation are explicitly legacy/indeterminate;
  consumers do not synthesize one from timestamps.
- Projection latency, cache expiry, and owner timeout are profile-specific and
  visible in freshness metadata.
- Projection collection failure is isolated from the owner runtime.

## Dependencies

- Owner generation conventions and opaque/versioned EC-033 evidence
  references.

## Proof and Deletion Gate

- Render configuration activation, owner readiness, and release activation
  through one envelope while preserving their different state machines.
- Make one owner unavailable, one stale, and one incompatible without changing
  the other owner results.
- Render the same owner fact for local and managed audiences with protected
  detail explicitly redacted.
- Delete one local session while export and provider copies remain, and
  project `deleted locally; copies remain` with owner-specific next actions.
- Delete projection-specific inference from logs and process existence.
- Disprove the separate contract if unlike owners already expose
  machine-stable generation, freshness, certainty, and failure semantics that
  local and managed projections can consume without shared inference.

## Implementation Package Reconciliation

- Use configuration, readiness, and release as the first three unlike owner
  fixtures; preserve their native payloads and state machines.
- Prove unavailable, stale, incompatible, mixed-version, local/managed
  audience, redaction/omission, and cache-freshness behavior before proposing
  a shared envelope.
- Reuse EC-030 for `deleted locally; copies remain` rather than creating a
  lifecycle store inside the projection layer.
- Treat command catalogs, Control UI, Lobster dashboards, and fleet views as
  consumers, never canonical owner state.
- File no upstream projection ask until the fixture deletes real log/process
  inference without requiring a mandatory projection service.
