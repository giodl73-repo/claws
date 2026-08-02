# OpenClaw Design Role Review - 2026-08-01

## Review Scope

Reviewed:

- `README.md`
- `conceptual-model.md`
- `facility-map.md`
- `specs/README.md`
- `specs/readiness.md`

Applied `.craft/roles/claws/` lenses:

| Role | Tension cluster | Review concern |
| ---- | --------------- | -------------- |
| `gateway-eng` | B | Preserve runtime owners and avoid a universal abstraction that adds parallel paths. |
| `platform-eng` | D | Make generations, fleet comparison, mixed-version state, and evidence operationally usable. |
| `new-hire` | E | Keep the map navigable and distinguish stable concepts from hypotheses. |
| `ciso` | A | Separate authentication, authorization, evidence integrity, redaction, and retention claims. |
| `founder` | A | Ensure the notebook feels native to OpenClaw and cannot become an enterprise-shaped shadow architecture. |

## Findings

### 1. Blocking: the map mixed different kinds of design area

The first draft placed runtime facilities, owner domains, cross-cutting
concerns, projections, and host integration on one flat list. That implied they
were equivalent subsystems and made "facility" too broad to be useful.

**Risk**: future specs could create universal identity, signal, state, or
hosting frameworks rather than extending existing owners.

**Disposition**: accepted. `facility-map.md` now classifies each row by kind and
states that cross-cutting concerns do not automatically earn shared runtime
APIs.

### 2. Blocking: the project lacked a falsifiable frame

The project described a method but did not state the current cost, deletion
target, or evidence that would disprove the approach.

**Risk**: the notebook could grow indefinitely and reward taxonomy production
instead of simplifying RFC and implementation work.

**Disposition**: accepted. `README.md` now includes the problem, affected
users, retained authority, simplification target, V1 boundary, and stop
conditions.

### 3. High: the conceptual object list could become a universal ontology

Even with a disclaimer against shared base interfaces, the object-class table
could encourage every owner to adopt `Subject`, `Artifact`, `Condition`, or
`Signal` as common runtime types.

**Risk**: abstraction and conversion overhead in the Gateway, plus semantic
loss where owners have different lifetimes and failure models.

**Disposition**: accepted. `conceptual-model.md` now separates owner objects,
relationships, evidence, and projections and requires owner-native vocabulary
unless a shared contract is proven.

### 4. High: authority and maturity were not visible enough

Directory-level source links did not distinguish current source behavior,
active RFC proposals, notebook hypotheses, or deferred ideas.

**Risk**: operators and future agents could mistake a plausible map entry for a
shipped OpenClaw guarantee.

**Disposition**: accepted. The facility map now carries a maturity column and
an evidence rule. Facility specs must identify exact authoritative sources and
label unsupported claims as hypotheses.

### 5. High: readiness combined its core contract with dependent facilities

The readiness capability list mixed canonical evaluation and projection with
watch, wait, profile validation, and retained conformance evidence.

**Risk**: RFC 0018 could appear to own RFC 0023 or later operator, release,
Doctor, telemetry, and support behavior.

**Disposition**: accepted. `specs/readiness.md` now separates core readiness,
readiness operator facilities, and profile/evidence facilities.

### 6. High: the readiness trust statement was too strong

"Existing Gateway authentication protects live readiness surfaces" did not
address authorization scope, redaction, artifact integrity, retention, or
post-runtime trust.

**Risk**: an authentication fact could be read as a complete security and
compliance contract.

**Disposition**: accepted. The spec now distinguishes inherited live-surface
authentication from unresolved authorization, disclosure, integrity, signing,
and retention contracts.

### 7. Medium: the map needed a simpler reading path

A new reader had no quick way to tell what was foundational, what was a
runtime flow, and what was an observational projection.

**Disposition**: accepted. The conceptual model now introduces four design
layers and the facility map records the kind of each area.

### 8. Medium: fleet and mixed-version questions were present but not promoted

The draft mentioned compatibility but did not make fleet comparison,
partial-upgrade behavior, or stale evidence first-class review questions.

**Disposition**: accepted. The facility-spec template and readiness questions
now require mixed-version, evidence freshness, and comparison semantics.

## Result

The project is suitable as a design index after the revisions in this review.
It is not yet a source-audited OpenClaw architecture.

The next facility should not be added until the current source behavior for
configuration and activation is audited and can either confirm or narrow the
proposed object vocabulary.
