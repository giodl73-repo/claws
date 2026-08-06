# Configuration and Activation Facility

## Boundary

Configuration and Activation turns authored inputs into one accepted runtime
generation. It owns resolution, validation, runtime materialization,
transactional activation, reload/restart disposition, and accepted-state
identity.

It does not own the semantics of every config field or the external systems
that author desired values.

## Current Objects and Capabilities

- config file snapshot;
- source config;
- materialized runtime config;
- runtime revision and fingerprint;
- applied source hash;
- write candidate and rollback;
- reload transaction and plan;
- owner-specific activation candidates;
- restart debt and accepted restart target.

Capabilities:

- parse, include, substitute, migrate, validate, and materialize;
- pin one runtime snapshot;
- inspect source/runtime snapshots;
- preflight and commit writes with conflict protection;
- roll back a committed write when activation fails and the file is unchanged;
- classify changes as dynamic, hot reload, channel/account restart, or process
  restart;
- reject superseded candidates; and
- recover post-commit failure through retained restart debt.

## Current Versus Proposed

**Current** behavior is source-audited in
`../source-audit-configuration-activation-2026-08-01.md`.

**Proposed Managed Configuration** adds ordered host/operator sources, explicit
field authority, provenance, and a portable effective generation. It should
reuse the current activation owner rather than create another runtime config
system.

## Non-Ownership Rules

- Field owners keep schema meaning, defaults, validation, and runtime behavior.
- Secret providers own issuance and resolution.
- Plugins and channels may contribute bounded activation/reload metadata.
- Hosts may author sources and rollout policy but do not own OpenClaw runtime
  acceptance.

## Open Gaps

- Portable effective generation and provenance.
- Operator-readable relationship among raw hash, source/runtime fingerprints,
  applied source hash, secrets revision, and registry versions.
- Exact dynamic-read rules for consumers of no-op reload paths.
- Mixed-version source and runtime compatibility.
